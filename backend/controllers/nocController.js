const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/noc');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: studentId_timestamp.pdf
    const studentId = req.user.id;
    const timestamp = Date.now();
    const filename = `noc_${studentId}_${timestamp}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for NOC letters.'));
    }
  },
});

// Multer middleware for file upload - exported separately
const uploadMiddleware = upload.single('nocFile');

/**
 * Upload NOC letter (Student only)
 * POST /api/student/noc/upload
 */
const uploadNOC = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a PDF file.',
      });
    }

    const studentId = req.user.id;

    // Check if student already has a pending or approved NOC
    const existingNOC = await prisma.nOCLetter.findFirst({
      where: {
        studentId: studentId,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    if (existingNOC) {
      // Delete the uploaded file if there's already an existing NOC
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved NOC letter. Please contact admin to upload a new one.',
      });
    }

    // Create NOC letter record
    const nocLetter = await prisma.nOCLetter.create({
      data: {
        studentId: studentId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: BigInt(req.file.size),
        status: 'PENDING',
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
      message: 'NOC letter uploaded successfully',
      data: {
        id: nocLetter.id,
        fileName: nocLetter.fileName,
        status: nocLetter.status,
        uploadedAt: nocLetter.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Error uploading NOC letter:', error);
    
    // Delete uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload NOC letter',
    });
  }
};

/**
 * Get student's own NOC letter status
 * GET /api/student/noc
 */
const getStudentNOC = async (req, res) => {
  try {
    const studentId = req.user.id;

    const nocLetter = await prisma.nOCLetter.findFirst({
      where: {
        studentId: studentId,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!nocLetter) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No NOC letter uploaded yet',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: nocLetter.id,
        fileName: nocLetter.fileName,
        status: nocLetter.status,
        uploadedAt: nocLetter.uploadedAt,
        reviewedAt: nocLetter.reviewedAt,
        reviewer: nocLetter.reviewer,
      },
    });
  } catch (error) {
    console.error('Error fetching student NOC:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NOC letter',
    });
  }
};

/**
 * Delete student's own NOC letter
 * DELETE /api/student/noc/:id
 */
const deleteStudentNOC = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { id } = req.params;

    const nocLetter = await prisma.nOCLetter.findUnique({
      where: { id: parseInt(id) },
    });

    if (!nocLetter) {
      return res.status(404).json({
        success: false,
        message: 'NOC letter not found',
      });
    }

    // Verify that the NOC belongs to the student
    if (nocLetter.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this NOC letter',
      });
    }

    // Only allow deletion if status is PENDING or REJECTED
    // Approved NOC letters should not be deleted by students
    if (nocLetter.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an approved NOC letter. Please contact admin if you need to update it.',
      });
    }

    // Delete the file from filesystem
    if (fs.existsSync(nocLetter.filePath)) {
      try {
        fs.unlinkSync(nocLetter.filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await prisma.nOCLetter.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      success: true,
      message: 'NOC letter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting NOC letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete NOC letter',
    });
  }
};

/**
 * Get all NOC letters (Admin only)
 * GET /api/admin/noc
 */
const getAllNOC = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [nocLetters, total] = await Promise.all([
      prisma.nOCLetter.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: {
          uploadedAt: 'desc',
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
          reviewer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.nOCLetter.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: nocLetters.map((noc) => ({
        id: noc.id,
        student: noc.student,
        fileName: noc.fileName,
        status: noc.status,
        uploadedAt: noc.uploadedAt,
        reviewedAt: noc.reviewedAt,
        reviewer: noc.reviewer,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching NOC letters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NOC letters',
    });
  }
};

/**
 * Download/view NOC letter (Admin only)
 * GET /api/admin/noc/:id/download
 */
const downloadNOC = async (req, res) => {
  try {
    const { id } = req.params;

    const nocLetter = await prisma.nOCLetter.findUnique({
      where: { id: parseInt(id) },
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

    if (!nocLetter) {
      return res.status(404).json({
        success: false,
        message: 'NOC letter not found',
      });
    }

    if (!fs.existsSync(nocLetter.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'NOC letter file not found',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nocLetter.fileName}"`);
    res.sendFile(path.resolve(nocLetter.filePath));
  } catch (error) {
    console.error('Error downloading NOC letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download NOC letter',
    });
  }
};

/**
 * Update NOC status (Approve/Reject) - Admin only
 * PATCH /api/admin/noc/:id/status
 */
const updateNOCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be APPROVED or REJECTED',
      });
    }

    const nocLetter = await prisma.nOCLetter.findUnique({
      where: { id: parseInt(id) },
    });

    if (!nocLetter) {
      return res.status(404).json({
        success: false,
        message: 'NOC letter not found',
      });
    }

    const updatedNOC = await prisma.nOCLetter.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: `NOC letter ${status.toLowerCase()} successfully`,
      data: {
        id: updatedNOC.id,
        student: updatedNOC.student,
        fileName: updatedNOC.fileName,
        status: updatedNOC.status,
        reviewedAt: updatedNOC.reviewedAt,
        reviewer: updatedNOC.reviewer,
      },
    });
  } catch (error) {
    console.error('Error updating NOC status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update NOC status',
    });
  }
};

module.exports = {
  upload: uploadMiddleware,
  uploadNOC,
  getStudentNOC,
  deleteStudentNOC,
  getAllNOC,
  downloadNOC,
  updateNOCStatus,
};

