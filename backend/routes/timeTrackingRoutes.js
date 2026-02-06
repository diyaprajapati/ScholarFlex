const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const timeTrackingController = require('../controllers/timeTrackingController');

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize('STUDENT'));

/**
 * @route   POST /api/student/time-tracking/start
 * @desc    Start a time tracking session
 * @access  Private (Student)
 */
router.post('/start', timeTrackingController.startTimeTracking);

/**
 * @route   POST /api/student/time-tracking/pause
 * @desc    Pause a time tracking session
 * @access  Private (Student)
 */
router.post('/pause', timeTrackingController.pauseTimeTracking);

/**
 * @route   POST /api/student/time-tracking/resume
 * @desc    Resume a paused time tracking session
 * @access  Private (Student)
 */
router.post('/resume', timeTrackingController.resumeTimeTracking);

/**
 * @route   POST /api/student/time-tracking/finish
 * @desc    Finish a time tracking session
 * @access  Private (Student)
 */
router.post('/finish', timeTrackingController.finishTimeTracking);

/**
 * @route   POST /api/student/time-tracking/heartbeat
 * @desc    Update last heartbeat for active session (used to detect shutdown/closed tab)
 * @access  Private (Student)
 */
router.post('/heartbeat', timeTrackingController.heartbeat);

/**
 * @route   GET /api/student/time-tracking/active
 * @desc    Get current active session
 * @access  Private (Student)
 */
router.get('/active', timeTrackingController.getActiveSession);

/**
 * @route   GET /api/student/time-tracking/today
 * @desc    Get today's working hours
 * @access  Private (Student)
 */
router.get('/today', timeTrackingController.getTodayWorkingHours);

/**
 * @route   POST /api/student/time-tracking/ask-question
 * @desc    Ask a random attendance question
 * @access  Private (Student)
 */
router.post('/ask-question', timeTrackingController.askAttendanceQuestion);

/**
 * @route   POST /api/student/time-tracking/answer-question
 * @desc    Answer an attendance question
 * @access  Private (Student)
 */
router.post(
  '/answer-question',
  [
    body('questionId')
      .isInt()
      .withMessage('Question ID must be a valid integer'),
    body('answer')
      .trim()
      .notEmpty()
      .withMessage('Answer is required')
      .isLength({ max: 255 })
      .withMessage('Answer must be less than 255 characters'),
  ],
  timeTrackingController.answerAttendanceQuestion
);

module.exports = router;

