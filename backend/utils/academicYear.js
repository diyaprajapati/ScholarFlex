/**
 * Derive academic year string (e.g. "2025-26") from internship start and/or end date.
 * Used for filtering candidates by batch without adding columns to students table.
 * @param {Date|string|null} startDate - Internship start date
 * @param {Date|string|null} endDate - Internship end date (optional)
 * @returns {string|null} - e.g. "2025-26" or null if no date
 */
function deriveAcademicYear(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && !isNaN(start.getTime())) {
    const startYear = start.getFullYear();
    let endYear = startYear + 1; // default: same academic year spans two calendar years
    if (end && !isNaN(end.getTime())) {
      endYear = end.getFullYear();
    }
    const shortEnd = endYear % 100;
    const shortStart = startYear % 100;
    return `${startYear}-${String(shortEnd).padStart(2, '0')}`;
  }
  return null;
}

module.exports = { deriveAcademicYear };
