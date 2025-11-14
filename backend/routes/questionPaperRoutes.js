const express = require('express');
const questionPaperController = require('../controllers/questionPaperController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/question-papers
 * @desc    Get all question papers (with optional filters)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  questionPaperController.getAllQuestionPapers
);

/**
 * @route   GET /api/question-papers/:id
 * @desc    Get a question paper by ID
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  questionPaperController.getQuestionPaperById
);

/**
 * @route   POST /api/question-papers
 * @desc    Create a new question paper with questions from JSON format
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  questionPaperController.createQuestionPaper
);

module.exports = router;

