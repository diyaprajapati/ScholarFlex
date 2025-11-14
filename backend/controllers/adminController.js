const { validationResult } = require('express-validator');
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

    // Get role_id based on role_code (ADMIN only, not SUPER_ADMIN)
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE role_code = $1",
      [role_code === 'SUPER_ADMIN' ? 'ADMIN' : role_code]
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
      message: 'Internal server error',
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
    const { full_name, is_active } = req.body;

    // Check if admin exists
    const admin = await User.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Don't allow updating super admin
    if (admin.role_code === 'SUPER_ADMIN' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update super admin account',
      });
    }

    // Update admin
    const updatedAdmin = await User.update(id, { full_name, is_active });

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

    // Don't allow deleting super admin
    if (admin.role_code === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin account',
      });
    }

    // Don't allow deleting yourself
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

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};

