const { prisma } = require('../config/database');
const { Prisma } = require('@prisma/client');

class Candidate {
  /**
   * Create a new candidate
   */
  static async create(candidateData) {
    try {
      const result = await prisma.$queryRaw`
        INSERT INTO candidates (
          first_name, middle_name, last_name, email, mobile_number,
          institute_name, course_taken, area_of_interests, internship_start_date,
          internship_end_date, reference_information, photograph_url,
          internal_faculty_name, faculty_contact, faculty_email,
          created_at, updated_at
        ) VALUES (
          ${candidateData.first_name},
          ${candidateData.middle_name || null},
          ${candidateData.last_name},
          ${candidateData.email},
          ${candidateData.mobile_number || null},
          ${candidateData.institute_name || null},
          ${candidateData.course_taken || null},
          ${candidateData.area_of_interests || null},
          ${candidateData.internship_start_date || null},
          ${candidateData.internship_end_date || null},
          ${candidateData.reference_information || null},
          ${candidateData.photograph_url || null},
          ${candidateData.internal_faculty_name || null},
          ${candidateData.faculty_contact || null},
          ${candidateData.faculty_email || null},
          NOW(), NOW()
        )
      `;

      // MySQL doesn't support RETURNING, so fetch the created record
      const created = await prisma.$queryRaw`
        SELECT * FROM candidates 
        WHERE email = ${candidateData.email} 
        ORDER BY id DESC 
        LIMIT 1
      `;

      return created[0] || null;
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
      const result = await prisma.$queryRaw`
        SELECT 
          c.*,
          COALESCE(MAX(ta.percentage_score), 0) as marks,
          MAX(ta.submitted_at) as last_test_date
        FROM candidates c
        LEFT JOIN students s ON LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
        LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status = 'COMPLETED'
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;

      return result;
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
      const result = await prisma.$queryRaw`
        SELECT 
          c.*,
          COALESCE(MAX(ta.percentage_score), 0) as marks,
          MAX(ta.submitted_at) as last_test_date
        FROM candidates c
        LEFT JOIN students s ON LOWER(TRIM(s.email)) = LOWER(TRIM(c.email))
        LEFT JOIN test_attempts ta ON ta.student_id = s.id AND ta.status = 'COMPLETED'
        WHERE c.id = ${id}
        GROUP BY c.id
      `;

      return result[0] || null;
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

      const allowedFields = [
        'first_name', 'middle_name', 'last_name', 'email', 'mobile_number',
        'institute_name', 'course_taken', 'area_of_interests', 'internship_start_date',
        'internship_end_date', 'reference_information', 'photograph_url',
        'internal_faculty_name', 'faculty_contact', 'faculty_email', 'is_selected'
      ];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      // Build the update query using Prisma.raw for dynamic SQL
      const updateQuery = Prisma.raw(`
        UPDATE candidates 
        SET ${fields.join(', ')} 
        WHERE id = ?
      `);

      await prisma.$executeRaw(updateQuery, ...values);

      // MySQL doesn't support RETURNING, so fetch the updated record
      const result = await prisma.$queryRaw`
        SELECT * FROM candidates WHERE id = ${id}
      `;

      return result[0] || null;
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
      await prisma.$executeRaw`
        UPDATE candidates 
        SET is_active = FALSE, updated_at = NOW() 
        WHERE id = ${id}
      `;

      // Check if update was successful
      const result = await prisma.$queryRaw`
        SELECT id FROM candidates WHERE id = ${id} AND is_active = FALSE
      `;

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting candidate:', error);
      throw error;
    }
  }

  /**
   * Bulk create candidates
   */
  static async bulkCreate(candidatesData) {
    try {
      const created = [];
      const errors = [];

      // Use Prisma transaction for atomicity
      await prisma.$transaction(async (tx) => {
        for (const candidateData of candidatesData) {
          try {
            // Check if candidate already exists by email
            const existing = await tx.$queryRaw`
              SELECT id FROM candidates 
              WHERE LOWER(TRIM(email)) = LOWER(TRIM(${candidateData.email})) 
              AND is_active = TRUE
            `;

            if (existing.length > 0) {
              errors.push({
                email: candidateData.email,
                reason: 'Candidate with this email already exists',
              });
              continue;
            }

            await tx.$executeRaw`
              INSERT INTO candidates (
                first_name, middle_name, last_name, email, mobile_number,
                institute_name, course_taken, area_of_interests, internship_start_date,
                internship_end_date, reference_information, photograph_url,
                internal_faculty_name, faculty_contact, faculty_email,
                created_at, updated_at
              ) VALUES (
                ${candidateData.first_name},
                ${candidateData.middle_name || null},
                ${candidateData.last_name},
                ${candidateData.email},
                ${candidateData.mobile_number || null},
                ${candidateData.institute_name || null},
                ${candidateData.course_taken || null},
                ${candidateData.area_of_interests || null},
                ${candidateData.internship_start_date || null},
                ${candidateData.internship_end_date || null},
                ${candidateData.reference_information || null},
                ${candidateData.photograph_url || null},
                ${candidateData.internal_faculty_name || null},
                ${candidateData.faculty_contact || null},
                ${candidateData.faculty_email || null},
                NOW(), NOW()
              )
            `;

            // Fetch the created record
            const newCandidate = await tx.$queryRaw`
              SELECT * FROM candidates 
              WHERE email = ${candidateData.email} 
              ORDER BY id DESC 
              LIMIT 1
            `;

            if (newCandidate[0]) {
              created.push(newCandidate[0]);
            }
          } catch (error) {
            errors.push({
              email: candidateData.email,
              reason: error.message || 'Failed to create candidate',
            });
          }
        }
      });

      return { created, errors };
    } catch (error) {
      console.error('Error in bulk create candidates:', error);
      throw error;
    }
  }
}

module.exports = Candidate;

