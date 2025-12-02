const pool = require('../config/database');

class Candidate {
  /**
   * Create a new candidate
   */
  static async create(candidateData) {
    try {
      const result = await pool.query(
        `INSERT INTO candidates (
          first_name, middle_name, last_name, email, mobile_number,
          institute_name, course_taken, area_of_interests, internship_start_date,
          internship_end_date, reference_information, photograph_url,
          internal_faculty_name, faculty_contact, faculty_email,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *`,
        [
          candidateData.first_name,
          candidateData.middle_name || null,
          candidateData.last_name,
          candidateData.email,
          candidateData.mobile_number || null,
          candidateData.institute_name || null,
          candidateData.course_taken || null,
          candidateData.area_of_interests || null,
          candidateData.internship_start_date || null,
          candidateData.internship_end_date || null,
          candidateData.reference_information || null,
          candidateData.photograph_url || null,
          candidateData.internal_faculty_name || null,
          candidateData.faculty_contact || null,
          candidateData.faculty_email || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
  }

  /**
   * Get all candidates with their marks
   */
  static async findAll() {
    try {
      const result = await pool.query(
        `SELECT 
          c.*,
          COALESCE(MAX(ta.percentage_score), 0) as marks,
          MAX(ta.submitted_at) as last_test_date
        FROM candidates c
        LEFT JOIN students s ON LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
        LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status = 'COMPLETED'
        GROUP BY c.id
        ORDER BY c.created_at DESC`
      );

      return result.rows;
    } catch (error) {
      console.error('Error finding all candidates:', error);
      throw error;
    }
  }

  /**
   * Get candidate by ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          c.*,
          COALESCE(MAX(ta.percentage_score), 0) as marks,
          MAX(ta.submitted_at) as last_test_date
        FROM candidates c
        LEFT JOIN students s ON LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
        LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status = 'COMPLETED'
        WHERE c.id = $1
        GROUP BY c.id`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding candidate by ID:', error);
      throw error;
    }
  }

  /**
   * Update candidate
   */
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'first_name', 'middle_name', 'last_name', 'email', 'mobile_number',
        'institute_name', 'course_taken', 'area_of_interests', 'internship_start_date',
        'internship_end_date', 'reference_information', 'photograph_url',
        'internal_faculty_name', 'faculty_contact', 'faculty_email', 'is_selected'
      ];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE candidates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  /**
   * Delete candidate (soft delete)
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'UPDATE candidates SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  /**
   * Bulk create candidates
   */
  static async bulkCreate(candidatesData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const created = [];
      const errors = [];

      for (const candidateData of candidatesData) {
        try {
          // Check if candidate already exists by email
          const existing = await client.query(
            'SELECT id FROM candidates WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_active = TRUE',
            [candidateData.email]
          );

          if (existing.rows.length > 0) {
            errors.push({
              email: candidateData.email,
              reason: 'Candidate with this email already exists',
            });
            continue;
          }

          const result = await client.query(
            `INSERT INTO candidates (
              first_name, middle_name, last_name, email, mobile_number,
              institute_name, course_taken, area_of_interests, internship_start_date,
              internship_end_date, reference_information, photograph_url,
              internal_faculty_name, faculty_contact, faculty_email,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            RETURNING *`,
            [
              candidateData.first_name,
              candidateData.middle_name || null,
              candidateData.last_name,
              candidateData.email,
              candidateData.mobile_number || null,
              candidateData.institute_name || null,
              candidateData.course_taken || null,
              candidateData.area_of_interests || null,
              candidateData.internship_start_date || null,
              candidateData.internship_end_date || null,
              candidateData.reference_information || null,
              candidateData.photograph_url || null,
              candidateData.internal_faculty_name || null,
              candidateData.faculty_contact || null,
              candidateData.faculty_email || null,
            ]
          );

          created.push(result.rows[0]);
        } catch (error) {
          errors.push({
            email: candidateData.email,
            reason: error.message || 'Failed to create candidate',
          });
        }
      }

      await client.query('COMMIT');

      return { created, errors };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Candidate;

