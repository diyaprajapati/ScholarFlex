const { prisma } = require('../config/database');
const crypto = require('crypto');

class OpenStudent {
  /**
   * Find open student by email
   */
  static async findByEmail(email) {
    try {
      const openStudent = await prisma.openStudent.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          videoProgresses: {
            include: {
              video: true,
            },
          },
          playlistAccesses: {
            include: {
              playlist: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      return openStudent;
    } catch (error) {
      console.error('Error finding open student by email:', error);
      throw error;
    }
  }

  /**
   * Find open student by ID
   */
  static async findById(id) {
    try {
      const openStudent = await prisma.openStudent.findUnique({
        where: { id: parseInt(id) },
        include: {
          videoProgresses: {
            include: {
              video: true,
            },
          },
          playlistAccesses: {
            include: {
              playlist: true,
            },
          },
        },
      });

      return openStudent;
    } catch (error) {
      console.error('Error finding open student by ID:', error);
      throw error;
    }
  }

  /**
   * Create new open student
   */
  static async create(studentData) {
    try {
      const { email, name, phone } = studentData;

      // Check if open student with this email already exists
      const existing = await prisma.openStudent.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existing) {
        const error = new Error('Email already registered');
        error.code = 'DUPLICATE_EMAIL';
        throw error;
      }

      // Create open student
      const openStudent = await prisma.openStudent.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name || null,
          phone: phone || null,
          isActive: true,
          lastAccessAt: new Date(),
        },
      });

      return openStudent;
    } catch (error) {
      console.error('Error creating open student:', error);
      throw error;
    }
  }

  /**
   * Update last access time
   */
  static async updateLastAccess(id) {
    try {
      const openStudent = await prisma.openStudent.update({
        where: { id: parseInt(id) },
        data: { lastAccessAt: new Date() },
      });

      return openStudent;
    } catch (error) {
      console.error('Error updating last access:', error);
      throw error;
    }
  }

  /**
   * Mark as converted to intern
   */
  static async markAsConverted(id, internStudentId) {
    try {
      const openStudent = await prisma.openStudent.update({
        where: { id: parseInt(id) },
        data: {
          convertedToInternId: internStudentId,
          convertedAt: new Date(),
          isActive: false,
        },
      });

      return openStudent;
    } catch (error) {
      console.error('Error marking as converted:', error);
      throw error;
    }
  }

  /**
   * Soft delete (mark as deleted)
   */
  static async softDelete(id) {
    try {
      const openStudent = await prisma.openStudent.update({
        where: { id: parseInt(id) },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      return openStudent;
    } catch (error) {
      console.error('Error soft deleting open student:', error);
      throw error;
    }
  }

  /**
   * Get inactive students (for retention policy)
   */
  static async getInactiveStudents(monthsAgo = 6) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

      const inactiveStudents = await prisma.openStudent.findMany({
        where: {
          isActive: true,
          convertedToInternId: null,
          deletedAt: null,
          lastAccessAt: {
            lt: cutoffDate,
          },
        },
      });

      return inactiveStudents;
    } catch (error) {
      console.error('Error getting inactive students:', error);
      throw error;
    }
  }

  /**
   * Get students ready for hard delete (soft deleted + grace period)
   */
  static async getStudentsForHardDelete(monthsAgo = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

      const students = await prisma.openStudent.findMany({
        where: {
          isActive: false,
          deletedAt: {
            lt: cutoffDate,
          },
          convertedToInternId: null, // Never delete converted records
        },
      });

      return students;
    } catch (error) {
      console.error('Error getting students for hard delete:', error);
      throw error;
    }
  }
}

class OpenSession {
  /**
   * Generate a new session token
   */
  static generateToken() {
    return crypto.randomUUID();
  }

  /**
   * Create a new session
   */
  static async create(openStudentId) {
    try {
      const token = OpenSession.generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days TTL

      const session = await prisma.openSession.create({
        data: {
          openStudentId: parseInt(openStudentId),
          token,
          expiresAt,
          lastUsedAt: new Date(),
        },
        include: {
          openStudent: true,
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Find session by token
   */
  static async findByToken(token) {
    try {
      const session = await prisma.openSession.findUnique({
        where: { token },
        include: {
          openStudent: true,
        },
      });

      return session;
    } catch (error) {
      console.error('Error finding session by token:', error);
      throw error;
    }
  }

  /**
   * Update last used time and extend expiration if needed
   */
  static async updateLastUsed(token) {
    try {
      const session = await prisma.openSession.findUnique({
        where: { token },
      });

      if (!session) {
        return null;
      }

      // Extend expiration if less than 7 days remaining
      const now = new Date();
      const daysUntilExpiry = (session.expiresAt - now) / (1000 * 60 * 60 * 24);
      
      let expiresAt = session.expiresAt;
      if (daysUntilExpiry < 7) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
      }

      const updated = await prisma.openSession.update({
        where: { token },
        data: {
          lastUsedAt: new Date(),
          expiresAt,
        },
        include: {
          openStudent: true,
        },
      });

      return updated;
    } catch (error) {
      console.error('Error updating last used:', error);
      throw error;
    }
  }

  /**
   * Delete session (logout)
   */
  static async delete(token) {
    try {
      await prisma.openSession.delete({
        where: { token },
      });

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Delete all sessions for an open student
   */
  static async deleteAllForStudent(openStudentId) {
    try {
      await prisma.openSession.deleteMany({
        where: { openStudentId: parseInt(openStudentId) },
      });

      return true;
    } catch (error) {
      console.error('Error deleting all sessions:', error);
      throw error;
    }
  }

  /**
   * Clean expired sessions
   */
  static async cleanExpired() {
    try {
      const result = await prisma.openSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      throw error;
    }
  }
}

module.exports = { OpenStudent, OpenSession };

