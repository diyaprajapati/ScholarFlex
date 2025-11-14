const express = require('express');
const logController = require('../controllers/logController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin/super admin role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN'));

/**
 * @route   GET /api/logs
 * @desc    Get activity logs with filters
 * @access  Private (Super Admin, Admin)
 * @note    Super Admin can see all logs, Admin can only see admin logs
 */
router.get('/', logController.getLogs);

/**
 * @route   GET /api/logs/stats
 * @desc    Get log statistics
 * @access  Private (Super Admin, Admin)
 */
router.get('/stats', logController.getLogStats);

/**
 * @route   GET /api/logs/:id
 * @desc    Get log by ID
 * @access  Private (Super Admin, Admin)
 * @note    Admin cannot view super admin logs
 */
router.get('/:id', logController.getLogById);

module.exports = router;

