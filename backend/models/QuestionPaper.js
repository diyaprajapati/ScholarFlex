const pool = require('../config/database');

class QuestionPaper {
  /**
   * Create a new question paper with questions
   */
  static async create(paperData, questionsData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert question paper
      const paperResult = await client.query(
        `INSERT INTO question_papers (
          paper_name, description, subject, year, semester,
          total_questions, total_weightage, duration_minutes, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          paperData.paper_name,
          paperData.description || null,
          paperData.subject || null,
          paperData.year || null,
          paperData.semester || null,
          paperData.total_questions || 0,
          paperData.total_weightage || 0,
          paperData.duration_minutes || 60,
          paperData.status || 'draft',
          userId,
        ]
      );

      const questionPaperId = paperResult.rows[0].id;

      // Insert questions
      const insertedQuestions = [];
      let displayOrder = 0;

      for (const questionData of questionsData) {
        // Map question type from JSON format to database enum
        const questionType = this.mapQuestionType(questionData.type);

        // Insert question
        const questionResult = await client.query(
          `INSERT INTO questions (
            question_paper_id, question_text, question_type, weightage,
            correct_answer, display_order, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            questionPaperId,
            questionData.text,
            questionType,
            questionData.weightage || 1,
            questionData.correctAnswer || null, // For short-answer questions
            displayOrder++,
            userId,
          ]
        );

        const questionId = questionResult.rows[0].id;

        // Insert options for multiple-choice, single-choice, and true-false questions
        if (questionData.options && questionData.options.length > 0) {
          const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          const correctOptions = questionData.correctOptions || [];

          for (let i = 0; i < questionData.options.length; i++) {
            const isCorrect = correctOptions.includes(i);
            const optionLabel = optionLabels[i] || String.fromCharCode(65 + i); // A, B, C, etc.

            await client.query(
              `INSERT INTO question_options (
                question_id, option_text, option_label, is_correct, display_order
              ) VALUES ($1, $2, $3, $4, $5)`,
              [questionId, questionData.options[i], optionLabel, isCorrect, i]
            );
          }
        }

        insertedQuestions.push({
          id: questionId,
          text: questionData.text,
          type: questionType,
        });
      }

      // Update total_questions and total_weightage in question_paper
      const totalWeightage = questionsData.reduce((sum, q) => sum + (q.weightage || 1), 0);
      await client.query(
        `UPDATE question_papers 
         SET total_questions = $1, total_weightage = $2 
         WHERE id = $3`,
        [questionsData.length, totalWeightage, questionPaperId]
      );

      await client.query('COMMIT');

      // Fetch the created question paper with all details
      const createdPaper = await this.findById(questionPaperId);

      return createdPaper;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating question paper:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Map question type from JSON format to database enum
   */
  static mapQuestionType(type) {
    const typeMap = {
      'multiple-choice': 'MULTIPLE_SELECT',
      'single-choice': 'SINGLE_CHOICE',
      'true-false': 'TRUE_FALSE',
      'short-answer': 'SHORT_ANSWER',
    };

    return typeMap[type] || 'MCQ';
  }

  /**
   * Map question type from database enum to JSON format
   */
  static mapQuestionTypeFromDB(type) {
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
   * Get all question papers (with optional filters)
   */
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT 
          qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester,
          qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status,
          qp.is_active, qp.created_at, qp.updated_at,
          u.email as created_by_email, u.full_name as created_by_name
        FROM question_papers qp
        LEFT JOIN users u ON qp.created_by = u.id
        WHERE qp.is_active = TRUE
      `;
      
      const params = [];
      let paramCount = 1;

      // Add filters
      if (filters.status) {
        query += ` AND qp.status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }

      if (filters.subject) {
        query += ` AND qp.subject = $${paramCount}`;
        params.push(filters.subject);
        paramCount++;
      }

      if (filters.year) {
        query += ` AND qp.year = $${paramCount}`;
        params.push(filters.year);
        paramCount++;
      }

      if (filters.semester) {
        query += ` AND qp.semester = $${paramCount}`;
        params.push(filters.semester);
        paramCount++;
      }

      // Order by created_at descending (newest first)
      query += ` ORDER BY qp.created_at DESC`;

      // Add pagination if provided
      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
        paramCount++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
        paramCount++;
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error finding all question papers:', error);
      throw error;
    }
  }

  /**
   * Find question paper by ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester,
          qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status,
          qp.is_active, qp.created_at, qp.updated_at,
          u.email as created_by_email, u.full_name as created_by_name
        FROM question_papers qp
        LEFT JOIN users u ON qp.created_by = u.id
        WHERE qp.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const paper = result.rows[0];

      // Fetch questions with options
      const questionsResult = await pool.query(
        `SELECT 
          q.id, q.question_text, q.question_type, q.weightage, q.correct_answer,
          q.display_order
        FROM questions q
        WHERE q.question_paper_id = $1 AND q.is_active = TRUE
        ORDER BY q.display_order`,
        [id]
      );

      const questions = [];
      for (const question of questionsResult.rows) {
        // Fetch options for this question
        const optionsResult = await pool.query(
          `SELECT id, option_text, option_label, is_correct, display_order
           FROM question_options
           WHERE question_id = $1
           ORDER BY display_order`,
          [question.id]
        );

        // Transform question data to frontend format
        const transformedQuestion = {
          id: question.id,
          text: question.question_text,
          type: this.mapQuestionTypeFromDB(question.question_type),
          weightage: question.weightage,
          correctAnswer: question.correct_answer || null,
        };

        // Transform options for choice-based questions
        if (optionsResult.rows.length > 0) {
          const options = optionsResult.rows.map(opt => opt.option_text);
          const correctOptions = optionsResult.rows
            .map((opt, index) => opt.is_correct ? index : null)
            .filter(index => index !== null);

          transformedQuestion.options = options;
          transformedQuestion.correctOptions = correctOptions;
        }

        questions.push(transformedQuestion);
      }

      return {
        ...paper,
        questions,
      };
    } catch (error) {
      console.error('Error finding question paper:', error);
      throw error;
    }
  }
}

module.exports = QuestionPaper;

