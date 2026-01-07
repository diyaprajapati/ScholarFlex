const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const timeTrackingController = require('../controllers/timeTrackingController');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

/**
 * @route   GET /api/admin/time-tracking/students
 * @desc    Get all students' working hours
 * @access  Private (Admin)
 */
router.get('/students', timeTrackingController.getAllStudentsWorkingHours);

/**
 * @route   GET /api/admin/time-tracking/students/day-wise
 * @desc    Get day-wise time tracking for all students
 * @access  Private (Admin)
 */
router.get('/students/day-wise', timeTrackingController.getDayWiseStudentsWorkingHours);

module.exports = router;

