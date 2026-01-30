/**
 * Import Students from Google Sheets CSV
 * 
 * This script:
 * 1. Downloads CSV from Google Sheets URL
 * 2. Parses the CSV
 * 3. Upserts students (only updates image_url if student exists)
 * 
 * Usage:
 * node scripts/import-students-from-google-sheets.js <GOOGLE_SHEETS_URL> [UNIQUE_FIELD]
 * 
 * Example:
 * node scripts/import-students-from-google-sheets.js "https://drive.google.com/open?id=1kRSrvDd4q9L73gm-Z3mRVcrPmDrjmCmE" email
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');

// Use built-in fetch (Node 18+) or require node-fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch {
  // If node-fetch is not available, use a simple fetch polyfill
  fetch = async (url) => {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: () => Promise.resolve(data),
          });
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  };
}

const prisma = new PrismaClient();

/**
 * Extract file ID from Google Sheets URL
 * Supports multiple URL formats:
 * - https://drive.google.com/open?id=FILE_ID
 * - https://docs.google.com/spreadsheets/d/FILE_ID/edit
 * - https://docs.google.com/spreadsheets/d/FILE_ID/view
 */
function extractFileId(url) {
  // Format 1: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  // Format 2: https://docs.google.com/spreadsheets/d/FILE_ID/edit or /view
  const fileMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  throw new Error('Could not extract file ID from URL. Please provide a valid Google Sheets URL.');
}

/**
 * Convert Google Sheets URL to CSV download URL
 */
function getCsvDownloadUrl(googleSheetsUrl) {
  const fileId = extractFileId(googleSheetsUrl);
  return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&gid=0`;
}

/**
 * Download CSV from Google Sheets
 */
async function downloadCsv(csvUrl) {
  try {
    // console.log(`Downloading CSV from: ${csvUrl}`);
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    return csvText;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw error;
  }
}

/**
 * Parse CSV text into array of objects
 */
function parseCsv(csvText) {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
}

/**
 * Convert Google Drive image URL to embeddable thumbnail URL
 */
function convertImageUrl(url) {
  if (!url) return null;

  // If already a thumbnail URL, return as is
  if (url.includes('thumbnail?id=')) return url;

  // Extract file ID from various Google Drive URL formats
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  // If it's already a valid URL, return as is
  if (url.startsWith('http')) return url;

  return null;
}

/**
 * Normalize email (lowercase, trim)
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Upsert student - only update image_url if exists
 */
async function upsertStudent(row, uniqueField = 'email') {
  try {
    // Determine unique identifier
    let uniqueValue;
    if (uniqueField === 'email') {
      uniqueValue = normalizeEmail(row.email || row.Email || row['Email']);
    } else if (uniqueField === 'id') {
      uniqueValue = parseInt(row.id || row.Id || row['ID']);
    } else {
      uniqueValue = row[uniqueField] || row[uniqueField.charAt(0).toUpperCase() + uniqueField.slice(1)];
    }

    if (!uniqueValue) {
      throw new Error(`Missing unique field: ${uniqueField}`);
    }

    // Extract image_url from CSV (could be in various column names)
    const imageUrl = convertImageUrl(
      row.image_url || 
      row.imageUrl || 
      row['Image URL'] || 
      row['image_url'] ||
      row.Photograph ||
      row.photograph ||
      row['Photograph']
    );

    if (!imageUrl) {
      console.warn(`No image URL found for ${uniqueField}: ${uniqueValue}`);
    }

    // Find existing student
    let existingStudent;
    if (uniqueField === 'email') {
      existingStudent = await prisma.student.findUnique({
        where: { email: uniqueValue },
      });
    } else if (uniqueField === 'id') {
      existingStudent = await prisma.student.findUnique({
        where: { id: uniqueValue },
      });
    } else {
      // For other fields, you might need to adjust this
      existingStudent = await prisma.student.findFirst({
        where: { [uniqueField]: uniqueValue },
      });
    }

    if (existingStudent) {
      // Update only image_url
      const updated = await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          imageUrl: imageUrl || existingStudent.imageUrl, // Keep existing if new one is null
        },
      });
      return { action: 'updated', student: updated };
    } else {
      // Insert new student (minimal fields required)
      // Extract other fields if available
      const email = normalizeEmail(row.email || row.Email || row['Email']);
      const fullName = row.fullName || row['Full Name'] || row.full_name || row.name || row.Name || 'Unknown';
      const phone = row.phone || row.Phone || row.mobile || row.Mobile || row['Mobile Number'] || null;

      if (!email) {
        throw new Error('Email is required for new students');
      }

      const newStudent = await prisma.student.create({
        data: {
          email,
          fullName,
          phone,
          imageUrl: imageUrl,
        },
      });
      return { action: 'created', student: newStudent };
    }
  } catch (error) {
    console.error(`Error upserting student:`, error);
    throw error;
  }
}

/**
 * Main import function
 */
async function importStudents(googleSheetsUrl, uniqueField = 'email') {
  try {
    // console.log('Starting student import from Google Sheets...');
    // console.log(`Google Sheets URL: ${googleSheetsUrl}`);
    // console.log(`Unique field: ${uniqueField}`);

    // Step 1: Get CSV download URL
    const csvUrl = getCsvDownloadUrl(googleSheetsUrl);
    // console.log(`CSV Download URL: ${csvUrl}`);

    // Step 2: Download CSV
    const csvText = await downloadCsv(csvUrl);
    // console.log(`Downloaded CSV (${csvText.length} characters)`);

    // Step 3: Parse CSV
    const rows = parseCsv(csvText);
    // console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      console.warn('No rows found in CSV');
      return;
    }

    // Step 4: Display first row as sample
    // console.log('\nSample row structure:');
    // console.log(Object.keys(rows[0]));

    // Step 5: Upsert each row
    const results = {
      created: [],
      updated: [],
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const result = await upsertStudent(row, uniqueField);
        if (result.action === 'created') {
          results.created.push({
            email: result.student.email,
            name: result.student.fullName,
          });
        } else {
          results.updated.push({
            email: result.student.email,
            name: result.student.fullName,
          });
        }
        // console.log(`[${i + 1}/${rows.length}] ${result.action}: ${result.student.email}`);
      } catch (error) {
        const email = row.email || row.Email || row['Email'] || 'unknown';
        results.errors.push({
          row: i + 2, // +2 because CSV has header row and 0-indexed
          email,
          error: error.message,
        });
        console.error(`[${i + 1}/${rows.length}] Error: ${email} - ${error.message}`);
      }
    }

    // Step 6: Summary
    // console.log('\n=== Import Summary ===');
    // console.log(`Total rows processed: ${rows.length}`);
    // console.log(`Created: ${results.created.length}`);
    // console.log(`Updated: ${results.updated.length}`);
    // console.log(`Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      // console.log('\nErrors:');
      results.errors.forEach((err) => {
        // console.log(`  Row ${err.row} (${err.email}): ${err.error}`);
      });
    }

    return results;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Run script if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node import-students-from-google-sheets.js <GOOGLE_SHEETS_URL> [UNIQUE_FIELD]');
    console.error('Example: node import-students-from-google-sheets.js "https://drive.google.com/open?id=1kRSrvDd4q9L73gm-Z3mRVcrPmDrjmCmE" email');
    process.exit(1);
  }

  const googleSheetsUrl = args[0];
  const uniqueField = args[1] || 'email';

  importStudents(googleSheetsUrl, uniqueField)
    .then(() => {
      // console.log('\nImport completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nImport failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { importStudents, extractFileId, getCsvDownloadUrl };

