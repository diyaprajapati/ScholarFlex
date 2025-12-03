const { validationResult } = require('express-validator');
const pool = require('../config/database');
const User = require('../models/User');
const { logActivitySimple } = require('../middleware/activityLogger');

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
 * Grant retake permission to a student for a test (Admin/Super Admin only)
 */
const grantRetakePermission = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { student_id, question_paper_id, reason } = req.body;

    // Verify student exists
    const studentResult = await pool.query(
      'SELECT id, email, full_name FROM students WHERE id = $1 AND is_active = TRUE',
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify question paper exists
    const paperResult = await pool.query(
      'SELECT id, paper_name FROM question_papers WHERE id = $1 AND is_active = TRUE',
      [question_paper_id]
    );

    if (paperResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    // Check if permission already exists
    const existingPermission = await pool.query(
      `SELECT id, is_active FROM test_retake_permissions 
       WHERE student_id = $1 AND question_paper_id = $2`,
      [student_id, question_paper_id]
    );

    if (existingPermission.rows.length > 0) {
      const permission = existingPermission.rows[0];
      
      // If permission exists but is inactive, reactivate it
      if (!permission.is_active) {
        await pool.query(
          `UPDATE test_retake_permissions 
           SET is_active = TRUE, reason = $1, granted_by = $2, updated_at = NOW()
           WHERE id = $3`,
          [reason || null, req.user.id, permission.id]
        );

        await logActivitySimple(
          req,
          'GRANT_RETAKE_PERMISSION',
          'USER',
          permission.id,
          `${req.user.email} granted retake permission to student ${studentResult.rows[0].email} for test ${paperResult.rows[0].paper_name}`
        );

        return res.status(200).json({
          success: true,
          message: 'Retake permission granted successfully',
          permission: {
            id: permission.id,
            student_id,
            question_paper_id,
            is_active: true,
          },
        });
      } else {
        return res.status(409).json({
          success: false,
          message: 'Retake permission already exists and is active',
        });
      }
    }

    // Create new permission
    const result = await pool.query(
      `INSERT INTO test_retake_permissions 
       (student_id, question_paper_id, granted_by, reason, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       RETURNING id, student_id, question_paper_id, is_active, created_at`,
      [student_id, question_paper_id, req.user.id, reason || null]
    );

    await logActivitySimple(
      req,
      'GRANT_RETAKE_PERMISSION',
      'USER',
      result.rows[0].id,
      `${req.user.email} granted retake permission to student ${studentResult.rows[0].email} for test ${paperResult.rows[0].paper_name}`
    );

    res.status(201).json({
      success: true,
      message: 'Retake permission granted successfully',
      permission: result.rows[0],
    });
  } catch (error) {
    console.error('Error in grantRetakePermission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Grant retake permission to a student for all tests in a domain (Admin/Super Admin only)
 */
const grantRetakePermissionByDomain = async (req, res) => {
  try {
    const { student_id, domain_id, reason } = req.body;

    if (!student_id || !domain_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Domain ID are required',
      });
    }

    // Verify student exists
    const studentResult = await pool.query(
      'SELECT id, email, full_name FROM students WHERE id = $1 AND is_active = TRUE',
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Verify domain exists
    const domainResult = await pool.query(
      'SELECT id, domain_name FROM domains WHERE id = $1 AND is_active = TRUE',
      [domain_id]
    );

    if (domainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found',
      });
    }

    // Get all published question papers for this domain
    const papersResult = await pool.query(
      `SELECT DISTINCT qp.id, qp.paper_name
       FROM question_papers qp
       INNER JOIN question_paper_domains qpd ON qp.id = qpd.question_paper_id
       WHERE qpd.domain_id = $1
         AND qp.status = 'published'
         AND qp.is_active = TRUE`,
      [domain_id]
    );

    if (papersResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No published tests found for this domain',
      });
    }

    const grantedPermissions = [];
    const skippedPermissions = [];

    // Grant permission for each test
    for (const paper of papersResult.rows) {
      // Check if permission already exists
      const existingPermission = await pool.query(
        `SELECT id, is_active FROM test_retake_permissions 
         WHERE student_id = $1 AND question_paper_id = $2`,
        [student_id, paper.id]
      );

      if (existingPermission.rows.length > 0) {
        const permission = existingPermission.rows[0];
        
        if (!permission.is_active) {
          // Reactivate existing permission
          await pool.query(
            `UPDATE test_retake_permissions 
             SET is_active = TRUE, reason = $1, granted_by = $2, updated_at = NOW()
             WHERE id = $3`,
            [reason || null, req.user.id, permission.id]
          );
          grantedPermissions.push({ id: permission.id, paper_name: paper.paper_name });
        } else {
          skippedPermissions.push({ paper_name: paper.paper_name, reason: 'Already active' });
        }
      } else {
        // Create new permission
        const result = await pool.query(
          `INSERT INTO test_retake_permissions 
           (student_id, question_paper_id, granted_by, reason, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
           RETURNING id`,
          [student_id, paper.id, req.user.id, reason || null]
        );
        grantedPermissions.push({ id: result.rows[0].id, paper_name: paper.paper_name });
      }
    }

    await logActivitySimple(
      req,
      'GRANT_RETAKE_PERMISSION_DOMAIN',
      'USER',
      null,
      `${req.user.email} granted retake permissions to student ${studentResult.rows[0].email} for all tests in domain ${domainResult.rows[0].domain_name}`
    );

    res.status(200).json({
      success: true,
      message: `Retake permissions granted for ${grantedPermissions.length} test(s)`,
      granted: grantedPermissions,
      skipped: skippedPermissions,
      total: papersResult.rows.length,
    });
  } catch (error) {
    console.error('Error in grantRetakePermissionByDomain:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Revoke retake permission from a student for a test (Admin/Super Admin only)
 */
const revokeRetakePermission = async (req, res) => {
  try {
    const { student_id, question_paper_id } = req.body;

    if (!student_id || !question_paper_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Question Paper ID are required',
      });
    }

    // Check if permission exists
    const permissionResult = await pool.query(
      `SELECT trp.id, trp.is_active, s.email as student_email, qp.paper_name
       FROM test_retake_permissions trp
       JOIN students s ON s.id = trp.student_id
       JOIN question_papers qp ON qp.id = trp.question_paper_id
       WHERE trp.student_id = $1 AND trp.question_paper_id = $2`,
      [student_id, question_paper_id]
    );

    if (permissionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Retake permission not found',
      });
    }

    const permission = permissionResult.rows[0];

    if (!permission.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Retake permission is already revoked',
      });
    }

    // Revoke permission (soft delete)
    await pool.query(
      `UPDATE test_retake_permissions 
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1`,
      [permission.id]
    );

    await logActivitySimple(
      req,
      'REVOKE_RETAKE_PERMISSION',
      'USER',
      permission.id,
      `${req.user.email} revoked retake permission from student ${permission.student_email} for test ${permission.paper_name}`
    );

    res.status(200).json({
      success: true,
      message: 'Retake permission revoked successfully',
    });
  } catch (error) {
    console.error('Error in revokeRetakePermission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all retake permissions (Admin/Super Admin only)
 */
const getRetakePermissions = async (req, res) => {
  try {
    const { student_id, question_paper_id, is_active } = req.query;

    let query = `
      SELECT 
        trp.id,
        trp.student_id,
        trp.question_paper_id,
        trp.reason,
        trp.is_active,
        trp.created_at,
        trp.updated_at,
        s.email as student_email,
        s.full_name as student_name,
        qp.paper_name,
        u.email as granted_by_email,
        u.full_name as granted_by_name
      FROM test_retake_permissions trp
      LEFT JOIN students s ON s.id = trp.student_id
      LEFT JOIN question_papers qp ON qp.id = trp.question_paper_id
      LEFT JOIN users u ON u.id = trp.granted_by
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (student_id && student_id !== '' && !isNaN(student_id)) {
      paramCount++;
      query += ` AND trp.student_id = $${paramCount}`;
      params.push(parseInt(student_id));
    }

    if (question_paper_id && question_paper_id !== '' && !isNaN(question_paper_id)) {
      paramCount++;
      query += ` AND trp.question_paper_id = $${paramCount}`;
      params.push(parseInt(question_paper_id));
    }

    if (is_active !== undefined && is_active !== '') {
      paramCount++;
      query += ` AND trp.is_active = $${paramCount}`;
      const isActiveValue = is_active === 'true' || is_active === true || is_active === '1';
      params.push(isActiveValue);
    }

    query += ` ORDER BY trp.created_at DESC`;

    const result = await pool.query(query, params);

    await logActivitySimple(
      req,
      'VIEW_RETAKE_PERMISSIONS',
      'USER',
      null,
      `${req.user.email} viewed retake permissions`
    );

    res.status(200).json({
      success: true,
      permissions: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error in getRetakePermissions:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      query: error.query,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      } : undefined,
    });
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  grantRetakePermission,
  grantRetakePermissionByDomain,
  revokeRetakePermission,
  getRetakePermissions,
};

