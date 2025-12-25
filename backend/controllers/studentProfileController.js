const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../config/database');

// Configure multer for profile image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const studentId = req.user.id;
    const timestamp = Date.now();
    const filename = `profile_${studentId}_${timestamp}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for profile images.'));
    }
  },
});

// Configure multer for resume uploads
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const studentId = req.user.id;
    const timestamp = Date.now();
    const filename = `resume_${studentId}_${timestamp}${path.extname(file.originalname)}`;
    cb(null, filename);
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an image file.',
      });
    }

    const studentId = req.user.id;

    // Get current student to delete old image if exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { imageUrl: true },
    });

    // Delete old image file if exists
    if (student && student.imageUrl) {
      const oldImagePath = path.join(__dirname, '../uploads/profile-images', path.basename(student.imageUrl));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update student with new image URL
    // Store relative path from uploads directory
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;

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
    console.error('Error uploading profile image:', error);
    // Delete uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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

    // Delete old resume file if exists
    if (student && student.resumeUrl) {
      const oldResumePath = path.join(__dirname, '../uploads/resumes', path.basename(student.resumeUrl));
      if (fs.existsSync(oldResumePath)) {
        fs.unlinkSync(oldResumePath);
      }
    }

    // Update student with new resume URL
    // Store relative path from uploads directory
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

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
      fs.unlinkSync(req.file.path);
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

