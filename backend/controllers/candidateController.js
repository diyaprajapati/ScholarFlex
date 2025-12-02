const multer = require('multer');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { logActivitySimple } = require('../middleware/activityLogger');
const pool = require('../config/database');

const prisma = new PrismaClient();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file.'));
    }
  },
});

exports.upload = upload.single('file');

/**
 * Convert Google Drive share link to embeddable image URL
 */
const convertGoogleDriveLink = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Extract file ID from various Google Drive link formats
  // Format 1: https://drive.google.com/open?id=FILE_ID
  // Format 2: https://drive.google.com/file/d/FILE_ID/view
  // Format 3: https://drive.google.com/uc?id=FILE_ID
  
  let fileId = null;
  
  // Check for format: open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    fileId = openMatch[1];
  } else {
    // Check for format: /file/d/FILE_ID/
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }
  }
  
  if (!fileId) return url; // Return original URL if we can't extract ID
  
  // Convert to embeddable thumbnail URL
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
};

/**
 * Parse spreadsheet file and extract candidate data
 */
const parseSpreadsheet = (buffer, mimetype) => {
  try {
    let workbook;
    
    if (mimetype === 'text/csv' || mimetype === 'application/csv') {
      const csvData = buffer.toString('utf8');
      workbook = XLSX.read(csvData, { type: 'string' });
    } else {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    return data;
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    throw new Error('Failed to parse spreadsheet file');
  }
};

/**
 * Map spreadsheet row to student data
 */
const mapSpreadsheetToStudent = (row) => {
  // Handle various column name variations
  const getValue = (possibleKeys) => {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
    return null;
  };

  const firstName = getValue(['First Name', 'First Name', 'first_name', 'firstName']);
  const middleName = getValue(['Middle Name', 'middle_name', 'middleName']);
  const lastName = getValue(['Last Name', 'last_name', 'lastName']);
  const email = getValue(['Email', 'email', 'Email Address', 'email_address']);
  const mobileNumber = getValue(['Mobile Number (WhatsApp)', 'Mobile Number', 'mobile_number', 'mobileNumber', 'phone', 'Phone']);
  const photograph = getValue(['Photograph', 'photograph', 'Photo', 'photo', 'Image', 'image', 'image_url', 'Image URL']);

  // Convert Google Drive link to embeddable format
  const imageUrl = photograph ? convertGoogleDriveLink(photograph) : null;

  // Build full name
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

  return {
    email: email ? email.toLowerCase().trim() : null,
    fullName: fullName || 'Unknown',
    phone: mobileNumber || null,
    imageUrl: imageUrl,
  };
};

/**
 * Upload and process spreadsheet
 */
exports.uploadSpreadsheet = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: req.fileValidationError,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an Excel or CSV file.',
      });
    }

    const rows = parseSpreadsheet(req.file.buffer, req.file.mimetype);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet is empty or could not be parsed.',
      });
    }

    // Log available columns in development
    if (process.env.NODE_ENV === 'development' && rows.length > 0) {
      console.log('📋 Available columns:', Object.keys(rows[0]));
    }

    const studentsData = [];
    const errors = [];
    const emailSet = new Set();
    const results = { created: [], updated: [], failed: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        const mapped = mapSpreadsheetToStudent(row);

        // Validate required fields
        if (!mapped.email) {
          errors.push({
            row: rowNum,
            email: 'N/A',
            reason: 'Missing required field: Email',
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mapped.email)) {
          errors.push({
            row: rowNum,
            email: mapped.email,
            reason: 'Invalid email format',
          });
          continue;
        }

        // Check for duplicate emails within spreadsheet
        if (emailSet.has(mapped.email)) {
          errors.push({
            row: rowNum,
            email: mapped.email,
            reason: 'Duplicate email in spreadsheet',
          });
          continue;
        }
        emailSet.add(mapped.email);

        studentsData.push(mapped);
      } catch (error) {
        errors.push({
          row: rowNum,
          email: row.Email || 'N/A',
          reason: error.message || 'Failed to process row',
        });
      }
    }

    if (studentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid student data found in spreadsheet.',
        errors,
      });
    }

    // Upsert students (update image_url if exists, create if not)
    for (const studentData of studentsData) {
      try {
        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
          where: { email: studentData.email },
        });

        if (existingStudent) {
          // Update only image_url if provided
          const updateData = {};
          if (studentData.imageUrl) {
            updateData.imageUrl = studentData.imageUrl;
          }

          if (Object.keys(updateData).length > 0) {
            const updated = await prisma.student.update({
              where: { id: existingStudent.id },
              data: updateData,
            });
            results.updated.push({
              id: updated.id,
              name: updated.fullName,
              email: updated.email,
            });
          } else {
            results.updated.push({
              id: existingStudent.id,
              name: existingStudent.fullName,
              email: existingStudent.email,
            });
          }
        } else {
          // Create new student
          const created = await prisma.student.create({
            data: {
              email: studentData.email,
              fullName: studentData.fullName,
              phone: studentData.phone,
              imageUrl: studentData.imageUrl,
            },
          });
          results.created.push({
            id: created.id,
            name: created.fullName,
            email: created.email,
          });
        }
      } catch (error) {
        results.failed.push({
          email: studentData.email,
          reason: error.message || 'Database error',
        });
      }
    }

    // Log activity
    await logActivitySimple(
      req,
      'UPLOAD_STUDENTS',
      'STUDENT',
      null,
      `Uploaded ${results.created.length} new students, updated ${results.updated.length} students from spreadsheet`
    );

    res.status(200).json({
      success: true,
      message: `Successfully processed ${results.created.length} new students and updated ${results.updated.length} students`,
      data: {
        created: results.created.length,
        updated: results.updated.length,
        failed: results.failed.length + errors.length,
        details: {
          created: results.created,
          updated: results.updated,
          failed: [...results.failed, ...errors],
        },
      },
    });
  } catch (error) {
    console.error('Error uploading spreadsheet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all students with marks (for Candidates tab)
 */
exports.getAllCandidates = async (req, res) => {
  try {
    // Fetch students with their marks from test attempts
    const result = await pool.query(
      `SELECT 
        s.id,
        s.email,
        s.full_name,
        s.phone as mobile_number,
        s.image_url,
        s.domain_id,
        s.status_id,
        s.registration_date,
        s.is_active,
        s.created_at,
        s.updated_at,
        d.domain_name,
        ist.status_name,
        COALESCE(MAX(ta.percentage_score), 0) as marks,
        MAX(ta.submitted_at) as last_test_date,
        COUNT(DISTINCT ta.id) as total_attempts,
        NULL as reference_information
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN intern_status ist ON s.status_id = ist.id
      LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status IN ('COMPLETED', 'AUTO_SUBMITTED')
      WHERE s.is_active = TRUE
      GROUP BY s.id, s.email, s.full_name, s.phone, s.image_url, s.domain_id, s.status_id, 
               s.registration_date, s.is_active, s.created_at, s.updated_at, d.domain_name, ist.status_name
      ORDER BY s.created_at DESC`
    );

    const students = result.rows.map(s => ({
      id: s.id,
      email: s.email,
      full_name: s.full_name,
      mobile_number: s.mobile_number,
      image_url: s.image_url,
      marks: parseFloat(s.marks || 0),
      reference_information: s.reference_information,
      status: s.status_name,
      domain: s.domain_name,
      total_attempts: parseInt(s.total_attempts || 0),
      last_test_date: s.last_test_date,
      registration_date: s.registration_date,
      is_active: s.is_active,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    // Log activity
    await logActivitySimple(
      req,
      'VIEW_STUDENTS',
      'STUDENT',
      null,
      `Viewed ${students.length} students`
    );

    res.status(200).json({
      success: true,
      candidates: students,
    });
  } catch (error) {
    console.error('Error getting students:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update candidate selection status (Deprecated - using students table now)
 */
exports.updateCandidateSelection = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Selection feature is not available. This endpoint is deprecated.',
  });
};

/**
 * Get student by ID with full details
 */
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        s.*,
        d.domain_name,
        ist.status_name,
        COALESCE(MAX(ta.percentage_score), 0) as marks,
        MAX(ta.submitted_at) as last_test_date,
        COUNT(DISTINCT ta.id) as total_attempts,
        NULL as reference_information
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN intern_status ist ON s.status_id = ist.id
      LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status IN ('COMPLETED', 'AUTO_SUBMITTED')
      WHERE s.id = $1 AND s.is_active = TRUE
      GROUP BY s.id, d.domain_name, ist.status_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const student = result.rows[0];

    res.status(200).json({
      success: true,
      student: {
        id: student.id,
        email: student.email,
        full_name: student.full_name,
        phone: student.phone,
        image_url: student.image_url,
        domain: student.domain_name,
        status: student.status_name,
        marks: parseFloat(student.marks || 0),
        reference_information: student.reference_information,
        total_attempts: parseInt(student.total_attempts || 0),
        last_test_date: student.last_test_date,
        registration_date: student.registration_date,
        created_at: student.created_at,
        updated_at: student.updated_at,
      },
    });
  } catch (error) {
    console.error('Error getting student by ID:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Import students from Google Sheets CSV URL
 */
exports.importFromGoogleSheets = async (req, res) => {
  try {
    const { google_sheets_url, unique_field = 'email' } = req.body;

    if (!google_sheets_url) {
      return res.status(400).json({
        success: false,
        message: 'Google Sheets URL is required',
      });
    }

    // Import the script function
    const { importStudents } = require('../scripts/import-students-from-google-sheets');

    // Run import
    const results = await importStudents(google_sheets_url, unique_field);

    // Log activity
    await logActivitySimple(
      req,
      'IMPORT_STUDENTS_GOOGLE_SHEETS',
      'STUDENT',
      null,
      `Imported ${results.created.length} new students, updated ${results.updated.length} students`
    );

    res.status(200).json({
      success: true,
      message: `Successfully imported ${results.created.length} new students and updated ${results.updated.length} students`,
      data: results,
    });
  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Bulk update candidate selection status (Deprecated - using students table now)
 */
exports.bulkUpdateSelection = async (req, res) => {
  return res.status(400).json({
    success: false,
    message: 'Bulk selection feature is not available. This endpoint is deprecated.',
  });
};

