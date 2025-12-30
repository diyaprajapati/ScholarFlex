const { prisma } = require('../config/database');

class ActivityLog {
  /**
   * Create a new activity log entry
   */
  static async create(logData) {
    try {
      const {
        user_id,
        user_type,
        action,
        entity_type,
        entity_id,
        description,
        request_method,
        request_path,
        request_body,
        response_status,
        ip_address,
        user_agent,
      } = logData;

      const result = await prisma.activityLog.create({
        data: {
          userId: user_id || null,
          userType: user_type || 'USER',
          action: action,
          entityType: entity_type || null,
          entityId: entity_id || null,
          description: description || null,
          requestMethod: request_method || null,
          requestPath: request_path || null,
          requestBody: request_body || null,
          responseStatus: response_status || null,
          ipAddress: ip_address || null,
          userAgent: user_agent || null,
        },
      });

      // Convert Prisma result to match expected format
      return {
        id: result.id,
        user_id: result.userId,
        user_type: result.userType,
        action: result.action,
        entity_type: result.entityType,
        entity_id: result.entityId,
        description: result.description,
        request_method: result.requestMethod,
        request_path: result.requestPath,
        request_body: result.requestBody,
        response_status: result.responseStatus,
        ip_address: result.ipAddress,
        user_agent: result.userAgent,
        created_at: result.createdAt,
      };
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  /**
   * Get logs with filters (for super admin - can see all, for admin - can see only admin logs)
   */
  static async getLogs(filters = {}) {
    try {
      const {
        user_id,
        user_type,
        action,
        entity_type,
        start_date,
        end_date,
        limit = 100,
        offset = 0,
        exclude_super_admin = false, // For admin users - exclude super admin logs
      } = filters;

      // Build where clause
      const where = {};

      if (user_id) {
        where.userId = user_id;
      }

      if (user_type) {
        where.userType = user_type;
      }

      if (action) {
        where.action = action;
      }

      if (entity_type) {
        where.entityType = entity_type;
      }

      if (start_date || end_date) {
        where.createdAt = {};
        if (start_date) {
          where.createdAt.gte = new Date(start_date);
        }
        if (end_date) {
          where.createdAt.lte = new Date(end_date);
        }
      }

      const results = await prisma.activityLog.findMany({
        where: where,
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Format results to match expected format and filter out super admin if needed
      let formattedResults = results.map((log) => ({
        id: log.id,
        user_id: log.userId,
        user_type: log.userType,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        description: log.description,
        request_method: log.requestMethod,
        request_path: log.requestPath,
        request_body: log.requestBody,
        response_status: log.responseStatus,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        created_at: log.createdAt,
        user_email: log.user?.email || null,
        user_name: log.user?.fullName || null,
        role_name: log.user?.role?.roleName || null,
        role_code: log.user?.role?.roleCode || null,
      }));

      // Filter out super admin logs if requested
      if (exclude_super_admin) {
        formattedResults = formattedResults.filter(
          (log) => log.role_code !== 'SUPER_ADMIN'
        );
      }

      return formattedResults;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  }

  /**
   * Get log count with filters
   */
  static async getLogCount(filters = {}) {
    try {
      const {
        user_id,
        user_type,
        action,
        entity_type,
        start_date,
        end_date,
        exclude_super_admin = false,
      } = filters;

      // Build where clause
      const where = {};

      if (user_id) {
        where.userId = user_id;
      }

      if (user_type) {
        where.userType = user_type;
      }

      if (action) {
        where.action = action;
      }

      if (entity_type) {
        where.entityType = entity_type;
      }

      if (start_date || end_date) {
        where.createdAt = {};
        if (start_date) {
          where.createdAt.gte = new Date(start_date);
        }
        if (end_date) {
          where.createdAt.lte = new Date(end_date);
        }
      }

      const allLogs = await prisma.activityLog.findMany({
        where: where,
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
      });

      // Filter out super admin logs if requested
      let filteredLogs = allLogs;
      if (exclude_super_admin) {
        filteredLogs = allLogs.filter(
          (log) => log.user?.role?.roleCode !== 'SUPER_ADMIN'
        );
      }

      return filteredLogs.length;

      return count;
    } catch (error) {
      console.error('Error getting log count:', error);
      throw error;
    }
  }

  /**
   * Get log by ID
   */
  static async getById(id) {
    try {
      const result = await prisma.activityLog.findUnique({
        where: { id: id },
        include: {
          user: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      // Format result to match expected format
      return {
        id: result.id,
        user_id: result.userId,
        user_type: result.userType,
        action: result.action,
        entity_type: result.entityType,
        entity_id: result.entityId,
        description: result.description,
        request_method: result.requestMethod,
        request_path: result.requestPath,
        request_body: result.requestBody,
        response_status: result.responseStatus,
        ip_address: result.ipAddress,
        user_agent: result.userAgent,
        created_at: result.createdAt,
        user_email: result.user?.email || null,
        user_name: result.user?.fullName || null,
        role_name: result.user?.role?.roleName || null,
        role_code: result.user?.role?.roleCode || null,
      };
    } catch (error) {
      console.error('Error getting activity log by ID:', error);
      throw error;
    }
  }
}

module.exports = ActivityLog;
