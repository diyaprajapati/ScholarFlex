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

      // Assign domains to question paper if provided
      if (paperData.domain_ids && Array.isArray(paperData.domain_ids) && paperData.domain_ids.length > 0) {
        for (const domainId of paperData.domain_ids) {
          await client.query(
            `INSERT INTO question_paper_domains (question_paper_id, domain_id)
             VALUES ($1, $2)
             ON CONFLICT (question_paper_id, domain_id) DO NOTHING`,
            [questionPaperId, domainId]
          );
        }
      }

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
      const papers = result.rows;

      if (papers.length === 0) {
        return [];
      }

      const paperIds = papers.map((paper) => paper.id);
      const domainsResult = await pool.query(
        `SELECT qpd.question_paper_id, d.id, d.domain_name, d.domain_code
         FROM question_paper_domains qpd
         JOIN domains d ON qpd.domain_id = d.id
         WHERE qpd.question_paper_id = ANY($1::int[])`,
        [paperIds]
      );

      const domainMap = new Map();
      domainsResult.rows.forEach((row) => {
        if (!domainMap.has(row.question_paper_id)) {
          domainMap.set(row.question_paper_id, []);
        }
        domainMap.get(row.question_paper_id).push({
          id: row.id,
          domain_name: row.domain_name,
          domain_code: row.domain_code,
        });
      });

      return papers.map((paper) => ({
        ...paper,
        domains: domainMap.get(paper.id) || [],
      }));
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

      // Fetch domains
      const domainsResult = await pool.query(
        `SELECT d.id, d.domain_name, d.domain_code
         FROM question_paper_domains qpd
         JOIN domains d ON qpd.domain_id = d.id
         WHERE qpd.question_paper_id = $1`,
        [id]
      );

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
        domains: domainsResult.rows || [],
      };
    } catch (error) {
      console.error('Error finding question paper:', error);
      throw error;
    }
  }

  /**
   * Update question paper and its questions
   */
  static async update(id, paperData, questionsData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const domainIds = paperData.domain_ids || null;
      if (paperData.domain_ids !== undefined) {
        delete paperData.domain_ids;
      }

      // Check if paper exists
      const existingPaper = await client.query(
        'SELECT id FROM question_papers WHERE id = $1 AND is_active = TRUE',
        [id]
      );

      if (existingPaper.rows.length === 0) {
        throw new Error('Question paper not found');
      }

      // Update question paper
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (paperData.paper_name !== undefined) {
        updateFields.push(`paper_name = $${paramCount++}`);
        updateValues.push(paperData.paper_name);
      }
      if (paperData.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(paperData.description);
      }
      if (paperData.subject !== undefined) {
        updateFields.push(`subject = $${paramCount++}`);
        updateValues.push(paperData.subject);
      }
      if (paperData.year !== undefined) {
        updateFields.push(`year = $${paramCount++}`);
        updateValues.push(paperData.year);
      }
      if (paperData.semester !== undefined) {
        updateFields.push(`semester = $${paramCount++}`);
        updateValues.push(paperData.semester);
      }
      if (paperData.duration_minutes !== undefined) {
        updateFields.push(`duration_minutes = $${paramCount++}`);
        updateValues.push(paperData.duration_minutes);
      }
      if (paperData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        updateValues.push(paperData.status);
      }
      if (paperData.total_questions !== undefined) {
        updateFields.push(`total_questions = $${paramCount++}`);
        updateValues.push(paperData.total_questions);
      }
      if (paperData.total_weightage !== undefined) {
        updateFields.push(`total_weightage = $${paramCount++}`);
        updateValues.push(paperData.total_weightage);
      }

      updateFields.push(`updated_by = $${paramCount++}`);
      updateValues.push(userId);
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      if (updateFields.length > 2) { // More than just updated_by and updated_at
        await client.query(
          `UPDATE question_papers SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          updateValues
        );
      }

      // If questions are provided, update them
      if (questionsData && Array.isArray(questionsData)) {
        // Get existing question IDs
        const existingQuestions = await client.query(
          'SELECT id FROM questions WHERE question_paper_id = $1 AND is_active = TRUE',
          [id]
        );
        const existingQuestionIds = existingQuestions.rows.map(row => row.id);

        // Get question IDs from the update data (questions with IDs are existing, without IDs are new)
        const providedQuestionIds = questionsData
          .filter(q => q.id)
          .map(q => q.id);

        // Questions to delete (exist in DB but not in provided data)
        const questionsToDelete = existingQuestionIds.filter(
          id => !providedQuestionIds.includes(id)
        );

        // Soft delete removed questions
        if (questionsToDelete.length > 0) {
          await client.query(
            `UPDATE questions SET is_active = FALSE WHERE id = ANY($1::int[])`,
            [questionsToDelete]
          );
          // Delete their options (question_options doesn't have is_active, so we delete them)
          await client.query(
            `DELETE FROM question_options 
             WHERE question_id = ANY($1::int[])`,
            [questionsToDelete]
          );
        }

        // Update or insert questions
        let displayOrder = 0;
        for (const questionData of questionsData) {
          const questionType = this.mapQuestionType(questionData.type);

          if (questionData.id && existingQuestionIds.includes(questionData.id)) {
            // Update existing question
            await client.query(
              `UPDATE questions 
               SET question_text = $1, question_type = $2, weightage = $3, 
                   correct_answer = $4, display_order = $5, updated_at = NOW()
               WHERE id = $6`,
              [
                questionData.text,
                questionType,
                questionData.weightage || 1,
                questionData.correctAnswer || null,
                displayOrder++,
                questionData.id,
              ]
            );

            const questionId = questionData.id;

            // Delete existing options (question_options doesn't have is_active, so we delete them)
            await client.query(
              'DELETE FROM question_options WHERE question_id = $1',
              [questionId]
            );

            // Insert new options
            if (questionData.options && questionData.options.length > 0) {
              const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
              const correctOptions = questionData.correctOptions || [];

              for (let i = 0; i < questionData.options.length; i++) {
                const isCorrect = correctOptions.includes(i);
                const optionLabel = optionLabels[i] || String.fromCharCode(65 + i);

                await client.query(
                  `INSERT INTO question_options (
                    question_id, option_text, option_label, is_correct, display_order
                  ) VALUES ($1, $2, $3, $4, $5)`,
                  [questionId, questionData.options[i], optionLabel, isCorrect, i]
                );
              }
            }
          } else {
            // Insert new question
            const questionResult = await client.query(
              `INSERT INTO questions (
                question_paper_id, question_text, question_type, weightage,
                correct_answer, display_order, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
              [
                id,
                questionData.text,
                questionType,
                questionData.weightage || 1,
                questionData.correctAnswer || null,
                displayOrder++,
                userId,
              ]
            );

            const questionId = questionResult.rows[0].id;

            // Insert options
            if (questionData.options && questionData.options.length > 0) {
              const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
              const correctOptions = questionData.correctOptions || [];

              for (let i = 0; i < questionData.options.length; i++) {
                const isCorrect = correctOptions.includes(i);
                const optionLabel = optionLabels[i] || String.fromCharCode(65 + i);

                await client.query(
                  `INSERT INTO question_options (
                    question_id, option_text, option_label, is_correct, display_order
                  ) VALUES ($1, $2, $3, $4, $5)`,
                  [questionId, questionData.options[i], optionLabel, isCorrect, i]
                );
              }
            }
          }
        }

        // Update total_questions and total_weightage
        const activeQuestions = await client.query(
          'SELECT COUNT(*) as count, COALESCE(SUM(weightage), 0) as total FROM questions WHERE question_paper_id = $1 AND is_active = TRUE',
          [id]
        );
        const totalQuestions = parseInt(activeQuestions.rows[0].count);
        const totalWeightage = parseInt(activeQuestions.rows[0].total);

        await client.query(
          `UPDATE question_papers 
           SET total_questions = $1, total_weightage = $2, updated_at = NOW()
           WHERE id = $3`,
          [totalQuestions, totalWeightage, id]
        );
      }

      // Update domain assignments if provided
      if (domainIds && Array.isArray(domainIds)) {
        const uniqueDomainIds = [...new Set(domainIds)].filter((domainId) => Number.isInteger(domainId));
        await client.query(
          'DELETE FROM question_paper_domains WHERE question_paper_id = $1',
          [id]
        );

        for (const domainId of uniqueDomainIds) {
          await client.query(
            `INSERT INTO question_paper_domains (question_paper_id, domain_id)
             VALUES ($1, $2)
             ON CONFLICT (question_paper_id, domain_id) DO NOTHING`,
            [id, domainId]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch and return updated question paper
      const updatedPaper = await this.findById(id);
      return updatedPaper;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating question paper:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete question paper (soft delete)
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        'UPDATE question_papers SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return false;
      }

      // Also soft delete all questions
      await pool.query(
        'UPDATE questions SET is_active = FALSE WHERE question_paper_id = $1',
        [id]
      );

      // Delete all options (question_options doesn't have is_active, so we delete them)
      await pool.query(
        `DELETE FROM question_options 
         WHERE question_id IN (SELECT id FROM questions WHERE question_paper_id = $1)`,
        [id]
      );

      return true;
    } catch (error) {
      console.error('Error deleting question paper:', error);
      throw error;
    }
  }
}

module.exports = QuestionPaper;

