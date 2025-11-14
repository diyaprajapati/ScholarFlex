const pool = require("../config/database");

class Student {
  /**
   * Find student by email
   */
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        `SELECT s.*, d.domain_name, ist.status_name, ist.status_code
         FROM students s 
         LEFT JOIN domains d ON s.domain_id = d.id
         LEFT JOIN intern_status ist ON s.status_id = ist.id
         WHERE s.email = $1 AND s.is_active = TRUE`,
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding student by email:", error);
      throw error;
    }
  }

  /**
   * Find student by ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT s.*, d.domain_name, ist.status_name, ist.status_code
         FROM students s 
         LEFT JOIN domains d ON s.domain_id = d.id
         LEFT JOIN intern_status ist ON s.status_id = ist.id
         WHERE s.id = $1 AND s.is_active = TRUE`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding student by ID:", error);
      throw error;
    }
  }

  /**
   * Create new student
   */
  static async create(studentData) {
    try {
      const { email, full_name, phone, domain_id, status_id, created_by } = studentData;
      
      // Check if student with this email already exists (case-insensitive)
      const existing = await pool.query(
        "SELECT id, email FROM students WHERE LOWER(email) = LOWER($1)",
        [email]
      );

      if (existing.rows.length > 0) {
        const error = new Error('Email already exists');
        error.code = 'DUPLICATE_EMAIL';
        throw error;
      }
      
      // Get default status_id if not provided (REGISTERED)
      let finalStatusId = status_id;
      if (!finalStatusId) {
        const statusResult = await pool.query(
          "SELECT id FROM intern_status WHERE status_code = 'REGISTERED' LIMIT 1"
        );
        finalStatusId = statusResult.rows[0]?.id || 1;
      }

      const result = await pool.query(
        `INSERT INTO students (email, full_name, phone, domain_id, status_id, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [email, full_name, phone, domain_id, finalStatusId, created_by]
      );
      return await this.findById(result.rows[0].id);
    } catch (error) {
      console.error("Error creating student:", error);
      throw error;
    }
  }

  /**
   * Create multiple students (bulk insert)
   */
  static async createBulk(studentsData) {
    try {
      const results = {
        success: [],
        failed: [],
      };

      // Get default status_id (REGISTERED)
      const statusResult = await pool.query(
        "SELECT id FROM intern_status WHERE status_code = 'REGISTERED' LIMIT 1"
      );
      const defaultStatusId = statusResult.rows[0]?.id || 1;

      for (const studentData of studentsData) {
        try {
          const { email, full_name, phone, domain_id, created_by } = studentData;
          
          // Check if student already exists (case-insensitive check)
          const existing = await pool.query(
            "SELECT id FROM students WHERE LOWER(email) = LOWER($1)",
            [email]
          );

          if (existing.rows.length > 0) {
            results.failed.push({
              email,
              full_name,
              reason: 'Email already exists',
            });
            continue;
          }

          const result = await pool.query(
            `INSERT INTO students (email, full_name, phone, domain_id, status_id, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [email, full_name, phone, domain_id, defaultStatusId, created_by]
          );

          results.success.push({
            id: result.rows[0].id,
            email,
            full_name,
          });
        } catch (error) {
          // Handle duplicate email constraint violation
          if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
            results.failed.push({
              email: studentData.email,
              full_name: studentData.full_name,
              reason: 'Email already exists',
            });
          } else {
            results.failed.push({
              email: studentData.email,
              full_name: studentData.full_name,
              reason: error.message || 'Failed to create student',
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error creating students in bulk:", error);
      throw error;
    }
  }

  /**
   * Get all students
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT s.*, d.domain_name, ist.status_name, ist.status_code
        FROM students s 
        LEFT JOIN domains d ON s.domain_id = d.id
        LEFT JOIN intern_status ist ON s.status_id = ist.id
        WHERE s.is_active = TRUE
      `;
      const params = [];
      let paramCount = 0;

      if (filters.domain_id) {
        paramCount++;
        query += ` AND s.domain_id = $${paramCount}`;
        params.push(filters.domain_id);
      }

      if (filters.status_id) {
        paramCount++;
        query += ` AND s.status_id = $${paramCount}`;
        params.push(filters.status_id);
      }

      query += ` ORDER BY s.created_at DESC`;

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error getting all students:", error);
      throw error;
    }
  }

  /**
   * Update student
   */
  static async update(id, updateData) {
    try {
      // If email is being updated, check if it already exists for another student (case-insensitive)
      if (updateData.email !== undefined) {
        const existing = await pool.query(
          "SELECT id, email FROM students WHERE LOWER(email) = LOWER($1) AND id != $2",
          [updateData.email, id]
        );

        if (existing.rows.length > 0) {
          const error = new Error('Email already exists for another intern');
          error.code = 'DUPLICATE_EMAIL';
          throw error;
        }
      }

      const fields = [];
      const values = [];
      let paramCount = 0;

      if (updateData.full_name !== undefined) {
        paramCount++;
        fields.push(`full_name = $${paramCount}`);
        values.push(updateData.full_name);
      }

      if (updateData.email !== undefined) {
        paramCount++;
        fields.push(`email = $${paramCount}`);
        values.push(updateData.email);
      }

      if (updateData.phone !== undefined) {
        paramCount++;
        fields.push(`phone = $${paramCount}`);
        values.push(updateData.phone);
      }

      if (updateData.domain_id !== undefined) {
        paramCount++;
        fields.push(`domain_id = $${paramCount}`);
        values.push(updateData.domain_id);
      }

      if (updateData.status_id !== undefined) {
        paramCount++;
        fields.push(`status_id = $${paramCount}`);
        values.push(updateData.status_id);
      }

      if (updateData.is_active !== undefined) {
        paramCount++;
        fields.push(`is_active = $${paramCount}`);
        values.push(updateData.is_active);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      paramCount++;
      values.push(id);

      await pool.query(
        `UPDATE students SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`,
        values
      );

      return await this.findById(id);
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  }

  /**
   * Delete student (hard delete - permanently removes from database)
   * Also deletes related test attempts and student answers via cascade
   */
  static async delete(id) {
    try {
      // First, delete related test attempts (which will cascade to student_answers)
      // This handles the foreign key constraint from test_attempts.student_id
      await pool.query(
        "DELETE FROM test_attempts WHERE student_id = $1",
        [id]
      );
      
      // Now delete the student record
      const result = await pool.query(
        "DELETE FROM students WHERE id = $1",
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  }

  /**
   * Get or create domain by name
   */
  static async getOrCreateDomain(domainName) {
    try {
      if (!domainName || !domainName.trim()) {
        return null;
      }

      const trimmedName = domainName.trim();
      
      // Try to find existing domain
      let result = await pool.query(
        "SELECT id FROM domains WHERE domain_name = $1 AND is_active = TRUE LIMIT 1",
        [trimmedName]
      );

      if (result.rows.length > 0) {
        return result.rows[0].id;
      }

      // Create new domain
      const domainCode = trimmedName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      result = await pool.query(
        `INSERT INTO domains (domain_name, domain_code) 
         VALUES ($1, $2) RETURNING id`,
        [trimmedName, domainCode]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error("Error getting or creating domain:", error);
      // If domain creation fails, return null (domain_id can be null)
      return null;
    }
  }
}

module.exports = Student;

