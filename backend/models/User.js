const { prisma } = require("../config/database");
const { Prisma } = require('@prisma/client');

class User {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const result = await prisma.$queryRaw`
        SELECT u.*, r.role_name, r.role_code 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ${email} AND u.is_active = TRUE
      `;
      if (result.length > 0) {
        return { ...result[0], source: 'users' };
      }

      const studentResult = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.email, 
          s.full_name, 
          'Student' AS role_name, 
          'STUDENT' AS role_code,
          s.is_selected,
          s.can_retest,
          s.internship_end_date
        FROM students s
        WHERE s.email = ${email} AND s.is_active = TRUE
      `;

      if (studentResult.length > 0) {
        return { ...studentResult[0], source: 'students' };
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
      const result = await prisma.$queryRaw`
        SELECT u.*, r.role_name, r.role_code 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ${id} AND u.is_active = TRUE
      `;
      if (result.length > 0) {
        return { ...result[0], source: 'users' };
      }

      const studentResult = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.email, 
          s.full_name, 
          'Student' AS role_name, 
          'STUDENT' AS role_code,
          s.is_active,
          s.is_selected,
          s.can_retest,
          s.internship_end_date
        FROM students s
        WHERE s.id = ${id} AND s.is_active = TRUE
      `;

      if (studentResult.length > 0) {
        return { ...studentResult[0], source: 'students' };
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
      // MySQL doesn't support RETURNING, so we insert and then query
      await prisma.$executeRaw`
        INSERT INTO users (email, full_name, role_id, created_by, updated_at) 
        VALUES (${email}, ${full_name}, ${role_id}, ${created_by}, NOW())
      `;
      // Get the inserted user by email
      return await this.findByEmail(email);
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
      await prisma.$executeRaw`
        UPDATE users SET last_login_at = NOW() WHERE id = ${userId}
      `;
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
      const result = await prisma.$queryRaw`
        SELECT id FROM users WHERE email = ${email}
      `;
      if (result.length > 0) return true;

      const studentResult = await prisma.$queryRaw`
        SELECT id FROM students WHERE email = ${email} AND is_active = TRUE
      `;
      return studentResult.length > 0;
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
      const result = await prisma.$queryRaw`
        SELECT u.*, r.role_name, r.role_code 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN') AND u.is_active = TRUE
        ORDER BY u.created_at DESC
      `;
      return result;
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
      const result = await prisma.$queryRaw`
        SELECT u.*, r.role_name, r.role_code 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ${id} AND r.role_code IN ('SUPER_ADMIN', 'ADMIN')
      `;
      return result[0] || null;
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
      const updates = [];
      
      if (updateData.full_name !== undefined) {
        updates.push(Prisma.sql`full_name = ${updateData.full_name}`);
      }

      if (updateData.is_active !== undefined) {
        updates.push(Prisma.sql`is_active = ${updateData.is_active}`);
      }

      if (updateData.role_id !== undefined) {
        updates.push(Prisma.sql`role_id = ${updateData.role_id}`);
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      // Build the update query
      const updateQuery = Prisma.sql`
        UPDATE users 
        SET ${Prisma.join(updates, ', ')}, updated_at = NOW() 
        WHERE id = ${id}
      `;

      await prisma.$executeRaw(updateQuery);

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
      await prisma.$executeRaw`
        UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ${id}
      `;
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
}

module.exports = User;
