const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');

/**
 * Save student activity log
 * POST /api/activity/log
 * This is the most important endpoint!
 */
const saveActivityLog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { activity_type, metadata } = req.body;

    // Get student ID from authenticated user
    // The student should be authenticated via JWT
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Create activity log
    const activityLog = await prisma.studentActivityLog.create({
      data: {
        studentId: student.id,
        activityType: activity_type,
        metadata: metadata || null,
        timestamp: new Date(),
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
      message: 'Activity log saved successfully',
      activityLog: {
        id: activityLog.id,
        studentId: activityLog.studentId,
        activityType: activityLog.activityType,
        metadata: activityLog.metadata,
        timestamp: activityLog.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in saveActivityLog:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  saveActivityLog,
};

