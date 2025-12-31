const { prisma } = require('../config/database');

/**
 * Get all test attempts (Admin/Super Admin)
 */
exports.getAllTestAttempts = async (req, res) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        ta.id,
        ta.student_id,
        s.full_name AS student_name,
        s.email AS student_email,
        s.registration_date AS internship_start_date,
        d.domain_name,
        ta.question_paper_id,
        qp.paper_name,
        qp.duration_minutes,
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
      ORDER BY ta.submitted_at DESC, ta.started_at DESC
    `;

    res.status(200).json({
      success: true,
      message: 'Test attempts retrieved successfully',
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
