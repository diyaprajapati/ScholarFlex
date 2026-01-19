const { prisma } = require('../config/database');
const {
  calculateInternshipStatus,
  isInternshipOngoing,
  getOrUpdateInternshipStatus
} = require('../utils/internshipStatus');
const { InternshipStatus } = require('@prisma/client');
const XLSX = require('xlsx');

/**
 * Create evaluation for a student (Admin only)
 * POST /api/admin/evaluations
 * 
 * Rules:
 * - Only allowed when internship status is ONGOING
 * - Admin only
 */
const createEvaluation = async (req, res) => {
  try {
    const { studentId, weekNo, evaluationData } = req.body;

    // Validate required fields
    if (!studentId || !weekNo || !evaluationData) {
      return res.status(400).json({
        success: false,
        message: 'studentId, weekNo, and evaluationData are required',
      });
    }

    // Validate weekNo is a positive integer
    if (!Number.isInteger(weekNo) || weekNo < 1) {
      return res.status(400).json({
        success: false,
        message: 'weekNo must be a positive integer',
      });
    }

    // Get student with dates
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: {
        id: true,
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

    // Calculate and check internship status
    const status = calculateInternshipStatus(
      student.internshipStartDate,
      student.internshipEndDate
    );

    // Update internship status in database
    await getOrUpdateInternshipStatus(
      prisma,
      student.id,
      student.internshipStartDate,
      student.internshipEndDate
    );

    // Check if internship is ONGOING
    if (status !== InternshipStatus.ONGOING) {
      return res.status(400).json({
        success: false,
        message: `Cannot create evaluation. Internship status is ${status}. Evaluations can only be created when internship is ONGOING.`,
      });
    }

    // Check if evaluation for this week already exists
    const existingEvaluation = await prisma.studentEvaluation.findUnique({
      where: {
        studentId_weekNo: {
          studentId: student.id,
          weekNo: parseInt(weekNo),
        },
      },
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: `Evaluation for week ${weekNo} already exists for this student`,
      });
    }

    // Create evaluation
    const evaluation = await prisma.studentEvaluation.create({
      data: {
        studentId: student.id,
        weekNo: parseInt(weekNo),
        evaluationData: evaluationData,
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
      message: 'Evaluation created successfully',
      data: evaluation,
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all evaluations for a student (Admin only)
 * GET /api/admin/evaluations/student/:studentId
 */
const getStudentEvaluations = async (req, res) => {
  try {
    const { studentId } = req.params;

    const evaluations = await prisma.studentEvaluation.findMany({
      where: {
        studentId: parseInt(studentId),
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        weekNo: 'asc',
      },
    });

    res.json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all evaluations (Admin only)
 * GET /api/admin/evaluations
 */
const getAllEvaluations = async (req, res) => {
  try {
    const { studentId, weekNo } = req.query;

    const where = {};
    if (studentId) {
      where.studentId = parseInt(studentId);
    }
    if (weekNo) {
      where.weekNo = parseInt(weekNo);
    }

    const evaluations = await prisma.studentEvaluation.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
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
        },
      },
      orderBy: [
        { studentId: 'asc' },
        { weekNo: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: evaluations,
    });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get evaluation by ID (Admin only)
 * GET /api/admin/evaluations/:id
 */
const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.studentEvaluation.findUnique({
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

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update evaluation (Admin only)
 * PUT /api/admin/evaluations/:id
 * 
 * Rules:
 * - Only allowed when internship status is ONGOING
 */
const updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { evaluationData } = req.body;

    if (!evaluationData) {
      return res.status(400).json({
        success: false,
        message: 'evaluationData is required',
      });
    }

    // Get existing evaluation
    const existingEvaluation = await prisma.studentEvaluation.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: {
          select: {
            id: true,
            internshipStartDate: true,
            internshipEndDate: true,
          },
        },
      },
    });

    if (!existingEvaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    // Allow editing existing evaluations regardless of current status
    // (since they were created when internship was ONGOING)
    // Only prevent creating new evaluations when not ONGOING

    // Update evaluation
    const evaluation = await prisma.studentEvaluation.update({
      where: { id: parseInt(id) },
      data: {
        evaluationData: evaluationData,
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

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      data: evaluation,
    });
  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete evaluation (Admin only)
 * DELETE /api/admin/evaluations/:id
 */
const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.studentEvaluation.findUnique({
      where: { id: parseInt(id) },
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found',
      });
    }

    await prisma.studentEvaluation.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Evaluation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Export evaluated students to Excel (Admin only)
 * GET /api/admin/evaluations/export
 * Returns Excel file with all evaluated students and their evaluations
 */
const exportEvaluatedStudents = async (req, res) => {
  try {
    const { domainId, studentId } = req.query;

    // Build where clause for domain filter
    // domainId can be a single value or multiple values (array)
    // Build where clause for domain filter and date filter
    // domainId can be a single value or multiple values (array)
    const where = {};
    const evaluationWhere = {}; // Additional filter on the included evaluations

    // Filter by isSelected: only export students who are selected (isSelected = true) AND have evaluations
    where.student = {
      isSelected: true,
    };

    if (domainId) {
      // Handle both single domainId and multiple domainIds
      const domainIds = Array.isArray(domainId) ? domainId : [domainId];
      const parsedDomainIds = domainIds.map(id => parseInt(id)).filter(id => !isNaN(id));

      if (parsedDomainIds.length > 0) {
        where.student = {
          ...where.student,
          domainId: {
            in: parsedDomainIds,
          },
        };
      }
    }

    // Add date range filter
    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      evaluationWhere.createdAt = {};

      if (startDate) {
        evaluationWhere.createdAt.gte = new Date(`${startDate}T00:00:00`);
      }

      if (endDate) {
        evaluationWhere.createdAt.lte = new Date(`${endDate}T23:59:59.999`);
      }
    }

    // Get all students who have evaluations matching the criteria
    // improved query to filter evaluations directly
    const evaluations = await prisma.studentEvaluation.findMany({
      where: {
        ...where,
        ...evaluationWhere
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            internshipStartDate: true,
            internshipEndDate: true,
            domain: {
              select: {
                domainName: true,
              },
            },
            projects: {
              select: {
                projectTitle: true,
                projectDescription: true,
                deadline: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: [
        { studentId: 'asc' },
        { weekNo: 'asc' },
      ],
    });

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No evaluated students found',
      });
    }

    // Group evaluations by student
    const studentsMap = new Map();

    evaluations.forEach(evaluation => {
      const studentId = evaluation.studentId;

      if (!studentsMap.has(studentId)) {
        // Format project details
        const projectDetails = evaluation.student.projects && evaluation.student.projects.length > 0
          ? evaluation.student.projects.map((project, index) => {
            const projectInfo = [
              `Project ${index + 1}: ${project.projectTitle || 'N/A'}`,
              `Description: ${project.projectDescription || 'N/A'}`,
              `Deadline: ${project.deadline ? new Date(project.deadline).toLocaleDateString('en-US') : 'N/A'}`,
              `Created: ${new Date(project.createdAt).toLocaleDateString('en-US')}`,
            ].join('\n');
            return projectInfo;
          }).join('\n\n')
          : 'No projects assigned';

        studentsMap.set(studentId, {
          studentName: evaluation.student.fullName || 'N/A',
          phoneNumber: evaluation.student.phone || 'N/A',
          emailId: evaluation.student.email || 'N/A',
          domain: evaluation.student.domain?.domainName || 'N/A',
          startDate: evaluation.student.internshipStartDate
            ? new Date(evaluation.student.internshipStartDate).toLocaleDateString('en-US')
            : 'N/A',
          endDate: evaluation.student.internshipEndDate
            ? new Date(evaluation.student.internshipEndDate).toLocaleDateString('en-US')
            : 'N/A',
          projectDetails: projectDetails,
          evaluations: [],
        });
      }

      const student = studentsMap.get(studentId);

      // Add evaluation data
      const evalData = evaluation.evaluationData || {};
      student.evaluations.push({
        weekNo: evaluation.weekNo,
        technicalSkills: evalData.technicalSkills || '',
        communication: evalData.communication || '',
        behavior: evalData.behavior || '',
        projectProgress: evalData.projectProgress || '',
        overallRating: evalData.overallRating || '',
        notes: evalData.notes || '',
        createdAt: new Date(evaluation.createdAt).toLocaleDateString('en-US'),
      });
    });

    // Find the maximum week number to determine column count
    let maxWeek = 0;
    studentsMap.forEach((studentData) => {
      studentData.evaluations.forEach(eval => {
        if (eval.weekNo > maxWeek) {
          maxWeek = eval.weekNo;
        }
      });
    });

    // Convert to Excel format - one row per student with week columns
    const excelData = [];

    studentsMap.forEach((studentData, studentId) => {
      const row = {
        'Student Name': studentData.studentName,
        'Phone Number': studentData.phoneNumber,
        'Email ID': studentData.emailId,
        'Domain': studentData.domain,
        'Start Date': studentData.startDate,
        'End Date': studentData.endDate,
        'Project Details': studentData.projectDetails,
      };

      // Create a map of evaluations by week number
      const evaluationsByWeek = new Map();
      studentData.evaluations.forEach(eval => {
        evaluationsByWeek.set(eval.weekNo, eval);
      });

      // Add week columns - each week contains all evaluation data in one cell
      for (let week = 1; week <= maxWeek; week++) {
        const eval = evaluationsByWeek.get(week);
        if (eval) {
          // Format all evaluation data into a single cell
          const weekData = [
            `Week: ${eval.weekNo}`,
            `Date: ${eval.createdAt}`,
            `Technical Skills: ${eval.technicalSkills || 'N/A'}`,
            `Communication: ${eval.communication || 'N/A'}`,
            `Behavior: ${eval.behavior || 'N/A'}`,
            `Project Progress: ${eval.projectProgress || 'N/A'}`,
            `Overall Rating: ${eval.overallRating || 'N/A'}`,
            `Notes: ${eval.notes || 'N/A'}`,
          ].join('\n');
          row[`Week ${week}`] = weekData;
        } else {
          row[`Week ${week}`] = '';
        }
      }

      excelData.push(row);
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluated Students');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    });

    // Set response headers
    const fileName = `evaluated_students_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting evaluated students:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createEvaluation,
  getStudentEvaluations,
  getAllEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  exportEvaluatedStudents,
};

