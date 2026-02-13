const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const timeTrackingController = require('../controllers/timeTrackingController');

// All routes require authentication and admin role
router.use(authenticate);
// IMPORTANT: Both ADMIN and SUPER_ADMIN should be allowed
// Create custom authorize middleware that explicitly checks for both roles
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const userRole = req.user.role_code;
  const normalizedRole = userRole ? String(userRole).toUpperCase().trim() : null;
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN']; // Explicitly set both roles here

  // console.log('[AUTHORIZE adminTimeTracking]', {
  //   path: req.path,
  //   userRole: userRole,
  //   normalizedRole: normalizedRole,
  //   allowedRoles: allowedRoles,
  //   match: allowedRoles.includes(normalizedRole)
  // });

  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.',
      debug: {
        userRole: userRole,
        normalizedRole: normalizedRole,
        allowedRoles: allowedRoles,
        userEmail: req.user.email
      }
    });
  }

  next();
});

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

/**
 * @route   GET /api/admin/time-tracking/logs
 * @desc    Get timer logs (start, pause, resume, stop events) for all students
 * @access  Private (Admin)
 */
router.get('/logs', timeTrackingController.getTimerLogs);

module.exports = router;

