const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/student/feedback
 * @desc    Submit internship feedback (Student only)
 * @access  Private (Student)
 */
router.post('/student/feedback', authenticate, authorize('STUDENT'), feedbackController.submitFeedback);

/**
 * @route   GET /api/student/feedback
 * @desc    Get student's own feedback (Student only)
 * @access  Private (Student)
 */
router.get('/student/feedback', authenticate, authorize('STUDENT'), feedbackController.getStudentFeedback);

/**
 * @route   GET /api/admin/feedback
 * @desc    Get all feedback (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get('/admin/feedback', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), (req, res, next) => {
  // console.log('✅ Route handler reached for /admin/feedback');
  // console.log('User:', req.user);
  next();
}, feedbackController.getAllFeedback);

module.exports = router;

