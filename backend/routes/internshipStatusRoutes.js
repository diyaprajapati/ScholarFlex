const express = require('express');
const router = express.Router();
const internshipStatusController = require('../controllers/internshipStatusController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/student/internship/status
 * @desc    Get student's own internship status (Student only)
 * @access  Private (Student)
 */
router.get(
  '/student/internship/status',
  authenticate,
  authorize('STUDENT'),
  internshipStatusController.getStudentInternshipStatus
);

/**
 * @route   GET /api/admin/internship/status
 * @desc    Get all students' internship statuses (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/internship/status',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  internshipStatusController.getAllInternshipStatuses
);

module.exports = router;

