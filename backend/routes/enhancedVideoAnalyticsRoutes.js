const express = require('express');
const enhancedVideoAnalyticsController = require('../controllers/enhancedVideoAnalyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/video-analytics/student/detailed
 * @desc    Get detailed student video analytics
 * @access  Private (Student)
 */
router.get(
  '/student/detailed',
  authorize('STUDENT'),
  enhancedVideoAnalyticsController.getStudentDetailedAnalytics
);

/**
 * @route   GET /api/video-analytics/admin/detailed
 * @desc    Get detailed admin video analytics with drop-off analysis
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/detailed',
  authorize('ADMIN', 'SUPER_ADMIN'),
  enhancedVideoAnalyticsController.getAdminDetailedAnalytics
);

/**
 * @route   GET /api/video-analytics/admin/video/:videoId
 * @desc    Get detailed analytics for a specific video
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/video/:videoId',
  authorize('ADMIN', 'SUPER_ADMIN'),
  enhancedVideoAnalyticsController.getVideoAnalytics
);

module.exports = router;

