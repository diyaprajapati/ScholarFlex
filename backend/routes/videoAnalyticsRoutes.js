const express = require('express');
const videoAnalyticsController = require('../controllers/videoAnalyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/video-analytics/student
 * @desc    Get student's own video analytics
 * @access  Private (Student)
 */
router.get(
  '/student',
  authorize('STUDENT'),
  videoAnalyticsController.getStudentVideoAnalytics
);

/**
 * @route   GET /api/video-analytics/admin
 * @desc    Get admin analytics for all students
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin',
  authorize('ADMIN', 'SUPER_ADMIN'),
  videoAnalyticsController.getAdminVideoAnalytics
);

/**
 * @route   GET /api/video-analytics/admin/student/:studentId
 * @desc    Get detailed analytics for a specific student
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/student/:studentId',
  authorize('ADMIN', 'SUPER_ADMIN'),
  videoAnalyticsController.getStudentDetailedAnalytics
);

module.exports = router;

