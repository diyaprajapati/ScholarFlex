const express = require('express');
const { body } = require('express-validator');
const openStudentController = require('../controllers/openStudentController');
const validateOpenSession = require('../middleware/openSessionAuth');

const router = express.Router();

// Validation rules
const emailValidation = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .trim()
  .toLowerCase();

const nameValidation = body('name')
  .optional({ nullable: true, checkFalsy: true })
  .trim()
  .custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty, null, or undefined
    }
    if (value.length < 1 || value.length > 255) {
      throw new Error('Name must be between 1 and 255 characters');
    }
    return true;
  });

const phoneValidation = body('phone')
  .optional({ nullable: true, checkFalsy: true })
  .trim()
  .custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // Allow empty, null, or undefined
    }
    if (value.length < 10 || value.length > 20) {
      throw new Error('Phone must be between 10 and 20 characters');
    }
    return true;
  });

/**
 * @route   POST /api/open/register
 * @desc    Register a new open student (light registration)
 * @access  Public
 */
router.post(
  '/register',
  [emailValidation, nameValidation, phoneValidation],
  openStudentController.register
);

/**
 * @route   GET /api/open/me
 * @desc    Get current open student
 * @access  Private (session token)
 */
router.get('/me', validateOpenSession, openStudentController.getCurrentStudent);

/**
 * @route   GET /api/open/dashboard
 * @desc    Get dashboard data (limited for open students)
 * @access  Private (session token)
 */
router.get('/dashboard', validateOpenSession, openStudentController.getDashboard);

/**
 * @route   GET /api/open/playlists
 * @desc    Get all playlists (public access)
 * @access  Private (session token)
 */
router.get('/playlists', validateOpenSession, openStudentController.getPlaylists);

/**
 * @route   GET /api/open/playlists/:id
 * @desc    Get playlist details
 * @access  Private (session token)
 */
router.get('/playlists/:id', validateOpenSession, openStudentController.getPlaylistById);

/**
 * @route   POST /api/open/video-progress
 * @desc    Track video progress
 * @access  Private (session token)
 */
router.post(
  '/video-progress',
  [
    validateOpenSession,
    body('videoId').isInt().withMessage('Video ID must be an integer'),
    body('playlistId').optional().isInt().withMessage('Playlist ID must be an integer'),
    body('watchTimeSeconds').optional().isInt().withMessage('Watch time must be an integer'),
    body('progressPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
    body('lastPosition').optional().isFloat({ min: 0 }).withMessage('Last position must be a positive number'),
  ],
  openStudentController.trackVideoProgress
);

/**
 * @route   GET /api/open/video-progress/:videoId
 * @desc    Get video progress
 * @access  Private (session token)
 */
router.get('/video-progress/:videoId', validateOpenSession, openStudentController.getVideoProgress);

/**
 * @route   POST /api/open/logout
 * @desc    Logout (delete session)
 * @access  Private (session token)
 */
router.post('/logout', validateOpenSession, openStudentController.logout);

module.exports = router;

