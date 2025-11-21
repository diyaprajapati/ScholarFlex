const QuestionPaper = require('../models/QuestionPaper');
const { logActivitySimple } = require('../middleware/activityLogger');

const ALLOWED_SECTIONS = ['Technical', 'Coding', 'Theory', 'Maths & Logical Reasoning'];

const normalizeSectionName = (section) => {
  if (!section) return null;
  const normalized = section.trim().toLowerCase();
  if (normalized === 'theory' || normalized === 'theory section' || normalized === 'aptitude') return 'Theory';
  if (
    normalized === 'technical' ||
    normalized === 'technical section' ||
    normalized === 'technical/coding' ||
    normalized === 'technical coding' ||
    normalized === 'tech based' ||
    normalized === 'tech-based' ||
    normalized === 'technical mcqs'
  ) {
    return 'Technical';
  }
  if (normalized === 'coding' || normalized === 'coding section') return 'Coding';
  if (
    normalized === 'maths & logical reasoning' ||
    normalized === 'maths and logical reasoning' ||
    normalized === 'maths & logical reasoning section' ||
    normalized === 'maths' ||
    normalized === 'logical reasoning' ||
    normalized === 'mathematics & logical reasoning'
  ) {
    return 'Maths & Logical Reasoning';
  }
  return null;
};

/**
 * Create question paper from JSON format
 */
exports.createQuestionPaper = async (req, res) => {
  try {
    const {
      paper_name,
      description,
      subject,
      year,
      semester,
      duration_minutes,
      status,
      questions, // Old format: array of questions
      sections, // New format: array of sections with questions
      domain_ids, // Array of domain IDs to assign this paper to
    } = req.body;

    // Handle both old format (questions) and new format (sections)
    let allQuestions = [];
    if (sections && Array.isArray(sections)) {
      // New format: sections with questions
      for (const section of sections) {
        if (section.questions && Array.isArray(section.questions)) {
          const normalizedSection = normalizeSectionName(section.name || section.sectionName);
          if (!normalizedSection) {
            return res.status(400).json({
              success: false,
              message: `Invalid section name "${section?.name}". Allowed sections: ${ALLOWED_SECTIONS.join(', ')}`,
            });
          }

          const sectionQuestions = section.questions.map(q => ({
            ...q,
            section: normalizedSection,
          }));
          allQuestions = allQuestions.concat(sectionQuestions);
        }
      }
    } else if (questions && Array.isArray(questions)) {
      // Old format: flat array of questions
      allQuestions = questions.map((q) => ({
        ...q,
        section: normalizeSectionName(q.section || q.sectionName),
      }));
    }

    // Validate required fields
    if (!paper_name) {
      return res.status(400).json({
        success: false,
        message: 'paper_name is required',
      });
    }

    if (allQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'questions or sections with questions are required and must not be empty',
      });
    }

    // Validate each question
    const validationErrors = [];
    for (let i = 0; i < allQuestions.length; i++) {
      const question = allQuestions[i];
      const questionNum = i + 1;

      if (!question.text) {
        validationErrors.push(`Question ${questionNum}: text is required`);
      }

      if (!question.type) {
        validationErrors.push(`Question ${questionNum}: type is required`);
      } else {
        const validTypes = ['multiple-choice', 'single-choice', 'true-false'];
        if (!validTypes.includes(question.type)) {
          validationErrors.push(
            `Question ${questionNum}: type must be one of: ${validTypes.join(', ')}`
          );
        }
      }

      if (question.weightage && (isNaN(question.weightage) || question.weightage < 0)) {
        validationErrors.push(`Question ${questionNum}: weightage must be a positive number`);
      }

      // Validate options for multiple-choice, single-choice, and true-false
      if (['multiple-choice', 'single-choice', 'true-false'].includes(question.type)) {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
          validationErrors.push(`Question ${questionNum}: options array is required for ${question.type} questions`);
        }

        if (!question.correctOptions || !Array.isArray(question.correctOptions) || question.correctOptions.length === 0) {
          validationErrors.push(`Question ${questionNum}: correctOptions array is required for ${question.type} questions`);
        } else {
          // Validate correctOptions indices
          for (const correctIndex of question.correctOptions) {
            if (correctIndex < 0 || correctIndex >= question.options.length) {
              validationErrors.push(
                `Question ${questionNum}: correctOptions index ${correctIndex} is out of range (options length: ${question.options.length})`
              );
            }
          }
        }
      }
      const normalizedSection = normalizeSectionName(question.section);
      if (!normalizedSection) {
        validationErrors.push(`Question ${questionNum}: section must be one of: ${ALLOWED_SECTIONS.join(', ')}`);
      } else {
        question.section = normalizedSection;
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: validationErrors,
      });
    }

    // Prepare paper data
    const paperData = {
      paper_name,
      description,
      subject,
      year,
      semester,
      duration_minutes: Number.isFinite(Number(duration_minutes)) && Number(duration_minutes) > 0
        ? Math.round(Number(duration_minutes))
        : 60,
      status: status || 'draft',
      total_questions: allQuestions.length,
      domain_ids: domain_ids || [], // Array of domain IDs
    };

    // Create question paper with questions
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const createdPaper = await QuestionPaper.create(paperData, allQuestions, userId);

    // Log activity
    await logActivitySimple(
      req,
      'CREATE',
      'QUESTION_PAPER',
      createdPaper.id,
      `Created question paper: ${paper_name} with ${allQuestions.length} questions`
    );

    res.status(201).json({
      success: true,
      message: 'Question paper created successfully',
      data: createdPaper,
    });
  } catch (error) {
    console.error('Error creating question paper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all question papers
 */
exports.getAllQuestionPapers = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      subject: req.query.subject,
      year: req.query.year,
      semester: req.query.semester,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const papers = await QuestionPaper.findAll(filters);

    res.status(200).json({
      success: true,
      message: 'Question papers retrieved successfully',
      data: papers,
      count: papers.length,
    });
  } catch (error) {
    console.error('Error getting question papers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get question paper by ID
 */
exports.getQuestionPaperById = async (req, res) => {
  try {
    const { id } = req.params;

    const paper = await QuestionPaper.findById(id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question paper retrieved successfully',
      data: paper,
    });
  } catch (error) {
    console.error('Error getting question paper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Update question paper
 */
exports.updateQuestionPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paper_name,
      description,
      subject,
      year,
      semester,
      duration_minutes,
      status,
      questions,
    } = req.body;

    // Validate required fields
    if (!paper_name) {
      return res.status(400).json({
        success: false,
        message: 'paper_name is required',
      });
    }

    // Validate questions if provided
    if (questions && Array.isArray(questions)) {
      const validationErrors = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionNum = i + 1;

        if (!question.text) {
          validationErrors.push(`Question ${questionNum}: text is required`);
        }

        if (!question.type) {
          validationErrors.push(`Question ${questionNum}: type is required`);
        } else {
          const validTypes = ['multiple-choice', 'single-choice', 'true-false'];
          if (!validTypes.includes(question.type)) {
            validationErrors.push(
              `Question ${questionNum}: type must be one of: ${validTypes.join(', ')}`
            );
          }
        }

        if (question.weightage && (isNaN(question.weightage) || question.weightage < 0)) {
          validationErrors.push(`Question ${questionNum}: weightage must be a positive number`);
        }

        // Validate options for multiple-choice, single-choice, and true-false
        if (['multiple-choice', 'single-choice', 'true-false'].includes(question.type)) {
          if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
            validationErrors.push(`Question ${questionNum}: options array is required for ${question.type} questions`);
          }

          if (!question.correctOptions || !Array.isArray(question.correctOptions) || question.correctOptions.length === 0) {
            validationErrors.push(`Question ${questionNum}: correctOptions array is required for ${question.type} questions`);
          } else {
            // Validate correctOptions indices
            for (const correctIndex of question.correctOptions) {
              if (correctIndex < 0 || correctIndex >= question.options.length) {
                validationErrors.push(
                  `Question ${questionNum}: correctOptions index ${correctIndex} is out of range (options length: ${question.options.length})`
                );
              }
            }
          }
        }

        const normalizedSection = normalizeSectionName(question.section);
        if (!normalizedSection) {
          validationErrors.push(`Question ${questionNum}: section must be one of: ${ALLOWED_SECTIONS.join(', ')}`);
        } else {
          question.section = normalizedSection;
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: validationErrors,
        });
      }
    }

    // Prepare paper data
    const paperData = {
      paper_name,
      description,
      subject,
      year,
      semester,
      duration_minutes: Number.isFinite(Number(duration_minutes)) && Number(duration_minutes) > 0
        ? Math.round(Number(duration_minutes))
        : undefined,
      status: status || undefined,
    };

    if (questions && Array.isArray(questions)) {
      paperData.total_questions = questions.length;
    }

    // Update question paper
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const updatedPaper = await QuestionPaper.update(id, paperData, questions, userId);

    // Log activity
    await logActivitySimple(
      req,
      'UPDATE',
      'QUESTION_PAPER',
      id,
      `Updated question paper: ${paper_name}${questions ? ` with ${questions.length} questions` : ''}`
    );

    res.status(200).json({
      success: true,
      message: 'Question paper updated successfully',
      data: updatedPaper,
    });
  } catch (error) {
    console.error('Error updating question paper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete question paper
 */
exports.deleteQuestionPaper = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if paper exists and is active
    const paper = await QuestionPaper.findById(id);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    // Check if paper is already deleted
    if (!paper.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found or already deleted',
      });
    }

    // Delete the paper
    const deleted = await QuestionPaper.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    // Log activity (wrap in try-catch to prevent logging errors from affecting the response)
    try {
      await logActivitySimple(
        req,
        'DELETE',
        'QUESTION_PAPER',
        id,
        `Deleted question paper: ${paper.paper_name}`
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the request if logging fails
    }

    res.status(200).json({
      success: true,
      message: 'Question paper deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question paper:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

