/**
 * Create Calculate Test Score Function
 * 
 * This script creates the sp_calculate_test_score function in the database
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createFunction() {
  try {
    // console.log('🔄 Creating sp_calculate_test_score function...\n');

    // MySQL stored procedure syntax (different from PostgreSQL)
    const createProcedureSQL = `
      DROP PROCEDURE IF EXISTS sp_calculate_test_score;
      
      DELIMITER //
      CREATE PROCEDURE sp_calculate_test_score(IN attempt_id_param INT)
      BEGIN
        DECLARE total_score_val DECIMAL(10,2);
        DECLARE max_score_val DECIMAL(10,2);
        DECLARE percentage_val DECIMAL(5,2);
        DECLARE questions_count_val INT;
        DECLARE attempted_count_val INT;
        DECLARE status_val VARCHAR(20);
        DECLARE auto_submitted_val BOOLEAN;
        
        -- Get auto_submitted value
        SELECT auto_submitted INTO auto_submitted_val
        FROM test_attempts
        WHERE id = attempt_id_param;
        
        -- Calculate total score from answered questions
        SELECT 
            COALESCE(SUM(sa.score_obtained), 0),
            COUNT(DISTINCT sa.id)
        INTO total_score_val, attempted_count_val
        FROM test_attempts ta
        JOIN student_answers sa ON ta.id = sa.test_attempt_id
        WHERE ta.id = attempt_id_param;
        
        -- Max possible score is always 100 for 50 questions
        SET max_score_val = 100;
        
        -- Get total questions count from question pool
        SELECT 
            COUNT(DISTINCT q.id)
        INTO questions_count_val
        FROM test_attempts ta
        JOIN student_answers sa ON ta.id = sa.test_attempt_id
        JOIN questions q ON sa.question_id = q.id AND q.is_active = TRUE
        WHERE ta.id = attempt_id_param;
        
        -- Calculate percentage
        SET percentage_val = total_score_val;
        
        -- Determine status value
        IF auto_submitted_val = TRUE THEN
            SET status_val = 'AUTO_SUBMITTED';
        ELSE
            SET status_val = 'COMPLETED';
        END IF;
        
        -- Update test attempt
        UPDATE test_attempts
        SET 
            total_score = total_score_val,
            max_possible_score = max_score_val,
            percentage_score = percentage_val,
            total_questions = questions_count_val,
            questions_attempted = attempted_count_val,
            submitted_at = NOW(),
            updated_at = NOW(),
            status = status_val
        WHERE id = attempt_id_param;
        
        -- Update student status if completed
        UPDATE students s
        INNER JOIN test_attempts ta ON s.id = ta.student_id
        SET s.status_id = 3, s.updated_at = NOW()
        WHERE ta.id = attempt_id_param 
          AND s.status_id = 1;
      END //
      DELIMITER ;
    `;

    await prisma.$executeRawUnsafe(createProcedureSQL);
    // console.log('✅ Function sp_calculate_test_score created successfully!');
    // console.log('ℹ️  Note: MySQL stored procedures work differently than PostgreSQL.');
    // console.log('ℹ️  The application uses Prisma for score calculation, so this procedure may not be used.');
    
  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    console.error('   Error code:', error.code);
    // console.log('ℹ️  This is expected if the procedure already exists or if using Prisma for calculations.');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function creation
createFunction()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Function creation failed:', error.message);
    process.exit(1);
  });

