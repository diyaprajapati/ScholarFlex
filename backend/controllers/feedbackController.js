const { prisma } = require('../config/database');

/**
 * Submit internship feedback (Student only)
 * POST /api/student/feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      overallRating,
      learningExperience,
      contentQuality,
      mentorSupport,
      platformUsability,
      suggestions,
      wouldRecommend,
      additionalComments,
    } = req.body;

    // Validate required fields
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Overall rating is required and must be between 1 and 5',
      });
    }

    // Check if student has already submitted feedback
    const existingFeedback = await prisma.internshipFeedback.findUnique({
      where: { studentId },
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted your feedback. Thank you!',
      });
    }

    // Create feedback
    const feedback = await prisma.internshipFeedback.create({
      data: {
        studentId,
        overallRating: parseInt(overallRating),
        learningExperience: learningExperience || null,
        contentQuality: contentQuality ? parseInt(contentQuality) : null,
        mentorSupport: mentorSupport ? parseInt(mentorSupport) : null,
        platformUsability: platformUsability ? parseInt(platformUsability) : null,
        suggestions: suggestions || null,
        wouldRecommend: wouldRecommend !== undefined ? Boolean(wouldRecommend) : null,
        additionalComments: additionalComments || null,
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
      message: 'Thank you for your feedback! Your response has been recorded.',
      data: {
        id: feedback.id,
        submittedAt: feedback.submittedAt,
      },
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.',
    });
  }
};

/**
 * Get student's feedback (Student only)
 * GET /api/student/feedback
 */
const getStudentFeedback = async (req, res) => {
  try {
    const studentId = req.user.id;

    const feedback = await prisma.internshipFeedback.findUnique({
      where: { studentId },
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

    if (!feedback) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No feedback submitted yet',
      });
    }

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
    });
  }
};

/**
 * Get all feedback (Admin only)
 * GET /api/admin/feedback
 */
const getAllFeedback = async (req, res) => {
  try {
    // console.log('✅ getAllFeedback function called');
    // console.log('User:', req.user ? { id: req.user.id, role: req.user.role_code } : 'No user');
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // console.log('Starting Prisma query...');
    const [feedbacks, total] = await Promise.all([
      prisma.internshipFeedback.findMany({
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: {
          submittedAt: 'desc',
        },
        include: {
          student: {
            select: {
              id: true,
              email: true,
              fullName: true,
              domain: {
                select: {
                  id: true,
                  domainName: true,
                },
              },
            },
          },
        },
      }),
      prisma.internshipFeedback.count(),
    ]);

    // console.log(`✅ Query successful: ${feedbacks.length} feedbacks, total: ${total}`);

    res.status(200).json({
      success: true,
      data: feedbacks.map((feedback) => ({
        id: feedback.id,
        studentId: feedback.studentId,
        overallRating: feedback.overallRating,
        learningExperience: feedback.learningExperience,
        contentQuality: feedback.contentQuality,
        mentorSupport: feedback.mentorSupport,
        platformUsability: feedback.platformUsability,
        suggestions: feedback.suggestions,
        wouldRecommend: feedback.wouldRecommend,
        additionalComments: feedback.additionalComments,
        submittedAt: feedback.submittedAt,
        student: feedback.student,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error in getAllFeedback:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Make sure we haven't already sent a response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch feedback',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta,
          name: error.name,
        } : undefined,
      });
    }
  }
};

module.exports = {
  submitFeedback,
  getStudentFeedback,
  getAllFeedback,
};

