const { prisma } = require('../config/database');
const { OpenStudent, OpenSession } = require('../models/OpenStudent');

/**
 * Convert open student to intern
 * Transfers incomplete video progress and archives open student record
 */
class OpenStudentConversionService {
  /**
   * Convert open student to intern when admin creates intern with same email
   * @param {string} email - Email of the open student
   * @param {number} internStudentId - ID of the newly created intern student
   */
  static async convertToIntern(email, internStudentId) {
    try {
      // Find open student by email
      const openStudent = await OpenStudent.findByEmail(email);

      if (!openStudent) {
        // No open student found, nothing to convert
        return { converted: false, message: 'No open student found with this email' };
      }

      // Check if already converted
      if (openStudent.convertedToInternId) {
        return { converted: false, message: 'Open student already converted' };
      }

      // Get incomplete video progress
      const incompleteProgress = await prisma.openVideoProgress.findMany({
        where: {
          openStudentId: openStudent.id,
          isCompleted: false, // Only transfer incomplete videos
        },
        include: {
          video: true,
        },
      });

      // Transfer video progress
      let transferredCount = 0;
      for (const progress of incompleteProgress) {
        try {
          // Check if intern already has progress for this video
          const existingProgress = await prisma.videoProgress.findUnique({
            where: {
              studentId_videoId: {
                studentId: internStudentId,
                videoId: progress.videoId,
              },
            },
          });

          if (!existingProgress) {
            // Create new progress for intern
            await prisma.videoProgress.create({
              data: {
                studentId: internStudentId,
                videoId: progress.videoId,
                playlistId: progress.playlistId,
                openedAt: progress.openedAt,
                startedWatching: progress.startedWatching,
                watchTimeSeconds: progress.watchTimeSeconds,
                progressPercent: progress.progressPercent,
                lastPosition: progress.lastPosition,
                isCompleted: false, // Keep as incomplete
              },
            });
            transferredCount++;
          }
        } catch (error) {
          console.error(`Error transferring progress for video ${progress.videoId}:`, error);
          // Continue with other videos
        }
      }

      // Transfer playlist accesses (for analytics)
      const playlistAccesses = await prisma.openPlaylistAccess.findMany({
        where: {
          openStudentId: openStudent.id,
        },
      });

      let playlistAccessCount = 0;
      for (const access of playlistAccesses) {
        try {
          // Check if intern already has access record
          const existingAccess = await prisma.playlistAccess.findFirst({
            where: {
              studentId: internStudentId,
              playlistId: access.playlistId,
            },
          });

          if (!existingAccess) {
            await prisma.playlistAccess.create({
              data: {
                studentId: internStudentId,
                playlistId: access.playlistId,
                openedAt: access.openedAt,
              },
            });
            playlistAccessCount++;
          }
        } catch (error) {
          console.error(`Error transferring playlist access ${access.id}:`, error);
          // Continue with other accesses
        }
      }

      // Invalidate all open student sessions
      await OpenSession.deleteAllForStudent(openStudent.id);

      // Archive open student record
      await OpenStudent.markAsConverted(openStudent.id, internStudentId);

      return {
        converted: true,
        message: 'Open student converted to intern successfully',
        transferredProgress: transferredCount,
        transferredPlaylistAccesses: playlistAccessCount,
      };
    } catch (error) {
      console.error('Error converting open student to intern:', error);
      throw error;
    }
  }

  /**
   * Check if email exists as open student
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  static async isOpenStudent(email) {
    try {
      const openStudent = await OpenStudent.findByEmail(email);
      return !!openStudent && openStudent.isActive && !openStudent.convertedToInternId;
    } catch (error) {
      console.error('Error checking if open student:', error);
      return false;
    }
  }
}

module.exports = OpenStudentConversionService;

