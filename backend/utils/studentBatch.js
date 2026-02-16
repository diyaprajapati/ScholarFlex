const { prisma } = require('../config/database');
const { deriveAcademicYear } = require('./academicYear');

/**
 * Upsert student_batch for a student from internship start/end dates.
 * Call after creating or updating a student. No-op if no dates (academic year stays null).
 * @param {number} studentId
 * @param {Date|string|null} internshipStartDate
 * @param {Date|string|null} internshipEndDate
 */
async function upsertStudentBatch(studentId, internshipStartDate, internshipEndDate) {
  const academicYear = deriveAcademicYear(internshipStartDate, internshipEndDate);
  if (!academicYear) return;

  await prisma.studentBatch.upsert({
    where: { studentId },
    create: { studentId, academicYear },
    update: { academicYear },
  });
}

module.exports = { upsertStudentBatch };
