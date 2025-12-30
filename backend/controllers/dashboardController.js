const { prisma } = require('../config/database');

/**
 * Get dashboard statistics (KPIs)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total registered interns (students) with status breakdown
    const totalInternsResult = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status_id IN (SELECT id FROM intern_status WHERE status_code = 'ACTIVE') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status_id IN (SELECT id FROM intern_status WHERE status_code = 'INACTIVE') THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status_id IN (SELECT id FROM intern_status WHERE status_code = 'REGISTERED') THEN 1 ELSE 0 END) as pending
      FROM students 
      WHERE is_active = TRUE
    `;

    // Get previous period count for change calculation (last 30 days)
    const previousInternsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM students 
      WHERE is_active = TRUE 
      AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;

    const totalInterns = parseInt(totalInternsResult[0]?.total) || 0;
    const previousTotalInterns = parseInt(previousInternsResult[0]?.total) || 0;
    const internsChange = totalInterns - previousTotalInterns;

    // Get all domains count
    const domainsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM domains WHERE is_active = TRUE
    `;
    const previousDomainsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM domains 
      WHERE is_active = TRUE 
      AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const totalDomains = parseInt(domainsResult[0]?.total) || 0;
    const previousTotalDomains = parseInt(previousDomainsResult[0]?.total) || 0;
    const domainsChange = totalDomains - previousTotalDomains;

    // Get completed aptitude tests (test attempts with COMPLETED status)
    const completedAptitudeResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM test_attempts 
      WHERE status = 'COMPLETED'
    `;
    const previousCompletedResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM test_attempts 
      WHERE status = 'COMPLETED' 
      AND submitted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const completedAptitude = parseInt(completedAptitudeResult[0]?.total) || 0;
    const previousCompleted = parseInt(previousCompletedResult[0]?.total) || 0;
    const completedChange = completedAptitude - previousCompleted;

    // Get selected students (using students.is_selected flag)
    const selectedStudentsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM students s
      WHERE s.is_active = TRUE 
      AND s.is_selected = TRUE
    `;
    const previousSelectedResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM students s
      WHERE s.is_active = TRUE 
      AND s.is_selected = TRUE
      AND s.updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const selectedStudents = parseInt(selectedStudentsResult[0]?.total) || 0;
    const previousSelected = parseInt(previousSelectedResult[0]?.total) || 0;
    const selectedChange = selectedStudents - previousSelected;

    res.status(200).json({
      success: true,
      data: {
        totalInterns: {
          value: totalInterns,
          change: internsChange,
          trend: internsChange >= 0 ? 'up' : 'down',
          active: parseInt(totalInternsResult[0]?.active) || 0,
          inactive: parseInt(totalInternsResult[0]?.inactive) || 0,
          pending: parseInt(totalInternsResult[0]?.pending) || 0,
        },
        allDomains: {
          value: totalDomains,
          change: domainsChange,
          trend: domainsChange >= 0 ? 'up' : 'down',
        },
        completedAptitude: {
          value: completedAptitude,
          change: completedChange,
          trend: completedChange >= 0 ? 'up' : 'down',
        },
        selectedStudents: {
          value: selectedStudents,
          change: selectedChange,
          trend: selectedChange >= 0 ? 'up' : 'down',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get detailed data for a specific KPI card
 */
exports.getCardDetails = async (req, res) => {
  try {
    const { cardId } = req.params;

    switch (cardId) {
      case 'total-interns': {
        // Get students by status for pie chart
        const statusResult = await prisma.$queryRaw`
          SELECT 
            ist.status_name,
            ist.status_code,
            COUNT(*) as count
          FROM students s
          JOIN intern_status ist ON s.status_id = ist.id
          WHERE s.is_active = TRUE
          GROUP BY ist.status_name, ist.status_code
          ORDER BY count DESC
        `;

        const pieData = statusResult.map((row, index) => {
          const colors = ['#4C763B', '#B0CE88', '#88B0CE', '#CE88B0', '#88CEB0'];
          return {
            label: row.status_name,
            value: parseInt(row.count) || 0,
            color: colors[index % colors.length],
          };
        });

        // Get all students list
        const studentsResult = await prisma.$queryRaw`
          SELECT 
            s.id,
            s.full_name as name,
            s.email,
            d.domain_name as domain,
            ist.status_name as status,
            s.created_at as registered_date
          FROM students s
          LEFT JOIN domains d ON s.domain_id = d.id
          LEFT JOIN intern_status ist ON s.status_id = ist.id
          WHERE s.is_active = TRUE
          ORDER BY s.created_at DESC
          LIMIT 50
        `;

        // Get students who completed aptitude tests (MySQL version - using subquery instead of DISTINCT ON)
        const aptitudeStudentsResult = await prisma.$queryRaw`
          SELECT 
            s.id,
            s.full_name as name,
            s.email,
            d.domain_name as domain,
            ta.percentage_score as score,
            'Completed' as status
          FROM students s
          LEFT JOIN domains d ON s.domain_id = d.id
          JOIN test_attempts ta ON s.id = ta.student_id
          WHERE s.is_active = TRUE
          AND ta.status = 'COMPLETED'
          AND ta.id = (
            SELECT ta2.id 
            FROM test_attempts ta2 
            WHERE ta2.student_id = s.id 
            AND ta2.status = 'COMPLETED'
            ORDER BY ta2.submitted_at DESC 
            LIMIT 1
          )
          ORDER BY ta.submitted_at DESC
          LIMIT 50
        `;

        res.status(200).json({
          success: true,
          data: {
            pieData,
            tables: [
              {
                title: 'Total Register Students',
                data: studentsResult.map(row => ({
                  id: row.id,
                  name: row.name,
                  email: row.email,
                  domain: row.domain || 'N/A',
                  status: row.status,
                  registeredDate: new Date(row.registered_date).toISOString().split('T')[0],
                })),
                columns: [
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'domain', label: 'Domain' },
                  { key: 'status', label: 'Status' },
                  { key: 'registeredDate', label: 'Registered' },
                ],
              },
              {
                title: 'Aptitude Students',
                data: aptitudeStudentsResult.map(row => ({
                  id: row.id,
                  name: row.name,
                  email: row.email,
                  domain: row.domain || 'N/A',
                  score: row.score ? Math.round(Number(row.score)) : null,
                  status: row.status,
                })),
                columns: [
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'domain', label: 'Domain' },
                  { key: 'score', label: 'Score' },
                  { key: 'status', label: 'Status' },
                ],
              },
            ],
          },
        });
        break;
      }

      case 'all-domains': {
        // Get domain distribution
        const domainResult = await prisma.$queryRaw`
          SELECT 
            d.domain_name,
            COUNT(s.id) as student_count
          FROM domains d
          LEFT JOIN students s ON d.id = s.domain_id AND s.is_active = TRUE
          WHERE d.is_active = TRUE
          GROUP BY d.id, d.domain_name
          ORDER BY student_count DESC
        `;

        const pieData = domainResult.map((row, index) => {
          const colors = ['#4C763B', '#B0CE88', '#88B0CE', '#CE88B0', '#88CEB0'];
          return {
            label: row.domain_name,
            value: parseInt(row.student_count) || 0,
            color: colors[index % colors.length],
          };
        });

        // Get domain statistics
        const domainStatsResult = await prisma.$queryRaw`
          SELECT 
            d.domain_name as domain,
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT CASE WHEN ist.status_code = 'ACTIVE' THEN s.id END) as active,
            COUNT(DISTINCT CASE WHEN ta.status = 'COMPLETED' THEN ta.id END) as completed
          FROM domains d
          LEFT JOIN students s ON d.id = s.domain_id AND s.is_active = TRUE
          LEFT JOIN intern_status ist ON s.status_id = ist.id
          LEFT JOIN test_attempts ta ON s.id = ta.student_id
          WHERE d.is_active = TRUE
          GROUP BY d.id, d.domain_name
          ORDER BY total_students DESC
        `;

        res.status(200).json({
          success: true,
          data: {
            pieData,
            tables: [
              {
                title: 'Domain Statistics',
                data: domainStatsResult.map(row => ({
                  id: row.domain,
                  domain: row.domain,
                  totalStudents: parseInt(row.total_students) || 0,
                  active: parseInt(row.active) || 0,
                  completed: parseInt(row.completed) || 0,
                })),
                columns: [
                  { key: 'domain', label: 'Domain' },
                  { key: 'totalStudents', label: 'Total Students' },
                  { key: 'active', label: 'Active' },
                  { key: 'completed', label: 'Completed' },
                ],
              },
            ],
          },
        });
        break;
      }

      case 'completed-aptitude': {
        // Get score distribution
        const scoreDistributionResult = await prisma.$queryRaw`
          SELECT 
            grade_range,
            COUNT(*) as count
          FROM (
            SELECT 
              CASE 
                WHEN percentage_score >= 90 THEN 'Excellent (90-100)'
                WHEN percentage_score >= 75 THEN 'Good (75-89)'
                WHEN percentage_score >= 60 THEN 'Average (60-74)'
                ELSE 'Below Average (<60)'
              END as grade_range,
              CASE 
                WHEN percentage_score >= 90 THEN 1
                WHEN percentage_score >= 75 THEN 2
                WHEN percentage_score >= 60 THEN 3
                ELSE 4
              END as sort_order
            FROM test_attempts
            WHERE status = 'COMPLETED'
          ) subquery
          GROUP BY grade_range, sort_order
          ORDER BY sort_order
        `;

        const pieData = scoreDistributionResult.map((row, index) => {
          const colors = ['#4C763B', '#B0CE88', '#88B0CE', '#CE88B0'];
          return {
            label: row.grade_range,
            value: parseInt(row.count) || 0,
            color: colors[index % colors.length],
          };
        });

        // Get completed aptitude tests
        const completedTestsResult = await prisma.$queryRaw`
          SELECT 
            ta.id,
            s.full_name as name,
            s.email,
            ta.percentage_score as score,
            CASE 
              WHEN ta.percentage_score >= 90 THEN 'Excellent'
              WHEN ta.percentage_score >= 75 THEN 'Good'
              WHEN ta.percentage_score >= 60 THEN 'Average'
              ELSE 'Below Average'
            END as grade,
            ta.submitted_at as completed_date
          FROM test_attempts ta
          JOIN students s ON ta.student_id = s.id
          WHERE ta.status = 'COMPLETED'
          ORDER BY ta.submitted_at DESC
          LIMIT 50
        `;

        res.status(200).json({
          success: true,
          data: {
            pieData,
            tables: [
              {
                title: 'Completed Aptitude Tests',
                data: completedTestsResult.map(row => ({
                  id: row.id,
                  name: row.name,
                  email: row.email,
                  score: row.score ? Math.round(Number(row.score)) : null,
                  grade: row.grade,
                  completedDate: new Date(row.completed_date).toISOString().split('T')[0],
                })),
                columns: [
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'score', label: 'Score' },
                  { key: 'grade', label: 'Grade' },
                  { key: 'completedDate', label: 'Completed Date' },
                ],
              },
            ],
          },
        });
        break;
      }

      case 'selected-students': {
        // Get selected students by domain using students.is_selected flag
        const selectedByDomainResult = await prisma.$queryRaw`
          SELECT 
            d.domain_name,
            COUNT(s.id) as count
          FROM students s
          LEFT JOIN domains d ON s.domain_id = d.id
          WHERE s.is_active = TRUE
          AND s.is_selected = TRUE
          GROUP BY d.id, d.domain_name
          ORDER BY count DESC
        `;

        const pieData = selectedByDomainResult.map((row, index) => {
          const colors = ['#4C763B', '#B0CE88', '#88B0CE', '#CE88B0'];
          return {
            label: row.domain_name || 'N/A',
            value: parseInt(row.count) || 0,
            color: colors[index % colors.length],
          };
        });

        // Get selected students list
        const selectedStudentsResult = await prisma.$queryRaw`
          SELECT 
            s.id,
            s.full_name as name,
            s.email,
            d.domain_name as domain,
            s.updated_at as selection_date,
            'Selected' as status
          FROM students s
          LEFT JOIN domains d ON s.domain_id = d.id
          WHERE s.is_active = TRUE
          AND s.is_selected = TRUE
          ORDER BY s.updated_at DESC
          LIMIT 50
        `;

        res.status(200).json({
          success: true,
          data: {
            pieData,
            tables: [
              {
                title: 'Selected Students',
                data: selectedStudentsResult.map(row => ({
                  id: row.id,
                  name: row.name,
                  email: row.email,
                  domain: row.domain || 'N/A',
                  selectionDate: new Date(row.selection_date).toISOString().split('T')[0],
                  status: row.status,
                })),
                columns: [
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'domain', label: 'Domain' },
                  { key: 'selectionDate', label: 'Selection Date' },
                  { key: 'status', label: 'Status' },
                ],
              },
            ],
          },
        });
        break;
      }

      default:
        res.status(400).json({
          success: false,
          message: 'Invalid card ID',
        });
    }
  } catch (error) {
    console.error('Error fetching card details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

