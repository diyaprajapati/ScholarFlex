const multer = require('multer');
const XLSX = require('xlsx');
const Candidate = require('../models/Candidate');
const { logActivitySimple } = require('../middleware/activityLogger');
const pool = require('../config/database');

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
 * Map spreadsheet row to candidate data
 */
const mapSpreadsheetToCandidate = (row) => {
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
  const instituteName = getValue(['Name of Institute', 'Institute Name', 'institute_name', 'instituteName']);
  const courseTaken = getValue(['Course Taken', 'course_taken', 'courseTaken', 'Course']);
  const areaOfInterests = getValue(['Area of Interests', 'Area of Interest', 'area_of_interests', 'areaOfInterests', 'Interests']);
  const internshipStartDate = getValue(['Internship Start Date', 'internship_start_date', 'startDate', 'Start Date']);
  const internshipEndDate = getValue(['Internship End Date', 'internship_end_date', 'endDate', 'End Date']);
  const referenceInfo = getValue(['Reference Information', 'reference_information', 'referenceInfo', 'Reference']);
  const photograph = getValue(['Photograph', 'photograph', 'Photo', 'photo', 'Image', 'image']);
  const internalFacultyName = getValue(['Internal Faculty of Institute', 'Internal Faculty', 'internal_faculty_name', 'facultyName']);
  const facultyContact = getValue(['Faculty Contact', 'faculty_contact', 'facultyContact']);
  const facultyEmail = getValue(['Faculty Email Id', 'Faculty Email', 'faculty_email', 'facultyEmail']);

  // Convert Google Drive link to embeddable format
  const photographUrl = photograph ? convertGoogleDriveLink(photograph) : null;

  // Parse dates
  let parsedStartDate = null;
  let parsedEndDate = null;
  
  if (internshipStartDate) {
    const startDate = new Date(internshipStartDate);
    if (!isNaN(startDate.getTime())) {
      parsedStartDate = startDate.toISOString().split('T')[0];
    }
  }
  
  if (internshipEndDate) {
    const endDate = new Date(internshipEndDate);
    if (!isNaN(endDate.getTime())) {
      parsedEndDate = endDate.toISOString().split('T')[0];
    }
  }

  return {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email: email,
    mobile_number: mobileNumber,
    institute_name: instituteName,
    course_taken: courseTaken,
    area_of_interests: areaOfInterests,
    internship_start_date: parsedStartDate,
    internship_end_date: parsedEndDate,
    reference_information: referenceInfo,
    photograph_url: photographUrl,
    internal_faculty_name: internalFacultyName,
    faculty_contact: facultyContact,
    faculty_email: facultyEmail,
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

    const candidatesData = [];
    const errors = [];
    const emailSet = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        const mapped = mapSpreadsheetToCandidate(row);

        // Validate required fields
        if (!mapped.first_name || !mapped.last_name || !mapped.email) {
          errors.push({
            row: rowNum,
            email: mapped.email || 'N/A',
            reason: 'Missing required fields: First Name, Last Name, or Email',
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
        const emailLower = mapped.email.toLowerCase().trim();
        if (emailSet.has(emailLower)) {
          errors.push({
            row: rowNum,
            email: mapped.email,
            reason: 'Duplicate email in spreadsheet',
          });
          continue;
        }
        emailSet.add(emailLower);

        candidatesData.push(mapped);
      } catch (error) {
        errors.push({
          row: rowNum,
          email: row.Email || 'N/A',
          reason: error.message || 'Failed to process row',
        });
      }
    }

    if (candidatesData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid candidate data found in spreadsheet.',
        errors,
      });
    }

    // Bulk insert candidates
    const results = await Candidate.bulkCreate(candidatesData);

    // Log activity
    await logActivitySimple(
      req,
      'UPLOAD_CANDIDATES',
      'CANDIDATE',
      null,
      `Uploaded ${results.created.length} candidates from spreadsheet`
    );

    res.status(200).json({
      success: true,
      message: `Successfully processed ${results.created.length} candidates`,
      data: {
        created: results.created.length,
        failed: results.errors.length + errors.length,
        details: {
          created: results.created.map(c => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            email: c.email,
          })),
          failed: [...results.errors, ...errors],
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
 * Get all candidates with marks
 */
exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.findAll();

    // Log activity
    await logActivitySimple(
      req,
      'VIEW_CANDIDATES',
      'CANDIDATE',
      null,
      `Viewed ${candidates.length} candidates`
    );

    res.status(200).json({
      success: true,
      candidates: candidates.map(c => ({
        id: c.id,
        first_name: c.first_name,
        middle_name: c.middle_name,
        last_name: c.last_name,
        full_name: `${c.first_name}${c.middle_name ? ` ${c.middle_name}` : ''} ${c.last_name}`.trim(),
        email: c.email,
        mobile_number: c.mobile_number,
        marks: parseFloat(c.marks || 0),
        reference_information: c.reference_information,
        photograph_url: c.photograph_url,
        is_selected: c.is_selected || false,
        institute_name: c.institute_name,
        course_taken: c.course_taken,
        area_of_interests: c.area_of_interests,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update candidate selection status
 */
exports.updateCandidateSelection = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_selected } = req.body;

    if (typeof is_selected !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_selected must be a boolean',
      });
    }

    const updated = await Candidate.update(id, { is_selected });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found',
      });
    }

    // Log activity
    await logActivitySimple(
      req,
      'UPDATE_CANDIDATE',
      'CANDIDATE',
      id,
      `Updated candidate selection status: ${is_selected}`
    );

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully',
      candidate: updated,
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Bulk update candidate selection status
 */
exports.bulkUpdateSelection = async (req, res) => {
  try {
    const { candidate_ids, is_selected } = req.body;

    if (!Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'candidate_ids must be a non-empty array',
      });
    }

    if (typeof is_selected !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_selected must be a boolean',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatePromises = candidate_ids.map(id =>
        Candidate.update(id, { is_selected })
      );

      await Promise.all(updatePromises);

      await client.query('COMMIT');

      // Log activity
      await logActivitySimple(
        req,
        'BULK_UPDATE_CANDIDATES',
        'CANDIDATE',
        null,
        `Updated selection status for ${candidate_ids.length} candidates`
      );

      res.status(200).json({
        success: true,
        message: `Successfully updated ${candidate_ids.length} candidates`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk updating candidates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

