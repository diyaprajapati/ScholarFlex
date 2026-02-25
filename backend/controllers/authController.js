const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTPService = require('../services/otpService');
const { logActivitySimple } = require('../middleware/activityLogger');
const { prisma } = require('../config/database');

// Token configuration: access (configurable via JWT_EXPIRE, default 1h) and refresh (30d, HttpOnly cookie only)
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRE || '1h';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_COOKIE_NAME = 'refreshToken';

// Treat "production" and "deployment" as production for cookie/CORS (secure, cross-site).
// Development: secure=false, sameSite=lax. Production/Deployment: secure=true, sameSite=none (cross-domain).
const isProductionEnv = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'deployment';

/** Cookie options for refresh token: cross-domain in production requires sameSite=none + secure=true */
function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: isProductionEnv ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  };
}

/**
 * Send OTP to email
 */
const sendOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // Check if user exists
    const userExists = await User.exists(email);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please contact administrator.',
      });
    }

    // Generate OTP
    const otp = OTPService.generateOTP(parseInt(process.env.OTP_LENGTH || 6));

    // Store OTP in database
    await OTPService.storeOTP(email, otp);

    // Send OTP via email
    try {
      await OTPService.sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // In development, you might want to return OTP in response
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'OTP generated (email service unavailable)',
          otp: otp, // Only in development
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email successfully',
    });
  } catch (error) {
    console.error('Error in sendOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify OTP and login
 */
const verifyOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const verification = await OTPService.verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // Get user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if student's internship has ended
    if (user.source === 'students' && user.internship_end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(user.internship_end_date);
      endDate.setHours(23, 59, 59, 999);

      if (today > endDate) {
        // Check if feedback has already been submitted
        try {
          const feedback = await prisma.internshipFeedback.findUnique({
            where: { studentId: user.id },
            select: { id: true },
          });

          if (feedback) {
            // Feedback already submitted, block login permanently
            return res.status(403).json({
              success: false,
              message: 'Your internship has ended and you have already submitted your feedback. You can no longer access the portal.',
            });
          }
          // If feedback not submitted, allow login to submit feedback (will be redirected to feedback page)
        } catch (feedbackError) {
          console.error('Error checking feedback during login:', feedbackError);
          // If error checking feedback, allow login but will be redirected to feedback page
        }
      }
    }

    // If this is a student who has already completed a test and was not selected,
    // AND they do not have explicit retest access, block login.
    if (user.source === 'students' && user.is_selected === false && user.can_retest !== true) {
      try {
        const result = await prisma.$queryRaw`
          SELECT 1 as exists
          FROM test_attempts
          WHERE student_id = ${user.id}
            AND status IN ('COMPLETED', 'AUTO_SUBMITTED')
          LIMIT 1
        `;

        if (result.length > 0) {
          return res.status(403).json({
            success: false,
            message:
              'Your test has been completed and you were not selected, so you can no longer log in to the student portal.',
          });
        }
      } catch (checkError) {
        console.error('Error checking student test status during verifyOTP:', checkError);
        return res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }

    // Update last login (only for non-student users)
    if (user.source !== 'students') {
      await User.updateLastLogin(user.id);
    }

    // Log login activity (don't fail login if logging fails)
    // Temporarily attach user to req for logging (since verify-otp is a public route)
    const originalUser = req.user;
    req.user = user;
    try {
      await logActivitySimple(
        req,
        'LOGIN',
        'USER',
        user.id,
        `${user.email} logged in successfully`
      );
    } catch (logError) {
      // Log the error but don't fail the login
      console.error('Error logging login activity (non-fatal):', logError);
    } finally {
      // Restore original req.user (or remove it if it didn't exist)
      req.user = originalUser;
    }

    // Require both secrets for dual-token architecture
    if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
      console.error('JWT_SECRET or REFRESH_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_code,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Prepare user data (exclude sensitive info)
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role_code,
      role_name: user.role_name,
    };

    // Add student-specific fields
    if (user.source === 'students') {
      if (user.is_selected !== undefined) {
        userData.is_selected = user.is_selected;
      }
      if (user.can_retest !== undefined) {
        userData.can_retest = user.can_retest;
      }
      if (user.internship_end_date !== undefined) {
        userData.internship_end_date = user.internship_end_date;
      }
    }

    // Set refresh token in HttpOnly cookie only (never in response body)
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    // Send access token in JSON only; frontend sends it via Authorization header
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,
      user: userData,
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

/**
 * Logout: clear refresh token cookie (and legacy token cookie if present)
 */
const logout = async (req, res) => {
  try {
    // Log logout activity when user was authenticated
    if (req.user) {
      await logActivitySimple(
        req,
        'LOGOUT',
        'USER',
        req.user.id,
        `${req.user.email} logged out`
      );
    }

    const cookieOptions = { ...getRefreshCookieOptions() };
    delete cookieOptions.maxAge;
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
    res.clearCookie('token', cookieOptions); // legacy
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Refresh access token using refresh token from HttpOnly cookie.
 * Does NOT issue a new refresh token (no rotation in this implementation).
 */
const refreshAccessToken = async (req, res) => {
  try {
    if (!process.env.REFRESH_SECRET || !process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError' || jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }
      throw jwtError;
    }

    if (decoded.type !== 'refresh' || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_code,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      success: true,
      token: accessToken,
    });
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res) => {
  try {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role_code,
      role_name: req.user.role_name,
    };

    // Include student-specific flags
    if (req.user.role_code === 'STUDENT') {
      userData.is_selected = req.user.is_selected || false;
      userData.can_retest = req.user.can_retest || false;
    }

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  logout,
  getCurrentUser,
  refreshAccessToken,
};

