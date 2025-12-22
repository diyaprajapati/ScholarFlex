const express = require('express');
const { body } = require('express-validator');
const enhancedVideoTrackingController = require('../controllers/enhancedVideoTrackingController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/video-tracking/playlist-opened
 * @desc    Track when a playlist is opened
 * @access  Private (Student)
 */
router.post(
  '/playlist-opened',
  authorize('STUDENT'),
  [
    body('playlistId')
      .isInt()
      .withMessage('Playlist ID must be an integer'),
  ],
  enhancedVideoTrackingController.trackPlaylistOpened
);

/**
 * @route   POST /api/video-tracking/session/start
 * @desc    Start a new video viewing session
 * @access  Private (Student)
 */
router.post(
  '/session/start',
  authorize('STUDENT'),
  [
    body('videoId')
      .isInt()
      .withMessage('Video ID must be an integer'),
    body('playlistId')
      .isInt()
      .withMessage('Playlist ID must be an integer'),
  ],
  enhancedVideoTrackingController.startSession
);

/**
 * @route   POST /api/video-tracking/session/event
 * @desc    Track an event within a session
 * @access  Private (Student)
 */
router.post(
  '/session/event',
  authorize('STUDENT'),
  [
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required'),
    body('eventType')
      .isIn(['PLAY', 'PAUSE', 'RESUME', 'SEEK', 'PROGRESS', 'COMPLETE', 'EXIT', 'TAB_HIDDEN', 'TAB_VISIBLE'])
      .withMessage('Invalid event type'),
    body('videoPosition')
      .isFloat({ min: 0 })
      .withMessage('Video position must be a non-negative number'),
    body('progressPercent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Progress percent must be between 0 and 100'),
    body('playbackRate')
      .optional()
      .isFloat({ min: 0.25, max: 4 })
      .withMessage('Playback rate must be between 0.25 and 4'),
  ],
  enhancedVideoTrackingController.trackEvent
);

/**
 * @route   POST /api/video-tracking/session/end
 * @desc    End a video viewing session
 * @access  Private (Student)
 */
router.post(
  '/session/end',
  authorize('STUDENT'),
  [
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required'),
    body('exitReason')
      .optional()
      .isIn(['completed', 'exited', 'timeout'])
      .withMessage('Invalid exit reason'),
  ],
  enhancedVideoTrackingController.endSession
);

module.exports = router;

