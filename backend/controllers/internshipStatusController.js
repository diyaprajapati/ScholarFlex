const { prisma } = require('../config/database');
const { 
  calculateInternshipStatus, 
  getOrUpdateInternshipStatus 
} = require('../utils/internshipStatus');

// Helper function to calculate status from dates
const calculateStatus = (startDate, endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!startDate) {
    return 'NOT_STARTED';
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (start <= today && end > today) {
    return 'ONGOING';
  } else if (end <= today) {
    return 'COMPLETED';
  } else {
    return 'NOT_STARTED';
  }
};

// Helper function to update internship status
const updateInternshipStatus = async (studentId, startDate, endDate) => {
  const status = calculateStatus(startDate, endDate);
  
  const internship = await prisma.studentInternship.upsert({
    where: { studentId },
    update: { status },
    create: {
      studentId,
      status,
    },
  });

  return internship;
};

/**
 * Get student's internship status (Student only)
 * GET /api/student/internship/status
 */
const getStudentInternshipStatus = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student with dates
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        fullName: true,
        internshipStartDate: true,
        internshipEndDate: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Calculate status
    const status = calculateInternshipStatus(
      student.internshipStartDate,
      student.internshipEndDate
    );

    // Update or create internship status record
    const internship = await getOrUpdateInternshipStatus(
      prisma,
      student.id,
      student.internshipStartDate,
      student.internshipEndDate
    );

    res.json({
      success: true,
      data: {
        status,
        startDate: student.internshipStartDate,
        endDate: student.internshipEndDate,
        updatedAt: internship.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching internship status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all students' internship statuses (Admin only)
 * GET /api/admin/internship/status
 * Returns all selected students with their calculated internship status
 */
const getAllInternshipStatuses = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', search = '', status = '', domainId = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get all selected students
    const where = {
      isSelected: true,
      isActive: true,
    };

    // Add domain filter
    if (domainId) {
      where.domainId = parseInt(domainId);
    }

    // Add search filter
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { domain: { domainName: { contains: search } } },
      ];
    }

    // Determine sort order
    let orderBy = {};
    if (sortBy === 'name') {
      orderBy = { fullName: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'date') {
      orderBy = { internshipStartDate: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'status') {
      // For status sorting, we'll need to sort after calculating
      orderBy = { fullName: 'asc' }; // Default sort
    }

    // Get ALL selected students first (we'll filter by status and paginate after)
    const [allStudents, totalCount] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          imageUrl: true,
          internshipStartDate: true,
          internshipEndDate: true,
          domain: {
            select: {
              id: true,
              domainName: true,
              domainCode: true,
            },
          },
        },
        orderBy,
      }),
      prisma.student.count({ where }),
    ]);

    if (allStudents.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Get student IDs for all students
    const allStudentIds = allStudents.map(s => s.id);

    // Fetch existing internship records in one query for all students
    const existingInternships = await prisma.studentInternship.findMany({
      where: {
        studentId: { in: allStudentIds },
      },
    });

    // Create a map of existing internships by studentId
    const internshipMap = new Map();
    existingInternships.forEach(internship => {
      internshipMap.set(internship.studentId, internship);
    });

    // Calculate statuses and prepare data for response
    const studentsWithStatus = [];
    const statusUpdates = []; // { studentId, status }
    const statusCreates = []; // { studentId, status }

    for (const student of allStudents) {
      const status = calculateStatus(
        student.internshipStartDate,
        student.internshipEndDate
      );

      const existing = internshipMap.get(student.id);
      
      if (existing) {
        // Only update if status changed
        if (existing.status !== status) {
          statusUpdates.push({ studentId: student.id, status });
        }
        studentsWithStatus.push({
          id: existing.id,
          studentId: student.id,
          status: existing.status !== status ? status : existing.status,
          student: {
            id: student.id,
            email: student.email,
            fullName: student.fullName,
            phone: student.phone,
            imageUrl: student.imageUrl,
            internshipStartDate: student.internshipStartDate,
            internshipEndDate: student.internshipEndDate,
            domain: student.domain,
          },
          updatedAt: existing.updatedAt,
        });
      } else {
        // Need to create new record
        statusCreates.push({ studentId: student.id, status });
        studentsWithStatus.push({
          id: null,
          studentId: student.id,
          status,
          student: {
            id: student.id,
            email: student.email,
            fullName: student.fullName,
            phone: student.phone,
            imageUrl: student.imageUrl,
            internshipStartDate: student.internshipStartDate,
            internshipEndDate: student.internshipEndDate,
            domain: student.domain,
          },
          updatedAt: new Date(),
        });
      }
    }

    // Batch update existing records using updateMany (more efficient)
    if (statusUpdates.length > 0) {
      // Group updates by status to minimize queries
      const updatesByStatus = new Map();
      statusUpdates.forEach(update => {
        if (!updatesByStatus.has(update.status)) {
          updatesByStatus.set(update.status, []);
        }
        updatesByStatus.get(update.status).push(update.studentId);
      });

      // Execute updates in parallel but limited batches
      const updatePromises = [];
      for (const [status, studentIds] of updatesByStatus.entries()) {
        updatePromises.push(
          prisma.studentInternship.updateMany({
            where: {
              studentId: { in: studentIds },
            },
            data: { status },
          })
        );
      }
      await Promise.all(updatePromises);
    }

    // Batch create new records using createMany (more efficient)
    if (statusCreates.length > 0) {
      await prisma.studentInternship.createMany({
        data: statusCreates,
        skipDuplicates: true, // Skip if somehow already exists
      });
    }

    // Refresh all records to get latest IDs and timestamps
    if (statusUpdates.length > 0 || statusCreates.length > 0) {
      const refreshedInternships = await prisma.studentInternship.findMany({
        where: {
          studentId: { in: allStudentIds },
        },
      });

      // Update response data with refreshed information
      const refreshedMap = new Map();
      refreshedInternships.forEach(internship => {
        refreshedMap.set(internship.studentId, internship);
      });

      studentsWithStatus.forEach(item => {
        const refreshed = refreshedMap.get(item.studentId);
        if (refreshed) {
          item.id = refreshed.id;
          item.status = refreshed.status;
          item.updatedAt = refreshed.updatedAt;
        }
      });
    }

    // Filter by status if provided
    let filteredStudents = studentsWithStatus;
    if (status && ['NOT_STARTED', 'ONGOING', 'COMPLETED'].includes(status)) {
      filteredStudents = studentsWithStatus.filter(s => s.status === status);
    }

    // Sort by status if needed (after calculation and filtering)
    if (sortBy === 'status') {
      const statusOrder = { NOT_STARTED: 1, ONGOING: 2, COMPLETED: 3 };
      filteredStudents.sort((a, b) => {
        const orderA = statusOrder[a.status] || 0;
        const orderB = statusOrder[b.status] || 0;
        if (orderA !== orderB) {
          return sortOrder === 'desc' ? orderB - orderA : orderA - orderB;
        }
        return a.student.fullName.localeCompare(b.student.fullName);
      });
    }

    // Re-apply pagination after status filtering
    const filteredTotal = filteredStudents.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedStudents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching internship statuses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getStudentInternshipStatus,
  getAllInternshipStatuses,
};

