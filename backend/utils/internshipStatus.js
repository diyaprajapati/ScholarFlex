/**
 * Utility functions for calculating and managing internship status
 * This is the single source of truth for internship status calculation
 */

const { InternshipStatus } = require('@prisma/client');

/**
 * Calculate internship status based on start_date and end_date
 * 
 * Rules:
 * - If start_date is NULL or < today: NOT_STARTED
 * - If start_date <= today AND end_date > today: ONGOING
 * - If end_date >= today: COMPLETED
 * 
 * @param {Date|null} startDate - Internship start date
 * @param {Date|null} endDate - Internship end date
 * @returns {string} - Status: 'NOT_STARTED', 'ONGOING', or 'COMPLETED'
 */
function calculateInternshipStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // If start_date is NULL or < today: NOT_STARTED
  if (!startDate) {
    return InternshipStatus.NOT_STARTED;
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (start > today) {
    return InternshipStatus.NOT_STARTED;
  }

  // If start_date <= today AND end_date > today: ONGOING
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (start <= today && end > today) {
      return InternshipStatus.ONGOING;
    }

    // If end_date <= today: COMPLETED
    if (end <= today) {
      return InternshipStatus.COMPLETED;
    }
  }

  // If start_date <= today but no end_date: ONGOING (assume ongoing if started)
  if (start <= today) {
    return InternshipStatus.ONGOING;
  }

  // Default to NOT_STARTED
  return InternshipStatus.NOT_STARTED;
}

/**
 * Get or create internship status record for a student
 * Updates the status based on current dates
 * 
 * @param {Object} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @param {Date|null} startDate - Internship start date
 * @param {Date|null} endDate - Internship end date
 * @returns {Promise<Object>} - StudentInternship record
 */
async function getOrUpdateInternshipStatus(prisma, studentId, startDate, endDate) {
  const status = calculateInternshipStatus(startDate, endDate);

  // Upsert: update if exists, create if not
  const internship = await prisma.studentInternship.upsert({
    where: { studentId },
    update: {
      status,
      updatedAt: new Date(),
    },
    create: {
      studentId,
      status,
    },
  });

  return internship;
}

/**
 * Check if internship is currently ONGOING
 * 
 * @param {Date|null} startDate - Internship start date
 * @param {Date|null} endDate - Internship end date
 * @returns {boolean} - True if internship is ONGOING
 */
function isInternshipOngoing(startDate, endDate) {
  return calculateInternshipStatus(startDate, endDate) === InternshipStatus.ONGOING;
}

module.exports = {
  calculateInternshipStatus,
  getOrUpdateInternshipStatus,
  isInternshipOngoing,
  InternshipStatus,
};

