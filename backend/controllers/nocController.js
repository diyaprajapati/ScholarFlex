const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { authenticate, authorize } = require('../middleware/auth');
const { prisma } = require('../config/database');

/**
 * Normalize string for directory name (lowercase, remove special chars, spaces to underscores)
 */
const normalizeDirectoryName = (str) => {
  if (!str) return 'unknown';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

/**
 * Calculate academic year from internship start and end dates
 * Returns format: "2024-2024" or "2024-2025"
 */
const calculateAcademicYear = (internshipStartDate, internshipEndDate) => {
  let startYear, endYear;
  
  if (internshipStartDate && internshipEndDate) {
    // Use internship start and end dates
    const startDate = new Date(internshipStartDate);
    const endDate = new Date(internshipEndDate);
    startYear = startDate.getFullYear();
    endYear = endDate.getFullYear();
  } else if (internshipStartDate) {
    // Only start date available, assume same year or next year
    const startDate = new Date(internshipStartDate);
    startYear = startDate.getFullYear();
    endYear = startYear + 1;
  } else {
    // Default to current academic year
    const now = new Date();
    startYear = now.getFullYear();
    endYear = startYear + 1;
  }
  
  return `${startYear}-${endYear}`;
};

/**
 * Get student upload directory path based on hierarchical structure
 * Structure: scholarflex/<start_year><end_year>/<institute_name>/<course_taken>/<domain>/<student_id>/
 * All directories are created automatically if they don't exist
 */
const getStudentUploadDir = async (studentId) => {
  // Fetch student data with domain relation
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      internshipStartDate: true,
      internshipEndDate: true,
      instituteName: true,
      courseTaken: true,
      domain: {
        select: {
          domainName: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Calculate academic year from internship dates
  const academicYear = calculateAcademicYear(
    student.internshipStartDate,
    student.internshipEndDate
  );

  // Normalize directory names (case-insensitive matching)
  const normalizedInstitute = normalizeDirectoryName(student.instituteName);
  const normalizedCourse = normalizeDirectoryName(student.courseTaken);
  const normalizedDomain = normalizeDirectoryName(
    student.domain?.domainName || 'unknown'
  );

  // Build the full path
  const dirPath = path.join(
    __dirname,
    '../uploads',
    'scholarflex',
    academicYear,
    normalizedInstitute,
    normalizedCourse,
    normalizedDomain,
    studentId.toString()
  );

  // Create directory structure automatically if it doesn't exist
  // This works even after deployment - directories are created on-demand
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
};

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const studentId = req.user.id;
      const uploadDir = await getStudentUploadDir(studentId);
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Always store as 'noc.pdf'
    cb(null, 'noc.pdf');
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
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.warn('Could not delete uploaded file:', unlinkError.message);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'You already have a pending or approved NOC letter. Please contact admin to upload a new one.',
      });
    }

    // Check for rejected NOC that can be replaced
    const rejectedNOC = await prisma.nOCLetter.findFirst({
      where: {
        studentId: studentId,
        status: 'REJECTED',
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Delete old rejected NOC file if exists (handle both old and new path formats)
    if (rejectedNOC && rejectedNOC.filePath) {
      let oldNocPath;
      
      // Check if it's the new hierarchical path format
      if (rejectedNOC.filePath.includes('/scholarflex/')) {
        oldNocPath = path.join(__dirname, '../uploads', rejectedNOC.filePath.replace(/^\//, ''));
      } else if (rejectedNOC.filePath.includes(`/students/${studentId}/`)) {
        oldNocPath = path.join(__dirname, '../uploads', rejectedNOC.filePath.replace(/^\//, ''));
      } else {
        // Old flat structure path (absolute or relative)
        if (path.isAbsolute(rejectedNOC.filePath)) {
          oldNocPath = rejectedNOC.filePath;
        } else {
          oldNocPath = path.join(__dirname, '../uploads/noc', path.basename(rejectedNOC.filePath));
        }
      }
      
      if (fs.existsSync(oldNocPath)) {
        try {
          fs.unlinkSync(oldNocPath);
        } catch (unlinkError) {
          console.warn('Could not delete old rejected NOC file:', unlinkError.message);
        }
      }
      
      // Delete the rejected NOC record from database
      try {
        await prisma.nOCLetter.delete({
          where: { id: rejectedNOC.id },
        });
      } catch (deleteError) {
        console.warn('Could not delete rejected NOC record:', deleteError.message);
      }
    }

    // Build the relative path for storage in database
    const uploadDir = await getStudentUploadDir(studentId);
    const relativePath = path.relative(
      path.join(__dirname, '../uploads'),
      uploadDir
    );
    const filePath = `/${path.join(relativePath, req.file.filename).replace(/\\/g, '/')}`;

    // Create NOC letter record
    const nocLetter = await prisma.nOCLetter.create({
      data: {
        studentId: studentId,
        fileName: req.file.originalname,
        filePath: filePath, // Store relative path
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
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete uploaded file on error:', unlinkError.message);
      }
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

    // Delete the file from filesystem (handle both old and new path formats)
    let filePathToDelete;
    
    if (nocLetter.filePath.includes('/scholarflex/')) {
      // New hierarchical path format (relative)
      filePathToDelete = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
    } else if (nocLetter.filePath.includes(`/students/${studentId}/`)) {
      // Alternative hierarchical path format
      filePathToDelete = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
    } else if (path.isAbsolute(nocLetter.filePath)) {
      // Old absolute path format
      filePathToDelete = nocLetter.filePath;
    } else {
      // Old relative path format
      filePathToDelete = path.join(__dirname, '../uploads/noc', path.basename(nocLetter.filePath));
    }
    
    if (fs.existsSync(filePathToDelete)) {
      try {
        fs.unlinkSync(filePathToDelete);
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

    // Resolve file path (handle both old and new path formats)
    let filePath;
    
    if (nocLetter.filePath.includes('/scholarflex/')) {
      // New hierarchical path format (relative)
      filePath = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
    } else if (nocLetter.filePath.includes(`/students/${nocLetter.student.id}/`)) {
      // Alternative hierarchical path format
      filePath = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
    } else if (path.isAbsolute(nocLetter.filePath)) {
      // Old absolute path format
      filePath = nocLetter.filePath;
    } else {
      // Old relative path format
      filePath = path.join(__dirname, '../uploads/noc', path.basename(nocLetter.filePath));
    }
    
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: 'NOC letter file not found',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nocLetter.fileName}"`);
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Error downloading NOC letter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download NOC letter',
    });
  }
};

/**
 * Download all NOC letters as ZIP (Admin only)
 * GET /api/admin/noc/download-all
 */
const downloadAllNOC = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build where clause for filtering
    const where = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // Get all NOC letters with student information
    const nocLetters = await prisma.nOCLetter.findMany({
      where,
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
        uploadedAt: 'desc',
      },
    });

    if (nocLetters.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No NOC letters found to download',
      });
    }

    // Create a ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const statusSuffix = status ? `_${status}` : '';
    const filename = `all_noc_letters${statusSuffix}_${timestamp}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive data to the response
    archive.pipe(res);

    // Add each NOC file to the archive
    let addedCount = 0;
    for (const noc of nocLetters) {
      // Resolve file path (handle both old and new path formats)
      let filePath;
      
      if (noc.filePath.includes('/scholarflex/')) {
        // New hierarchical path format (relative)
        filePath = path.join(__dirname, '../uploads', noc.filePath.replace(/^\//, ''));
      } else if (noc.filePath.includes(`/students/${noc.student?.id}/`)) {
        // Alternative hierarchical path format
        filePath = path.join(__dirname, '../uploads', noc.filePath.replace(/^\//, ''));
      } else if (path.isAbsolute(noc.filePath)) {
        // Old absolute path format
        filePath = noc.filePath;
      } else {
        // Old relative path format
        filePath = path.join(__dirname, '../uploads/noc', path.basename(noc.filePath));
      }
      
      const resolvedPath = path.resolve(filePath);
      
      if (fs.existsSync(resolvedPath)) {
        // Create a safe filename: StudentName_Email_NOCID.pdf
        const studentName = (noc.student?.fullName || 'Unknown')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 50);
        const studentEmail = (noc.student?.email || 'unknown')
          .replace(/[^a-zA-Z0-9@._-]/g, '_')
          .substring(0, 50);
        const safeFileName = `${studentName}_${studentEmail}_${noc.id}.pdf`;
        
        // Add file to archive
        archive.file(resolvedPath, { name: safeFileName });
        addedCount++;
      } else {
        console.warn(`NOC file not found: ${resolvedPath} (ID: ${noc.id}, stored path: ${noc.filePath})`);
      }
    }

    // Finalize the archive
    archive.finalize();

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create ZIP archive',
        });
      }
    });

    // Log completion
    archive.on('end', () => {
      // console.log(`ZIP archive created with ${addedCount} NOC letters`);
    });

  } catch (error) {
    console.error('Error downloading all NOC letters:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to download NOC letters',
      });
    }
  }
};

/**
 * Update NOC status (Approve/Reject) - Admin only
 * PATCH /api/admin/noc/:id/status
 * Note: Rejecting an approved NOC will delete it from the database
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

    // If rejecting an approved NOC, delete it from database and filesystem
    if (status === 'REJECTED' && nocLetter.status === 'APPROVED') {
      // Delete the file from filesystem (handle both old and new path formats)
      let filePathToDelete;
      
      if (nocLetter.filePath.includes('/scholarflex/')) {
        // New hierarchical path format (relative)
        filePathToDelete = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
      } else if (nocLetter.filePath.includes(`/students/${nocLetter.studentId}/`)) {
        // Alternative hierarchical path format
        filePathToDelete = path.join(__dirname, '../uploads', nocLetter.filePath.replace(/^\//, ''));
      } else if (path.isAbsolute(nocLetter.filePath)) {
        // Old absolute path format
        filePathToDelete = nocLetter.filePath;
      } else {
        // Old relative path format
        filePathToDelete = path.join(__dirname, '../uploads/noc', path.basename(nocLetter.filePath));
      }
      
      // Delete file if it exists
      if (fs.existsSync(filePathToDelete)) {
        try {
          fs.unlinkSync(filePathToDelete);
        } catch (fileError) {
          console.error('Error deleting NOC file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      await prisma.nOCLetter.delete({
        where: { id: parseInt(id) },
      });

      return res.status(200).json({
        success: true,
        message: 'Approved NOC letter rejected and deleted successfully',
        data: {
          id: nocLetter.id,
          student: nocLetter.student,
          fileName: nocLetter.fileName,
          status: 'DELETED',
        },
      });
    }

    // For other cases (approving pending, or rejecting pending), just update status
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
  downloadAllNOC,
  updateNOCStatus,
};

