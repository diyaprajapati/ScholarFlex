const { prisma } = require('../config/database');

/**
 * Get all institutes with student counts.
 * This groups by the string field institute_name on students.
 */
exports.getInstituteStats = async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 
        TRIM(institute_name) AS institute_name,
        COUNT(*) AS student_count
      FROM students
      WHERE is_active = TRUE
        AND institute_name IS NOT NULL
        AND TRIM(institute_name) <> ''
      GROUP BY TRIM(institute_name)
      ORDER BY TRIM(institute_name) ASC
    `;

    const institutes = rows.map((row) => ({
      institute_name: row.institute_name,
      student_count: Number(row.student_count || 0),
    }));

    res.status(200).json({
      success: true,
      message: 'Institute statistics retrieved successfully',
      institutes,
      data: institutes,
    });
  } catch (error) {
    console.error('Error fetching institute stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Merge/rename institutes by updating students' institute_name.
 *
 * Body:
 * - source_name (required): current institute name to merge from
 * - target_name (required): new/canonical name to merge into
 */
exports.mergeInstitutes = async (req, res) => {
  try {
    const { source_name, target_name } = req.body || {};

    const source = (source_name || '').trim();
    const target = (target_name || '').trim();

    if (!source || !target) {
      return res.status(400).json({
        success: false,
        message: 'Both source_name and target_name are required',
      });
    }

    if (source.toLowerCase() === target.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Source and target institute names must be different',
      });
    }

    // Update all active students with this institute_name
    const result = await prisma.$executeRaw`
      UPDATE students
      SET institute_name = ${target}
      WHERE is_active = TRUE
        AND TRIM(institute_name) = ${source}
    `;

    res.status(200).json({
      success: true,
      message: 'Institutes merged successfully',
      source_name: source,
      target_name: target,
      updated_count: Number(result || 0),
    });
  } catch (error) {
    console.error('Error merging institutes:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

