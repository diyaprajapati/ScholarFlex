const jwt = require('jsonwebtoken');
const User = require('../models/User');
const pool = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // For students: if they have already completed a test and were not selected,
    // and do NOT have explicit retest access, block further access to the student portal and APIs
    if (user.role_code === 'STUDENT' && user.is_selected === false && user.can_retest !== true) {
      try {
        const result = await pool.query(
          `SELECT 1
           FROM test_attempts
           WHERE student_id = $1
             AND status IN ('COMPLETED', 'AUTO_SUBMITTED')
           LIMIT 1`,
          [user.id]
        );

        if (result.rows.length > 0) {
          return res.status(403).json({
            success: false,
            message:
              'Access denied. Your test has been evaluated and you were not selected, so you can no longer access the student portal.',
          });
        }
      } catch (checkError) {
        console.error('Error checking student test status in auth middleware:', checkError);
        return res.status(500).json({
          success: false,
          message: 'Authentication error',
        });
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Check if user has required role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role_code;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

