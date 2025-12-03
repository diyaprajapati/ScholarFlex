const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes that require super admin only
const superAdminRouter = express.Router();
superAdminRouter.use(authorize('SUPER_ADMIN'));

// Routes that require admin or super admin
const adminRouter = express.Router();
adminRouter.use(authorize('ADMIN', 'SUPER_ADMIN'));

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

// Super Admin only routes
/**
 * @route   POST /api/admin/create
 * @desc    Create a new admin (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.post(
  '/create',
  [emailValidation, fullNameValidation, roleCodeValidation],
  adminController.createAdmin
);

/**
 * @route   GET /api/admin/all
 * @desc    Get all admins (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.get('/all', adminController.getAllAdmins);

/**
 * @route   GET /api/admin/:id
 * @desc    Get admin by ID (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.get('/:id', adminController.getAdminById);

/**
 * @route   PUT /api/admin/:id
 * @desc    Update admin (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.put(
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
superAdminRouter.delete('/:id', adminController.deleteAdmin);

// Admin/Super Admin routes for retake permissions
/**
 * @route   POST /api/admin/retake-permissions/grant
 * @desc    Grant retake permission to a student (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/retake-permissions/grant',
  [
    body('student_id')
      .isInt()
      .withMessage('Student ID must be a valid integer'),
    body('question_paper_id')
      .isInt()
      .withMessage('Question Paper ID must be a valid integer'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
  ],
  adminController.grantRetakePermission
);

/**
 * @route   POST /api/admin/retake-permissions/grant-by-domain
 * @desc    Grant retake permission to a student for all tests in a domain (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/retake-permissions/grant-by-domain',
  [
    body('student_id')
      .isInt()
      .withMessage('Student ID must be a valid integer'),
    body('domain_id')
      .isInt()
      .withMessage('Domain ID must be a valid integer'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Reason must be less than 500 characters'),
  ],
  adminController.grantRetakePermissionByDomain
);

/**
 * @route   POST /api/admin/retake-permissions/revoke
 * @desc    Revoke retake permission from a student (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/retake-permissions/revoke',
  [
    body('student_id')
      .isInt()
      .withMessage('Student ID must be a valid integer'),
    body('question_paper_id')
      .isInt()
      .withMessage('Question Paper ID must be a valid integer'),
  ],
  adminController.revokeRetakePermission
);

/**
 * @route   GET /api/admin/retake-permissions
 * @desc    Get all retake permissions (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/retake-permissions', adminController.getRetakePermissions);

// Mount routers
router.use('/', superAdminRouter);
router.use('/', adminRouter);

module.exports = router;

