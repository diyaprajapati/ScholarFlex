const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const pool = require('../config/database');
const User = require('../models/User');
const { logActivitySimple } = require('../middleware/activityLogger');

/**
 * Parse spreadsheet file (Excel/CSV) into JSON rows
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

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON using header row
    return XLSX.utils.sheet_to_json(worksheet, { raw: false });
  } catch (error) {
    console.error('Error parsing candidate spreadsheet:', error);
    throw new Error('Failed to parse spreadsheet file');
  }
};

/**
 * Extract Google Drive image view URL from shared link
 * Example input: https://drive.google.com/open?id=FILE_ID
 * Output: https://drive.google.com/uc?export=view&id=FILE_ID
 */
const getDriveViewUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    if (url.includes('drive.google.com')) {
      // Try query param ?id=
      const hasIdParam = url.includes('id=');
      if (hasIdParam) {
        const [, idPart] = url.split('id=');
        const id = idPart.split('&')[0].trim();
        if (id) {
          return `https://drive.google.com/uc?export=view&id=${id}`;
        }
      }

      // Fallback for /d/<id>/ style URLs
      const match = url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
  } catch (e) {
    // Ignore parsing errors and fall through
  }

  return url;
};

/**
 * Normalize a checkbox-like value to boolean
 */
const parseCheckboxValue = (value) => {
  if (value === undefined || value === null) return false;
  const v = String(value).trim().toLowerCase();
  if (!v) return false;
  const truthy = ['yes', 'y', 'true', '1', 'checked', 'selected'];
  return truthy.includes(v);
};

/**
 * Map a spreadsheet row to a candidate object
 * Expected data points:
 *  - imageUrl: drive link or image URL (e.g. from "Photograph" column)
 *  - name: full name (from a combined Name column or First/Middle/Last)
 *  - checkboxSelected: boolean (from a checkbox/selection column)
 *  - mobile: mobile number
 *  - marks: numeric or string marks/score column
 *  - referenceName: reference / referrer name
 */
const mapRowToCandidate = (row, index) => {
  const get = (keys) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  // Name: try combined or first/middle/last
  const firstName = get(['First Name', 'FirstName', 'Given Name', 'GivenName']);
  const middleName = get(['Middle Name', 'MiddleName']);
  const lastName = get(['Last Name', 'LastName', 'Surname']);
  const fullNameFromParts = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  const name =
    get(['Name', 'Full Name', 'FullName', 'Candidate Name', 'Student Name']) ||
    fullNameFromParts;

  // Mobile
  const mobile = get([
    'Mobile Number',
    'Mobile Number (WhatsApp)',
    'Mobile',
    'Phone',
    'Contact Number',
  ]);

  // Marks / score
  const marks = get(['Marks', 'Score', 'Total Marks', 'Test Marks']);

  // Reference name
  const referenceName = get([
    'Reference Name',
    'Reference',
    'Reference Information',
    'Referrer',
  ]);

  // Checkbox / selection
  const checkboxRaw =
    row['Checkbox'] ||
    row['Selected'] ||
    row['Is Selected'] ||
    row['Selection'] ||
    row['Shortlisted'] ||
    row['Approved'];
  const checkboxSelected = parseCheckboxValue(checkboxRaw);

  // Image URL (Drive link or other)
  const rawImageUrl =
    get(['Photograph', 'Photo', 'Image', 'Image URL', 'Photo URL', 'Profile Picture']) || '';
  const imageUrl = rawImageUrl || null;
  const imageViewUrl = imageUrl ? getDriveViewUrl(imageUrl) : null;

  // If we have absolutely nothing meaningful, skip this row
  if (!name && !mobile && !marks && !referenceName && !imageUrl) {
    return null;
  }

  return {
    rowIndex: index + 2, // +2 to account for header + 1-based index
    name: name || null,
    mobile: mobile || null,
    marks: marks || null,
    referenceName: referenceName || null,
    checkboxSelected,
    imageUrl,
    imageViewUrl,
  };
};

/**
 * Create a new admin (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, full_name, role_code } = req.body;

    // Check if user already exists
    const userExists = await User.exists(email);
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Get role_id based on role_code (ADMIN or SUPER_ADMIN)
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE role_code = $1",
      [role_code]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role code',
      });
    }

    const role_id = roleResult.rows[0].id;

    // Create admin user
    const newAdmin = await User.create({
      email,
      full_name,
      role_id,
      created_by: req.user.id,
    });

    // Log the activity
    await logActivitySimple(
      req,
      'CREATE_ADMIN',
      'USER',
      newAdmin.id,
      `${req.user.email} created new admin: ${email}`
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        role: newAdmin.role_code,
        role_name: newAdmin.role_name,
      },
    });
  } catch (error) {
    console.error('Error in createAdmin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.getAllAdmins();

    // Log the activity
    await logActivitySimple(req, 'VIEW_ADMINS', 'USER', null, `${req.user.email} viewed all admins`);

    res.status(200).json({
      success: true,
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role_code,
        role_name: admin.role_name,
        is_active: admin.is_active,
        last_login_at: admin.last_login_at,
        created_at: admin.created_at,
      })),
    });
  } catch (error) {
    console.error('Error in getAllAdmins:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get admin by ID (Super Admin only)
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.getAdminById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Log the activity
    await logActivitySimple(
      req,
      'VIEW_ADMIN',
      'USER',
      id,
      `${req.user.email} viewed admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role_code,
        role_name: admin.role_name,
        is_active: admin.is_active,
        last_login_at: admin.last_login_at,
        created_at: admin.created_at,
      },
    });
  } catch (error) {
    console.error('Error in getAdminById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update admin (Super Admin only)
 */
const updateAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { full_name, is_active, role_code } = req.body;

    // Check if admin exists
    const admin = await User.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Allow super admin to update any admin (including other super admins)
    // Only prevent updating yourself to avoid accidental self-deactivation or role change
    if (parseInt(id) === req.user.id) {
      if (is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
      }
      if (role_code && role_code !== admin.role_code) {
        return res.status(403).json({
          success: false,
          message: 'Cannot change your own role',
        });
      }
    }

    // Prepare update data
    const updateData = { full_name, is_active };
    
    // If role_code is provided, get role_id
    if (role_code) {
      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE role_code = $1",
        [role_code]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role code',
        });
      }
      
      updateData.role_id = roleResult.rows[0].id;
    }

    // Update admin
    const updatedAdmin = await User.update(id, updateData);

    // Log the activity
    await logActivitySimple(
      req,
      'UPDATE_ADMIN',
      'USER',
      id,
      `${req.user.email} updated admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        full_name: updatedAdmin.full_name,
        role: updatedAdmin.role_code,
        role_name: updatedAdmin.role_name,
        is_active: updatedAdmin.is_active,
      },
    });
  } catch (error) {
    console.error('Error in updateAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete admin (Super Admin only) - Soft delete
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const admin = await User.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Allow super admin to delete any admin (including other super admins)
    // Only prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Soft delete admin
    await User.delete(id);

    // Log the activity
    await logActivitySimple(
      req,
      'DELETE_ADMIN',
      'USER',
      id,
      `${req.user.email} deleted admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Upload candidate spreadsheet and extract candidate details
 * Does NOT create users; only parses and returns structured data
 */
const uploadCandidatesSpreadsheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an Excel or CSV file.',
      });
    }

    const { buffer, mimetype, originalname } = req.file;

    const rows = parseSpreadsheet(buffer, mimetype);
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or has no readable rows.',
      });
    }

    const candidates = [];
    const failed = [];

    rows.forEach((row, index) => {
      try {
        const candidate = mapRowToCandidate(row, index);
        if (candidate) {
          candidates.push(candidate);
        } else {
          failed.push({
            row: index + 2, // header is row 1
            reason: 'Row does not contain enough candidate information',
            data: row,
          });
        }
      } catch (err) {
        console.error(`Error parsing candidate row ${index + 2}:`, err);
        failed.push({
          row: index + 2,
          reason: err.message || 'Failed to parse row',
          data: row,
        });
      }
    });

    // Log activity (no entity id, just a bulk parse)
    await logActivitySimple(
      req,
      'UPLOAD_CANDIDATE_SPREADSHEET',
      'CANDIDATE_IMPORT',
      null,
      `${req.user.email} uploaded candidate spreadsheet "${originalname}" with ${candidates.length} parsed candidates`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully parsed ${candidates.length} candidate(s) from spreadsheet`,
      data: {
        candidates,
        failed,
        totalRows: rows.length,
      },
    });
  } catch (error) {
    console.error('Error in uploadCandidatesSpreadsheet:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process candidate spreadsheet',
    });
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  uploadCandidatesSpreadsheet,
};

