const { prisma } = require('../config/database');
const QuestionPaper = require('../models/QuestionPaper');

const SECTION_REQUIREMENTS = {
  'Technical section': 20,
  'Theory section': 10,
  'Coding': 10,
  'Maths & Logical Reasoning': 10,
};

const TOTAL_REQUIRED_QUESTIONS = Object.values(SECTION_REQUIREMENTS).reduce((sum, count) => sum + count, 0);

const normalizeSectionName = (section) => {
  if (!section || typeof section !== 'string') return null;
  const normalized = section.trim().toLowerCase();
  
  // Theory section - map various theory-related names
  if (
    normalized === 'theory' ||
    normalized === 'theory section' ||
    normalized === 'theory-1' ||
    normalized === 'theory 1' ||
    normalized === 'theory section 1' ||
    normalized === 'theory_section_1' ||
    normalized === 'theory-2' ||
    normalized === 'theory 2' ||
    normalized === 'theory section 2' ||
    normalized === 'theory_section_2'
  ) {
    return 'Theory section';
  }
  
  // Technical section - map various technical-related names
  if (
    normalized === 'technical' ||
    normalized === 'technical section' ||
    normalized === 'technical/coding' ||
    normalized === 'technical coding' ||
    normalized === 'tech based' ||
    normalized === 'tech-based' ||
    normalized === 'technical mcqs'
  ) {
    return 'Technical section';
  }
  
  // Coding section
  if (
    normalized === 'coding' ||
    normalized === 'coding section' ||
    normalized === 'programming' ||
    normalized === 'code'
  ) {
    return 'Coding';
  }
  
  // Maths & Logical Reasoning section
  if (
    normalized === 'maths & logical reasoning' ||
    normalized === 'maths and logical reasoning' ||
    normalized === 'maths & logical reasoning section' ||
    normalized === 'maths' ||
    normalized === 'logical reasoning' ||
    normalized === 'mathematics & logical reasoning' ||
    normalized === 'aptitude' ||
    normalized === 'maths and logical'
  ) {
    return 'Maths & Logical Reasoning';
  }
  
  return null;
};

const shuffleArray = (input = []) => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const buildQuestionPoolForPaper = async (questionPaperId) => {
  const questions = await prisma.question.findMany({
    where: {
      questionPaperId: parseInt(questionPaperId),
      isActive: true,
    },
    select: {
      id: true,
      weightage: true,
      section: true,
    },
  });

  // Initialize sections map with all 4 required sections
  const sectionsMap = {
    'Technical section': [],
    'Theory section': [],
    'Coding': [],
    'Maths & Logical Reasoning': [],
  };

  // Group questions by normalized section name
  questions.forEach((question) => {
    const normalizedSection = normalizeSectionName(question.section);
    if (!normalizedSection) {
      console.warn(`Question ${question.id} has invalid section: ${question.section}`);
      return;
    }
    if (sectionsMap[normalizedSection]) {
      sectionsMap[normalizedSection].push({
        question_id: question.id,
        weightage: question.weightage || 1,
        section: normalizedSection,
      });
    }
  });

  // Validate that we have enough questions in each section
  for (const [sectionName, requiredCount] of Object.entries(SECTION_REQUIREMENTS)) {
    const availableCount = (sectionsMap[sectionName] || []).length;
    if (availableCount < requiredCount) {
      throw new Error(
        `Insufficient questions in "${sectionName}" section. Need at least ${requiredCount}, but only ${availableCount} available.`
      );
    }
  }

  // Randomly select questions from each section
  const selected = [];
  for (const [sectionName, requiredCount] of Object.entries(SECTION_REQUIREMENTS)) {
    const pool = sectionsMap[sectionName] || [];
    // Shuffle the pool and randomly select the required number
    const shuffledPool = shuffleArray(pool);
    const sampled = shuffledPool.slice(0, requiredCount);
    selected.push(...sampled);
  }

  // Verify we have the correct total
  if (selected.length !== TOTAL_REQUIRED_QUESTIONS) {
    throw new Error(
      `Question pool must contain exactly ${TOTAL_REQUIRED_QUESTIONS} questions, but got ${selected.length}`
    );
  }

  // Calculate total weightage of selected questions
  const totalWeightage = selected.reduce((sum, item) => sum + (item.weightage || 1), 0);
  
  // Scale weightages so they sum to 100
  const TARGET_TOTAL_WEIGHTAGE = 100;
  const scaleFactor = TARGET_TOTAL_WEIGHTAGE / totalWeightage;
  
  // Apply scaling to each question's weightage
  const scaledSelection = selected.map((item) => ({
    ...item,
    weightage: Math.round((item.weightage || 1) * scaleFactor * 100) / 100, // Round to 2 decimal places
    original_weightage: item.weightage || 1, // Store original for reference
  }));

  // Verify the scaled total is approximately 100 (within rounding error)
  const scaledTotal = scaledSelection.reduce((sum, item) => sum + item.weightage, 0);
  if (Math.abs(scaledTotal - TARGET_TOTAL_WEIGHTAGE) > 0.1) {
    // Adjust the last question to make exact 100
    const difference = TARGET_TOTAL_WEIGHTAGE - scaledTotal;
    scaledSelection[scaledSelection.length - 1].weightage += difference;
  }

  return scaledSelection;
};

const ensureAttemptQuestionPool = async (attemptId, questionPaperId, existingPool) => {
  let poolData = existingPool;
  if (!poolData || !Array.isArray(poolData) || poolData.length === 0) {
    poolData = await buildQuestionPoolForPaper(questionPaperId);
    // Max possible score is always 100 for 50 questions
    const maxScore = 100;

    await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        questionPool: poolData,
        totalQuestions: poolData.length,
        maxPossibleScore: maxScore,
      },
    });
  }
  return poolData;
};

/**
 * Map question type from database enum to JSON format
 */
function mapQuestionTypeFromDB(type) {
  const typeMap = {
    'MULTIPLE_SELECT': 'multiple-choice',
    'SINGLE_CHOICE': 'single-choice',
    'TRUE_FALSE': 'true-false',
    'MCQ': 'multiple-choice',
  };
  return typeMap[type] || 'multiple-choice';
}

/**
 * Get available tests for a student based on their domain
 */
exports.getAvailableTests = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get student's domain using Prisma
    const student = await prisma.student.findFirst({
      where: { id: studentId, isActive: true },
      select: { domainId: true },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const domainId = student.domainId;
    if (!domainId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No domain assigned to student',
      });
    }

    // Get tests assigned to this domain (published only) using Prisma
    const domainTests = await prisma.questionPaper.findMany({
      where: {
        domains: {
          some: {
            domainId: domainId,
          },
        },
        status: 'published',
        isActive: true,
      },
      include: {
        testAttempts: {
          where: {
            studentId: studentId,
          },
          select: {
            id: true,
            status: true,
            percentageScore: true,
          },
          take: 1,
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get manually assigned tests using Prisma
    const manualAssignments = await prisma.testAssignment.findMany({
      where: {
        studentId: studentId,
        isActive: true,
        questionPaper: {
          status: 'published',
          isActive: true,
        },
      },
      include: {
        questionPaper: {
          include: {
            testAttempts: {
              where: {
                studentId: studentId,
              },
              select: {
                id: true,
                status: true,
                percentageScore: true,
              },
              take: 1,
              orderBy: {
                submittedAt: 'desc',
              },
            },
          },
        },
      },
    });

    // Transform domain tests
    const domainTestsFormatted = domainTests.map(qp => ({
      id: qp.id,
      paper_name: qp.paperName,
      description: qp.description,
      subject: qp.subject,
      year: qp.year,
      semester: qp.semester,
      total_questions: qp.totalQuestions,
      total_weightage: qp.totalWeightage,
      duration_minutes: qp.durationMinutes,
      status: qp.status,
      created_at: qp.createdAt,
      is_attempted: qp.testAttempts.length > 0,
      attempt_id: qp.testAttempts[0]?.id || null,
      attempt_status: qp.testAttempts[0]?.status || null,
      attempt_score: qp.testAttempts[0]?.percentageScore ? parseFloat(qp.testAttempts[0].percentageScore) : null,
    }));

    // Transform manually assigned tests
    const manualTestsFormatted = manualAssignments.map(ta => ({
      id: ta.questionPaper.id,
      paper_name: ta.questionPaper.paperName,
      description: ta.questionPaper.description,
      subject: ta.questionPaper.subject,
      year: ta.questionPaper.year,
      semester: ta.questionPaper.semester,
      total_questions: ta.questionPaper.totalQuestions,
      total_weightage: ta.questionPaper.totalWeightage,
      duration_minutes: ta.questionPaper.durationMinutes,
      status: ta.questionPaper.status,
      created_at: ta.questionPaper.createdAt,
      is_attempted: ta.questionPaper.testAttempts.length > 0,
      attempt_id: ta.questionPaper.testAttempts[0]?.id || null,
      attempt_status: ta.questionPaper.testAttempts[0]?.status || null,
      attempt_score: ta.questionPaper.testAttempts[0]?.percentageScore ? parseFloat(ta.questionPaper.testAttempts[0].percentageScore) : null,
    }));

    // Combine and deduplicate
    const allTests = [...domainTestsFormatted, ...manualTestsFormatted];
    const uniqueTests = Array.from(
      new Map(allTests.map(test => [test.id, test])).values()
    );

    res.status(200).json({
      success: true,
      data: uniqueTests,
      message: 'Tests retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting available tests:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Helper to verify student access to test
 */
const verifyTestAccess = async (testId, studentId) => {
  // Get student with domain
  const student = await prisma.student.findUnique({
    where: { id: parseInt(studentId) },
    select: { domainId: true },
  });

  if (!student) {
    return null;
  }

  // Get question paper with domains and test assignments
  const questionPaper = await prisma.questionPaper.findFirst({
    where: {
      id: parseInt(testId),
      status: 'published',
      isActive: true,
      OR: [
        // Check if paper is assigned to student's domain
        {
          domains: {
            some: {
              domainId: student.domainId,
            },
          },
        },
        // Check if paper is manually assigned to student
        {
          testAssignments: {
            some: {
              studentId: parseInt(studentId),
              isActive: true,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      durationMinutes: true,
    },
  });

  if (!questionPaper) {
    return null;
  }

  // Return in the expected format (snake_case for compatibility)
  return {
    id: questionPaper.id,
    duration_minutes: questionPaper.durationMinutes,
  };
};

/**
 * Get next question for adaptive testing
 * Starts with lowest marks, increases difficulty on correct answer, decreases on wrong
 */
exports.getNextQuestion = async (req, res) => {
  try {
    const { testAttemptId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get test attempt and verify ownership
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: parseInt(testAttemptId),
        studentId: parseInt(studentId),
        status: 'IN_PROGRESS',
      },
      include: {
        questionPaper: {
          select: {
            totalWeightage: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found or already completed',
      });
    }

    // Transform to match expected format
    const attemptData = {
      id: attempt.id,
      student_id: attempt.studentId,
      question_paper_id: attempt.questionPaperId,
      status: attempt.status,
      question_pool: attempt.questionPool,
      total_weightage: attempt.questionPaper.totalWeightage,
      duration_minutes: attempt.questionPaper.durationMinutes,
    };

    // Get question pool with scaled weightages
    const questionPool = await ensureAttemptQuestionPool(
      testAttemptId,
      attemptData.question_paper_id,
      attemptData.question_pool
    );

    if (!questionPool || questionPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to load questions for this test attempt',
      });
    }

    const questionIds = questionPool.map((item) => item.question_id);

    // Get all questions from the pool, sorted by scaled weightage (marks)
    const questions = await prisma.question.findMany({
      where: {
        id: {
          in: questionIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        weightage: true,
        correctAnswer: true,
        displayOrder: true,
      },
      orderBy: [
        { weightage: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // Create a map of question_id -> scaled weightage from pool
    const poolWeightageMap = new Map();
    questionPool.forEach((item) => {
      poolWeightageMap.set(item.question_id, item.weightage || 1);
    });

    // Get answered questions with timestamps - ensure we get ALL answered questions
    const answeredQuestions = await prisma.studentAnswer.findMany({
      where: {
        testAttemptId: parseInt(testAttemptId),
      },
      select: {
        questionId: true,
        isCorrect: true,
        scoreObtained: true,
        answeredAt: true,
      },
      orderBy: {
        answeredAt: 'desc',
      },
      distinct: ['questionId'],
    });

    // Create a Set for faster lookup and a Map for details
    const answeredQuestionIds = new Set();
    const answeredQuestionsMap = new Map();
    answeredQuestions.forEach(answer => {
      answeredQuestionIds.add(answer.questionId);
      answeredQuestionsMap.set(answer.questionId, {
        is_correct: answer.isCorrect,
        score_obtained: parseFloat(answer.scoreObtained || 0),
        answered_at: answer.answeredAt,
      });
    });

    // Calculate current total marks obtained
    const currentMarks = Array.from(answeredQuestionsMap.values())
      .reduce((sum, ans) => sum + ans.score_obtained, 0);

    // Adaptive logic: Find next question based on time taken
    let nextQuestion = null;
    const allQuestions = questions.map(q => ({
      id: q.id,
      question_text: q.questionText,
      question_type: q.questionType,
      weightage: q.weightage,
      correct_answer: q.correctAnswer,
    }));

    // Sort questions by scaled weightage (ascending - easier to harder)
    const sortedQuestions = [...allQuestions].sort((a, b) => {
      const weightA = poolWeightageMap.get(a.id) || a.weightage || 1;
      const weightB = poolWeightageMap.get(b.id) || b.weightage || 1;
      return weightA - weightB;
    });

    if (answeredQuestions.size === 0) {
      // First question: always start with lowest weightage (easiest - closest to 1)
      // Find question with minimum scaled weightage
      let minWeight = Infinity;
      let minWeightQuestion = null;
      
      sortedQuestions.forEach(q => {
        const weight = poolWeightageMap.get(q.id) || q.weightage || 1;
        if (weight < minWeight) {
          minWeight = weight;
          minWeightQuestion = q;
        }
      });
      
      nextQuestion = minWeightQuestion || sortedQuestions[0]; // Always use easiest question first
    } else {
      // Get last answered question and calculate time taken
      const lastAnsweredId = answeredQuestions[0]?.questionId;
      const lastAnswered = allQuestions.find(q => q.id === lastAnsweredId);
      const lastAnswer = answeredQuestionsMap.get(lastAnsweredId);
      
      // Calculate time taken for last question (in seconds)
      let timeTakenSeconds = 0;
      if (answeredQuestions.length > 1) {
        // Time between last two answers
        const lastAnswerTime = answeredQuestions[0].answeredAt;
        const previousAnswerTime = answeredQuestions[1].answeredAt;
        timeTakenSeconds = (lastAnswerTime.getTime() - previousAnswerTime.getTime()) / 1000;
      } else {
        // First answer - use time from test start
        const lastAnswerTime = answeredQuestions[0].answeredAt;
        const testStartTime = attempt.startedAt;
        timeTakenSeconds = (lastAnswerTime.getTime() - testStartTime.getTime()) / 1000;
      }

      const currentWeightage = poolWeightageMap.get(lastAnswered.id) || lastAnswered.weightage || 1;
      
      // Calculate expected time based on weightage (more weightage = more time expected)
      // Base: 30 seconds per mark, minimum 15 seconds
      const expectedTime = Math.max(15, currentWeightage * 30);
      
      // Determine if user took more or less time than expected
      const isFast = timeTakenSeconds < expectedTime * 0.7; // 70% of expected time = fast
      const isSlow = timeTakenSeconds > expectedTime * 1.5; // 150% of expected time = slow
      
      // Get available questions (not answered yet) - use Set for faster lookup
      const availableQuestions = sortedQuestions.filter(q => !answeredQuestionIds.has(q.id));
      
      if (availableQuestions.length === 0) {
        nextQuestion = null; // All questions answered
      } else if (isFast) {
        // Fast answer: move to harder question (higher weightage)
        const harderQuestions = availableQuestions.filter(q => {
          const weight = poolWeightageMap.get(q.id) || q.weightage || 1;
          return weight > currentWeightage;
        });
        nextQuestion = harderQuestions.length > 0 
          ? harderQuestions[0] // First harder question
          : availableQuestions[availableQuestions.length - 1]; // Hardest available
      } else if (isSlow) {
        // Slow answer: move to easier question (lower weightage)
        const easierQuestions = availableQuestions.filter(q => {
          const weight = poolWeightageMap.get(q.id) || q.weightage || 1;
          return weight < currentWeightage;
        });
        nextQuestion = easierQuestions.length > 0 
          ? easierQuestions[easierQuestions.length - 1] // Easiest available
          : availableQuestions[0]; // Easiest overall
      } else {
        // Normal time: stay at similar difficulty
        const similarQuestions = availableQuestions.filter(q => {
          const weight = poolWeightageMap.get(q.id) || q.weightage || 1;
          return Math.abs(weight - currentWeightage) <= 0.5; // Within 0.5 marks
        });
        nextQuestion = similarQuestions.length > 0 
          ? similarQuestions[0]
          : availableQuestions[Math.floor(availableQuestions.length / 2)]; // Middle difficulty
      }
    }

    // If no next question found, test is complete
    if (!nextQuestion) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'All questions completed',
        test_complete: true,
        current_marks: currentMarks,
        total_marks: 100, // Always 100 for 50 questions
      });
    }

    // Double-check: Verify this question hasn't been answered (robust check)
    const alreadyAnsweredCheck = await prisma.studentAnswer.findFirst({
      where: {
        testAttemptId: parseInt(testAttemptId),
        questionId: nextQuestion.id,
      },
      select: {
        id: true,
      },
    });

    if (alreadyAnsweredCheck) {
      // This question was already answered - find another one
      const availableQuestions = sortedQuestions.filter(q => !answeredQuestionIds.has(q.id));
      
      // Remove the duplicate question from available list
      const remainingQuestions = availableQuestions.filter(q => q.id !== nextQuestion.id);
      
      if (remainingQuestions.length > 0) {
        // Select the easiest available question as fallback
        nextQuestion = remainingQuestions[0];
      } else {
        // No more questions available
        return res.status(200).json({
          success: true,
          data: null,
          message: 'All questions completed',
          test_complete: true,
          current_marks: currentMarks,
          total_marks: 100,
        });
      }
    }

    // Get options for this question
    const options = await prisma.questionOption.findMany({
      where: {
        questionId: nextQuestion.id,
      },
      select: {
        id: true,
        optionText: true,
        optionLabel: true,
        isCorrect: true,
        displayOrder: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    // Get scaled weightage from pool
    const scaledWeightage = poolWeightageMap.get(nextQuestion.id) || nextQuestion.weightage || 1;

    // Transform question data
    const questionData = {
      id: nextQuestion.id,
      text: nextQuestion.question_text,
      type: mapQuestionTypeFromDB(nextQuestion.question_type),
      weightage: scaledWeightage,
      correctAnswer: nextQuestion.correct_answer || null,
      options: options.map(opt => ({
        id: opt.id,
        text: opt.option_text,
        label: opt.option_label,
        is_correct: opt.is_correct,
      })),
    };

    res.status(200).json({
      success: true,
      data: {
        question: questionData,
        progress: {
          current_marks: currentMarks,
          total_marks: attempt.total_weightage,
          questions_answered: answeredQuestions.size,
          total_questions: allQuestions.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Start a new test attempt
 */
exports.startTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const testAccess = await verifyTestAccess(testId, studentId);
    if (!testAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this test',
      });
    }

    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        studentId: parseInt(studentId),
        questionPaperId: parseInt(testId),
        status: 'IN_PROGRESS',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (existingAttempt) {
      return res.status(200).json({
        success: true,
        message: 'Resumed existing test attempt',
        data: {
          attempt_id: existingAttempt.id,
          duration_minutes: testAccess.duration_minutes || 60,
        },
      });
    }

    // Check if student has completed this test before
    const completedAttempt = await prisma.testAttempt.findFirst({
      where: {
        studentId: parseInt(studentId),
        questionPaperId: parseInt(testId),
        status: {
          in: ['COMPLETED', 'AUTO_SUBMITTED'],
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // If student has completed the test, deny access unless they have explicit retest access
    if (completedAttempt && req.user?.can_retest !== true) {
      return res.status(403).json({
        success: false,
        message: 'You have already attempted this test. You cannot attempt it again.',
      });
    }

    let questionPool;
    try {
      questionPool = await buildQuestionPoolForPaper(testId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Unable to create question pool for this test',
      });
    }

    // Max possible score is always 100 for 50 questions
    const maxScore = 100;

    const attemptResult = await prisma.testAttempt.create({
      data: {
        studentId: parseInt(studentId),
        questionPaperId: parseInt(testId),
        status: 'IN_PROGRESS',
        totalQuestions: questionPool.length,
        maxPossibleScore: maxScore,
        questionPool: questionPool,
      },
      select: {
        id: true,
        startedAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Test attempt started successfully',
      data: {
        attempt_id: attemptResult.id,
        duration_minutes: testAccess.duration_minutes || 60,
      },
    });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Submit test answers and finalize attempt
 */
exports.submitTest = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: parseInt(attemptId),
        studentId: parseInt(studentId),
      },
      include: {
        questionPaper: {
          select: {
            id: true,
            paperName: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    // Transform to match expected format
    const attemptData = {
      id: attempt.id,
      student_id: attempt.studentId,
      question_paper_id: attempt.questionPaperId,
      status: attempt.status,
      question_pool: attempt.questionPool,
      paper_name: attempt.questionPaper.paperName,
    };
    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Test attempt is already completed',
      });
    }

    if (answers.length > 0) {
      const questionIds = answers.map((ans) => ans.question_id).filter(Boolean);
      if (questionIds.length > 0) {
        // Get question pool to use scaled weightages
        const questionPool = await ensureAttemptQuestionPool(
          attemptId,
          attemptData.question_paper_id,
          attemptData.question_pool
        );
        
        // Create a map of question_id -> scaled weightage from pool
        const poolWeightageMap = new Map();
        if (questionPool && Array.isArray(questionPool)) {
          questionPool.forEach((item) => {
            poolWeightageMap.set(item.question_id, item.weightage || 1);
          });
        }

        const questions = await prisma.question.findMany({
          where: {
            questionPaperId: attemptData.question_paper_id,
            id: {
              in: questionIds,
            },
          },
          select: {
            id: true,
            questionType: true,
            weightage: true,
            correctAnswer: true,
          },
        });

        const options = await prisma.questionOption.findMany({
          where: {
            questionId: {
              in: questionIds,
            },
          },
          select: {
            id: true,
            questionId: true,
            optionText: true,
            isCorrect: true,
            displayOrder: true,
          },
          orderBy: [
            { questionId: 'asc' },
            { displayOrder: 'asc' },
          ],
        });

        const questionMap = new Map();
        questions.forEach((question) => {
          questionMap.set(question.id, {
            id: question.id,
            question_type: question.questionType,
            weightage: question.weightage,
            correct_answer: question.correctAnswer,
          });
        });

        const optionMap = new Map();
        options.forEach((option) => {
          if (!optionMap.has(option.questionId)) {
            optionMap.set(option.questionId, []);
          }
          optionMap.get(option.questionId).push({
            question_id: option.questionId,
            id: option.id,
            option_text: option.optionText,
            is_correct: option.isCorrect,
            display_order: option.displayOrder,
          });
        });

        for (const answer of answers) {
          const question = questionMap.get(answer.question_id);
          if (!question) continue;

          // Use scaled weightage from pool, fallback to original if not found
          const scaledWeightage = poolWeightageMap.get(question.id) || question.weightage || 1;

          const questionType = QuestionPaper.mapQuestionTypeFromDB(question.question_type);
          const optionList = optionMap.get(question.id) || [];

          let isCorrect = false;
          let score = 0;
          let selectedOptionId = null;
          let selectedOptionIds = null;
          let answerText = null;

          if (questionType === 'multiple-choice') {
            const selectedIndexes = Array.isArray(answer.selected_option_indexes)
              ? answer.selected_option_indexes
              : [];
            const correctIndexes = optionList
              .map((opt, idx) => (opt.is_correct ? idx : null))
              .filter((idx) => idx !== null);

            const selectedIds = selectedIndexes
              .map((idx) => optionList[idx]?.id)
              .filter((id) => id !== undefined);

            selectedOptionIds = JSON.stringify(selectedIds);

            const sortedSelected = [...selectedIndexes].sort();
            const sortedCorrect = [...correctIndexes].sort();
            isCorrect =
              sortedSelected.length === sortedCorrect.length &&
              sortedSelected.every((value, idx) => value === sortedCorrect[idx]);

            score = isCorrect ? scaledWeightage : 0;
          } else if (questionType === 'single-choice' || questionType === 'true-false') {
            const selectedIndex =
              typeof answer.selected_option_index === 'number' ? answer.selected_option_index : null;
            if (selectedIndex !== null && optionList[selectedIndex]) {
              selectedOptionId = optionList[selectedIndex].id;
              isCorrect = !!optionList[selectedIndex].is_correct;
              score = isCorrect ? scaledWeightage : 0;
            }
          }

          // Use Prisma upsert for MySQL compatibility
          await prisma.studentAnswer.upsert({
            where: {
              testAttemptId_questionId: {
                testAttemptId: parseInt(attemptId),
                questionId: question.id,
              },
            },
            update: {
              selectedOptionId: selectedOptionId,
              selectedOptionIds: selectedOptionIds,
              answerText: answerText,
              isCorrect: isCorrect,
              scoreObtained: score,
              answeredAt: new Date(),
            },
            create: {
              testAttemptId: parseInt(attemptId),
              questionId: question.id,
              selectedOptionId: selectedOptionId,
              selectedOptionIds: selectedOptionIds,
              answerText: answerText,
              isCorrect: isCorrect,
              scoreObtained: score,
              answeredAt: new Date(),
            },
          });
        }
      }
    }

    // Calculate test score manually (since stored procedures may not work in MySQL)
    const studentAnswers = await prisma.studentAnswer.findMany({
      where: {
        testAttemptId: parseInt(attemptId),
      },
      select: {
        scoreObtained: true,
      },
    });

    const totalScore = studentAnswers.reduce((sum, answer) => sum + parseFloat(answer.scoreObtained || 0), 0);
    const maxPossibleScore = attempt.maxPossibleScore || 100;
    const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    // Update test attempt with final scores and status
    await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        status: 'COMPLETED',
        submittedAt: new Date(),
        totalScore: totalScore,
        percentageScore: percentageScore,
        questionsAttempted: studentAnswers.length,
      },
    });

    // If this student was granted retest access, consume it after this submission
    // so future logins and access behave like a normal post-test student again.
    try {
      await prisma.student.updateMany({
        where: {
          id: parseInt(attemptData.student_id),
          canRetest: true,
        },
        data: {
          canRetest: false,
        },
      });
    } catch (consumeError) {
      console.error('Error consuming student can_retest flag after submission:', consumeError);
      // Do not fail the submission because of this; just log it.
    }

    // Get summary with all related data
    const summary = await prisma.testAttempt.findUnique({
      where: { id: parseInt(attemptId) },
      include: {
        questionPaper: {
          select: {
            paperName: true,
            totalQuestions: true,
          },
        },
        student: {
          include: {
            domain: {
              select: {
                domainName: true,
              },
            },
          },
        },
      },
    });

    // Transform to match expected format
    const summaryData = {
      id: summary.id,
      student_id: summary.studentId,
      question_paper_id: summary.questionPaperId,
      status: summary.status,
      total_score: parseFloat(summary.totalScore || 0),
      max_possible_score: parseFloat(summary.maxPossibleScore || 0),
      percentage_score: parseFloat(summary.percentageScore || 0),
      started_at: summary.startedAt,
      submitted_at: summary.submittedAt,
      paper_name: summary.questionPaper.paperName,
      total_questions: summary.questionPaper.totalQuestions,
      student_name: summary.student.fullName,
      student_email: summary.student.email,
      domain_name: summary.student.domain?.domainName || null,
    };

    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      data: summaryData,
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get full test details (questions/options) for a student
 */
exports.getTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const attemptId = parseInt(req.query.attempt_id, 10);
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!attemptId || Number.isNaN(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'attempt_id query parameter is required',
      });
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: parseInt(studentId),
      },
      include: {
        questionPaper: {
          select: {
            id: true,
            paperName: true,
            description: true,
            subject: true,
            durationMinutes: true,
            totalWeightage: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    // Transform to match expected format
    const attemptData = {
      id: attempt.id,
      student_id: attempt.studentId,
      question_paper_id: attempt.questionPaperId,
      status: attempt.status,
      question_pool: attempt.questionPool,
      paper_name: attempt.questionPaper.paperName,
      description: attempt.questionPaper.description,
      subject: attempt.questionPaper.subject,
      duration_minutes: attempt.questionPaper.durationMinutes,
      total_weightage: attempt.questionPaper.totalWeightage,
    };
    if (attemptData.question_paper_id !== Number(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Attempt does not belong to the requested test',
      });
    }

    const questionPool = await ensureAttemptQuestionPool(
      attemptData.id,
      attemptData.question_paper_id,
      attemptData.question_pool
    );

    if (!questionPool || questionPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to load questions for this test attempt',
      });
    }

    const questionIds = questionPool.map((item) => item.question_id);
    const questions = await prisma.question.findMany({
      where: {
        questionPaperId: parseInt(testId),
        id: {
          in: questionIds,
        },
        isActive: true,
      },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        weightage: true,
        section: true,
      },
    });

    const options = await prisma.questionOption.findMany({
      where: {
        questionId: {
          in: questionIds,
        },
      },
      select: {
        id: true,
        questionId: true,
        optionText: true,
        optionLabel: true,
        displayOrder: true,
      },
      orderBy: [
        { questionId: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    const questionMap = new Map();
    questions.forEach((question) => {
      questionMap.set(question.id, {
        id: question.id,
        question_text: question.questionText,
        question_type: question.questionType,
        weightage: question.weightage,
        section: question.section,
      });
    });

    const optionMap = new Map();
    options.forEach((option) => {
      if (!optionMap.has(option.questionId)) {
        optionMap.set(option.questionId, []);
      }
      optionMap.get(option.questionId).push({
        id: option.id,
        question_id: option.questionId,
        option_text: option.optionText,
        option_label: option.optionLabel,
        display_order: option.displayOrder,
      });
    });

    const sanitizedQuestions = questionPool
      .filter((poolItem) => questionMap.has(poolItem.question_id))
      .map((poolItem) => {
        const questionRow = questionMap.get(poolItem.question_id);
        const baseOptions = (optionMap.get(poolItem.question_id) || []).map((opt, index) => ({
          id: opt.id,
          label: opt.option_label,
          text: opt.option_text,
          originalIndex: index,
        }));
        const randomizedOptions = shuffleArray(baseOptions);

        return {
          id: poolItem.question_id,
          text: questionRow.question_text,
          type: mapQuestionTypeFromDB(questionRow.question_type),
          weightage: poolItem.weightage || questionRow.weightage || 1, // Use scaled weightage from pool
          section: poolItem.section || normalizeSectionName(questionRow.section) || 'Theory-1',
          options: randomizedOptions,
        };
      });

    res.status(200).json({
      success: true,
      message: 'Test details retrieved successfully',
      data: {
        id: attemptData.question_paper_id,
        paper_name: attemptData.paper_name,
        description: attemptData.description,
        subject: attemptData.subject,
        duration_minutes: attemptData.duration_minutes,
        total_questions: sanitizedQuestions.length,
        total_weightage: 100, // Always 100 for 50 questions
        questions: sanitizedQuestions,
      },
    });
  } catch (error) {
    console.error('Error getting test details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

