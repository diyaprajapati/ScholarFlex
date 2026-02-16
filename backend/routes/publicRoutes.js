const express = require('express');
const { body } = require('express-validator');
const publicRegistrationController = require('../controllers/publicRegistrationController');
const domainController = require('../controllers/domainController');
const instituteController = require('../controllers/instituteController');

const router = express.Router();

/**
 * @route   GET /api/public/candidate-registration-enabled
 * @desc    Check if candidate registration form is open (no auth)
 * @access  Public
 */
router.get('/candidate-registration-enabled', publicRegistrationController.getRegistrationEnabled);

/**
 * @route   GET /api/public/domains
 * @desc    Get all active domains for registration form (no auth)
 * @access  Public
 */
router.get('/domains', domainController.getAllDomains);

/**
 * @route   GET /api/public/institutes/stats
 * @desc    Get institutes with student counts for registration form (no auth)
 * @access  Public
 */
router.get('/institutes/stats', instituteController.getInstituteStats);

/**
 * @route   POST /api/public/candidates/register
 * @desc    Register as candidate (no auth). Academic year derived from internship dates.
 * @access  Public
 */
router.post(
  '/candidates/register',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 255 }),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('institute_name').optional().trim().isLength({ max: 255 }),
    body('course_taken').optional().trim().isLength({ max: 255 }),
    body('area_of_interests').optional().trim(),
    body('internship_start_date').optional().trim(),
    body('internship_end_date').optional().trim(),
    body('internship_duration').optional().trim().isLength({ max: 50 }),
    body('reference_information').optional().trim(),
    body('internal_faculty_name').optional().trim().isLength({ max: 255 }),
    body('faculty_contact').optional().trim().isLength({ max: 20 }),
    body('faculty_email').optional().trim().isEmail(),
  ],
  publicRegistrationController.registerCandidate
);

module.exports = router;
