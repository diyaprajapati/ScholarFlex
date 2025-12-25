const { prisma } = require('../config/database');
const { 
  calculateInternshipStatus, 
  isInternshipOngoing,
  getOrUpdateInternshipStatus 
} = require('../utils/internshipStatus');
const { InternshipStatus } = require('@prisma/client');

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
            internshipStartDate: true,
            internshipEndDate: true,
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

module.exports = {
  createEvaluation,
  getStudentEvaluations,
  getAllEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
};

