const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { upsertStudentBatch } = require('../utils/studentBatch');

const CANDIDATE_REGISTRATION_ENABLED_KEY = 'candidate_registration_enabled';

/**
 * GET /api/public/candidate-registration-enabled
 * Public: no auth. Returns whether candidate registration form is open.
 */
exports.getRegistrationEnabled = async (req, res) => {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: CANDIDATE_REGISTRATION_ENABLED_KEY },
    });
    const enabled = row?.value === 'true';

    res.status(200).json({
      success: true,
      enabled: !!enabled,
    });
  } catch (error) {
    console.error('Error in getRegistrationEnabled:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * POST /api/public/candidates/register
 * Public: no auth. Register a new candidate (creates student + student_batch).
 * Academic year is derived from internship_start_date and internship_end_date.
 */
exports.registerCandidate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const enabledRow = await prisma.systemSetting.findUnique({
      where: { key: CANDIDATE_REGISTRATION_ENABLED_KEY },
    });
    if (enabledRow?.value !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Registrations are currently closed.',
      });
    }

    const {
      full_name,
      email,
      phone,
      institute_name,
      course_taken,
      area_of_interests,
      internship_start_date,
      internship_end_date,
      internship_duration,
      reference_information,
      internal_faculty_name,
      faculty_contact,
      faculty_email,
    } = req.body;

    if (!full_name?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if email exists for an ACTIVE student only (ignore soft-deleted students)
    const existing = await prisma.student.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        isActive: true, // Only check active students
      },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered.',
      });
    }

    let domainId = null;
    if (area_of_interests?.trim()) {
      const Student = require('../models/Student');
      domainId = await Student.getOrCreateDomain(area_of_interests.trim());
    }

    const studentData = {
      email: email.toLowerCase().trim(),
      fullName: full_name.trim(),
      phone: phone?.trim() || null,
      domainId,
      instituteName: institute_name?.trim() || null,
      courseTaken: course_taken?.trim() || null,
      internshipStartDate: internship_start_date ? new Date(internship_start_date) : null,
      internshipEndDate: internship_end_date ? new Date(internship_end_date) : null,
      internshipDuration: internship_duration?.trim() || null,
      referenceInformation: reference_information?.trim() || null,
      internalFacultyName: internal_faculty_name?.trim() || null,
      facultyContact: faculty_contact?.trim() || null,
      facultyEmail: faculty_email?.trim() || null,
      createdBy: null,
    };

    const created = await prisma.student.create({
      data: studentData,
      include: { domain: true, status: true },
    });

    await upsertStudentBatch(
      created.id,
      created.internshipStartDate,
      created.internshipEndDate
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. You can log in as an intern once your account is activated.',
      student: {
        id: created.id,
        email: created.email,
        full_name: created.fullName,
      },
    });
  } catch (error) {
    console.error('Error in registerCandidate:', error);
    if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('duplicate')) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered.',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
