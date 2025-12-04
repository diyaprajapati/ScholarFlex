const express = require('express');
const multer = require('multer');
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN'));

/**
 * @route   POST /api/candidates/upload
 * @desc    Upload spreadsheet to bulk insert candidates
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/upload',
  (req, res, next) => {
    candidateController.upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File too large. Maximum size is 10MB.',
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  },
  candidateController.uploadSpreadsheet
);

/**
 * @route   GET /api/candidates
 * @desc    Get all students with marks
 * @access  Private (Admin, Super Admin)
 */
router.get('/', candidateController.getAllCandidates);

/**
 * @route   GET /api/candidates/:id
 * @desc    Get student by ID with full details
 * @access  Private (Admin, Super Admin)
 */
router.get('/:id', candidateController.getStudentById);

/**
 * @route   POST /api/candidates/import-google-sheets
 * @desc    Import students from Google Sheets CSV URL
 * @access  Private (Admin, Super Admin)
 */
router.post('/import-google-sheets', candidateController.importFromGoogleSheets);

/**
 * @route   PUT /api/candidates/:id/selection
 * @desc    Update candidate selection status
 * @access  Private (Admin, Super Admin)
 */
router.put('/:id/selection', candidateController.updateStudentSelection);

/**
 * @route   PUT /api/candidates/bulk-selection
 * @desc    Bulk update candidate selection status
 * @access  Private (Admin, Super Admin)
 */
router.put('/bulk-selection', candidateController.bulkUpdateSelection);

module.exports = router;

