const express = require('express');
const { body } = require('express-validator');
const activityLogController = require('../controllers/activityLogController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/activity/log
 * @desc    Save student activity log (This is the most important endpoint!)
 * @access  Private (Student)
 */
router.post(
  '/log',
  authorize('STUDENT'),
  [
    body('activity_type')
      .trim()
      .notEmpty()
      .withMessage('Activity type is required')
      .isLength({ max: 100 })
      .withMessage('Activity type must be less than 100 characters'),
    body('metadata')
      .optional()
      .custom((value) => {
        // Allow null, undefined, or valid JSON object
        if (value === null || value === undefined) {
          return true;
        }
        // If it's already an object, it's fine
        if (typeof value === 'object') {
          return true;
        }
        // Try to parse if it's a string
        try {
          JSON.parse(value);
          return true;
        } catch (e) {
          return false;
        }
      })
      .withMessage('Metadata must be a valid JSON object'),
  ],
  activityLogController.saveActivityLog
);

/**
 * @route   GET /api/activity/videos/recent
 * @desc    Get last 5 video activity logs for continue watching (Student)
 * @access  Private (Student)
 */
router.get(
  '/videos/recent',
  authorize('STUDENT'),
  activityLogController.getRecentVideoActivities
);

/**
 * @route   GET /api/activity/video/progress
 * @desc    Get latest video progress for a specific video (Student)
 * @access  Private (Student)
 */
router.get(
  '/video/progress',
  authorize('STUDENT'),
  activityLogController.getVideoProgress
);

/**
 * @route   GET /api/activity/summary
 * @desc    Get comprehensive activity summary for student (Student)
 * @access  Private (Student)
 */
router.get(
  '/summary',
  authorize('STUDENT'),
  activityLogController.getActivitySummary
);

module.exports = router;

