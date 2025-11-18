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
        `INSERT INTO students (email, full_name, phone, domain_id, status_id, created_by, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
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
        "SELECT id FROM intern_status WHERE status_code = 'REGISTERED' AND is_active = TRUE LIMIT 1"
      );
      
      let defaultStatusId = statusResult.rows[0]?.id;
      
      // If REGISTERED status doesn't exist, try to get the first active status
      if (!defaultStatusId) {
        const firstStatusResult = await pool.query(
          "SELECT id FROM intern_status WHERE is_active = TRUE ORDER BY id LIMIT 1"
        );
        defaultStatusId = firstStatusResult.rows[0]?.id;
      }
      
      // If still no status found, throw an error
      if (!defaultStatusId) {
        throw new Error('No active intern status found. Please run the database seed script: npm run db:seed');
      }

      for (const studentData of studentsData) {
        try {
          const { email, full_name, phone, domain_id, created_by } = studentData;
          
          // Validate required fields
          if (!email || !full_name) {
            results.failed.push({
              email: email || 'N/A',
              full_name: full_name || 'N/A',
              reason: 'Email and full_name are required',
            });
            continue;
          }
          
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
            `INSERT INTO students (email, full_name, phone, domain_id, status_id, created_by, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
            [email, full_name, phone || null, domain_id || null, defaultStatusId, created_by || null]
          );

          results.success.push({
            id: result.rows[0].id,
            email,
            full_name,
          });
        } catch (error) {
          console.error(`Error creating student ${studentData.email}:`, error);
          
          // Handle duplicate email constraint violation
          if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
            results.failed.push({
              email: studentData.email || 'N/A',
              full_name: studentData.full_name || 'N/A',
              reason: 'Email already exists',
            });
          } 
          // Handle foreign key constraint violations
          else if (error.code === '23503') {
            if (error.message.includes('status_id')) {
              results.failed.push({
                email: studentData.email || 'N/A',
                full_name: studentData.full_name || 'N/A',
                reason: 'Invalid status. Please run: npm run db:seed',
              });
            } else if (error.message.includes('domain_id')) {
              results.failed.push({
                email: studentData.email || 'N/A',
                full_name: studentData.full_name || 'N/A',
                reason: 'Invalid domain',
              });
            } else {
              results.failed.push({
                email: studentData.email || 'N/A',
                full_name: studentData.full_name || 'N/A',
                reason: `Database constraint violation: ${error.message}`,
              });
            }
          } else {
            results.failed.push({
              email: studentData.email || 'N/A',
              full_name: studentData.full_name || 'N/A',
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First, delete student_answers for all test attempts of this student
      // (student_answers has ON DELETE CASCADE from test_attempts, but we'll be explicit)
      await client.query(
        `DELETE FROM student_answers 
         WHERE test_attempt_id IN (
           SELECT id FROM test_attempts WHERE student_id = $1
         )`,
        [id]
      );

      // Then delete related test attempts
      // This handles the foreign key constraint from test_attempts.student_id
      await client.query(
        "DELETE FROM test_attempts WHERE student_id = $1",
        [id]
      );
      
      // Finally, delete the student record
      const result = await client.query(
        "DELETE FROM students WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error deleting student:", error);
      throw error;
    } finally {
      client.release();
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
      
      // Try to find existing domain (case-insensitive)
      let result = await pool.query(
        "SELECT id FROM domains WHERE LOWER(domain_name) = LOWER($1) AND is_active = TRUE LIMIT 1",
        [trimmedName]
      );

      if (result.rows.length > 0) {
        return result.rows[0].id;
      }

      // Generate domain code
      let domainCode = trimmedName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      
      // Ensure domain code is not empty
      if (!domainCode || domainCode.length === 0) {
        domainCode = 'DOMAIN_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      }

      // Check if domain_code already exists (to avoid unique constraint violation)
      const codeCheck = await pool.query(
        "SELECT id FROM domains WHERE domain_code = $1 LIMIT 1",
        [domainCode]
      );

      // If code exists, append a number
      if (codeCheck.rows.length > 0) {
        let counter = 1;
        let newCode = domainCode + '_' + counter;
        while (true) {
          const check = await pool.query(
            "SELECT id FROM domains WHERE domain_code = $1 LIMIT 1",
            [newCode]
          );
          if (check.rows.length === 0) {
            domainCode = newCode;
            break;
          }
          counter++;
          newCode = domainCode + '_' + counter;
        }
      }

      // Create new domain with all required fields
      result = await pool.query(
        `INSERT INTO domains (domain_name, domain_code, updated_at) 
         VALUES ($1, $2, NOW()) RETURNING id`,
        [trimmedName, domainCode]
      );

      console.log(`✅ Created domain: ${trimmedName} (ID: ${result.rows[0].id})`);
      return result.rows[0].id;
    } catch (error) {
      console.error("❌ Error getting or creating domain:", error.message);
      console.error("   Domain name:", domainName);
      console.error("   Error code:", error.code);
      
      // If it's a duplicate, try to find it again
      if (error.code === '23505') {
        try {
          const result = await pool.query(
            "SELECT id FROM domains WHERE LOWER(domain_name) = LOWER($1) AND is_active = TRUE LIMIT 1",
            [domainName.trim()]
          );
          if (result.rows.length > 0) {
            return result.rows[0].id;
          }
        } catch (retryError) {
          console.error("   Retry also failed:", retryError.message);
        }
      }
      
      // If domain creation fails, return null (domain_id can be null)
      return null;
    }
  }
}

module.exports = Student;

