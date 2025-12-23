const multer = require('multer');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { logActivitySimple } = require('../middleware/activityLogger');
const pool = require('../config/database');

const prisma = new PrismaClient();

/**
 * Ensure the manual NOC status table exists.
 * This table is used to track whether NOC has been received manually for each student.
 */
const ensureNOCStatusTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_noc_status (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL UNIQUE,
      is_received BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_student_noc_status_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_student_noc_status_student_id
      ON student_noc_status(student_id);
  `);
};

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

  const getDateValue = (possibleKeys) => {
    const value = getValue(possibleKeys);
    if (!value) return null;
    try {
      // Try to parse the date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // If parsing fails, return null
    }
    return null;
  };
  
  // Extract name parts to build full_name (but don't store them separately)
  const firstName = getValue(['First Name', 'FirstName', 'first_name', 'firstName']);
  const middleName = getValue(['Middle Name', 'MiddleName', 'middle_name', 'middleName']);
  const lastName = getValue(['Last Name', 'LastName', 'last_name', 'lastName']);
  
  const email = getValue(['Email', 'email', 'Email Address', 'email_address']);
  const mobileNumber = getValue(['Mobile Number (WhatsApp)', 'Mobile Number', 'mobile_number', 'mobileNumber', 'phone', 'Phone']);
  const photograph = getValue(['Photograph', 'photograph', 'Photo', 'photo', 'Image', 'image', 'image_url', 'Image URL']);
  const instituteName = getValue(['Name of Institute', 'Institute Name', 'institute_name', 'instituteName', 'Institute']);
  const courseTaken = getValue(['Course Taken', 'course_taken', 'courseTaken', 'Course']);
  // Map both "Area of Interest" and "Domain" columns to domain (they are treated the same)
  // This handles various column name variations and converts them to domain_id during processing
  const areaOfInterests = getValue([
    'Domain', 'domain', 'DOMAIN', // Domain column variations
    'Area of Interests', 'Area of Interest', 'Area Of Interest', 'Area Of Interests', // Area of Interest variations
    'area_of_interests', 'areaOfInterests', 'area_of_interest', 'areaOfInterest',
    'Interest Area', 'Interest', 'Field', 'field', 'Specialization', 'specialization' // Other common variations
  ]);
  const internshipStartDate = getDateValue(['Internship Start Date', 'internship_start_date', 'internshipStartDate', 'Start Date']);
  const internshipEndDate = getDateValue(['Internship End Date', 'internship_end_date', 'internshipEndDate', 'End Date']);
  const internshipDuration = getValue(['Internship Duration', 'internship_duration', 'internshipDuration', 'Duration']);
  const referenceInformation = getValue(['Reference Information', 'reference_information', 'referenceInformation', 'Reference']);
  const internalFacultyName = getValue(['Internal Faculty of Institute', 'Internal Faculty', 'internal_faculty_name', 'internalFacultyName', 'Faculty Name']);
  const facultyContact = getValue(['Faculty Contact', 'faculty_contact', 'facultyContact', 'Faculty Phone']);
  const facultyEmail = getValue(['Faculty Email Id', 'Faculty Email', 'faculty_email', 'facultyEmail', 'Faculty Email ID']);

  // Convert Google Drive link to embeddable format
  const imageUrl = photograph ? convertGoogleDriveLink(photograph) : null;

  // Build full name from parts or use full_name if available (but don't store name parts separately)
  const nameParts = [firstName, middleName, lastName].filter(Boolean);
  const fullName = nameParts.length > 0 ? nameParts.join(' ').trim() : getValue(['Full Name', 'full_name', 'fullName']) || 'Unknown';

  return {
    email: email ? email.toLowerCase().trim() : null,
    fullName: fullName,
    phone: mobileNumber || null,
    imageUrl: imageUrl,
    instituteName: instituteName || null,
    courseTaken: courseTaken || null,
    areaOfInterests: areaOfInterests || null, // Will be converted to domainId during processing
    internshipStartDate: internshipStartDate,
    internshipEndDate: internshipEndDate,
    internshipDuration: internshipDuration || null,
    referenceInformation: referenceInformation || null,
    internalFacultyName: internalFacultyName || null,
    facultyContact: facultyContact || null,
    facultyEmail: facultyEmail || null,
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
      console.log('💡 Note: Both "Area of Interest" and "Domain" columns will be converted to domain_id');
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
        message: `No valid student data found in spreadsheet. ${errors.length > 0 ? `Found ${errors.length} error(s).` : ''}`,
        errors: errors,
        errorCount: errors.length,
      });
    }

    // Upsert students (update image_url if exists, create if not)
    const Student = require('../models/Student');
    for (const studentData of studentsData) {
      try {
        // Convert areaOfInterests (from "Area of Interest" or "Domain" column) to domainId
        // Both column names are treated the same and converted to domain_id
        let domainId = null;
        if (studentData.areaOfInterests && studentData.areaOfInterests.trim()) {
          domainId = await Student.getOrCreateDomain(studentData.areaOfInterests.trim());
        }

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
          where: { email: studentData.email },
        });

        if (existingStudent) {
          // If domainId is not set from spreadsheet but student has area_of_interests, migrate it
          if (!domainId && existingStudent.areaOfInterests && existingStudent.areaOfInterests.trim() && !existingStudent.domainId) {
            domainId = await Student.getOrCreateDomain(existingStudent.areaOfInterests.trim());
          }

          // Update all provided fields
          const updateData = {};
          if (studentData.fullName) updateData.fullName = studentData.fullName;
          if (studentData.phone !== null) updateData.phone = studentData.phone;
          if (studentData.imageUrl !== null) updateData.imageUrl = studentData.imageUrl;
          if (studentData.instituteName !== null) updateData.instituteName = studentData.instituteName;
          if (studentData.courseTaken !== null) updateData.courseTaken = studentData.courseTaken;
          if (domainId !== null) updateData.domainId = domainId;
          if (studentData.internshipStartDate !== null) updateData.internshipStartDate = studentData.internshipStartDate;
          if (studentData.internshipEndDate !== null) updateData.internshipEndDate = studentData.internshipEndDate;
          if (studentData.internshipDuration !== null) updateData.internshipDuration = studentData.internshipDuration;
          if (studentData.referenceInformation !== null) updateData.referenceInformation = studentData.referenceInformation;
          if (studentData.internalFacultyName !== null) updateData.internalFacultyName = studentData.internalFacultyName;
          if (studentData.facultyContact !== null) updateData.facultyContact = studentData.facultyContact;
          if (studentData.facultyEmail !== null) updateData.facultyEmail = studentData.facultyEmail;

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
          // Create new student with all fields
          const created = await prisma.student.create({
            data: {
              email: studentData.email,
              fullName: studentData.fullName,
              phone: studentData.phone,
              imageUrl: studentData.imageUrl,
              instituteName: studentData.instituteName,
              courseTaken: studentData.courseTaken,
              domainId: domainId,
              internshipStartDate: studentData.internshipStartDate,
              internshipEndDate: studentData.internshipEndDate,
              internshipDuration: studentData.internshipDuration,
              referenceInformation: studentData.referenceInformation,
              internalFacultyName: studentData.internalFacultyName,
              facultyContact: studentData.facultyContact,
              facultyEmail: studentData.facultyEmail,
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
    // Ensure NOC status table exists
    await ensureNOCStatusTable();

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
        s.institute_name,
        s.course_taken,
        s.area_of_interests,
        s.internship_start_date,
        s.internship_end_date,
        s.internship_duration,
        s.reference_information,
        s.internal_faculty_name,
        s.faculty_contact,
        s.faculty_email,
        s.is_active,
        s.is_selected,
        s.can_retest,
        s.created_at,
        s.updated_at,
        d.domain_name,
        ist.status_name,
        COALESCE(BOOL_OR(sns.is_received), FALSE) as noc_received,
        COALESCE(MAX(ta.percentage_score), 0) as marks,
        MAX(ta.submitted_at) as last_test_date,
        COUNT(DISTINCT ta.id) as total_attempts
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN intern_status ist ON s.status_id = ist.id
      LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status IN ('COMPLETED', 'AUTO_SUBMITTED')
      LEFT JOIN student_noc_status sns ON sns.student_id = s.id
      WHERE s.is_active = TRUE
      GROUP BY s.id, s.email, s.full_name, s.phone, s.image_url, 
               s.domain_id, s.status_id, s.registration_date, s.institute_name, s.course_taken, 
               s.area_of_interests, s.internship_start_date, s.internship_end_date, s.internship_duration,
               s.reference_information, s.internal_faculty_name, s.faculty_contact, s.faculty_email,
               s.is_active, s.is_selected, s.can_retest, s.created_at, s.updated_at, d.domain_name, ist.status_name
      ORDER BY s.created_at DESC`
    );

    const students = result.rows.map(s => ({
      id: s.id,
      email: s.email,
      full_name: s.full_name,
      mobile_number: s.mobile_number,
      phone: s.mobile_number,
      image_url: s.image_url,
      noc_received: s.noc_received,
      marks: parseFloat(s.marks || 0),
      reference_information: s.reference_information,
      status: s.status_name,
      domain: s.domain_name,
      domain_id: s.domain_id,
      institute_name: s.institute_name,
      course_taken: s.course_taken,
      internship_start_date: s.internship_start_date,
      internship_end_date: s.internship_end_date,
      internship_duration: s.internship_duration,
      internal_faculty_name: s.internal_faculty_name,
      faculty_contact: s.faculty_contact,
      faculty_email: s.faculty_email,
      is_selected: s.is_selected || false,
      can_retest: s.can_retest || false,
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

    // Ensure NOC status table exists
    await ensureNOCStatusTable();

    const result = await pool.query(
      `SELECT 
        s.*,
        d.domain_name,
        ist.status_name,
        COALESCE(BOOL_OR(sns.is_received), FALSE) as noc_received,
        COALESCE(MAX(ta.percentage_score), 0) as marks,
        MAX(ta.submitted_at) as last_test_date,
        COUNT(DISTINCT ta.id) as total_attempts
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      LEFT JOIN intern_status ist ON s.status_id = ist.id
      LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status IN ('COMPLETED', 'AUTO_SUBMITTED')
      LEFT JOIN student_noc_status sns ON sns.student_id = s.id
      WHERE s.id = $1 AND s.is_active = TRUE
      GROUP BY s.id, d.domain_name, ist.status_name, s.is_selected`,
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
        domain_id: student.domain_id,
        status: student.status_name,
        noc_received: student.noc_received,
        marks: parseFloat(student.marks || 0),
        reference_information: student.reference_information,
        institute_name: student.institute_name,
        course_taken: student.course_taken,
        internship_start_date: student.internship_start_date,
        internship_end_date: student.internship_end_date,
        internship_duration: student.internship_duration,
        internal_faculty_name: student.internal_faculty_name,
        faculty_contact: student.faculty_contact,
        faculty_email: student.faculty_email,
        is_selected: student.is_selected || false,
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
 * Update student selection status
 */
exports.updateStudentSelection = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_selected, can_retest } = req.body;

    if (typeof is_selected !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_selected must be a boolean value',
      });
    }

    // Check if student exists
    const studentResult = await pool.query(
      'SELECT id, email, full_name FROM students WHERE id = $1 AND is_active = TRUE',
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Update selection status (and optionally can_retest if provided)
    if (typeof can_retest === 'boolean') {
      await pool.query(
        'UPDATE students SET is_selected = $1, can_retest = $2, updated_at = NOW() WHERE id = $3',
        [is_selected, can_retest, id]
      );
    } else {
      await pool.query(
        'UPDATE students SET is_selected = $1, updated_at = NOW() WHERE id = $2',
        [is_selected, id]
      );
    }

    // Log activity
    await logActivitySimple(
      req,
      'UPDATE_STUDENT_SELECTION',
      'STUDENT',
      id,
      `${req.user.email} ${is_selected ? 'selected' : 'deselected'} student: ${studentResult.rows[0].email}`
    );

    res.status(200).json({
      success: true,
      message: `Student ${is_selected ? 'selected' : 'deselected'} successfully`,
      data: {
        id: parseInt(id),
        is_selected,
        can_retest: typeof can_retest === 'boolean' ? can_retest : undefined,
      },
    });
  } catch (error) {
    console.error('Error updating student selection:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update manual NOC received status for a student
 * This is a manual flag, independent from the NOC letters table.
 */
exports.updateNOCReceivedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { noc_received } = req.body;

    if (typeof noc_received !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'noc_received must be a boolean value',
      });
    }

    // Ensure NOC status table exists
    await ensureNOCStatusTable();

    // Check if student exists
    const studentResult = await pool.query(
      'SELECT id, email, full_name FROM students WHERE id = $1 AND is_active = TRUE',
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Upsert manual NOC status
    const updateResult = await pool.query(
      `
      INSERT INTO student_noc_status (student_id, is_received, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (student_id)
      DO UPDATE SET is_received = EXCLUDED.is_received, updated_at = NOW()
      RETURNING student_id, is_received, updated_at
      `,
      [id, noc_received]
    );

    console.log('✅ NOC status saved to database:', {
      student_id: id,
      noc_received: noc_received,
      saved_data: updateResult.rows[0],
    });

    // Log activity
    await logActivitySimple(
      req,
      'UPDATE_STUDENT_NOC_STATUS',
      'STUDENT',
      id,
      `${req.user.email} set NOC received = ${noc_received ? 'YES' : 'NO'} for student: ${studentResult.rows[0].email}`
    );

    res.status(200).json({
      success: true,
      message: 'NOC received status updated successfully',
      data: {
        id: parseInt(id),
        noc_received,
      },
    });
  } catch (error) {
    console.error('Error updating NOC received status:', error);
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

/**
 * Migrate area_of_interests to domain_id for existing students
 */
exports.migrateAreaOfInterestsToDomain = async (req, res) => {
  try {
    const Student = require('../models/Student');
    
    // Get all students with area_of_interests but no domain_id
    const result = await pool.query(
      `SELECT id, area_of_interests, domain_id 
       FROM students 
       WHERE area_of_interests IS NOT NULL 
       AND area_of_interests != '' 
       AND (domain_id IS NULL OR domain_id = 0)
       AND is_active = TRUE`
    );

    let migrated = 0;
    let failed = 0;
    const errors = [];

    for (const student of result.rows) {
      try {
        const areaOfInterest = student.area_of_interests.trim();
        if (areaOfInterest) {
          // Get or create domain from area_of_interests
          const domainId = await Student.getOrCreateDomain(areaOfInterest);
          
          if (domainId) {
            // Update student with domain_id
            await pool.query(
              'UPDATE students SET domain_id = $1, updated_at = NOW() WHERE id = $2',
              [domainId, student.id]
            );
            migrated++;
          } else {
            failed++;
            errors.push(`Student ID ${student.id}: Failed to create domain for "${areaOfInterest}"`);
          }
        }
      } catch (error) {
        failed++;
        errors.push(`Student ID ${student.id}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Migration completed: ${migrated} students migrated, ${failed} failed`,
      data: {
        migrated,
        failed,
        total: result.rows.length,
        errors: errors.slice(0, 10), // Show first 10 errors
      },
    });
  } catch (error) {
    console.error('Error migrating area_of_interests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Create a new student manually
 */
exports.createStudent = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      domain_id,
      status_id,
      institute_name,
      course_taken,
      area_of_interests, // Legacy support - will be converted to domain_id
      internship_start_date,
      internship_end_date,
      internship_duration,
      reference_information,
      internal_faculty_name,
      faculty_contact,
      faculty_email,
      image_url,
    } = req.body;

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if student with this email already exists
    const existingStudent = await prisma.student.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Handle domain_id: if area_of_interests is provided but domain_id is not, convert it
    let finalDomainId = domain_id ? parseInt(domain_id) : null;
    if (!finalDomainId && area_of_interests && area_of_interests.trim()) {
      const Student = require('../models/Student');
      finalDomainId = await Student.getOrCreateDomain(area_of_interests.trim());
    }

    // Prepare student data
    const studentData = {
      email: email.toLowerCase().trim(),
      fullName: full_name,
      phone: phone || null,
      domainId: finalDomainId,
      statusId: status_id ? parseInt(status_id) : undefined, // Let Prisma use default if not provided
      instituteName: institute_name || null,
      courseTaken: course_taken || null,
      internshipStartDate: internship_start_date ? new Date(internship_start_date) : null,
      internshipEndDate: internship_end_date ? new Date(internship_end_date) : null,
      internshipDuration: internship_duration || null,
      referenceInformation: reference_information || null,
      internalFacultyName: internal_faculty_name || null,
      facultyContact: faculty_contact || null,
      facultyEmail: faculty_email || null,
      imageUrl: image_url || null,
    };

    // Create student
    const created = await prisma.student.create({
      data: studentData,
      include: {
        domain: true,
        status: true,
      },
    });

    // Log activity
    await logActivitySimple(
      req,
      'CREATE_STUDENT',
      'STUDENT',
      created.id,
      `Created student: ${created.fullName}`
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        id: created.id,
        email: created.email,
        full_name: created.fullName,
        phone: created.phone,
        domain: created.domain?.domainName || null,
        domain_id: created.domainId,
        status: created.status?.statusName || null,
        institute_name: created.instituteName,
        course_taken: created.courseTaken,
        registration_date: created.registrationDate,
      },
    });
  } catch (error) {
    console.error('Error creating student:', error);
    
    // Handle duplicate email error
    if (error.code === 'P2002' || error.message.includes('Unique constraint') || error.message.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update an existing student
 */
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      domain_id,
      status_id,
      institute_name,
      course_taken,
      area_of_interests, // Legacy support - will be converted to domain_id
      internship_start_date,
      internship_end_date,
      internship_duration,
      reference_information,
      internal_faculty_name,
      faculty_contact,
      faculty_email,
      image_url,
    } = req.body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // If email is being changed, check if new email already exists
    if (email && email.toLowerCase().trim() !== existingStudent.email) {
      const emailExists = await prisma.student.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another student',
        });
      }
    }

    // Handle domain_id: if area_of_interests is provided but domain_id is not, convert it
    let finalDomainId = domain_id !== undefined ? (domain_id === '' || domain_id === null ? null : parseInt(domain_id)) : undefined;
    if ((finalDomainId === undefined || finalDomainId === null) && area_of_interests && area_of_interests.trim()) {
      const Student = require('../models/Student');
      finalDomainId = await Student.getOrCreateDomain(area_of_interests.trim());
    }

    // Prepare update data
    const updateData = {};
    if (full_name !== undefined) updateData.fullName = full_name;
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone || null;
    if (finalDomainId !== undefined) {
      updateData.domainId = finalDomainId;
    }
    if (status_id !== undefined) updateData.statusId = parseInt(status_id);
    if (institute_name !== undefined) updateData.instituteName = institute_name || null;
    if (course_taken !== undefined) updateData.courseTaken = course_taken || null;
    if (internship_start_date !== undefined) updateData.internshipStartDate = internship_start_date ? new Date(internship_start_date) : null;
    if (internship_end_date !== undefined) updateData.internshipEndDate = internship_end_date ? new Date(internship_end_date) : null;
    if (internship_duration !== undefined) updateData.internshipDuration = internship_duration || null;
    if (reference_information !== undefined) updateData.referenceInformation = reference_information || null;
    if (internal_faculty_name !== undefined) updateData.internalFacultyName = internal_faculty_name || null;
    if (faculty_contact !== undefined) updateData.facultyContact = faculty_contact || null;
    if (faculty_email !== undefined) updateData.facultyEmail = faculty_email || null;
    if (image_url !== undefined) updateData.imageUrl = image_url || null;

    // Update student
    const updated = await prisma.student.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        domain: true,
        status: true,
      },
    });

    // Log activity
    await logActivitySimple(
      req,
      'UPDATE_STUDENT',
      'STUDENT',
      updated.id,
      `Updated student: ${updated.fullName}`
    );

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      student: {
        id: updated.id,
        email: updated.email,
        full_name: updated.fullName,
        phone: updated.phone,
        domain: updated.domain?.domainName || null,
        domain_id: updated.domainId,
        status: updated.status?.statusName || null,
        institute_name: updated.instituteName,
        course_taken: updated.courseTaken,
        registration_date: updated.registrationDate,
      },
    });
  } catch (error) {
    console.error('Error updating student:', error);
    
    // Handle duplicate email error
    if (error.code === 'P2002' || error.message.includes('Unique constraint') || error.message.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists for another student',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

