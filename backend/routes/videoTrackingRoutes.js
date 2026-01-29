const express = require('express');
const { body, param, query } = require('express-validator');
const videoTrackingController = require('../controllers/videoTrackingController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/video-tracking/open
 * @desc    Track when a video is opened
 * @access  Private (Student)
 */
router.post(
  '/open',
  authorize('STUDENT'),
  [
    body('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    body('playlistId')
      .optional()
      .isInt()
      .withMessage('Playlist ID must be an integer'),
  ],
  videoTrackingController.trackVideoOpened
);

/**
 * @route   POST /api/video-tracking/start
 * @desc    Track when a video starts playing
 * @access  Private (Student)
 */
router.post(
  '/start',
  authorize('STUDENT'),
  [
    body('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    body('playlistId')
      .isInt()
      .withMessage('Playlist ID must be an integer'),
  ],
  videoTrackingController.trackVideoStarted
);

/**
 * @route   POST /api/video-tracking/progress
 * @desc    Track video progress (watch time, position)
 * @access  Private (Student)
 */
router.post(
  '/progress',
  authorize('STUDENT'),
  [
    body('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    body('playlistId')
      .optional()
      .isInt()
      .withMessage('Playlist ID must be an integer'),
    body('watchTimeSeconds')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Watch time must be a non-negative integer'),
    body('progressPercent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Progress percent must be between 0 and 100'),
    body('lastPosition')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Last position must be a non-negative number'),
  ],
  videoTrackingController.trackVideoProgress
);

/**
 * @route   POST /api/video-tracking/complete
 * @desc    Track when a video is completed
 * @access  Private (Student)
 */
router.post(
  '/complete',
  authorize('STUDENT'),
  [
    body('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    body('playlistId')
      .optional()
      .isInt()
      .withMessage('Playlist ID must be an integer'),
    body('watchTimeSeconds')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Watch time must be a non-negative integer'),
  ],
  videoTrackingController.trackVideoCompleted
);

/**
 * @route   POST /api/video-tracking/complete/:videoId
 * @desc    Mark video as completed (remove from continue watching)
 * @access  Private (Student)
 */
router.post(
  '/complete/:videoId',
  authorize('STUDENT'),
  [
    param('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    query('skipNextVideo')
      .optional()
      .isIn(['true', 'false', '1', '0'])
      .withMessage('skipNextVideo must be true or false'),
  ],
  videoTrackingController.markVideoAsCompleted
);

/**
 * @route   GET /api/video-tracking/progress/:videoId
 * @desc    Get video progress for a specific video
 * @access  Private (Student)
 */
router.get(
  '/progress/:videoId',
  authorize('STUDENT'),
  videoTrackingController.getVideoProgress
);

module.exports = router;

