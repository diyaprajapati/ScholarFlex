const { prisma } = require('../config/database');

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

/**
 * Create project for a student (Admin only)
 * POST /api/admin/projects
 * 
 * Rules:
 * - Can be assigned anytime (NOT_STARTED, ONGOING, or COMPLETED)
 */
const createProject = async (req, res) => {
  try {
    const { studentId, projectTitle, projectDescription, deadline, projectData } = req.body;

    // Validate required fields
    if (!studentId || !projectTitle) {
      return res.status(400).json({
        success: false,
        message: 'studentId and projectTitle are required',
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Create project
    const project = await prisma.studentProject.create({
      data: {
        studentId: student.id,
        projectTitle,
        projectDescription: projectDescription || null,
        deadline: deadline ? new Date(deadline) : null,
        projectData: projectData || null,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Project assigned successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all projects for a student (Admin and Student)
 * GET /api/admin/projects/student/:studentId (Admin)
 * GET /api/student/projects (Student - their own projects)
 */
const getStudentProjects = async (req, res) => {
  try {
    let studentId;

    // If admin accessing, use studentId from params
    // If student accessing, use their own ID
    if (req.params.studentId) {
      studentId = parseInt(req.params.studentId);
    } else {
      studentId = req.user.id;
    }

    const projects = await prisma.studentProject.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all projects (Admin only)
 * GET /api/admin/projects
 */
const getAllProjects = async (req, res) => {
  try {
    const { studentId } = req.query;

    const where = {};
    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const projects = await prisma.studentProject.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            internshipStartDate: true,
            internshipEndDate: true,
          },
        },
      },
      orderBy: [
        { studentId: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all selected students with their projects (Admin only)
 * GET /api/admin/projects/students
 * Used for Project Management page to show all selected students
 */
const getSelectedStudentsWithProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', search = '', status = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      isSelected: true,
      isActive: true,
    };

    // Add search filter
    // Note: MySQL doesn't support 'mode: insensitive' - case-insensitive search depends on column collation
    // For case-insensitive search in MySQL, we can use raw SQL with LOWER() if needed
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
    } else {
      orderBy = { fullName: 'asc' };
    }

    // Get all selected students (we'll filter by status after calculating)
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

    // Combine students with calculated status
    let studentsWithStatus = allStudents.map(student => {
      const calculatedStatus = calculateStatus(student.internshipStartDate, student.internshipEndDate);
      return {
        ...student,
        status: calculatedStatus,
      };
    });

    // Filter by status if provided
    if (status && ['NOT_STARTED', 'ONGOING', 'COMPLETED'].includes(status)) {
      studentsWithStatus = studentsWithStatus.filter(s => s.status === status);
    }

    // Apply pagination after status filtering
    const filteredTotal = studentsWithStatus.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedStudents = studentsWithStatus.slice(startIndex, endIndex);

    // Get student IDs for the paginated students
    const studentIds = paginatedStudents.map(s => s.id);

    // Get projects for these students
    const projects = await prisma.studentProject.findMany({
      where: {
        studentId: { in: studentIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group projects by studentId
    const projectsByStudent = {};
    projects.forEach(project => {
      if (!projectsByStudent[project.studentId]) {
        projectsByStudent[project.studentId] = [];
      }
      projectsByStudent[project.studentId].push(project);
    });

    // Combine students with their projects
    const studentsWithProjects = paginatedStudents.map(student => ({
      ...student,
      projects: projectsByStudent[student.id] || [],
    }));

    res.json({
      success: true,
      data: studentsWithProjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching selected students with projects:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get project by ID (Admin and Student)
 * GET /api/admin/projects/:id (Admin)
 * GET /api/student/projects/:id (Student - their own project only)
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.studentProject.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            internshipStartDate: true,
            internshipEndDate: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // If student accessing, verify it's their own project
    if (req.user.role_code === 'STUDENT' && project.studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own projects.',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update project (Admin only)
 * PUT /api/admin/projects/:id
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectTitle, projectDescription, deadline, projectData } = req.body;

    const updateData = {};
    if (projectTitle !== undefined) updateData.projectTitle = projectTitle;
    if (projectDescription !== undefined) updateData.projectDescription = projectDescription;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (projectData !== undefined) updateData.projectData = projectData;

    const project = await prisma.studentProject.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete project (Admin only)
 * DELETE /api/admin/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.studentProject.findUnique({
      where: { id: parseInt(id) },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await prisma.studentProject.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createProject,
  getStudentProjects,
  getAllProjects,
  getSelectedStudentsWithProjects,
  getProjectById,
  updateProject,
  deleteProject,
};

