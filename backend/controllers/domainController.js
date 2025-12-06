const pool = require('../config/database');

/**
 * Get all active domains
 */
exports.getAllDomains = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, domain_name, domain_code, description
       FROM domains
       WHERE is_active = TRUE
       ORDER BY domain_name ASC`
    );

    res.status(200).json({
      success: true,
      message: 'Domains retrieved successfully',
      domains: result.rows,
      data: result.rows, // Keep for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

