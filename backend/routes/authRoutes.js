const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const emailValidation = body('email')
  .isEmail()
  .withMessage('Please provide a valid email address')
  .trim()
  .toLowerCase();

const otpValidation = body('otp')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be 6 digits')
  .isNumeric()
  .withMessage('OTP must contain only numbers');

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to user's email
 * @access  Public
 */
router.post(
  '/send-otp',
  [emailValidation],
  authController.sendOTP
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 */
router.post(
  '/verify-otp',
  [emailValidation, otpValidation],
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Issue new access token using refresh token from HttpOnly cookie
 * @access  Public (requires refresh cookie)
 */
router.post('/refresh', authController.refreshAccessToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;

