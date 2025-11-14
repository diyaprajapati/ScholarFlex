const pool = require('../config/database');

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

      const result = await pool.query(
        `INSERT INTO activity_logs (
          user_id, user_type, action, entity_type, entity_id, description,
          request_method, request_path, request_body, response_status,
          ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
        RETURNING *`,
        [
          user_id,
          user_type,
          action,
          entity_type,
          entity_id,
          description,
          request_method,
          request_path,
          request_body ? JSON.stringify(request_body) : null,
          response_status,
          ip_address,
          user_agent,
        ]
      );

      return result.rows[0];
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

      let query = `
        SELECT 
          al.*,
          u.email as user_email,
          u.full_name as user_name,
          r.role_name,
          r.role_code
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Exclude super admin logs if requested (for admin users)
      if (exclude_super_admin) {
        query += ` AND (r.role_code != 'SUPER_ADMIN' OR r.role_code IS NULL)`;
      }

      if (user_id) {
        paramCount++;
        query += ` AND al.user_id = $${paramCount}`;
        params.push(user_id);
      }

      if (user_type) {
        paramCount++;
        query += ` AND al.user_type = $${paramCount}`;
        params.push(user_type);
      }

      if (action) {
        paramCount++;
        query += ` AND al.action = $${paramCount}`;
        params.push(action);
      }

      if (entity_type) {
        paramCount++;
        query += ` AND al.entity_type = $${paramCount}`;
        params.push(entity_type);
      }

      if (start_date) {
        paramCount++;
        query += ` AND al.created_at >= $${paramCount}`;
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        query += ` AND al.created_at <= $${paramCount}`;
        params.push(end_date);
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
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

      let query = `
        SELECT COUNT(*) as total
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (exclude_super_admin) {
        query += ` AND (r.role_code != 'SUPER_ADMIN' OR r.role_code IS NULL)`;
      }

      if (user_id) {
        paramCount++;
        query += ` AND al.user_id = $${paramCount}`;
        params.push(user_id);
      }

      if (user_type) {
        paramCount++;
        query += ` AND al.user_type = $${paramCount}`;
        params.push(user_type);
      }

      if (action) {
        paramCount++;
        query += ` AND al.action = $${paramCount}`;
        params.push(action);
      }

      if (entity_type) {
        paramCount++;
        query += ` AND al.entity_type = $${paramCount}`;
        params.push(entity_type);
      }

      if (start_date) {
        paramCount++;
        query += ` AND al.created_at >= $${paramCount}`;
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        query += ` AND al.created_at <= $${paramCount}`;
        params.push(end_date);
      }

      const result = await pool.query(query, params);
      return parseInt(result.rows[0].total);
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
      const result = await pool.query(
        `SELECT 
          al.*,
          u.email as user_email,
          u.full_name as user_name,
          r.role_name,
          r.role_code
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE al.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting activity log by ID:', error);
      throw error;
    }
  }
}

module.exports = ActivityLog;

