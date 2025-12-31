const { prisma } = require('../config/database');
const ActivityLog = require('../models/ActivityLog');
const { logActivitySimple } = require('../middleware/activityLogger');

/**
 * Get activity logs with filters
 * Super Admin: Can see all logs
 * Admin: Can see only admin logs (excludes super admin logs)
 */
const getLogs = async (req, res) => {
  try {
    const {
      user_id,
      user_type,
      action,
      entity_type,
      start_date,
      end_date,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Determine if we should exclude super admin logs
    // Admin users cannot see super admin logs
    const excludeSuperAdmin = req.user.role_code === 'ADMIN';

    const filters = {
      user_id: user_id ? parseInt(user_id) : null,
      user_type: user_type || null,
      action: action || null,
      entity_type: entity_type || null,
      start_date: start_date || null,
      end_date: end_date || null,
      limit: parseInt(limit),
      offset: offset,
      exclude_super_admin: excludeSuperAdmin,
    };

    // Get logs and total count
    const [logs, total] = await Promise.all([
      ActivityLog.getLogs(filters),
      ActivityLog.getLogCount(filters),
    ]);

    // Log the activity
    await logActivitySimple(
      req,
      'VIEW_LOGS',
      'ACTIVITY_LOG',
      null,
      `${req.user.email} viewed activity logs (${logs.length} results)`
    );

    res.status(200).json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        user: log.user_email
          ? {
              id: log.user_id,
              email: log.user_email,
              name: log.user_name,
              role: log.role_code,
              role_name: log.role_name,
            }
          : null,
        user_type: log.user_type,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        description: log.description,
        request_method: log.request_method,
        request_path: log.request_path,
        response_status: log.response_status,
        ip_address: log.ip_address,
        created_at: log.created_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error in getLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get log by ID
 */
const getLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await ActivityLog.getById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log not found',
      });
    }

    // Check permissions: Admin cannot see super admin logs
    if (req.user.role_code === 'ADMIN' && log.role_code === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot view super admin logs.',
      });
    }

    // Log the activity
    await logActivitySimple(
      req,
      'VIEW_LOG',
      'ACTIVITY_LOG',
      id,
      `${req.user.email} viewed log entry: ${id}`
    );

    res.status(200).json({
      success: true,
      log: {
        id: log.id,
        user: log.user_email
          ? {
              id: log.user_id,
              email: log.user_email,
              name: log.user_name,
              role: log.role_code,
              role_name: log.role_name,
            }
          : null,
        user_type: log.user_type,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        description: log.description,
        request_method: log.request_method,
        request_path: log.request_path,
        request_body: log.request_body,
        response_status: log.response_status,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      },
    });
  } catch (error) {
    console.error('Error in getLogById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get log statistics
 */
const getLogStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Determine if we should exclude super admin logs
    const excludeSuperAdmin = req.user.role_code === 'ADMIN';

    // Get total logs count
    const totalLogs = await ActivityLog.getLogCount({
      start_date,
      end_date,
      exclude_super_admin: excludeSuperAdmin,
    });

    // Get logs by action (top 10) using Prisma
    const whereClause = {};
    if (start_date) {
      whereClause.createdAt = { gte: new Date(start_date) };
    }
    if (end_date) {
      whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(end_date) };
    }
    if (excludeSuperAdmin) {
      whereClause.OR = [
        {
          user: {
            role: {
              roleCode: { not: 'SUPER_ADMIN' },
            },
          },
        },
        {
          user: null,
        },
      ];
    }

    const actionStatsResult = await prisma.activityLog.groupBy({
      by: ['action'],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Transform to match expected format
    const actionStats = actionStatsResult.map(stat => ({
      action: stat.action,
      count: stat._count.id,
    }));

    // Log the activity
    await logActivitySimple(
      req,
      'VIEW_LOG_STATS',
      'ACTIVITY_LOG',
      null,
      `${req.user.email} viewed log statistics`
    );

    res.status(200).json({
      success: true,
      stats: {
        total_logs: totalLogs,
        action_breakdown: actionStats,
      },
    });
  } catch (error) {
    console.error('Error in getLogStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getLogs,
  getLogById,
  getLogStats,
};

