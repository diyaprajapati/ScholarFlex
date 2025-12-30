const { prisma } = require('../config/database');
const { Prisma } = require('@prisma/client');

class QuestionPaper {
  /**
   * Create a new question paper with questions
   */
  static async create(paperData, questionsData, userId) {
    try {
      // Calculate total weightage
      const totalWeightage = questionsData.reduce((sum, q) => sum + (q.weightage || 1), 0);

      // Use Prisma transaction to create question paper with all related data
      const result = await prisma.$transaction(async (tx) => {
        // Create question paper
        const questionPaper = await tx.questionPaper.create({
          data: {
            paperName: paperData.paper_name,
            description: paperData.description || null,
            subject: paperData.subject || null,
            year: paperData.year || null,
            semester: paperData.semester || null,
            totalQuestions: paperData.total_questions || questionsData.length,
            totalWeightage: paperData.total_weightage || totalWeightage,
            durationMinutes: paperData.duration_minutes || 60,
            status: paperData.status || 'draft',
            createdBy: userId,
          },
        });

        const questionPaperId = questionPaper.id;

        // Create questions with options
        let displayOrder = 0;
        for (const questionData of questionsData) {
          // Map question type from JSON format to database enum
          const questionType = this.mapQuestionType(questionData.type);

          // Create question
          const question = await tx.question.create({
            data: {
              questionPaperId: questionPaperId,
              questionText: questionData.text,
              questionType: questionType,
              weightage: questionData.weightage || 1,
              section: questionData.section || null,
              displayOrder: displayOrder++,
              createdBy: userId,
            },
          });

          // Create options for multiple-choice, single-choice, and true-false questions
          if (questionData.options && questionData.options.length > 0) {
            const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const correctOptions = questionData.correctOptions || [];

            const optionsData = questionData.options.map((optionText, i) => ({
              questionId: question.id,
              optionText: optionText,
              optionLabel: optionLabels[i] || String.fromCharCode(65 + i),
              isCorrect: correctOptions.includes(i),
              displayOrder: i,
            }));

            await tx.questionOption.createMany({
              data: optionsData,
            });
          }
        }

        // Update total_questions and total_weightage (in case they were calculated)
        await tx.questionPaper.update({
          where: { id: questionPaperId },
          data: {
            totalQuestions: questionsData.length,
            totalWeightage: totalWeightage,
          },
        });

        // Assign domains to question paper if provided
        if (paperData.domain_ids && Array.isArray(paperData.domain_ids) && paperData.domain_ids.length > 0) {
          // Remove duplicates
          const uniqueDomainIds = [...new Set(paperData.domain_ids)];
          
          const domainConnections = uniqueDomainIds.map(domainId => ({
            questionPaperId: questionPaperId,
            domainId: domainId,
          }));

          // Use createMany with skipDuplicates for MySQL (equivalent to ON CONFLICT DO NOTHING)
          await tx.questionPaperDomain.createMany({
            data: domainConnections,
            skipDuplicates: true,
          });
        }

        return questionPaperId;
      });

      // Fetch the created question paper with all details
      const createdPaper = await this.findById(result);

      return createdPaper;
    } catch (error) {
      console.error('Error creating question paper:', error);
      throw error;
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
      'MCQ': 'multiple-choice',
    };

    return typeMap[type] || 'multiple-choice';
  }

  /**
   * Get all question papers (with optional filters)
   */
  static async findAll(filters = {}) {
    try {
      // Build WHERE conditions using Prisma.sql
      const whereParts = [Prisma.sql`qp.is_active = TRUE`];

      if (filters.status) {
        whereParts.push(Prisma.sql`qp.status = ${filters.status}`);
      }

      if (filters.subject) {
        whereParts.push(Prisma.sql`qp.subject = ${filters.subject}`);
      }

      if (filters.year) {
        whereParts.push(Prisma.sql`qp.year = ${filters.year}`);
      }

      if (filters.semester) {
        whereParts.push(Prisma.sql`qp.semester = ${filters.semester}`);
      }

      // Build the main query
      let query = Prisma.sql`
        SELECT 
          qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester,
          qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status,
          qp.is_active, qp.created_at, qp.updated_at,
          u.email as created_by_email, u.full_name as created_by_name
        FROM question_papers qp
        LEFT JOIN users u ON qp.created_by = u.id
        WHERE ${Prisma.join(whereParts, Prisma.sql` AND `)}
        ORDER BY qp.created_at DESC
      `;

      // Add pagination if provided
      if (filters.limit) {
        query = Prisma.sql`${query} LIMIT ${filters.limit}`;
      }

      if (filters.offset) {
        query = Prisma.sql`${query} OFFSET ${filters.offset}`;
      }

      const papers = await prisma.$queryRaw(query);

      if (papers.length === 0) {
        return [];
      }

      const paperIds = papers.map((paper) => paper.id);
      
      // Fetch domains for all papers (MySQL uses IN instead of ANY)
      if (paperIds.length > 0) {
        // Use Prisma ORM to fetch domains - more reliable than raw SQL with IN clause
        const domainsResult = await prisma.questionPaperDomain.findMany({
          where: {
            questionPaperId: {
              in: paperIds,
            },
          },
          include: {
            domain: {
              select: {
                id: true,
                domainName: true,
                domainCode: true,
              },
            },
          },
        });

        const domainMap = new Map();
        domainsResult.forEach((row) => {
          const paperId = row.questionPaperId;
          if (!domainMap.has(paperId)) {
            domainMap.set(paperId, []);
          }
          domainMap.get(paperId).push({
            id: row.domain.id,
            domain_name: row.domain.domainName,
            domain_code: row.domain.domainCode,
          });
        });

        return papers.map((paper) => ({
          ...paper,
          domains: domainMap.get(paper.id) || [],
        }));
      }

      return papers.map((paper) => ({
        ...paper,
        domains: [],
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
      // Fetch question paper with creator info using Prisma
      const questionPaper = await prisma.questionPaper.findUnique({
        where: { id: parseInt(id) },
        include: {
          creator: {
            select: {
              email: true,
              fullName: true,
            },
          },
          domains: {
            include: {
              domain: {
                select: {
                  id: true,
                  domainName: true,
                  domainCode: true,
                },
              },
            },
          },
          questions: {
            where: {
              isActive: true,
            },
            include: {
              options: {
                orderBy: {
                  displayOrder: 'asc',
                },
              },
            },
            orderBy: [
              { section: 'asc' },
              { displayOrder: 'asc' },
            ],
          },
        },
      });

      if (!questionPaper) {
        return null;
      }

      // Transform to match expected format
      const paper = {
        id: questionPaper.id,
        paper_name: questionPaper.paperName,
        description: questionPaper.description,
        subject: questionPaper.subject,
        year: questionPaper.year,
        semester: questionPaper.semester,
        total_questions: questionPaper.totalQuestions,
        total_weightage: questionPaper.totalWeightage,
        duration_minutes: questionPaper.durationMinutes,
        status: questionPaper.status,
        is_active: questionPaper.isActive,
        created_at: questionPaper.createdAt,
        updated_at: questionPaper.updatedAt,
        created_by_email: questionPaper.creator?.email || null,
        created_by_name: questionPaper.creator?.fullName || null,
      };

      // Transform domains
      const domains = questionPaper.domains.map(qpd => ({
        id: qpd.domain.id,
        domain_name: qpd.domain.domainName,
        domain_code: qpd.domain.domainCode,
      }));

      // Transform questions
      const questions = questionPaper.questions.map(question => {
        const transformedQuestion = {
          id: question.id,
          text: question.questionText,
          type: this.mapQuestionTypeFromDB(question.questionType),
          weightage: question.weightage,
          section: question.section || null,
        };

        // Transform options for choice-based questions
        if (question.options && question.options.length > 0) {
          const options = question.options.map(opt => opt.optionText);
          const correctOptions = question.options
            .map((opt, index) => opt.isCorrect ? index : null)
            .filter(index => index !== null);

          transformedQuestion.options = options;
          transformedQuestion.correctOptions = correctOptions;
        }

        return transformedQuestion;
      });

      // Group questions by section for frontend
      const questionsBySection = {};
      questions.forEach(q => {
        const sectionName = q.section || 'Uncategorized';
        if (!questionsBySection[sectionName]) {
          questionsBySection[sectionName] = [];
        }
        questionsBySection[sectionName].push(q);
      });

      // Convert to sections array format
      const sections = Object.keys(questionsBySection).map(sectionName => ({
        name: sectionName,
        questions: questionsBySection[sectionName],
      }));

      return {
        ...paper,
        questions, // Keep flat array for backward compatibility
        sections, // New format: grouped by sections
        domains: domains,
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
    try {
      const domainIds = paperData.domain_ids || null;
      const paperId = parseInt(id);

      // Use Prisma transaction to update question paper with all related data
      await prisma.$transaction(async (tx) => {
        // Check if paper exists
        const existingPaper = await tx.questionPaper.findFirst({
          where: { id: paperId, isActive: true },
          select: { id: true },
        });

        if (!existingPaper) {
          throw new Error('Question paper not found');
        }

        // Build update data for question paper
        const updateData = {
          updatedBy: userId,
        };

        if (paperData.paper_name !== undefined) {
          updateData.paperName = paperData.paper_name;
        }
        if (paperData.description !== undefined) {
          updateData.description = paperData.description;
        }
        if (paperData.subject !== undefined) {
          updateData.subject = paperData.subject;
        }
        if (paperData.year !== undefined) {
          updateData.year = paperData.year;
        }
        if (paperData.semester !== undefined) {
          updateData.semester = paperData.semester;
        }
        if (paperData.duration_minutes !== undefined) {
          updateData.durationMinutes = paperData.duration_minutes;
        }
        if (paperData.status !== undefined) {
          updateData.status = paperData.status;
        }
        if (paperData.total_questions !== undefined) {
          updateData.totalQuestions = paperData.total_questions;
        }
        if (paperData.total_weightage !== undefined) {
          updateData.totalWeightage = paperData.total_weightage;
        }

        // Update question paper
        await tx.questionPaper.update({
          where: { id: paperId },
          data: updateData,
        });

        // If questions are provided, update them
        if (questionsData && Array.isArray(questionsData)) {
          // Get existing question IDs
          const existingQuestions = await tx.question.findMany({
            where: { questionPaperId: paperId, isActive: true },
            select: { id: true },
          });
          const existingQuestionIds = existingQuestions.map(q => q.id);

          // Get question IDs from the update data (questions with IDs are existing, without IDs are new)
          const providedQuestionIds = questionsData
            .filter(q => q.id)
            .map(q => q.id);

          // Questions to delete (exist in DB but not in provided data)
          const questionsToDelete = existingQuestionIds.filter(
            qId => !providedQuestionIds.includes(qId)
          );

          // Soft delete removed questions
          if (questionsToDelete.length > 0) {
            await tx.question.updateMany({
              where: { id: { in: questionsToDelete } },
              data: { isActive: false },
            });
            
            // Delete their options
            await tx.questionOption.deleteMany({
              where: { questionId: { in: questionsToDelete } },
            });
          }

          // Update or insert questions
          let displayOrder = 0;
          for (const questionData of questionsData) {
            const questionType = this.mapQuestionType(questionData.type);

            if (questionData.id && existingQuestionIds.includes(questionData.id)) {
              // Update existing question
              await tx.question.update({
                where: { id: questionData.id },
                data: {
                  questionText: questionData.text,
                  questionType: questionType,
                  weightage: questionData.weightage || 1,
                  section: questionData.section || null,
                  displayOrder: displayOrder++,
                  updatedBy: userId,
                },
              });

              const questionId = questionData.id;

              // Delete existing options
              await tx.questionOption.deleteMany({
                where: { questionId: questionId },
              });

              // Insert new options
              if (questionData.options && questionData.options.length > 0) {
                const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const correctOptions = questionData.correctOptions || [];

                const optionsData = questionData.options.map((optionText, i) => ({
                  questionId: questionId,
                  optionText: optionText,
                  optionLabel: optionLabels[i] || String.fromCharCode(65 + i),
                  isCorrect: correctOptions.includes(i),
                  displayOrder: i,
                }));

                await tx.questionOption.createMany({
                  data: optionsData,
                });
              }
            } else {
              // Insert new question
              const question = await tx.question.create({
                data: {
                  questionPaperId: paperId,
                  questionText: questionData.text,
                  questionType: questionType,
                  weightage: questionData.weightage || 1,
                  section: questionData.section || null,
                  displayOrder: displayOrder++,
                  createdBy: userId,
                },
              });

              const questionId = question.id;

              // Insert options
              if (questionData.options && questionData.options.length > 0) {
                const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const correctOptions = questionData.correctOptions || [];

                const optionsData = questionData.options.map((optionText, i) => ({
                  questionId: questionId,
                  optionText: optionText,
                  optionLabel: optionLabels[i] || String.fromCharCode(65 + i),
                  isCorrect: correctOptions.includes(i),
                  displayOrder: i,
                }));

                await tx.questionOption.createMany({
                  data: optionsData,
                });
              }
            }
          }

          // Update total_questions and total_weightage
          const activeQuestions = await tx.question.aggregate({
            where: { questionPaperId: paperId, isActive: true },
            _count: { id: true },
            _sum: { weightage: true },
          });
          
          const totalQuestions = activeQuestions._count.id || 0;
          const totalWeightage = activeQuestions._sum.weightage || 0;

          await tx.questionPaper.update({
            where: { id: paperId },
            data: {
              totalQuestions: totalQuestions,
              totalWeightage: totalWeightage,
            },
          });
        }

        // Update domain assignments if provided
        if (domainIds && Array.isArray(domainIds)) {
          const uniqueDomainIds = [...new Set(domainIds)].filter((domainId) => Number.isInteger(domainId));
          
          // Delete existing domain assignments
          await tx.questionPaperDomain.deleteMany({
            where: { questionPaperId: paperId },
          });

          // Create new domain assignments
          if (uniqueDomainIds.length > 0) {
            const domainConnections = uniqueDomainIds.map(domainId => ({
              questionPaperId: paperId,
              domainId: domainId,
            }));

            await tx.questionPaperDomain.createMany({
              data: domainConnections,
              skipDuplicates: true,
            });
          }
        }
      });

      // Fetch and return updated question paper
      const updatedPaper = await this.findById(id);
      return updatedPaper;
    } catch (error) {
      console.error('Error updating question paper:', error);
      throw error;
    }
  }

  /**
   * Delete question paper (soft delete)
   */
  static async delete(id) {
    try {
      // Use Prisma transaction to soft delete question paper and related questions
      await prisma.$transaction(async (tx) => {
        // Soft delete question paper
        const updatedPaper = await tx.questionPaper.update({
          where: { id: parseInt(id) },
          data: { isActive: false },
        });

        if (!updatedPaper) {
          throw new Error('Question paper not found');
        }

        // Soft delete all questions
        await tx.question.updateMany({
          where: { questionPaperId: parseInt(id) },
          data: { isActive: false },
        });

        // Delete all options (question_options doesn't have is_active, so we delete them)
        // First get all question IDs for this paper
        const questions = await tx.question.findMany({
          where: { questionPaperId: parseInt(id) },
          select: { id: true },
        });

        const questionIds = questions.map(q => q.id);
        
        if (questionIds.length > 0) {
          await tx.questionOption.deleteMany({
            where: { questionId: { in: questionIds } },
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting question paper:', error);
      throw error;
    }
  }
}

module.exports = QuestionPaper;

