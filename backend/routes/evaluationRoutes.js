const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/admin/evaluations
 * @desc    Create evaluation for a student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/admin/evaluations',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.createEvaluation
);

/**
 * @route   GET /api/admin/evaluations
 * @desc    Get all evaluations (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/evaluations',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.getAllEvaluations
);

/**
 * @route   GET /api/admin/evaluations/student/:studentId
 * @desc    Get all evaluations for a specific student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/evaluations/student/:studentId',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.getStudentEvaluations
);

/**
 * @route   GET /api/admin/evaluations/:id
 * @desc    Get evaluation by ID (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/evaluations/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.getEvaluationById
);

/**
 * @route   PUT /api/admin/evaluations/:id
 * @desc    Update evaluation (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.put(
  '/admin/evaluations/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.updateEvaluation
);

/**
 * @route   DELETE /api/admin/evaluations/:id
 * @desc    Delete evaluation (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.delete(
  '/admin/evaluations/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  evaluationController.deleteEvaluation
);

module.exports = router;

