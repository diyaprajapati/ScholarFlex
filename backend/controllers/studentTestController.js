const pool = require('../config/database');
const QuestionPaper = require('../models/QuestionPaper');

const SECTION_REQUIREMENTS = {
  'Theory-1': 20,
  'Coding': 10,
  'Theory-2': 10,
  'Maths & Logical Reasoning': 10,
};

const TOTAL_REQUIRED_QUESTIONS = Object.values(SECTION_REQUIREMENTS).reduce((sum, count) => sum + count, 0);

const normalizeSectionName = (section) => {
  if (!section || typeof section !== 'string') return null;
  const normalized = section.trim().toLowerCase();
  
  // Theory-1 section (20 questions)
  if (
    normalized === 'theory-1' ||
    normalized === 'theory 1' ||
    normalized === 'theory section 1' ||
    normalized === 'theory_section_1'
  ) {
    return 'Theory-1';
  }
  
  // Coding section (10 questions)
  if (
    normalized === 'coding' ||
    normalized === 'coding section' ||
    normalized === 'programming' ||
    normalized === 'code'
  ) {
    return 'Coding';
  }
  
  // Theory-2 section (10 questions)
  if (
    normalized === 'theory-2' ||
    normalized === 'theory 2' ||
    normalized === 'theory section 2' ||
    normalized === 'theory_section_2'
  ) {
    return 'Theory-2';
  }
  
  // Maths & Logical Reasoning section (10 questions)
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
  
  // Legacy support
  if (normalized === 'theory' || normalized === 'theory section') {
    return 'Theory-1';
  }
  if (
    normalized === 'technical' ||
    normalized === 'technical/coding' ||
    normalized === 'technical coding' ||
    normalized === 'tech based' ||
    normalized === 'tech-based' ||
    normalized === 'technical mcqs'
  ) {
    return 'Coding';
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
  const questionsResult = await pool.query(
    `SELECT id, weightage, section
     FROM questions
     WHERE question_paper_id = $1 AND is_active = TRUE`,
    [questionPaperId]
  );

  // Initialize sections map with all 4 required sections
  const sectionsMap = {
    'Theory-1': [],
    'Coding': [],
    'Theory-2': [],
    'Maths & Logical Reasoning': [],
  };

  // Group questions by normalized section name
  questionsResult.rows.forEach((row) => {
    const normalizedSection = normalizeSectionName(row.section);
    if (!normalizedSection) {
      console.warn(`Question ${row.id} has invalid section: ${row.section}`);
      return;
    }
    if (sectionsMap[normalizedSection]) {
      sectionsMap[normalizedSection].push({
        question_id: row.id,
        weightage: row.weightage || 1,
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

    await pool.query(
      `UPDATE test_attempts 
       SET question_pool = $1::jsonb, total_questions = $2, max_possible_score = $3
       WHERE id = $4`,
      [JSON.stringify(poolData), poolData.length, maxScore, attemptId]
    );
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

    // Get student's domain
    const studentResult = await pool.query(
      'SELECT domain_id FROM students WHERE id = $1 AND is_active = TRUE',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const domainId = studentResult.rows[0].domain_id;
    if (!domainId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No domain assigned to student',
      });
    }

    // Get tests assigned to this domain (published only)
    const testsResult = await pool.query(
      `SELECT DISTINCT
        qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester,
        qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status,
        qp.created_at,
        -- Check if student has already attempted this test
        CASE WHEN ta.id IS NOT NULL THEN true ELSE false END as is_attempted,
        ta.id as attempt_id,
        ta.status as attempt_status,
        ta.percentage_score as attempt_score
      FROM question_papers qp
      INNER JOIN question_paper_domains qpd ON qp.id = qpd.question_paper_id
      LEFT JOIN test_attempts ta ON qp.id = ta.question_paper_id AND ta.student_id = $1
      WHERE qpd.domain_id = $2
        AND qp.status = 'published'
        AND qp.is_active = TRUE
      ORDER BY qp.created_at DESC`,
      [studentId, domainId]
    );

    // Also get manually assigned tests
    const manualAssignmentsResult = await pool.query(
      `SELECT DISTINCT
        qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester,
        qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status,
        qp.created_at,
        CASE WHEN ta.id IS NOT NULL THEN true ELSE false END as is_attempted,
        ta.id as attempt_id,
        ta.status as attempt_status,
        ta.percentage_score as attempt_score
      FROM question_papers qp
      INNER JOIN test_assignments ta_assign ON qp.id = ta_assign.question_paper_id
      LEFT JOIN test_attempts ta ON qp.id = ta.question_paper_id AND ta.student_id = $1
      WHERE ta_assign.student_id = $1
        AND ta_assign.is_active = TRUE
        AND qp.status = 'published'
        AND qp.is_active = TRUE
      ORDER BY qp.created_at DESC`,
      [studentId]
    );

    // Combine and deduplicate
    const allTests = [...testsResult.rows, ...manualAssignmentsResult.rows];
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
  const result = await pool.query(
    `SELECT qp.id, qp.duration_minutes
     FROM question_papers qp
     JOIN students s ON s.id = $2
     LEFT JOIN question_paper_domains qpd 
       ON qpd.question_paper_id = qp.id AND qpd.domain_id = s.domain_id
     LEFT JOIN test_assignments ta_assign 
       ON ta_assign.question_paper_id = qp.id 
       AND ta_assign.student_id = $2 
       AND ta_assign.is_active = TRUE
     WHERE qp.id = $1
       AND qp.status = 'published'
       AND qp.is_active = TRUE
       AND (qpd.domain_id IS NOT NULL OR ta_assign.id IS NOT NULL)`,
    [testId, studentId]
  );

  return result.rows[0] || null;
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
    const attemptResult = await pool.query(
      `SELECT ta.*, qp.total_weightage, qp.duration_minutes
       FROM test_attempts ta
       JOIN question_papers qp ON ta.question_paper_id = qp.id
       WHERE ta.id = $1 AND ta.student_id = $2 AND ta.status = 'IN_PROGRESS'`,
      [testAttemptId, studentId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found or already completed',
      });
    }

    const attempt = attemptResult.rows[0];

    // Get question pool with scaled weightages
    const questionPool = await ensureAttemptQuestionPool(
      testAttemptId,
      attempt.question_paper_id,
      attempt.question_pool
    );

    if (!questionPool || questionPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to load questions for this test attempt',
      });
    }

    const questionIds = questionPool.map((item) => item.question_id);

    // Get all questions from the pool, sorted by scaled weightage (marks)
    const questionsResult = await pool.query(
      `SELECT q.id, q.question_text, q.question_type, q.weightage, q.correct_answer
       FROM questions q
       WHERE q.id = ANY($1::int[]) AND q.is_active = TRUE
       ORDER BY q.weightage ASC, q.display_order ASC`,
      [questionIds]
    );

    // Create a map of question_id -> scaled weightage from pool
    const poolWeightageMap = new Map();
    questionPool.forEach((item) => {
      poolWeightageMap.set(item.question_id, item.weightage || 1);
    });

    // Get answered questions with timestamps - ensure we get ALL answered questions
    const answeredResult = await pool.query(
      `SELECT DISTINCT question_id, is_correct, score_obtained, answered_at
       FROM student_answers
       WHERE test_attempt_id = $1
       ORDER BY answered_at DESC`,
      [testAttemptId]
    );

    // Create a Set for faster lookup and a Map for details
    const answeredQuestionIds = new Set();
    const answeredQuestions = new Map();
    answeredResult.rows.forEach(row => {
      answeredQuestionIds.add(row.question_id);
      answeredQuestions.set(row.question_id, {
        is_correct: row.is_correct,
        score_obtained: parseFloat(row.score_obtained),
        answered_at: new Date(row.answered_at),
      });
    });

    // Calculate current total marks obtained
    const currentMarks = Array.from(answeredQuestions.values())
      .reduce((sum, ans) => sum + ans.score_obtained, 0);

    // Adaptive logic: Find next question based on time taken
    let nextQuestion = null;
    const allQuestions = questionsResult.rows;

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
      const lastAnsweredId = answeredResult.rows[0].question_id;
      const lastAnswered = allQuestions.find(q => q.id === lastAnsweredId);
      const lastAnswer = answeredQuestions.get(lastAnsweredId);
      
      // Calculate time taken for last question (in seconds)
      let timeTakenSeconds = 0;
      if (answeredResult.rows.length > 1) {
        // Time between last two answers
        const lastAnswerTime = new Date(answeredResult.rows[0].answered_at);
        const previousAnswerTime = new Date(answeredResult.rows[1].answered_at);
        timeTakenSeconds = (lastAnswerTime - previousAnswerTime) / 1000;
      } else {
        // First answer - use time from test start
        const lastAnswerTime = new Date(answeredResult.rows[0].answered_at);
        const testStartTime = new Date(attempt.started_at);
        timeTakenSeconds = (lastAnswerTime - testStartTime) / 1000;
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
    const alreadyAnsweredCheck = await pool.query(
      `SELECT id FROM student_answers 
       WHERE test_attempt_id = $1 AND question_id = $2 
       LIMIT 1`,
      [testAttemptId, nextQuestion.id]
    );

    if (alreadyAnsweredCheck.rows.length > 0) {
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
    const optionsResult = await pool.query(
      `SELECT id, option_text, option_label, is_correct, display_order
       FROM question_options
       WHERE question_id = $1
       ORDER BY display_order`,
      [nextQuestion.id]
    );

    // Get scaled weightage from pool
    const scaledWeightage = poolWeightageMap.get(nextQuestion.id) || nextQuestion.weightage || 1;

    // Transform question data
    const questionData = {
      id: nextQuestion.id,
      text: nextQuestion.question_text,
      type: mapQuestionTypeFromDB(nextQuestion.question_type),
      weightage: scaledWeightage,
      correctAnswer: nextQuestion.correct_answer || null,
      options: optionsResult.rows.map(opt => ({
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

    const existingAttempt = await pool.query(
      `SELECT id, status, started_at 
       FROM test_attempts 
       WHERE student_id = $1 AND question_paper_id = $2 AND status = 'IN_PROGRESS'
       ORDER BY started_at DESC LIMIT 1`,
      [studentId, testId]
    );

    if (existingAttempt.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Resumed existing test attempt',
        data: {
          attempt_id: existingAttempt.rows[0].id,
          duration_minutes: testAccess.duration_minutes || 60,
        },
      });
    }

    const todayAttemptResult = await pool.query(
      `SELECT id, status
       FROM test_attempts
       WHERE student_id = $1 
         AND question_paper_id = $2
         AND DATE(started_at) = CURRENT_DATE
       ORDER BY started_at DESC LIMIT 1`,
      [studentId, testId]
    );

    if (todayAttemptResult.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'You have already attempted this test today. Please try again tomorrow.',
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

    const attemptResult = await pool.query(
      `INSERT INTO test_attempts (
         student_id, question_paper_id, status, total_questions, max_possible_score, started_at, updated_at, question_pool
       )
       VALUES ($1, $2, 'IN_PROGRESS', $3, $4, NOW(), NOW(), $5::jsonb)
       RETURNING id, started_at`,
      [studentId, testId, questionPool.length, maxScore, JSON.stringify(questionPool)]
    );

    res.status(201).json({
      success: true,
      message: 'Test attempt started successfully',
      data: {
        attempt_id: attemptResult.rows[0].id,
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

    const attemptResult = await pool.query(
      `SELECT ta.*, qp.paper_name
       FROM test_attempts ta
       JOIN question_papers qp ON ta.question_paper_id = qp.id
       WHERE ta.id = $1 AND ta.student_id = $2`,
      [attemptId, studentId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    const attempt = attemptResult.rows[0];
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
          attempt.question_paper_id,
          attempt.question_pool
        );
        
        // Create a map of question_id -> scaled weightage from pool
        const poolWeightageMap = new Map();
        if (questionPool && Array.isArray(questionPool)) {
          questionPool.forEach((item) => {
            poolWeightageMap.set(item.question_id, item.weightage || 1);
          });
        }

        const questionsResult = await pool.query(
          `SELECT q.id, q.question_type, q.weightage, q.correct_answer
           FROM questions q
           WHERE q.question_paper_id = $1 AND q.id = ANY($2::int[])`,
          [attempt.question_paper_id, questionIds]
        );

        const optionsResult = await pool.query(
          `SELECT question_id, id, option_text, is_correct, display_order
           FROM question_options
           WHERE question_id = ANY($1::int[])
           ORDER BY question_id, display_order`,
          [questionIds]
        );

        const questionMap = new Map();
        questionsResult.rows.forEach((row) => {
          questionMap.set(row.id, row);
        });

        const optionMap = new Map();
        optionsResult.rows.forEach((row) => {
          if (!optionMap.has(row.question_id)) {
            optionMap.set(row.question_id, []);
          }
          optionMap.get(row.question_id).push(row);
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

          await pool.query(
            `INSERT INTO student_answers (
              test_attempt_id, question_id, selected_option_id, selected_option_ids,
              answer_text, is_correct, score_obtained, answered_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (test_attempt_id, question_id)
            DO UPDATE SET 
              selected_option_id = EXCLUDED.selected_option_id,
              selected_option_ids = EXCLUDED.selected_option_ids,
              answer_text = EXCLUDED.answer_text,
              is_correct = EXCLUDED.is_correct,
              score_obtained = EXCLUDED.score_obtained,
              answered_at = NOW()`,
            [
              attemptId,
              question.id,
              selectedOptionId,
              selectedOptionIds,
              answerText,
              isCorrect,
              score,
            ]
          );
        }
      }
    }

    await pool.query('SELECT sp_calculate_test_score($1)', [attemptId]);

    const summaryResult = await pool.query(
      `SELECT 
        ta.id,
        ta.student_id,
        ta.question_paper_id,
        ta.status,
        ta.total_score,
        ta.max_possible_score,
        ta.percentage_score,
        ta.started_at,
        ta.submitted_at,
        qp.paper_name,
        qp.total_questions,
        s.full_name AS student_name,
        s.email AS student_email,
        d.domain_name
      FROM test_attempts ta
      JOIN question_papers qp ON ta.question_paper_id = qp.id
      JOIN students s ON ta.student_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE ta.id = $1`,
      [attemptId]
    );

    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      data: summaryResult.rows[0],
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

    const attemptResult = await pool.query(
      `SELECT 
         ta.id,
         ta.student_id,
         ta.question_paper_id,
         ta.status,
         ta.question_pool,
         qp.paper_name,
         qp.description,
         qp.subject,
         qp.duration_minutes,
         qp.total_weightage
       FROM test_attempts ta
       JOIN question_papers qp ON ta.question_paper_id = qp.id
       WHERE ta.id = $1 AND ta.student_id = $2`,
      [attemptId, studentId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test attempt not found',
      });
    }

    const attempt = attemptResult.rows[0];
    if (attempt.question_paper_id !== Number(testId)) {
      return res.status(400).json({
        success: false,
        message: 'Attempt does not belong to the requested test',
      });
    }

    const questionPool = await ensureAttemptQuestionPool(
      attempt.id,
      attempt.question_paper_id,
      attempt.question_pool
    );

    if (!questionPool || questionPool.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Unable to load questions for this test attempt',
      });
    }

    const questionIds = questionPool.map((item) => item.question_id);
    const questionsResult = await pool.query(
      `SELECT id, question_text, question_type, weightage, section
       FROM questions
       WHERE question_paper_id = $1
         AND id = ANY($2::int[])
         AND is_active = TRUE`,
      [testId, questionIds]
    );

    const optionsResult = await pool.query(
      `SELECT id, question_id, option_text, option_label
       FROM question_options
       WHERE question_id = ANY($1::int[])
       ORDER BY question_id, display_order`,
      [questionIds]
    );

    const questionMap = new Map();
    questionsResult.rows.forEach((row) => {
      questionMap.set(row.id, row);
    });

    const optionMap = new Map();
    optionsResult.rows.forEach((row) => {
      if (!optionMap.has(row.question_id)) {
        optionMap.set(row.question_id, []);
      }
      optionMap.get(row.question_id).push(row);
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
        id: attempt.question_paper_id,
        paper_name: attempt.paper_name,
        description: attempt.description,
        subject: attempt.subject,
        duration_minutes: attempt.duration_minutes,
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

