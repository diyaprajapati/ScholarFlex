const express = require('express');
const studentTestController = require('../controllers/studentTestController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/student/tests
 * @desc    Get available tests for student based on their domain
 * @access  Private (Student)
 */
router.get(
  '/tests',
  authorize('STUDENT'),
  studentTestController.getAvailableTests
);

router.get(
  '/tests/:testId/details',
  authorize('STUDENT'),
  studentTestController.getTestDetails
);

router.post(
  '/tests/:testId/start',
  authorize('STUDENT'),
  studentTestController.startTest
);

/**
 * @route   GET /api/student/test-attempts/:testAttemptId/next-question
 * @desc    Get next question for adaptive testing
 * @access  Private (Student)
 */
router.get(
  '/test-attempts/:testAttemptId/next-question',
  authorize('STUDENT'),
  studentTestController.getNextQuestion
);

router.post(
  '/test-attempts/:attemptId/submit',
  authorize('STUDENT'),
  studentTestController.submitTest
);

module.exports = router;

