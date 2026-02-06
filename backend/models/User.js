const { prisma } = require("../config/database");
const { Prisma } = require('@prisma/client');

class User {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const result = await prisma.$queryRaw`
        SELECT u.*, r.role_name, r.role_code AS role_code
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ${email} AND u.is_active = TRUE
      `;
      if (result.length > 0) {
        const user = { ...result[0], source: 'users' };
        // Ensure role_code is always set and uppercase
        if (user.role_code) {
          user.role_code = String(user.role_code).toUpperCase().trim();
        }
        return user;
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
        SELECT u.*, r.role_name, r.role_code AS role_code
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ${id} AND u.is_active = TRUE
      `;
      if (result.length > 0) {
        const user = { ...result[0], source: 'users' };
        // Ensure role_code is always set and uppercase
        if (user.role_code) {
          user.role_code = String(user.role_code).toUpperCase().trim();
        }
        return user;
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
        WHERE r.role_code IN ('SUPER_ADMIN', 'ADMIN')
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
      
      if (updateData.email !== undefined) {
        updates.push(Prisma.sql`email = ${updateData.email}`);
      }

      if (updateData.full_name !== undefined) {
        updates.push(Prisma.sql`full_name = ${updateData.full_name}`);
      }

      if (updateData.is_active !== undefined) {
        updates.push(Prisma.sql`is_active = ${updateData.is_active}`);
      }

      if (updateData.role_id !== undefined) {
        updates.push(Prisma.sql`role_id = ${updateData.role_id}`);
      }

      // Get the updated user without filtering by is_active
      const getUserQuery = Prisma.sql`
        SELECT u.*, r.role_name, r.role_code 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ${id}
      `;

      if (updates.length === 0) {
        const result = await prisma.$queryRaw(getUserQuery);
        return result[0] || null;
      }

      // Build the update query
      const updateQuery = Prisma.sql`
        UPDATE users 
        SET ${Prisma.join(updates, ', ')}, updated_at = NOW() 
        WHERE id = ${id}
      `;

      await prisma.$executeRaw(updateQuery);

      // Get the updated user without filtering by is_active
      const result = await prisma.$queryRaw(getUserQuery);
      
      return result[0] || null;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Delete user (hard delete - permanently removes from database)
   * Handles foreign key constraints by first updating related records
   */
  static async delete(id) {
    try {
      // console.log(`[User.delete] Starting hard deletion for user ID: ${id}`);
      // Use a transaction to handle foreign key constraints
      return await prisma.$transaction(async (tx) => {
        // console.log(`[User.delete] Transaction started for user ID: ${id}`);
        // Find the first super admin to use as replacement for NOT NULL foreign keys
        const superAdminResult = await tx.$queryRaw`
          SELECT u.id 
          FROM users u 
          JOIN roles r ON u.role_id = r.id 
          WHERE r.role_code = 'SUPER_ADMIN' AND u.is_active = 1 AND u.id != ${id}
          ORDER BY u.id ASC
          LIMIT 1
        `;
        
        const replacementUserId = superAdminResult.length > 0 ? superAdminResult[0].id : null;

        // If no replacement admin found and there are NOT NULL foreign key constraints,
        // we can't proceed with deletion
        if (!replacementUserId) {
          // Check if there are any records that would prevent deletion
          const hasFileUploads = await tx.$queryRaw`
            SELECT COUNT(*) as count FROM file_uploads WHERE uploaded_by = ${id}
          `;
          const hasQuestionPapers = await tx.$queryRaw`
            SELECT COUNT(*) as count FROM question_papers WHERE created_by = ${id}
          `;
          const hasQuestions = await tx.$queryRaw`
            SELECT COUNT(*) as count FROM questions WHERE created_by = ${id}
          `;
          const hasTestAssignments = await tx.$queryRaw`
            SELECT COUNT(*) as count FROM test_assignments WHERE assigned_by = ${id}
          `;

          // Convert BigInt to Number for comparison
          const fileUploadsCount = Number(hasFileUploads[0]?.count || 0);
          const questionPapersCount = Number(hasQuestionPapers[0]?.count || 0);
          const questionsCount = Number(hasQuestions[0]?.count || 0);
          const testAssignmentsCount = Number(hasTestAssignments[0]?.count || 0);

          const totalRecords = fileUploadsCount + questionPapersCount + questionsCount + testAssignmentsCount;

          if (totalRecords > 0) {
            throw new Error('Cannot delete admin: No other active super admin available to transfer ownership. Please ensure at least one other super admin exists.');
          }
        }

        // Update nullable foreign keys to NULL
        await tx.$executeRaw`
          UPDATE users 
          SET created_by = NULL, updated_at = NOW() 
          WHERE created_by = ${id} AND id != ${id}
        `;

        await tx.$executeRaw`
          UPDATE activity_logs 
          SET user_id = NULL 
          WHERE user_id = ${id}
        `;

        await tx.$executeRaw`
          UPDATE question_papers 
          SET updated_by = NULL 
          WHERE updated_by = ${id}
        `;

        await tx.$executeRaw`
          UPDATE questions 
          SET updated_by = NULL 
          WHERE updated_by = ${id}
        `;

        await tx.$executeRaw`
          UPDATE students 
          SET created_by = NULL 
          WHERE created_by = ${id}
        `;

        await tx.$executeRaw`
          UPDATE noc_letters 
          SET reviewed_by = NULL 
          WHERE reviewed_by = ${id}
        `;

        // Update NOT NULL foreign keys to replacement admin (if available)
        if (replacementUserId) {
          await tx.$executeRaw`
            UPDATE file_uploads 
            SET uploaded_by = ${replacementUserId} 
            WHERE uploaded_by = ${id}
          `;

          await tx.$executeRaw`
            UPDATE question_papers 
            SET created_by = ${replacementUserId} 
            WHERE created_by = ${id}
          `;

          await tx.$executeRaw`
            UPDATE questions 
            SET created_by = ${replacementUserId} 
            WHERE created_by = ${id}
          `;

          await tx.$executeRaw`
            UPDATE test_assignments 
            SET assigned_by = ${replacementUserId} 
            WHERE assigned_by = ${id}
          `;
        }

        // Finally, hard delete the user (permanently remove from database)
        const deleteResult = await tx.$executeRaw`
          DELETE FROM users 
          WHERE id = ${id}
        `;

        // Verify the deletion was successful (record should no longer exist)
        const verifyResult = await tx.$queryRaw`
          SELECT id FROM users WHERE id = ${id}
        `;
        
        if (verifyResult.length > 0) {
          console.error(`[User.delete] Verification failed: User still exists after deletion attempt`);
          throw new Error('Admin deletion failed: Record still exists in database');
        }

        // console.log(`[User.delete] Successfully hard deleted user ID: ${id}`);
        return true;
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
}

module.exports = User;
