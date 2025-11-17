const express = require('express');
const testAttemptController = require('../controllers/testAttemptController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

/**
 * @route   GET /api/test-attempts
 * @desc    Get all test attempts with scores
 * @access  Private (Admin, Super Admin)
 */
router.get('/', testAttemptController.getAllTestAttempts);

module.exports = router;

