/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // If response has already been sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  console.error('Error:', err);
  if (err.stack) {
    console.error('Stack:', err.stack);
  }

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Invalid reference. Related record does not exist.';
  }

  // PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
  }

  if (err.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Invalid reference. Related record does not exist.';
  }

  try {
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  } catch (sendError) {
    // If we can't send the response, log it but don't crash
    console.error('Failed to send error response:', sendError);
  }
};

module.exports = errorHandler;

