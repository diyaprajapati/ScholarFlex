const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const nocController = require('../controllers/nocController');

/**
 * Student routes
 */
// Upload NOC letter
router.post(
  '/student/noc/upload',
  authenticate,
  authorize('STUDENT'),
  nocController.upload,
  nocController.uploadNOC
);

// Get student's own NOC
router.get(
  '/student/noc',
  authenticate,
  authorize('STUDENT'),
  nocController.getStudentNOC
);

// Delete student's own NOC
router.delete(
  '/student/noc/:id',
  authenticate,
  authorize('STUDENT'),
  nocController.deleteStudentNOC
);

/**
 * Admin routes - These are now handled in adminRoutes.js
 * to avoid route conflicts with /api/admin/:id
 */

module.exports = router;

