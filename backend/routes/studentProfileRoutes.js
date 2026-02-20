const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const studentProfileController = require('../controllers/studentProfileController');

// All routes require authentication and student role
router.use(authenticate);
router.use(authorize('STUDENT'));

/**
 * @route   GET /api/student/profile
 * @desc    Get student's own profile
 * @access  Private (Student)
 */
router.get('/', studentProfileController.getProfile);

/**
 * @route   GET /api/student/profile/check-completion
 * @desc    Check if student profile is completed
 * @access  Private (Student)
 */
router.get('/check-completion', studentProfileController.checkProfileCompletion);

/**
 * @route   PUT /api/student/profile
 * @desc    Update student profile
 * @access  Private (Student)
 */
router.put('/', studentProfileController.updateProfile);

/**
 * @route   POST /api/student/profile/image
 * @desc    Upload profile image
 * @access  Private (Student)
 */
router.post(
  '/image',
  (req, res, next) => {
    // console.log('🔄 Multer middleware called for profile image');
    studentProfileController.uploadProfileImage(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        console.error('   Error type:', err.constructor.name);
        if (err instanceof multer.MulterError) {
          console.error('   Multer error code:', err.code);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File too large. Maximum size is 5MB.',
            });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: `Unexpected field "${err.field}". Please use field name "image" or "profileImage".`,
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
      // console.log('✅ Multer middleware completed successfully');
      // console.log('   req.file:', req.file ? {
      //   fieldname: req.file.fieldname,
      //   originalname: req.file.originalname,
      //   encoding: req.file.encoding,
      //   mimetype: req.file.mimetype,
      //   size: req.file.size,
      //   destination: req.file.destination,
      //   filename: req.file.filename,
      //   path: req.file.path,
      // } : 'null');
      next();
    });
  },
  studentProfileController.uploadProfileImageHandler
);

/**
 * @route   POST /api/student/profile/resume
 * @desc    Upload resume
 * @access  Private (Student)
 */
router.post(
  '/resume',
  (req, res, next) => {
    // console.log('🔄 Multer middleware called for resume');
    studentProfileController.uploadResume(req, res, (err) => {
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
  studentProfileController.uploadResumeHandler
);

module.exports = router;

