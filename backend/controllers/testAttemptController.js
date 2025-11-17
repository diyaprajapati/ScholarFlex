const pool = require('../config/database');

/**
 * Get all test attempts (Admin/Super Admin)
 */
exports.getAllTestAttempts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ta.id,
        ta.student_id,
        s.full_name AS student_name,
        s.email AS student_email,
        d.domain_name,
        ta.question_paper_id,
        qp.paper_name,
        ta.status,
        ta.total_score,
        ta.max_possible_score,
        ta.percentage_score,
        ta.started_at,
        ta.submitted_at
      FROM test_attempts ta
      JOIN students s ON ta.student_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      JOIN question_papers qp ON ta.question_paper_id = qp.id
      ORDER BY ta.submitted_at DESC NULLS LAST, ta.started_at DESC`
    );

    res.status(200).json({
      success: true,
      message: 'Test attempts retrieved successfully',
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

