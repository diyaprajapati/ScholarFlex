const { prisma } = require('../config/database');
const User = require('../models/User');

/**
 * Get Firebase Analytics summary data
 * GET /api/admin/analytics/firebase
 */
const getFirebaseAnalytics = async (req, res) => {
  try {
    // Get total users (students + admins)
    const totalStudents = await prisma.student.count({
      where: { isActive: true }
    });

    // Get admin role IDs first
    const adminRoles = await prisma.role.findMany({
      where: {
        roleCode: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: { id: true }
    });
    
    const adminRoleIds = adminRoles.map(r => r.id);
    
    const totalAdmins = await prisma.user.count({
      where: {
        isActive: true,
        roleId: { in: adminRoleIds }
      }
    });

    const totalUsers = totalStudents + totalAdmins;

    // Get active users (last 7 days, 30 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Active students (based on last login or activity)
    const activeStudents7Days = await prisma.student.count({
      where: {
        isActive: true,
        updatedAt: { gte: sevenDaysAgo }
      }
    });

    const activeStudents30Days = await prisma.student.count({
      where: {
        isActive: true,
        updatedAt: { gte: thirtyDaysAgo }
      }
    });

    // Active admins
    const activeAdmins7Days = await prisma.user.count({
      where: {
        isActive: true,
        lastLoginAt: { gte: sevenDaysAgo },
        roleId: { in: adminRoleIds }
      }
    });

    const activeAdmins30Days = await prisma.user.count({
      where: {
        isActive: true,
        lastLoginAt: { gte: thirtyDaysAgo },
        roleId: { in: adminRoleIds }
      }
    });

    // Get new users (last 7 days, 30 days)
    const newStudents7Days = await prisma.student.count({
      where: {
        isActive: true,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const newStudents30Days = await prisma.student.count({
      where: {
        isActive: true,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    // Get selected students count
    const selectedStudents = await prisma.student.count({
      where: {
        isActive: true,
        isSelected: true
      }
    });

    // Get users by role
    const studentsByRole = await prisma.student.groupBy({
      by: ['isSelected'],
      where: { isActive: true },
      _count: true
    });

    const adminsByRole = await prisma.user.groupBy({
      by: ['roleId'],
      where: {
        isActive: true,
        roleId: { in: adminRoleIds }
      },
      _count: true
    });

    // Get role names for admins (reuse adminRoles from above, but get full details)
    const adminRolesWithNames = await prisma.role.findMany({
      where: {
        roleCode: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: {
        id: true,
        roleCode: true,
        roleName: true
      }
    });

    const roleMap = new Map(adminRolesWithNames.map(r => [r.id, { code: r.roleCode, name: r.roleName }]));

    // Format admin roles data
    const adminsByRoleFormatted = adminsByRole.map(item => ({
      role: roleMap.get(item.roleId)?.code || 'UNKNOWN',
      roleName: roleMap.get(item.roleId)?.name || 'Unknown',
      count: item._count
    }));

    // Get daily user activity based on actual activity (updatedAt) - last 30 days
    // This shows when users were last active, not when they registered
    const dailyActivity = await prisma.$queryRaw`
      SELECT 
        DATE(updated_at) as date,
        COUNT(DISTINCT id) as count
      FROM students
      WHERE is_active = TRUE
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(updated_at)
      ORDER BY date ASC
    `;

    // Also get daily new user registrations
    const dailyRegistrations = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM students
      WHERE is_active = TRUE
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Format daily activity
    const dailyActivityFormatted = dailyActivity.map(item => ({
      date: item.date.toISOString().split('T')[0],
      count: parseInt(item.count) || 0
    }));

    // Format daily registrations
    const dailyRegistrationsFormatted = dailyRegistrations.map(item => ({
      date: item.date.toISOString().split('T')[0],
      count: parseInt(item.count) || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalAdmins,
        selectedStudents,
        activeUsers: {
          last7Days: activeStudents7Days + activeAdmins7Days,
          last30Days: activeStudents30Days + activeAdmins30Days,
          students7Days: activeStudents7Days,
          students30Days: activeStudents30Days,
          admins7Days: activeAdmins7Days,
          admins30Days: activeAdmins30Days
        },
        newUsers: {
          last7Days: newStudents7Days,
          last30Days: newStudents30Days
        },
        usersByRole: {
          students: {
            selected: studentsByRole.find(s => s.isSelected === true)?._count || 0,
            notSelected: studentsByRole.find(s => s.isSelected === false)?._count || 0
          },
          admins: adminsByRoleFormatted
        },
        dailyActivity: dailyActivityFormatted,
        dailyRegistrations: dailyRegistrationsFormatted
      }
    });
  } catch (error) {
    console.error('Error fetching Firebase Analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  getFirebaseAnalytics
};
