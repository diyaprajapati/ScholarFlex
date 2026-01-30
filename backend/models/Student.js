const { prisma } = require("../config/database");
const { Prisma } = require('@prisma/client');

class Student {
  /**
   * Find student by email
   */
  static async findByEmail(email) {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          s.*, 
          d.domain_name, 
          ist.status_name, 
          ist.status_code
        FROM students s 
        LEFT JOIN domains d ON s.domain_id = d.id
        LEFT JOIN intern_status ist ON s.status_id = ist.id
        WHERE s.email = ${email} AND s.is_active = TRUE
        LIMIT 1
      `;
      return result[0] || null;
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
      const result = await prisma.$queryRaw`
        SELECT 
          s.*, 
          d.domain_name, 
          ist.status_name, 
          ist.status_code
        FROM students s 
        LEFT JOIN domains d ON s.domain_id = d.id
        LEFT JOIN intern_status ist ON s.status_id = ist.id
        WHERE s.id = ${id} AND s.is_active = TRUE
        LIMIT 1
      `;
      return result[0] || null;
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
      const existing = await prisma.$queryRaw`
        SELECT id, email FROM students WHERE LOWER(email) = LOWER(${email}) LIMIT 1
      `;

      if (existing.length > 0) {
        const error = new Error('Email already exists');
        error.code = 'DUPLICATE_EMAIL';
        throw error;
      }
      
      // Get default status_id if not provided (REGISTERED)
      let finalStatusId = status_id;
      if (!finalStatusId) {
        const statusResult = await prisma.$queryRaw`
          SELECT id FROM intern_status WHERE status_code = 'REGISTERED' LIMIT 1
        `;
        finalStatusId = statusResult[0]?.id || 1;
      }

      // Create student using Prisma
      const student = await prisma.student.create({
        data: {
          email,
          fullName: full_name,
          phone: phone || null,
          domainId: domain_id || null,
          statusId: finalStatusId,
          createdBy: created_by || null,
        },
        include: {
          domain: true,
          status: true,
        },
      });

      // Format response to match expected structure
      return {
        ...student,
        domain_name: student.domain?.domainName || null,
        status_name: student.status?.statusName || null,
        status_code: student.status?.statusCode || null,
      };
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
      const statusResult = await prisma.$queryRaw`
        SELECT id FROM intern_status WHERE status_code = 'REGISTERED' AND is_active = TRUE LIMIT 1
      `;
      
      let defaultStatusId = statusResult[0]?.id;
      
      // If REGISTERED status doesn't exist, try to get the first active status
      if (!defaultStatusId) {
        const firstStatusResult = await prisma.$queryRaw`
          SELECT id FROM intern_status WHERE is_active = TRUE ORDER BY id LIMIT 1
        `;
        defaultStatusId = firstStatusResult[0]?.id;
      }
      
      // If still no status found, throw an error
      if (!defaultStatusId) {
        throw new Error('No active intern status found. Please run the database seed script: npm run db:seed');
      }

      // Use transaction for bulk operations
      await prisma.$transaction(async (tx) => {
        for (const studentData of studentsData) {
          try {
            const { 
              email, full_name, phone, domain_id, 
              image_url, institute_name, course_taken, area_of_interests,
              internship_start_date, internship_end_date, internship_duration,
              reference_information, internal_faculty_name, faculty_contact, faculty_email,
              created_by 
            } = studentData;
            
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
            const existing = await tx.$queryRaw`
              SELECT id FROM students WHERE LOWER(email) = LOWER(${email}) LIMIT 1
            `;

            if (existing.length > 0) {
              results.failed.push({
                email,
                full_name,
                reason: 'Email already exists',
              });
              continue;
            }

            // Create student
            const student = await tx.student.create({
              data: {
                email,
                fullName: full_name,
                phone: phone || null,
                domainId: domain_id || null,
                imageUrl: image_url || null,
                instituteName: institute_name || null,
                courseTaken: course_taken || null,
                areaOfInterests: area_of_interests || null,
                internshipStartDate: internship_start_date ? new Date(internship_start_date) : null,
                internshipEndDate: internship_end_date ? new Date(internship_end_date) : null,
                internshipDuration: internship_duration || null,
                referenceInformation: reference_information || null,
                internalFacultyName: internal_faculty_name || null,
                facultyContact: faculty_contact || null,
                facultyEmail: faculty_email || null,
                statusId: defaultStatusId,
                createdBy: created_by || null,
              },
            });

            results.success.push({
              id: student.id,
              email,
              full_name,
            });
          } catch (error) {
            console.error(`Error creating student ${studentData.email}:`, error);
            
            // Handle duplicate email constraint violation
            if (error.code === 'P2002' || error.message.includes('duplicate') || error.message.includes('unique')) {
              results.failed.push({
                email: studentData.email || 'N/A',
                full_name: studentData.full_name || 'N/A',
                reason: 'Email already exists',
              });
            } 
            // Handle foreign key constraint violations
            else if (error.code === 'P2003') {
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
      });

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
      // Build WHERE conditions using Prisma.sql
      const whereParts = [Prisma.sql`s.is_active = TRUE`];

      if (filters.domain_id) {
        whereParts.push(Prisma.sql`s.domain_id = ${filters.domain_id}`);
      }

      if (filters.status_id) {
        whereParts.push(Prisma.sql`s.status_id = ${filters.status_id}`);
      }

      // Build the main query
      let query = Prisma.sql`
        SELECT s.*, d.domain_name, ist.status_name, ist.status_code
        FROM students s 
        LEFT JOIN domains d ON s.domain_id = d.id
        LEFT JOIN intern_status ist ON s.status_id = ist.id
        WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
        ORDER BY s.created_at DESC
      `;

      // Add pagination if provided
      if (filters.limit) {
        query = Prisma.sql`${query} LIMIT ${filters.limit}`;
      }

      if (filters.offset) {
        query = Prisma.sql`${query} OFFSET ${filters.offset}`;
      }

      const result = await prisma.$queryRaw(query);
      return result;
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
        const existing = await prisma.$queryRaw`
          SELECT id, email FROM students WHERE LOWER(email) = LOWER(${updateData.email}) AND id != ${id} LIMIT 1
        `;

        if (existing.length > 0) {
          const error = new Error('Email already exists for another intern');
          error.code = 'DUPLICATE_EMAIL';
          throw error;
        }
      }

      // Build update data object
      const updateFields = {};
      
      if (updateData.full_name !== undefined) {
        updateFields.fullName = updateData.full_name;
      }
      if (updateData.email !== undefined) {
        updateFields.email = updateData.email;
      }
      if (updateData.phone !== undefined) {
        updateFields.phone = updateData.phone;
      }
      if (updateData.domain_id !== undefined) {
        updateFields.domainId = updateData.domain_id;
      }
      if (updateData.status_id !== undefined) {
        updateFields.statusId = updateData.status_id;
      }
      if (updateData.is_active !== undefined) {
        updateFields.isActive = updateData.is_active;
      }

      if (Object.keys(updateFields).length === 0) {
        return await this.findById(id);
      }

      // Update student using Prisma
      const student = await prisma.student.update({
        where: { id: parseInt(id) },
        data: updateFields,
        include: {
          domain: true,
          status: true,
        },
      });

      // Format response to match expected structure
      return {
        ...student,
        domain_name: student.domain?.domainName || null,
        status_name: student.status?.statusName || null,
        status_code: student.status?.statusCode || null,
      };
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
      // Use transaction for safe deletion
      await prisma.$transaction(async (tx) => {
        // Delete student answers for all test attempts of this student
        await tx.$executeRaw`
          DELETE FROM student_answers 
          WHERE test_attempt_id IN (
            SELECT id FROM test_attempts WHERE student_id = ${id}
          )
        `;

        // Delete related test attempts
        await tx.$executeRaw`
          DELETE FROM test_attempts WHERE student_id = ${id}
        `;
        
        // Finally, delete the student record
        await tx.student.delete({
          where: { id: parseInt(id) },
        });
      });

      return true;
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
      
      // Try to find existing domain (case-insensitive)
      let result = await prisma.$queryRaw`
        SELECT id FROM domains WHERE LOWER(domain_name) = LOWER(${trimmedName}) AND is_active = TRUE LIMIT 1
      `;

      if (result.length > 0) {
        return result[0].id;
      }

      // Generate domain code
      let domainCode = trimmedName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      
      // Ensure domain code is not empty
      if (!domainCode || domainCode.length === 0) {
        domainCode = 'DOMAIN_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      }

      // Check if domain_code already exists (to avoid unique constraint violation)
      const codeCheck = await prisma.$queryRaw`
        SELECT id FROM domains WHERE domain_code = ${domainCode} LIMIT 1
      `;

      // If code exists, append a number
      if (codeCheck.length > 0) {
        let counter = 1;
        let newCode = domainCode + '_' + counter;
        while (true) {
          const check = await prisma.$queryRaw`
            SELECT id FROM domains WHERE domain_code = ${newCode} LIMIT 1
          `;
          if (check.length === 0) {
            domainCode = newCode;
            break;
          }
          counter++;
          newCode = domainCode + '_' + counter;
        }
      }

      // Create new domain using Prisma
      const domain = await prisma.domain.create({
        data: {
          domainName: trimmedName,
          domainCode: domainCode,
        },
      });

      // console.log(`✅ Created domain: ${trimmedName} (ID: ${domain.id})`);
      return domain.id;
    } catch (error) {
      console.error("❌ Error getting or creating domain:", error.message);
      console.error("   Domain name:", domainName);
      console.error("   Error code:", error.code);
      
      // If it's a duplicate, try to find it again
      if (error.code === 'P2002') {
        try {
          const result = await prisma.$queryRaw`
            SELECT id FROM domains WHERE LOWER(domain_name) = LOWER(${domainName.trim()}) AND is_active = TRUE LIMIT 1
          `;
          if (result.length > 0) {
            return result[0].id;
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
