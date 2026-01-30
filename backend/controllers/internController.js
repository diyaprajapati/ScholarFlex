const multer = require('multer');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const { logActivitySimple } = require('../middleware/activityLogger');
const { prisma } = require('../config/database');

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
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

// Export multer middleware
exports.upload = upload.single('file');

/**
 * Parse spreadsheet file and extract intern data
 */
const parseSpreadsheet = (buffer, mimetype) => {
  try {
    let workbook;
    
    if (mimetype === 'text/csv' || mimetype === 'application/csv') {
      // Parse CSV
      const csvData = buffer.toString('utf8');
      workbook = XLSX.read(csvData, { type: 'string' });
    } else {
      // Parse Excel
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    return data;
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    throw new Error('Failed to parse spreadsheet file');
  }
};

/**
 * Map spreadsheet columns to student data
 */
const mapSpreadsheetToStudent = (row) => {
  // Map column names (case-insensitive and handle variations)
  const getValue = (row, possibleKeys) => {
    for (const key of possibleKeys) {
      const foundKey = Object.keys(row).find(
        k => k.toLowerCase().trim() === key.toLowerCase().trim()
      );
      if (foundKey && row[foundKey]) {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };

  const getDateValue = (row, possibleKeys) => {
    const value = getValue(row, possibleKeys);
    if (!value) return null;
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // If parsing fails, return null
    }
    return null;
  };

  // Extract values
  const firstName = getValue(row, ['First Name', 'FirstName', 'First Name', 'first name']);
  const middleName = getValue(row, ['Middle Name', 'MiddleName', 'Middle Name', 'middle name']);
  const lastName = getValue(row, ['Last Name', 'LastName', 'Last Name', 'last name']);
  
  // Combine name parts
  const nameParts = [firstName, middleName, lastName].filter(part => part);
  const fullName = nameParts.join(' ').trim();

  const email = getValue(row, ['Email', 'email', 'Email Id', 'Email ID', 'email id']);
  const phone = getValue(row, [
    'Mobile Number (WhatsApp)',
    'Mobile Number',
    'Phone',
    'WhatsApp',
    'mobile number',
    'phone',
    'whatsapp'
  ]);
  const areaOfInterest = getValue(row, [
    'Area of Interests',
    'Area of Interest',
    'Area Of Interest',
    'Area Of Interests',
    'Domain',
    'domain',
    'DOMAIN',
    'Area',
    'area',
    'Interest Area',
    'Interest',
    'Field',
    'field',
    'Specialization',
    'specialization'
  ]);
  const photograph = getValue(row, ['Photograph', 'photograph', 'Photo', 'photo', 'Image', 'image', 'image_url', 'Image URL']);
  const instituteName = getValue(row, ['Name of Institute', 'Institute Name', 'institute_name', 'instituteName', 'Institute']);
  const courseTaken = getValue(row, ['Course Taken', 'course_taken', 'courseTaken', 'Course']);
  const internshipStartDate = getDateValue(row, ['Internship Start Date', 'internship_start_date', 'internshipStartDate', 'Start Date']);
  const internshipEndDate = getDateValue(row, ['Internship End Date', 'internship_end_date', 'internshipEndDate', 'End Date']);
  const internshipDuration = getValue(row, ['Internship Duration', 'internship_duration', 'internshipDuration', 'Duration']);
  const referenceInformation = getValue(row, ['Reference Information', 'reference_information', 'referenceInformation', 'Reference']);
  const internalFacultyName = getValue(row, ['Internal Faculty of Institute', 'Internal Faculty', 'internal_faculty_name', 'internalFacultyName', 'Faculty Name']);
  const facultyContact = getValue(row, ['Faculty Contact', 'faculty_contact', 'facultyContact', 'Faculty Phone']);
  const facultyEmail = getValue(row, ['Faculty Email Id', 'Faculty Email', 'faculty_email', 'facultyEmail', 'Faculty Email ID']);

  // Convert Google Drive link to embeddable format
  const convertGoogleDriveLink = (url) => {
    if (!url || typeof url !== 'string') return null;
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : url;
  };
  const imageUrl = photograph ? convertGoogleDriveLink(photograph) : null;

  return {
    full_name: fullName,
    email: email,
    phone: phone || null,
    area_of_interest: areaOfInterest,
    image_url: imageUrl,
    institute_name: instituteName || null,
    course_taken: courseTaken || null,
    internship_start_date: internshipStartDate,
    internship_end_date: internshipEndDate,
    internship_duration: internshipDuration || null,
    reference_information: referenceInformation || null,
    internal_faculty_name: internalFacultyName || null,
    faculty_contact: facultyContact || null,
    faculty_email: facultyEmail || null,
  };
};

/**
 * Upload and process spreadsheet
 */
exports.uploadSpreadsheet = async (req, res) => {
  try {
    // Handle multer errors
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

    // Parse spreadsheet
    const rows = parseSpreadsheet(req.file.buffer, req.file.mimetype);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet is empty or could not be parsed.',
      });
    }

    // Debug: Log available columns (first row only, in development)
    if (process.env.NODE_ENV === 'development' && rows.length > 0 && rows[0] && typeof rows[0] === 'object') {
      try {
        // console.log('📋 Available columns in spreadsheet:', Object.keys(rows[0]));
      } catch (error) {
        // console.log('📋 Could not log spreadsheet columns:', error.message);
      }
    }

    // Map rows to student data
    const studentsData = [];
    const errors = [];
    const emailSet = new Set(); // Track emails within spreadsheet to detect duplicates

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = mapSpreadsheetToStudent(row);

      // Validate required fields
      if (!mapped.email) {
        errors.push({
          row: i + 2, // +2 because row 1 is header and arrays are 0-indexed
          reason: 'Email is required',
          data: mapped,
        });
        continue;
      }

      if (!mapped.full_name) {
        errors.push({
          row: i + 2,
          reason: 'Name is required (First Name, Middle Name, or Last Name)',
          data: mapped,
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(mapped.email)) {
        errors.push({
          row: i + 2,
          reason: 'Invalid email format',
          data: mapped,
        });
        continue;
      }

      // Check for duplicate emails within the spreadsheet (case-insensitive)
      const emailLower = mapped.email.toLowerCase();
      if (emailSet.has(emailLower)) {
        errors.push({
          row: i + 2,
          reason: 'Duplicate email in spreadsheet',
          data: mapped,
        });
        continue;
      }
      emailSet.add(emailLower);

      studentsData.push(mapped);
    }

    if (studentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No valid student data found in spreadsheet. ${errors.length > 0 ? `Found ${errors.length} error(s).` : ''}`,
        errors: errors,
        errorCount: errors.length,
      });
    }

    // Get or create domains and prepare data for bulk insert
    const preparedData = [];
    let domainsFound = 0;
    let domainsMissing = 0;
    
    for (const student of studentsData) {
      // Check if area_of_interest exists and is not empty
      const areaOfInterest = student.area_of_interest?.trim();
      const domainId = areaOfInterest && areaOfInterest.length > 0
        ? await Student.getOrCreateDomain(areaOfInterest)
        : null;

      if (domainId) {
        domainsFound++;
      } else {
        domainsMissing++;
      }

      preparedData.push({
        email: student.email,
        full_name: student.full_name,
        phone: student.phone,
        domain_id: domainId,
        image_url: student.image_url,
        institute_name: student.institute_name,
        course_taken: student.course_taken,
        area_of_interests: student.area_of_interest,
        internship_start_date: student.internship_start_date,
        internship_end_date: student.internship_end_date,
        internship_duration: student.internship_duration,
        reference_information: student.reference_information,
        internal_faculty_name: student.internal_faculty_name,
        faculty_contact: student.faculty_contact,
        faculty_email: student.faculty_email,
        created_by: req.user?.id || null,
      });
    }

    // Log domain statistics
    if (domainsMissing > 0) {
      // console.log(`⚠️  ${domainsMissing} students without domain. Make sure your spreadsheet has a "Domain" or "Area of Interest" column.`);
    }
    if (domainsFound > 0) {
      // console.log(`✅ ${domainsFound} students with domain assigned.`);
    }

    // Bulk insert students
    const results = await Student.createBulk(preparedData);

    // Log activity
    if (req.user && results.success.length > 0) {
      await logActivitySimple(
        req,
        'BULK_UPLOAD',
        'STUDENT',
        null,
        `Bulk uploaded ${results.success.length} students from spreadsheet`
      );
    }

    // Combine successful inserts with skipped duplicates
    const skipped = results.failed.filter(f => f.reason === 'Email already exists');
    const failed = results.failed.filter(f => f.reason !== 'Email already exists');

    // If all failed and it's a database issue, return appropriate error
    if (results.success.length === 0 && failed.length > 0) {
      const dbError = failed.find(f => f.reason.includes('status') || f.reason.includes('constraint'));
      if (dbError) {
        return res.status(500).json({
          success: false,
          message: dbError.reason || 'Database configuration error. Please ensure the database is properly seeded.',
          data: {
            total: rows.length,
            successful: 0,
            skipped: skipped.length,
            failed: failed.length + errors.length,
            details: {
              successful: [],
              skipped: skipped,
              failed: [...failed, ...errors],
            },
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed ${results.success.length} students`,
      data: {
        total: rows.length,
        successful: results.success.length,
        skipped: skipped.length,
        failed: failed.length + errors.length,
        details: {
          successful: results.success,
          skipped: skipped,
          failed: [...failed, ...errors],
        },
      },
    });
  } catch (error) {
    console.error('Error uploading spreadsheet:', error);
    
    // Check if it's a database seeding issue
    if (error.message && error.message.includes('status')) {
      return res.status(500).json({
        success: false,
        message: 'Database not properly configured. Please run: npm run db:seed',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all interns/students
 */
exports.getAllInterns = async (req, res) => {
  try {
    const filters = {
      domain_id: req.query.domain_id ? parseInt(req.query.domain_id) : null,
      status_id: req.query.status_id ? parseInt(req.query.status_id) : null,
      limit: req.query.limit ? parseInt(req.query.limit) : null,
      offset: req.query.offset ? parseInt(req.query.offset) : null,
    };

    const students = await Student.getAll(filters);

    // Format response to show only Name, Email, Domain
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.full_name,
      email: student.email,
      domain: student.domain_name || 'N/A',
      status: student.status_name,
      registration_date: student.registration_date,
    }));

    res.status(200).json({
      success: true,
      data: formattedStudents,
      count: formattedStudents.length,
    });
  } catch (error) {
    console.error('Error getting all interns:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get intern by ID
 */
exports.getInternById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found',
      });
    }

    // Format response
    const formattedStudent = {
      id: student.id,
      name: student.full_name,
      email: student.email,
      domain: student.domain_name || 'N/A',
      domain_id: student.domain_id,
      phone: student.phone,
      status: student.status_name,
      status_id: student.status_id,
      registration_date: student.registration_date,
    };

    res.status(200).json({
      success: true,
      data: formattedStudent,
    });
  } catch (error) {
    console.error('Error getting intern by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update intern
 */
exports.updateIntern = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, domain_id, domain_name, status_id, status_name } = req.body;

    // Check if intern exists
    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found',
      });
    }

    // Prepare update data
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    // Handle domain - accept either domain_id or domain_name
    if (domain_id !== undefined) {
      updateData.domain_id = domain_id;
    } else if (domain_name !== undefined) {
      // Get or create domain by name
      const resolvedDomainId = await Student.getOrCreateDomain(domain_name);
      updateData.domain_id = resolvedDomainId;
    }
    
    // Handle status - accept either status_id or status_name
    if (status_id !== undefined) {
      updateData.status_id = status_id;
    } else if (status_name !== undefined) {
      // Get status_id from status_name
      const status = await prisma.internStatus.findFirst({
        where: {
          statusName: status_name,
          isActive: true,
        },
        select: {
          id: true,
        },
      });
      if (status) {
        updateData.status_id = status.id;
      }
    }

    // Update student
    const updatedStudent = await Student.update(id, updateData);

    // Log activity
    if (req.user) {
      await logActivitySimple(
        req,
        'UPDATE',
        'STUDENT',
        id,
        `Updated intern: ${updatedStudent.full_name}`
      );
    }

    // Format response
    const formattedStudent = {
      id: updatedStudent.id,
      name: updatedStudent.full_name,
      email: updatedStudent.email,
      domain: updatedStudent.domain_name || 'N/A',
      phone: updatedStudent.phone,
      status: updatedStudent.status_name,
      registration_date: updatedStudent.registration_date,
    };

    res.status(200).json({
      success: true,
      message: 'Intern updated successfully',
      data: formattedStudent,
    });
  } catch (error) {
    console.error('Error updating intern:', error);
    
    // Handle duplicate email error
    if (error.code === 'DUPLICATE_EMAIL' || error.code === '23505' || error.message.includes('duplicate') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Email already exists for another intern',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete intern
 */
exports.deleteIntern = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if intern exists
    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found',
      });
    }

    // Delete student (hard delete - permanently removes from database)
    const deleted = await Student.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found or already deleted',
      });
    }

    // Log activity
    if (req.user) {
      await logActivitySimple(
        req,
        'DELETE',
        'STUDENT',
        id,
        `Deleted intern: ${existingStudent.full_name}`
      );
    }

    res.status(200).json({
      success: true,
      message: 'Intern deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting intern:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

