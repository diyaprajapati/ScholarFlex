const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const playlistController = require('../controllers/playlistController');
const domainController = require('../controllers/domainController');
const instituteController = require('../controllers/instituteController');
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes that require super admin only
const superAdminRouter = express.Router();
superAdminRouter.use(authorize('SUPER_ADMIN'));

// Routes that require admin or super admin
const adminRouter = express.Router();
adminRouter.use(authorize('ADMIN', 'SUPER_ADMIN'));

// Validation rules
const emailValidation = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .normalizeEmail({ gmail_remove_dots: false })
  .trim();

const fullNameValidation = body('full_name')
  .trim()
  .isLength({ min: 2, max: 255 })
  .withMessage('Full name must be between 2 and 255 characters');

const roleCodeValidation = body('role_code')
  .isIn(['ADMIN', 'SUPER_ADMIN'])
  .withMessage('Role code must be ADMIN or SUPER_ADMIN');

// Super Admin only routes
/**
 * @route   POST /api/admin/create
 * @desc    Create a new admin (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.post(
  '/create',
  [emailValidation, fullNameValidation, roleCodeValidation],
  adminController.createAdmin
);

/**
 * @route   GET /api/admin/all
 * @desc    Get all admins (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.get('/all', adminController.getAllAdmins);

/**
 * @route   GET /api/admin/settings
 * @desc    Get app settings e.g. candidate registration enabled (Super Admin only)
 * @access  Private (Super Admin)
 * IMPORTANT: Must be registered BEFORE /:id route to avoid conflicts
 */
superAdminRouter.get('/settings', settingsController.getSettings);

/**
 * @route   PUT /api/admin/settings
 * @desc    Update app settings (Super Admin only)
 * @access  Private (Super Admin)
 * IMPORTANT: Must be registered BEFORE /:id route to avoid conflicts
 */
superAdminRouter.put('/settings', settingsController.updateSettings);

/**
 * @route   GET /api/admin/:id
 * @desc    Get admin by ID (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.get('/:id', adminController.getAdminById);

/**
 * @route   PUT /api/admin/:id
 * @desc    Update admin (Super Admin only)
 * @access  Private (Super Admin)
 */
superAdminRouter.put(
  '/:id',
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail({ gmail_remove_dots: false })
      .trim(),
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Full name must be between 2 and 255 characters'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
    body('role_code')
      .optional()
      .isIn(['ADMIN', 'SUPER_ADMIN'])
      .withMessage('Role code must be ADMIN or SUPER_ADMIN'),
  ],
  adminController.updateAdmin
);

/**
 * @route   DELETE /api/admin/:id
 * @desc    Delete admin (Super Admin only) - Soft delete
 * @access  Private (Super Admin)
 */
superAdminRouter.delete('/:id', adminController.deleteAdmin);

// Admin/Super Admin routes for playlists, domains, and institutes
/**
 * @route   POST /api/admin/playlists
 * @desc    Create a new playlist (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/playlists',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('domain')
      .isInt()
      .withMessage('Domain must be a valid integer'),
  ],
  playlistController.createPlaylist
);

/**
 * @route   POST /api/admin/domains
 * @desc    Create a new domain (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post('/domains', domainController.createDomain);

/**
 * @route   GET /api/admin/institutes/stats
 * @desc    Get institutes with student counts (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/institutes/stats', instituteController.getInstituteStats);

/**
 * @route   POST /api/admin/institutes/merge
 * @desc    Merge/rename institutes by updating students' institute_name (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post('/institutes/merge', instituteController.mergeInstitutes);

/**
 * @route   GET /api/admin/domains/stats
 * @desc    Get domains with student counts (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/domains/stats', domainController.getDomainStats);

/**
 * @route   DELETE /api/admin/domains/:id
 * @desc    Soft delete a domain and optionally reassign students (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.delete('/domains/:id', domainController.deleteDomain);

/**
 * @route   POST /api/admin/playlists/:id/videos
 * @desc    Add a video to a playlist (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/playlists/:id/videos',
  [
    body('video_title')
      .trim()
      .notEmpty()
      .withMessage('Video title is required')
      .isLength({ max: 255 })
      .withMessage('Video title must be less than 255 characters'),
    body('youtube_url')
      .trim()
      .notEmpty()
      .withMessage('YouTube URL is required')
      .isURL()
      .withMessage('YouTube URL must be a valid URL')
      .isLength({ max: 500 })
      .withMessage('YouTube URL must be less than 500 characters'),
  ],
  playlistController.addVideoToPlaylist
);

/**
 * @route   POST /api/admin/playlists/:id/videos/bulk
 * @desc    Add multiple videos from YouTube playlist URL (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post(
  '/playlists/:id/videos/bulk',
  [
    body('youtube_playlist_url')
      .trim()
      .notEmpty()
      .withMessage('YouTube playlist URL is required')
      .isURL()
      .withMessage('YouTube playlist URL must be a valid URL')
      .matches(/playlist\?list=/)
      .withMessage('URL must be a valid YouTube playlist URL'),
  ],
  playlistController.addVideosFromPlaylistUrl
);

/**
 * @route   DELETE /api/admin/playlists/:playlistId/videos/:videoId
 * @desc    Delete a video from a playlist (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.delete(
  '/playlists/:playlistId/videos/:videoId',
  playlistController.deleteVideoFromPlaylist
);

/**
 * @route   GET /api/admin/playlists
 * @desc    Get all playlists (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/playlists', (req, res, next) => {
  // console.log('📥 GET /api/admin/playlists - Request received');
  // console.log('User:', req.user?.email);
  next();
}, playlistController.getAllPlaylists);

/**
 * @route   PUT /api/admin/playlists/:id
 * @desc    Update a playlist (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.put(
  '/playlists/:id',
  [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('domain')
      .optional()
      .isInt()
      .withMessage('Domain must be a valid integer'),
  ],
  playlistController.updatePlaylist
);

/**
 * @route   DELETE /api/admin/playlists/:id
 * @desc    Delete a playlist (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.delete(
  '/playlists/:id',
  playlistController.deletePlaylist
);

// Import NOC controller for admin routes
const nocController = require('../controllers/nocController');

/**
 * @route   GET /api/admin/noc
 * @desc    Get all NOC letters (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/noc', nocController.getAllNOC);

/**
 * @route   GET /api/admin/noc/:id/download
 * @desc    Download/view NOC letter (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/noc/:id/download', nocController.downloadNOC);

/**
 * @route   GET /api/admin/noc/download-all
 * @desc    Download all NOC letters as ZIP (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/noc/download-all', nocController.downloadAllNOC);

/**
 * @route   PATCH /api/admin/noc/:id/status
 * @desc    Update NOC status (Approve/Reject) (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.patch('/noc/:id/status', nocController.updateNOCStatus);

/**
 * @route   GET /api/admin/students/analytics
 * @desc    Get student analytics for all selected students (Admin/Super Admin)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/students/analytics', adminController.getStudentAnalytics);

// Import feedback controller
const feedbackController = require('../controllers/feedbackController');

/**
 * @route   GET /api/admin/feedback
 * @desc    Get all feedback (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: This route must be registered BEFORE the /:id route to avoid conflicts
 */
adminRouter.get('/feedback', feedbackController.getAllFeedback);

// Import evaluation, project, and internship status controllers
const evaluationController = require('../controllers/evaluationController');
const projectController = require('../controllers/projectController');
const internshipStatusController = require('../controllers/internshipStatusController');

/**
 * @route   GET /api/admin/evaluations
 * @desc    Get all evaluations (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /:id route
 */
adminRouter.get('/evaluations', evaluationController.getAllEvaluations);

/**
 * @route   POST /api/admin/evaluations
 * @desc    Create evaluation (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post('/evaluations', evaluationController.createEvaluation);

/**
 * @route   GET /api/admin/evaluations/export
 * @desc    Export evaluated students to Excel (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /evaluations/student/:studentId route
 */
adminRouter.get('/evaluations/export', evaluationController.exportEvaluatedStudents);

/**
 * @route   GET /api/admin/evaluations/student/:studentId
 * @desc    Get evaluations for a student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/evaluations/student/:studentId', evaluationController.getStudentEvaluations);

/**
 * @route   GET /api/admin/evaluations/:id
 * @desc    Get evaluation by ID (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/evaluations/:id', evaluationController.getEvaluationById);

/**
 * @route   PUT /api/admin/evaluations/:id
 * @desc    Update evaluation (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.put('/evaluations/:id', evaluationController.updateEvaluation);

/**
 * @route   DELETE /api/admin/evaluations/:id
 * @desc    Delete evaluation (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.delete('/evaluations/:id', evaluationController.deleteEvaluation);

/**
 * @route   GET /api/admin/evaluations/export
 * @desc    Export evaluated students to Excel (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /evaluations/:id route
 */
adminRouter.get('/evaluations/export', evaluationController.exportEvaluatedStudents);

/**
 * @route   GET /api/admin/projects/students
 * @desc    Get all selected students with their projects (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /projects/:id route
 */
adminRouter.get('/projects/students', projectController.getSelectedStudentsWithProjects);

/**
 * @route   GET /api/admin/projects
 * @desc    Get all projects (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/projects', projectController.getAllProjects);

/**
 * @route   POST /api/admin/projects
 * @desc    Create project (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.post('/projects', projectController.createProject);

/**
 * @route   GET /api/admin/projects/student/:studentId
 * @desc    Get projects for a student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/projects/student/:studentId', projectController.getStudentProjects);

/**
 * @route   GET /api/admin/projects/:id
 * @desc    Get project by ID (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/projects/:id', projectController.getProjectById);

/**
 * @route   PUT /api/admin/projects/:id
 * @desc    Update project (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.put('/projects/:id', projectController.updateProject);

/**
 * @route   DELETE /api/admin/projects/:id
 * @desc    Delete project (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.delete('/projects/:id', projectController.deleteProject);

/**
 * @route   GET /api/admin/internship/status
 * @desc    Get all internship statuses (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/internship/status', internshipStatusController.getAllInternshipStatuses);

// Import open student analytics controller
const openStudentAnalyticsController = require('../controllers/openStudentAnalyticsController');
// Import Firebase analytics controller
const firebaseAnalyticsController = require('../controllers/firebaseAnalyticsController');

/**
 * @route   GET /api/admin/analytics/open-students/aggregate
 * @desc    Get aggregate analytics for open students (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /:id route
 */
adminRouter.get('/analytics/open-students/aggregate', openStudentAnalyticsController.getAggregateAnalytics);

/**
 * @route   GET /api/admin/analytics/open-students/stats
 * @desc    Get statistics for open students (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 * IMPORTANT: Must be registered BEFORE /:id route
 */
adminRouter.get('/analytics/open-students/stats', openStudentAnalyticsController.getStats);

/**
 * @route   GET /api/admin/analytics/open-students/individual
 * @desc    Get individual open student analytics with pagination (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
adminRouter.get('/analytics/open-students/individual', openStudentAnalyticsController.getIndividualAnalytics);

/**
 * @route   GET /api/admin/analytics/firebase
 * @desc    Get Firebase Analytics summary data (Admin/Super Admin only)
 */
adminRouter.get('/analytics/firebase', firebaseAnalyticsController.getFirebaseAnalytics);

// Mount routers
// IMPORTANT: adminRouter (with specific routes) must be mounted BEFORE superAdminRouter (with /:id catch-all)
// IMPORTANT: Mount adminRouter FIRST (with specific routes like /playlists)
// BEFORE superAdminRouter (which has catch-all /:id route)
// This ensures /playlists matches before /:id
router.use('/', adminRouter);
router.use('/', superAdminRouter);

module.exports = router;

