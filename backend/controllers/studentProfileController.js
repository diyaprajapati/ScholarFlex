const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  try {
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
      throw new Error(`Student not found with ID: ${studentId}`);
    }

    // Calculate academic year from internship dates
    const academicYear = calculateAcademicYear(
      student.internshipStartDate,
      student.internshipEndDate
    );

    // Normalize directory names (case-insensitive matching)
    // Use 'unknown' as fallback if fields are missing
    const normalizedInstitute = normalizeDirectoryName(student.instituteName || 'unknown');
    const normalizedCourse = normalizeDirectoryName(student.courseTaken || 'unknown');
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
      // console.log(`✅ Created upload directory: ${dirPath}`);
    } else {
      // console.log(`📁 Using existing upload directory: ${dirPath}`);
    }

    return dirPath;
  } catch (error) {
    console.error(`❌ Error getting student upload directory for student ${studentId}:`, error);
    throw error;
  }
};

// Use memory storage and manually write file to ensure it's saved
const imageMemoryStorage = multer.memoryStorage();

const imageUpload = multer({
  storage: imageMemoryStorage, // Use memory storage
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // console.log('🔍 File filter called');
    // console.log('   File mimetype:', file.mimetype);
    // console.log('   File originalname:', file.originalname);
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      // console.log('✅ File type allowed');
      cb(null, true);
    } else {
      console.error('❌ File type not allowed:', file.mimetype);
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile images.'));
    }
  },
});

// Configure multer for resume uploads
// Use async destination callback directly (same pattern as NOC controller)
const resumeStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // console.log('📁 Multer destination callback called for resume');
      const studentId = req.user?.id;
      if (!studentId) {
        console.error('❌ Student ID not found in request');
        return cb(new Error('Student ID not found in request'));
      }
      // console.log(`📤 Getting upload directory for student ${studentId}`);
      const uploadDir = await getStudentUploadDir(studentId);
      // console.log(`✅ Using upload directory: ${uploadDir}`);
      cb(null, uploadDir);
    } catch (error) {
      console.error('❌ Error in multer destination callback:', error);
      console.error('   Stack:', error.stack);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Always store as 'resume.pdf'
    cb(null, 'resume.pdf');
  },
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resumes.'));
    }
  },
});

// Export multer middlewares
exports.uploadProfileImage = imageUpload.single('profileImage');
exports.uploadResume = resumeUpload.single('resume');

/**
 * Get student's own profile
 * GET /api/student/profile
 */
const getProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
        personalProjects: {
          orderBy: {
            createdAt: 'desc',
          },
        },
          skills: {
            orderBy: [
              { skillType: 'asc' },
              { skillName: 'asc' },
            ],
          },
          achievements: {
            orderBy: [
              { achievementType: 'asc' },
              { date: 'desc' },
            ],
          },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Group skills by type
    const skillsGrouped = {
      languages: [],
      frameworks: [],
      tools: [],
      softSkills: [],
    };

    student.skills.forEach((skill) => {
      if (skill.skillType === 'language') skillsGrouped.languages.push(skill.skillName);
      else if (skill.skillType === 'framework') skillsGrouped.frameworks.push(skill.skillName);
      else if (skill.skillType === 'tool') skillsGrouped.tools.push(skill.skillName);
      else if (skill.skillType === 'soft_skill') skillsGrouped.softSkills.push(skill.skillName);
    });

    // Group achievements by type
    const achievementsGrouped = {
      hackathons: [],
      certifications: [],
      awards: [],
      competitions: [],
    };

    student.achievements.forEach((achievement) => {
      const achievementData = {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        issuer: achievement.issuer,
        date: achievement.date,
        link: achievement.link,
      };

      if (achievement.achievementType === 'hackathon') achievementsGrouped.hackathons.push(achievementData);
      else if (achievement.achievementType === 'certification') achievementsGrouped.certifications.push(achievementData);
      else if (achievement.achievementType === 'award') achievementsGrouped.awards.push(achievementData);
      else if (achievement.achievementType === 'competition') achievementsGrouped.competitions.push(achievementData);
    });

    res.json({
      success: true,
      profile: {
        // Identity & Contact
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        imageUrl: student.imageUrl,
        // Education Details
        instituteName: student.instituteName,
        courseTaken: student.courseTaken,
        currentYear: student.currentYear,
        currentSemester: student.currentSemester,
        graduationYear: student.graduationYear,
        // Internship Information
        domainId: student.domainId,
        domain: student.domain ? {
          id: student.domain.id,
          name: student.domain.domainName,
          code: student.domain.domainCode,
        } : null,
        internshipStartDate: student.internshipStartDate,
        internshipEndDate: student.internshipEndDate,
        // Skills
        skills: skillsGrouped,
        // Projects
        personalProjects: student.personalProjects,
        // Achievements
        achievements: achievementsGrouped,
        // Documents
        resumeUrl: student.resumeUrl,
        // Status
        profileCompleted: student.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Check if profile is completed
 * GET /api/student/profile/check-completion
 */
const checkProfileCompletion = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        profileCompleted: true,
        fullName: true,
        email: true,
        phone: true,
        imageUrl: true,
        instituteName: true,
        courseTaken: true,
        currentYear: true,
        currentSemester: true,
        graduationYear: true,
        domainId: true,
        internshipStartDate: true,
        internshipEndDate: true,
        resumeUrl: true,
        _count: {
          select: {
            skills: true,
            personalProjects: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check mandatory fields
    const missingFields = [];
    
    if (!student.fullName) missingFields.push('Full Name');
    if (!student.email) missingFields.push('Email');
    if (!student.phone) missingFields.push('Phone Number');
    if (!student.imageUrl) missingFields.push('Profile Image');
    if (!student.instituteName) missingFields.push('College Name');
    if (!student.courseTaken) missingFields.push('Degree');
    if (!student.currentYear) missingFields.push('Current Year');
    if (!student.currentSemester) missingFields.push('Current Semester');
    if (!student.graduationYear) missingFields.push('Graduation Year');
    if (!student.domainId) missingFields.push('Domain');
    if (!student.internshipStartDate) missingFields.push('Internship Start Date');
    if (!student.internshipEndDate) missingFields.push('Internship End Date');
    if (student._count.skills === 0) missingFields.push('Skills');
    if (student._count.personalProjects === 0) missingFields.push('Projects');
    if (!student.resumeUrl) missingFields.push('Resume');

    const isCompleted = missingFields.length === 0 && student.profileCompleted;

    res.json({
      success: true,
      isCompleted,
      profileCompleted: student.profileCompleted,
      missingFields,
    });
  } catch (error) {
    console.error('Error checking profile completion:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update student profile
 * PUT /api/student/profile
 */
const updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      fullName,
      phone,
      instituteName,
      courseTaken,
      currentYear,
      currentSemester,
      graduationYear,
      domainId,
      internshipStartDate,
      internshipEndDate,
      skills,
      personalProjects,
      achievements,
    } = req.body;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update student basic info
      const updateData = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (instituteName !== undefined) updateData.instituteName = instituteName;
      if (courseTaken !== undefined) updateData.courseTaken = courseTaken;
      if (currentYear !== undefined) updateData.currentYear = currentYear;
      if (currentSemester !== undefined) updateData.currentSemester = currentSemester;
      if (graduationYear !== undefined) updateData.graduationYear = graduationYear ? parseInt(graduationYear) : null;
      if (domainId !== undefined) updateData.domainId = domainId ? parseInt(domainId) : null;
      if (internshipStartDate !== undefined) updateData.internshipStartDate = internshipStartDate ? new Date(internshipStartDate) : null;
      if (internshipEndDate !== undefined) updateData.internshipEndDate = internshipEndDate ? new Date(internshipEndDate) : null;

      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: updateData,
      });

      // Update skills
      if (skills !== undefined) {
        // Delete existing skills
        await tx.studentSkill.deleteMany({
          where: { studentId: studentId },
        });

        // Insert new skills
        if (skills.languages && Array.isArray(skills.languages)) {
          await tx.studentSkill.createMany({
            data: skills.languages.map((skill) => ({
              studentId: studentId,
              skillType: 'language',
              skillName: skill,
            })),
          });
        }

        if (skills.frameworks && Array.isArray(skills.frameworks)) {
          await tx.studentSkill.createMany({
            data: skills.frameworks.map((skill) => ({
              studentId: studentId,
              skillType: 'framework',
              skillName: skill,
            })),
          });
        }

        if (skills.tools && Array.isArray(skills.tools)) {
          await tx.studentSkill.createMany({
            data: skills.tools.map((skill) => ({
              studentId: studentId,
              skillType: 'tool',
              skillName: skill,
            })),
          });
        }

        if (skills.softSkills && Array.isArray(skills.softSkills)) {
          await tx.studentSkill.createMany({
            data: skills.softSkills.map((skill) => ({
              studentId: studentId,
              skillType: 'soft_skill',
              skillName: skill,
            })),
          });
        }
      }

      // Update personal projects
      if (personalProjects !== undefined && Array.isArray(personalProjects)) {
        // Delete existing projects
        await tx.studentPersonalProject.deleteMany({
          where: { studentId: studentId },
        });

        // Insert new projects
        if (personalProjects.length > 0) {
          await tx.studentPersonalProject.createMany({
            data: personalProjects.map((project) => ({
              studentId: studentId,
              projectTitle: project.projectTitle || project.title,
              description: project.description,
              techStack: project.techStack,
              role: project.role,
              githubLink: project.githubLink || project.github,
              liveLink: project.liveLink || project.live,
            })),
          });
        }
      }

      // Update achievements
      if (achievements !== undefined) {
        // Delete existing achievements
        await tx.studentAchievement.deleteMany({
          where: { studentId: studentId },
        });

        // Insert new achievements
        const achievementsToInsert = [];

        if (achievements.hackathons && Array.isArray(achievements.hackathons)) {
          achievements.hackathons.forEach((achievement) => {
            achievementsToInsert.push({
              studentId: studentId,
              achievementType: 'hackathon',
              title: achievement.title,
              description: achievement.description,
              issuer: achievement.issuer,
              date: achievement.date ? new Date(achievement.date) : null,
              link: achievement.link,
            });
          });
        }

        if (achievements.certifications && Array.isArray(achievements.certifications)) {
          achievements.certifications.forEach((achievement) => {
            achievementsToInsert.push({
              studentId: studentId,
              achievementType: 'certification',
              title: achievement.title,
              description: achievement.description,
              issuer: achievement.issuer,
              date: achievement.date ? new Date(achievement.date) : null,
              link: achievement.link,
            });
          });
        }

        if (achievements.awards && Array.isArray(achievements.awards)) {
          achievements.awards.forEach((achievement) => {
            achievementsToInsert.push({
              studentId: studentId,
              achievementType: 'award',
              title: achievement.title,
              description: achievement.description,
              issuer: achievement.issuer,
              date: achievement.date ? new Date(achievement.date) : null,
              link: achievement.link,
            });
          });
        }

        if (achievements.competitions && Array.isArray(achievements.competitions)) {
          achievements.competitions.forEach((achievement) => {
            achievementsToInsert.push({
              studentId: studentId,
              achievementType: 'competition',
              title: achievement.title,
              description: achievement.description,
              issuer: achievement.issuer,
              date: achievement.date ? new Date(achievement.date) : null,
              link: achievement.link,
            });
          });
        }

        if (achievementsToInsert.length > 0) {
          await tx.studentAchievement.createMany({
            data: achievementsToInsert,
          });
        }
      }

      // Check if profile is now complete
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          fullName: true,
          email: true,
          phone: true,
          imageUrl: true,
          instituteName: true,
          courseTaken: true,
          currentYear: true,
          currentSemester: true,
          graduationYear: true,
          domainId: true,
          internshipStartDate: true,
          internshipEndDate: true,
          resumeUrl: true,
          _count: {
            select: {
              skills: true,
              personalProjects: true,
            },
          },
        },
      });

      const isComplete = !!(
        student.fullName &&
        student.email &&
        student.phone &&
        student.imageUrl &&
        student.instituteName &&
        student.courseTaken &&
        student.currentYear &&
        student.currentSemester &&
        student.graduationYear &&
        student.domainId &&
        student.internshipStartDate &&
        student.internshipEndDate &&
        student._count.skills > 0 &&
        student._count.personalProjects > 0 &&
        student.resumeUrl
      );

      // Update profileCompleted flag
      await tx.student.update({
        where: { id: studentId },
        data: { profileCompleted: isComplete },
      });

      return { updatedStudent, isComplete };
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profileCompleted: result.isComplete,
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Upload profile image
 * POST /api/student/profile/image
 */
const uploadProfileImageHandler = async (req, res) => {
  try {
    // console.log('📥 Profile image upload request received');
    // console.log('   req.file:', req.file ? {
    //   fieldname: req.file.fieldname,
    //   originalname: req.file.originalname,
    //   encoding: req.file.encoding,
    //   mimetype: req.file.mimetype,
    //   size: req.file.size,
    //   destination: req.file.destination,
    //   filename: req.file.filename,
    //   path: req.file.path,
    // } : 'null');

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an image file.',
      });
    }

    const studentId = req.user?.id;
    if (!studentId) {
      console.error('❌ No student ID in request');
      return res.status(401).json({
        success: false,
        message: 'Student ID not found in request',
      });
    }

    // console.log(`👤 Student ID: ${studentId}`);

    // Get current student to delete old image if exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { imageUrl: true },
    });

    // Delete old image file if exists (handle both old and new path formats)
    if (student && student.imageUrl) {
      let oldImagePath;
      
      // Check if it's the new hierarchical path format
      if (student.imageUrl.includes('/scholarflex/')) {
        oldImagePath = path.join(__dirname, '../uploads', student.imageUrl.replace(/^\//, ''));
      } else if (student.imageUrl.includes(`/students/${studentId}/`)) {
        oldImagePath = path.join(__dirname, '../uploads', student.imageUrl.replace(/^\//, ''));
      } else {
        // Old flat structure path
        oldImagePath = path.join(__dirname, '../uploads/profile-images', path.basename(student.imageUrl));
      }
      
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          // console.log(`🗑️ Deleted old image: ${oldImagePath}`);
        } catch (unlinkError) {
          console.warn('Could not delete old image file:', unlinkError.message);
        }
      }
    }

    // With memory storage, we need to manually write the file
    if (!req.file || !req.file.buffer) {
      console.error('❌ No file buffer available');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file buffer missing',
      });
    }

    // console.log('📄 File upload details:');
    // console.log('   Original name:', req.file.originalname);
    // console.log('   Size:', req.file.size, 'bytes');
    // console.log('   MIME type:', req.file.mimetype);
    // console.log('   Buffer size:', req.file.buffer.length, 'bytes');

    // Get upload directory
    const uploadDir = await getStudentUploadDir(studentId);
    // console.log(`📁 Upload directory: ${uploadDir}`);
    
    // Determine filename
    const ext = path.extname(req.file.originalname);
    const filename = `profile${ext}`;
    const filePath = path.join(uploadDir, filename);
    // console.log(`📝 Target file path: ${filePath}`);
    
    // Write file manually from buffer
    // console.log('💾 Writing file to disk...');
    try {
      fs.writeFileSync(filePath, req.file.buffer);
      // console.log(`✅ File written successfully to: ${filePath}`);
    } catch (writeError) {
      console.error('❌ Error writing file:', writeError);
      console.error('   Stack:', writeError.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to write file to disk: ' + writeError.message,
      });
    }
    
    // Verify file was written
    if (!fs.existsSync(filePath)) {
      console.error('❌ File was not written despite writeFileSync call');
      return res.status(500).json({
        success: false,
        message: 'File could not be written to disk',
      });
    }
    
    const stats = fs.statSync(filePath);
    // console.log(`✅ File verified: ${stats.size} bytes`);

    // Calculate relative path from uploads directory
    const uploadsBaseDir = path.join(__dirname, '../uploads');
    const relativePath = path.relative(uploadsBaseDir, filePath);
    const imageUrl = `/${relativePath.replace(/\\/g, '/')}`;

    // console.log(`✅ Profile image saved successfully`);
    // console.log(`   Full path: ${filePath}`);
    // console.log(`   Relative path: ${imageUrl}`);

    await prisma.student.update({
      where: { id: studentId },
      data: { imageUrl: imageUrl },
    });

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('❌ Error uploading profile image:', error);
    console.error('   Stack:', error.stack);
    // Delete uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        // console.log('🗑️ Deleted uploaded file due to error');
      } catch (unlinkError) {
        console.warn('Could not delete uploaded file on error:', unlinkError.message);
      }
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Upload resume
 * POST /api/student/profile/resume
 */
const uploadResumeHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload a PDF file.',
      });
    }

    const studentId = req.user.id;

    // Get current student to delete old resume if exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { resumeUrl: true },
    });

    // Delete old resume file if exists (handle both old and new path formats)
    if (student && student.resumeUrl) {
      let oldResumePath;
      
      // Check if it's the new hierarchical path format
      if (student.resumeUrl.includes('/scholarflex/')) {
        oldResumePath = path.join(__dirname, '../uploads', student.resumeUrl.replace(/^\//, ''));
      } else if (student.resumeUrl.includes(`/students/${studentId}/`)) {
        oldResumePath = path.join(__dirname, '../uploads', student.resumeUrl.replace(/^\//, ''));
      } else {
        // Old flat structure path
        oldResumePath = path.join(__dirname, '../uploads/resumes', path.basename(student.resumeUrl));
      }
      
      // Multer already saved the new file before this handler runs. If the previous
      // resume path matches the just-uploaded path (same filename like 'resume.pdf'),
      // don't delete it.
      const currentUploadPath = req.file?.path ? path.resolve(req.file.path) : null;
      const previousPath = oldResumePath ? path.resolve(oldResumePath) : null;

      if (previousPath && currentUploadPath && previousPath === currentUploadPath) {
        // skip delete
      } else if (fs.existsSync(oldResumePath)) {
        try {
          fs.unlinkSync(oldResumePath);
        } catch (unlinkError) {
          console.warn('Could not delete old resume file:', unlinkError.message);
        }
      }
    }

    // Verify file was saved correctly
    if (!req.file || !req.file.path) {
      return res.status(500).json({
        success: false,
        message: 'File upload failed - file path not available',
      });
    }

    // Verify file actually exists at the saved location
    if (!fs.existsSync(req.file.path)) {
      console.error(`❌ File not found at saved path: ${req.file.path}`);
      return res.status(500).json({
        success: false,
        message: 'File was not saved correctly',
      });
    }

    // Calculate relative path from uploads directory
    // req.file.path is the absolute path where multer saved the file
    const uploadsBaseDir = path.join(__dirname, '../uploads');
    const relativePath = path.relative(uploadsBaseDir, req.file.path);
    const resumeUrl = `/${relativePath.replace(/\\/g, '/')}`;

    // console.log(`✅ Resume saved successfully`);
    // console.log(`   Full path: ${req.file.path}`);
    // console.log(`   Relative path: ${resumeUrl}`);

    await prisma.student.update({
      where: { id: studentId },
      data: { resumeUrl: resumeUrl },
    });

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      resumeUrl: resumeUrl,
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    // Delete uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('Could not delete uploaded file on error:', unlinkError.message);
      }
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getProfile,
  checkProfileCompletion,
  updateProfile,
  uploadProfileImage: exports.uploadProfileImage, // Multer middleware
  uploadResume: exports.uploadResume, // Multer middleware
  uploadProfileImageHandler,
  uploadResumeHandler,
};

