const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All dashboard routes require authentication and Admin/Super Admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard KPI statistics
 * @access  Private (Admin, Super Admin)
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @route   GET /api/dashboard/cards/:cardId
 * @desc    Get detailed data for a specific KPI card
 * @access  Private (Admin, Super Admin)
 */
router.get('/cards/:cardId', dashboardController.getCardDetails);

module.exports = router;

