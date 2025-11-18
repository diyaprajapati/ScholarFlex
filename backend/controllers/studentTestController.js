const pool = require('../config/database');
const QuestionPaper = require('../models/QuestionPaper');

/**
 * Map question type from database enum to JSON format
 */
function mapQuestionTypeFromDB(type) {
  const typeMap = {
    'MULTIPLE_SELECT': 'multiple-choice',
    'SINGLE_CHOICE': 'single-choice',
    'TRUE_FALSE': 'true-false',
    'SHORT_ANSWER': 'short-answer',
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

    // Get all questions for this paper, sorted by weightage (marks)
    const questionsResult = await pool.query(
      `SELECT q.id, q.question_text, q.question_type, q.weightage, q.correct_answer
       FROM questions q
       WHERE q.question_paper_id = $1 AND q.is_active = TRUE
       ORDER BY q.weightage ASC, q.display_order ASC`,
      [attempt.question_paper_id]
    );

    // Get answered questions
    const answeredResult = await pool.query(
      `SELECT question_id, is_correct, score_obtained
       FROM student_answers
       WHERE test_attempt_id = $1
       ORDER BY answered_at DESC`,
      [testAttemptId]
    );

    const answeredQuestions = new Map();
    answeredResult.rows.forEach(row => {
      answeredQuestions.set(row.question_id, {
        is_correct: row.is_correct,
        score_obtained: parseFloat(row.score_obtained),
      });
    });

    // Calculate current total marks obtained
    const currentMarks = Array.from(answeredQuestions.values())
      .reduce((sum, ans) => sum + ans.score_obtained, 0);

    // Adaptive logic: Find next question based on last answer
    let nextQuestion = null;
    const allQuestions = questionsResult.rows;

    if (answeredQuestions.size === 0) {
      // First question: start with lowest marks
      nextQuestion = allQuestions[0];
    } else {
      // Get last answered question
      const lastAnsweredId = answeredResult.rows[0].question_id;
      const lastAnswered = allQuestions.find(q => q.id === lastAnsweredId);
      const lastAnswer = answeredQuestions.get(lastAnsweredId);

      if (lastAnswer.is_correct) {
        // Correct answer: move to harder question (higher marks)
        const currentWeightage = lastAnswered.weightage;
        const harderQuestions = allQuestions.filter(
          q => q.weightage > currentWeightage && !answeredQuestions.has(q.id)
        );
        nextQuestion = harderQuestions.length > 0 
          ? harderQuestions[0] 
          : allQuestions.find(q => !answeredQuestions.has(q.id));
      } else {
        // Wrong answer: go back to easier question (lower marks)
        const currentWeightage = lastAnswered.weightage;
        const easierQuestions = allQuestions.filter(
          q => q.weightage < currentWeightage && !answeredQuestions.has(q.id)
        );
        nextQuestion = easierQuestions.length > 0 
          ? easierQuestions[easierQuestions.length - 1] // Get easiest available
          : allQuestions.find(q => !answeredQuestions.has(q.id));
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
        total_marks: attempt.total_weightage,
      });
    }

    // Get options for this question
    const optionsResult = await pool.query(
      `SELECT id, option_text, option_label, is_correct, display_order
       FROM question_options
       WHERE question_id = $1
       ORDER BY display_order`,
      [nextQuestion.id]
    );

    // Transform question data
    const questionData = {
      id: nextQuestion.id,
      text: nextQuestion.question_text,
      type: mapQuestionTypeFromDB(nextQuestion.question_type),
      weightage: nextQuestion.weightage,
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

    const attemptResult = await pool.query(
      `INSERT INTO test_attempts (student_id, question_paper_id, status, started_at, updated_at)
       VALUES ($1, $2, 'IN_PROGRESS', NOW(), NOW())
       RETURNING id, started_at`,
      [studentId, testId]
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

            score = isCorrect ? question.weightage : 0;
          } else if (questionType === 'single-choice' || questionType === 'true-false') {
            const selectedIndex =
              typeof answer.selected_option_index === 'number' ? answer.selected_option_index : null;
            if (selectedIndex !== null && optionList[selectedIndex]) {
              selectedOptionId = optionList[selectedIndex].id;
              isCorrect = !!optionList[selectedIndex].is_correct;
              score = isCorrect ? question.weightage : 0;
            }
          } else if (questionType === 'short-answer') {
            answerText = (answer.answer_text || '').trim();
            const correctAnswer = (question.correct_answer || '').trim();
            if (answerText && correctAnswer) {
              isCorrect = answerText.toLowerCase() === correctAnswer.toLowerCase();
            }
            score = isCorrect ? question.weightage : 0;
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
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify that the test is available to this student (domain match or manual assignment)
    const eligibilityResult = await pool.query(
      `SELECT qp.id
       FROM question_papers qp
       JOIN students s ON s.id = $2
       LEFT JOIN question_paper_domains qpd 
         ON qpd.question_paper_id = qp.id AND qpd.domain_id = s.domain_id
       LEFT JOIN test_assignments ta 
         ON ta.question_paper_id = qp.id AND ta.student_id = $2 AND ta.is_active = TRUE
       WHERE qp.id = $1 
         AND qp.status = 'published'
         AND qp.is_active = TRUE
         AND (qpd.domain_id IS NOT NULL OR ta.id IS NOT NULL)`,
      [testId, studentId]
    );

    if (eligibilityResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this test',
      });
    }

    const paper = await QuestionPaper.findById(testId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    const sanitizedQuestions = (paper.questions || []).map((question) => ({
      id: question.id,
      text: question.text || question.question_text,
      type: question.type,
      weightage: question.weightage,
      options: question.options || [],
    }));

    res.status(200).json({
      success: true,
      message: 'Test details retrieved successfully',
      data: {
        id: paper.id,
        paper_name: paper.paper_name,
        description: paper.description,
        subject: paper.subject,
        duration_minutes: paper.duration_minutes,
        total_questions: paper.total_questions,
        total_weightage: paper.total_weightage,
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

