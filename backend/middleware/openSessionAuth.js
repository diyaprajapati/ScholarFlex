const { OpenSession } = require('../models/OpenStudent');

/**
 * Validate open student session token
 * Middleware to authenticate open students using session tokens
 */
const validateOpenSession = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers['x-open-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Session token required. Please register or login.',
      });
    }

    // Find session by token
    let session = await OpenSession.findByToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token. Please register again.',
      });
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please register again.',
      });
    }

    // Check if open student is active
    if (!session.openStudent || !session.openStudent.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Update last used time and extend expiration if needed
    session = await OpenSession.updateLastUsed(token);

    // Attach open student to request
    req.openStudent = session.openStudent;
    req.openSession = session;

    next();
  } catch (error) {
    console.error('Error in validateOpenSession:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = validateOpenSession;

