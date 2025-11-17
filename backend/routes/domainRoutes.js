const express = require('express');
const domainController = require('../controllers/domainController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/domains
 * @desc    Get all active domains
 * @access  Private (Admin, Super Admin, Student)
 */
router.get(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN', 'STUDENT'),
  domainController.getAllDomains
);

module.exports = router;

