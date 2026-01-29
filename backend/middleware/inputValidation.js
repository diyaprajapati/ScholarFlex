/**
 * Input Validation Middleware
 * Prevents SQL injection by validating and sanitizing user input
 */

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /('|('')|;|--|#|\*|\/\*|\*\/|xp_|sp_)/gi,
  /(\bOR\b.*=.*)|(\bAND\b.*=.*)/gi,
  /(\bUNION\b.*\bSELECT\b)/gi,
  /(\bSELECT\b.*\bFROM\b)/gi,
  /(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/gi,
  /(\bUPDATE\b.*\bSET\b)/gi,
  /(\bDELETE\b.*\bFROM\b)/gi,
  /(\bDROP\b.*\bTABLE\b)/gi,
  /(\bEXEC\b|\bEXECUTE\b)/gi,
  /(;|\s--|\s#|\/\*|\*\/)/g,
];

// Dangerous characters
const DANGEROUS_CHARS = /[<>'"\\;{}[\]()]/g;

/**
 * Check if a string contains SQL injection patterns
 */
function containsSQLInjection(str) {
  if (typeof str !== 'string') return false;
  
  const upperStr = str.toUpperCase();
  
  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(str)) {
      // Allow common safe patterns
      if (str.match(/^(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)$/i)) {
        // Single SQL keyword without context is suspicious
        if (str.length < 20) continue;
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate numeric ID
 */
function isValidId(id) {
  if (id === null || id === undefined) return false;
  const numId = parseInt(id);
  return !isNaN(numId) && numId > 0 && numId <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validate enum value
 */
function isValidEnum(value, allowedValues) {
  if (!Array.isArray(allowedValues)) return false;
  return allowedValues.includes(value);
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Trim whitespace
  str = str.trim();
  
  // Limit length (prevent DoS)
  if (str.length > 10000) {
    str = str.substring(0, 10000);
  }
  
  return str;
}

/**
 * Validate request parameters
 */
function validateParams(req, res, next) {
  try {
    // Validate route parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (value && typeof value === 'string') {
          if (containsSQLInjection(value)) {
            return res.status(400).json({
              success: false,
              message: `Invalid parameter: ${key}. Contains potentially dangerous characters.`,
            });
          }
          
          // Validate ID parameters (only if key ends with 'id' or is exactly 'id')
          // This prevents false positives like 'skipNextVideo' being treated as an ID
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'id' || lowerKey.endsWith('id')) {
            if (!isValidId(value)) {
              return res.status(400).json({
                success: false,
                message: `Invalid ${key}: must be a positive integer`,
              });
            }
          }
        }
      }
    }

    // Validate query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (value && typeof value === 'string') {
          if (containsSQLInjection(value)) {
            return res.status(400).json({
              success: false,
              message: `Invalid query parameter: ${key}. Contains potentially dangerous characters.`,
            });
          }
          
          // Validate email query parameters
          if (key.toLowerCase().includes('email')) {
            if (!isValidEmail(value)) {
              return res.status(400).json({
                success: false,
                message: `Invalid email format: ${key}`,
              });
            }
          }
          
          // Validate ID query parameters (only if key ends with 'id' or is exactly 'id')
          // This prevents false positives like 'skipNextVideo' being treated as an ID
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'id' || lowerKey.endsWith('id')) {
            if (!isValidId(value)) {
              return res.status(400).json({
                success: false,
                message: `Invalid ${key}: must be a positive integer`,
              });
            }
          }
        }
      }
    }

    // Validate body parameters
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (value && typeof value === 'string') {
          if (containsSQLInjection(value)) {
            return res.status(400).json({
              success: false,
              message: `Invalid field: ${key}. Contains potentially dangerous characters.`,
            });
          }
          
          // Validate email fields
          if (key.toLowerCase().includes('email')) {
            if (!isValidEmail(value)) {
              return res.status(400).json({
                success: false,
                message: `Invalid email format: ${key}`,
              });
            }
          }
          
          // Validate ID fields (only if key ends with 'id' or is exactly 'id', and not email)
          // This prevents false positives like 'skipNextVideo' being treated as an ID
          const lowerKey = key.toLowerCase();
          if ((lowerKey === 'id' || lowerKey.endsWith('id')) && !lowerKey.includes('email')) {
            if (typeof value === 'string' && !isValidId(value)) {
              return res.status(400).json({
                success: false,
                message: `Invalid ${key}: must be a positive integer`,
              });
            }
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Input validation failed',
    });
  }
}

/**
 * Sanitize request data
 */
function sanitizeInput(req, res, next) {
  try {
    // Sanitize params
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          req.params[key] = sanitizeString(value);
        }
      }
    }

    // Sanitize query
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = sanitizeString(value);
        }
      }
    }

    // Sanitize body (recursively)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(500).json({
      success: false,
      message: 'Input sanitization failed',
    });
  }
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'string' ? sanitizeString(item) : 
      typeof item === 'object' && item !== null ? sanitizeObject(item) : 
      item
    );
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
}

module.exports = {
  validateParams,
  sanitizeInput,
  containsSQLInjection,
  isValidEmail,
  isValidId,
  isValidEnum,
  sanitizeString,
};

