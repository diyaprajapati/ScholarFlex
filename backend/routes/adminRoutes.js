const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and super admin role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Validation rules
const emailValidation = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail();

const fullNameValidation = body('full_name')
  .trim()
  .isLength({ min: 2, max: 255 })
  .withMessage('Full name must be between 2 and 255 characters');

const roleCodeValidation = body('role_code')
  .isIn(['ADMIN', 'SUPER_ADMIN'])
  .withMessage('Role code must be ADMIN or SUPER_ADMIN');

/**
 * @route   POST /api/admin/create
 * @desc    Create a new admin (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post(
  '/create',
  [emailValidation, fullNameValidation, roleCodeValidation],
  adminController.createAdmin
);

/**
 * @route   GET /api/admin/all
 * @desc    Get all admins (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get('/all', adminController.getAllAdmins);

/**
 * @route   GET /api/admin/:id
 * @desc    Get admin by ID (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get('/:id', adminController.getAdminById);

/**
 * @route   PUT /api/admin/:id
 * @desc    Update admin (Super Admin only)
 * @access  Private (Super Admin)
 */
router.put(
  '/:id',
  [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Full name must be between 2 and 255 characters'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    body('role_code')
      .optional()
      .isIn(['ADMIN', 'SUPER_ADMIN'])
      .withMessage('Role code must be ADMIN or SUPER_ADMIN'),
  ],
  adminController.updateAdmin
);

/**
 * @route   DELETE /api/admin/:id
 * @desc    Delete admin (Super Admin only) - Soft delete
 * @access  Private (Super Admin)
 */
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;

