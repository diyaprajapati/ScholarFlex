const express = require('express');
const multer = require('multer');
const internController = require('../controllers/internController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/interns/upload
 * @desc    Upload spreadsheet to bulk insert interns
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/upload',
  authorize('ADMIN', 'SUPER_ADMIN'),
  (req, res, next) => {
    internController.upload(req, res, (err) => {
      if (err) {
        // Handle multer errors
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
        // Handle other errors
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  },
  internController.uploadSpreadsheet
);

/**
 * @route   GET /api/interns
 * @desc    Get all interns/students
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/',
  authorize('ADMIN', 'SUPER_ADMIN'),
  internController.getAllInterns
);

/**
 * @route   GET /api/interns/:id
 * @desc    Get intern by ID
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  internController.getInternById
);

/**
 * @route   PUT /api/interns/:id
 * @desc    Update intern
 * @access  Private (Admin, Super Admin)
 */
router.put(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  internController.updateIntern
);

/**
 * @route   DELETE /api/interns/:id
 * @desc    Delete intern (soft delete)
 * @access  Private (Admin, Super Admin)
 */
router.delete(
  '/:id',
  authorize('ADMIN', 'SUPER_ADMIN'),
  internController.deleteIntern
);

module.exports = router;

