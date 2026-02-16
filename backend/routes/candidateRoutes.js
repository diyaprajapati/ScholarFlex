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
 * @route   GET /api/candidates/academic-years
 * @desc    Get distinct academic years for filter (Admin, Super Admin)
 * @access  Private (Admin, Super Admin)
 */
router.get('/academic-years', candidateController.getAcademicYears);

/**
 * @route   GET /api/candidates
 * @desc    Get all students with marks (optional query: ?academic_year=2025-26)
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
 * @route   PUT /api/candidates/:id/noc-status
 * @desc    Update manual NOC received status for a student
 * @access  Private (Admin, Super Admin)
 */
router.put('/:id/noc-status', candidateController.updateNOCReceivedStatus);

/**
 * @route   PUT /api/candidates/bulk-selection
 * @desc    Bulk update candidate selection status
 * @access  Private (Admin, Super Admin)
 */
router.put('/bulk-selection', candidateController.bulkUpdateSelection);

/**
 * @route   POST /api/candidates
 * @desc    Create a new student manually
 * @access  Private (Admin, Super Admin)
 */
router.post('/', candidateController.createStudent);

/**
 * @route   PUT /api/candidates/:id
 * @desc    Update an existing student
 * @access  Private (Admin, Super Admin)
 */
router.put('/:id', candidateController.updateStudent);

/**
 * @route   DELETE /api/candidates/:id
 * @desc    Delete a student (soft delete)
 * @access  Private (Admin, Super Admin)
 */
router.delete('/:id', candidateController.deleteStudent);

/**
 * @route   POST /api/candidates/migrate-area-of-interests
 * @desc    Migrate area_of_interests data to domain_id for existing students
 * @access  Private (Admin, Super Admin)
 */
router.post('/migrate-area-of-interests', candidateController.migrateAreaOfInterestsToDomain);

module.exports = router;

