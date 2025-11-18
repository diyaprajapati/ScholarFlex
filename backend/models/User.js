const pool = require("../config/database");

class User {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        `SELECT u.*, r.role_name, r.role_code 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.email = $1 AND u.is_active = TRUE`,
        [email]
      );
      if (result.rows.length > 0) {
        return { ...result.rows[0], source: 'users' };
      }

      const studentResult = await pool.query(
        `SELECT 
          s.id, 
          s.email, 
          s.full_name, 
          'Student' AS role_name, 
          'STUDENT' AS role_code
         FROM students s
         WHERE s.email = $1 AND s.is_active = TRUE`,
        [email]
      );

      if (studentResult.rows.length > 0) {
        return { ...studentResult.rows[0], source: 'students' };
      }

      return null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT u.*, r.role_name, r.role_code 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1 AND u.is_active = TRUE`,
        [id]
      );
      if (result.rows.length > 0) {
        return { ...result.rows[0], source: 'users' };
      }

      const studentResult = await pool.query(
        `SELECT 
          s.id, 
          s.email, 
          s.full_name, 
          'Student' AS role_name, 
          'STUDENT' AS role_code,
          s.is_active
         FROM students s
         WHERE s.id = $1 AND s.is_active = TRUE`,
        [id]
      );

      if (studentResult.rows.length > 0) {
        return { ...studentResult.rows[0], source: 'students' };
      }

      return null;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async create(userData) {
    try {
      const { email, full_name, role_id, created_by } = userData;
      const result = await pool.query(
        `INSERT INTO users (email, full_name, role_id, created_by, updated_at) 
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [email, full_name, role_id, created_by]
      );
      return await this.findById(result.rows[0].id);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(userId) {
    try {
      await pool.query(
        "UPDATE users SET last_login_at = NOW() WHERE id = $1",
        [userId]
      );
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  static async exists(email) {
    try {
      const result = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (result.rows.length > 0) return true;

      const studentResult = await pool.query(
        "SELECT id FROM students WHERE email = $1 AND is_active = TRUE",
        [email]
      );
      return studentResult.rows.length > 0;
    } catch (error) {
      console.error("Error checking user existence:", error);
      throw error;
    }
  }

  /**
   * Get all admins (for super admin to view)
   */
  static async getAllAdmins() {
    try {
      const result = await pool.query(
        `SELECT u.*, r.role_name, r.role_code 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN') AND u.is_active = TRUE
         ORDER BY u.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting all admins:", error);
      throw error;
    }
  }

  /**
   * Get admin by ID
   */
  static async getAdminById(id) {
    try {
      const result = await pool.query(
        `SELECT u.*, r.role_name, r.role_code 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1 AND r.role_code IN ('SUPER_ADMIN', 'ADMIN')`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting admin by ID:", error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 0;

      if (updateData.full_name !== undefined) {
        paramCount++;
        fields.push(`full_name = $${paramCount}`);
        values.push(updateData.full_name);
      }

      if (updateData.is_active !== undefined) {
        paramCount++;
        fields.push(`is_active = $${paramCount}`);
        values.push(updateData.is_active);
      }

      if (updateData.role_id !== undefined) {
        paramCount++;
        fields.push(`role_id = $${paramCount}`);
        values.push(updateData.role_id);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      paramCount++;
      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id`,
        values
      );

      return await this.findById(id);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting is_active = false)
   */
  static async delete(id) {
    try {
      await pool.query(
        "UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1",
        [id]
      );
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
}

module.exports = User;
