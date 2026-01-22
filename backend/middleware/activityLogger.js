const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to log all admin activities
 * Should be used after authentication middleware
 */
const activityLogger = (action, entityType, getEntityId = null, getDescription = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log the activity after response is sent
      logActivity(req, res, data, action, entityType, getEntityId, getDescription);
      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper function to log activity
 */
async function logActivity(req, res, responseData, action, entityType, getEntityId, getDescription) {
  try {
    // Only log if user is authenticated
    if (!req.user) {
      return;
    }

    // Get entity ID (can be from params, body, or custom function)
    let entityId = null;
    if (getEntityId) {
      if (typeof getEntityId === 'function') {
        entityId = getEntityId(req);
      } else {
        entityId = req.params[getEntityId] || req.body[getEntityId] || getEntityId;
      }
    } else {
      entityId = req.params.id || req.body.id || null;
    }

    // Get description (can be custom function or default)
    let description = null;
    if (getDescription) {
      if (typeof getDescription === 'function') {
        description = getDescription(req, responseData);
      } else {
        description = getDescription;
      }
    } else {
      description = generateDefaultDescription(req, action, entityType, entityId);
    }

    // Prepare request body (exclude sensitive data)
    let requestBody = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      requestBody = { ...req.body };
      // Remove sensitive fields
      delete requestBody.password;
      delete requestBody.password_hash;
      delete requestBody.token;
      if (Object.keys(requestBody).length === 0) {
        requestBody = null;
      }
    }

    // Get IP address
    const ipAddress =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      'unknown';

    // Determine user_id and user_type based on user source
    // Students are in the 'students' table, not 'users' table
    // So we set userId to null for students to avoid foreign key constraint violations
    let userId = null;
    let userType = 'USER';
    
    if (req.user.source === 'users') {
      // User is from users table (admin/super_admin) - use their user ID
      userId = req.user.id;
      userType = 'USER'; // Admins are logged as USER type
    } else if (req.user.source === 'students') {
      // Student is from students table - no corresponding user record
      // Set userId to null to avoid foreign key constraint violation
      userId = null;
      userType = 'STUDENT';
    } else {
      // Fallback: if source is not set, check role_code
      if (req.user.role_code === 'STUDENT') {
        userId = null;
        userType = 'STUDENT';
      } else {
        // Admin or other user from users table
        userId = req.user.id;
        userType = 'USER';
      }
    }

    await ActivityLog.create({
      user_id: userId,
      user_type: userType,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      description: description,
      request_method: req.method,
      request_path: req.path,
      request_body: requestBody,
      response_status: res.statusCode,
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Error logging activity:', error);
  }
}

/**
 * Generate default description based on action and entity
 */
function generateDefaultDescription(req, action, entityType, entityId) {
  const method = req.method;
  const path = req.path;
  const userEmail = req.user?.email || 'Unknown';

  switch (action) {
    case 'CREATE_ADMIN':
      return `${userEmail} created a new admin user`;
    case 'UPDATE_USER':
      return `${userEmail} updated user (ID: ${entityId})`;
    case 'DELETE_USER':
      return `${userEmail} deleted user (ID: ${entityId})`;
    case 'LOGIN':
      return `${userEmail} logged in`;
    case 'LOGOUT':
      return `${userEmail} logged out`;
    case 'VIEW_LOGS':
      return `${userEmail} viewed activity logs`;
    default:
      return `${userEmail} performed ${action} on ${entityType}${entityId ? ` (ID: ${entityId})` : ''}`;
  }
}

/**
 * Simple activity logger for specific actions
 */
const logActivitySimple = async (req, action, entityType, entityId = null, description = null) => {
  try {
    if (!req.user) return;

    const ipAddress =
      req.ip ||
      req.connection.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      'unknown';

    // Determine user_id and user_type based on user source
    // Students are in the 'students' table, not 'users' table
    let userId = null;
    let userType = 'USER';
    
    if (req.user.source === 'users') {
      // User is from users table (admin/super_admin) - use their user ID
      userId = req.user.id;
      userType = 'USER'; // Admins are logged as USER type
    } else if (req.user.source === 'students') {
      // Student is from students table - no corresponding user record
      userId = null;
      userType = 'STUDENT';
    } else {
      // Fallback: if source is not set, check role_code
      if (req.user.role_code === 'STUDENT') {
        userId = null;
        userType = 'STUDENT';
      } else {
        // Admin or other user from users table
        userId = req.user.id;
        userType = 'USER';
      }
    }

    // Convert entityId to integer if provided (Prisma expects Int or Null)
    const entityIdInt = entityId !== null && entityId !== undefined ? parseInt(entityId) : null;

    await ActivityLog.create({
      user_id: userId,
      user_type: userType,
      action: action,
      entity_type: entityType,
      entity_id: entityIdInt,
      description: description || `${req.user.email} performed ${action}`,
      request_method: req.method,
      request_path: req.path,
      request_body: null,
      response_status: null,
      ip_address: ipAddress,
      user_agent: req.headers['user-agent'] || null,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = {
  activityLogger,
  logActivitySimple,
};

