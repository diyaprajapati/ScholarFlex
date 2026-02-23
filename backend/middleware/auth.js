const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { prisma } = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
      });
    }

    // Access token must be sent via Authorization: Bearer <token> (refresh token is HttpOnly cookie only)
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Verify access token with JWT_SECRET (refresh tokens use REFRESH_SECRET and are not accepted here)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // JWT verification failed - return appropriate error
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }
      throw jwtError; // Re-throw if it's an unexpected error
    }

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Normalize role - check all possible property names (MySQL/Prisma may return different cases)
    // Try: role_code, roleCode, role, ROLE_CODE, Role_Code, etc.
    let roleCode = null;
    const roleKeys = Object.keys(user).filter(key => 
      key.toLowerCase() === 'role_code' || 
      key.toLowerCase() === 'rolecode' || 
      key.toLowerCase() === 'role'
    );
    
    if (roleKeys.length > 0) {
      roleCode = user[roleKeys[0]];
    } else {
      // Fallback to explicit checks
      roleCode = user.role_code ?? user.roleCode ?? user.role ?? 
                 user.ROLE_CODE ?? user.Role_Code ?? user.ROLE;
    }
    
    // If still not found, try JWT token's role (fallback)
    if (!roleCode && decoded.role) {
      roleCode = decoded.role;
    }
    
    // Always set role_code in uppercase for consistency
    if (roleCode) {
      user.role_code = String(roleCode).toUpperCase().trim();
    } else {
      // Log error if role cannot be determined
      // console.error('[AUTHENTICATE] ERROR: Could not determine user role', {
      //   userId: user.id,
      //   email: user.email,
      //   userKeys: Object.keys(user),
      //   decodedRole: decoded.role,
      //   userObject: user
      // });
      // Set a default or reject - but let's try to continue and see what happens
      // The authorize middleware will catch this
    }
    
    // Always log user authentication (for debugging)
    // console.log('[AUTHENTICATE] User loaded:', {
    //   id: user.id,
    //   email: user.email,
    //   role_code: user.role_code,
    //   allRoleKeys: roleKeys,
    //   userKeys: Object.keys(user).filter(k => k.toLowerCase().includes('role')),
    //   source: user.source
    // });

    // For students: Check if internship has ended
    if (user.role_code === 'STUDENT' && user.internship_end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(user.internship_end_date);
      endDate.setHours(23, 59, 59, 999);
      
      if (today > endDate) {
        // Allow access to feedback routes even after internship ends
        const isFeedbackRoute = req.path === '/student/feedback' || req.path.startsWith('/student/feedback');
        
        if (!isFeedbackRoute) {
          // Block access to all other routes after internship ends
          return res.status(403).json({
            success: false,
            message: 'Your internship has ended. You can no longer access the portal. Please submit your feedback if you haven\'t already.',
          });
        }
        
        // For feedback routes, check if feedback already submitted
        // This check is done in the feedback controller, so we allow the request to proceed
      }
    }

    // For students: if they have already completed a test and were not selected,
    // and do NOT have explicit retest access, block further access to the student portal and APIs
    if (user.role_code === 'STUDENT' && user.is_selected === false && user.can_retest !== true) {
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
    // Log unexpected errors for debugging
    console.error('Authentication middleware error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    
    // JWT errors should already be handled above, but catch any edge cases
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
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

/**
 * Check if user has required role
 * Supports role_code (DB snake_case), roleCode (camelCase), or role (token payload)
 */
const authorize = (...roles) => {
  // Log what roles were passed to authorize
  // console.log('[AUTHORIZE] Middleware created with roles:', roles);
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get role from normalized role_code (should be set by authenticate middleware)
    const userRole = req.user.role_code;
    const normalizedRole = userRole ? String(userRole).toUpperCase().trim() : null;
    const allowedRoles = roles.map((r) => String(r).toUpperCase().trim());
    
    // Log the roles array to see what we're working with
    // console.log('[AUTHORIZE] Roles array:', roles, 'Mapped to:', allowedRoles);

    // Always log authorization attempts (for debugging)
    // console.log('[AUTHORIZE]', {
    //   path: req.path,
    //   method: req.method,
    //   userRole: userRole,
    //   normalizedRole: normalizedRole,
    //   allowedRoles: allowedRoles,
    //   userObject: {
    //     role_code: req.user.role_code,
    //     email: req.user.email,
    //     id: req.user.id,
    //     allKeys: Object.keys(req.user).filter(k => k.toLowerCase().includes('role'))
    //   },
    //   match: allowedRoles.includes(normalizedRole)
    // });

    if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
      // console.error('[AUTHORIZE] ACCESS DENIED:', {
      //   path: req.path,
      //   userRole: userRole,
      //   normalizedRole: normalizedRole,
      //   allowedRoles: allowedRoles,
      //   userEmail: req.user.email
      // });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        debug: {
          userRole: userRole,
          normalizedRole: normalizedRole,
          allowedRoles: allowedRoles,
          userEmail: req.user.email
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

