/**
 * Create Calculate Test Score Function
 * 
 * This script creates the sp_calculate_test_score function in the database
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

// Configure SSL
const sslConfig = { rejectUnauthorized: false };
const caCertPath = path.join(__dirname, '..', 'config', 'certs', 'aiven-ca.pem');
if (fs.existsSync(caCertPath)) {
  try {
    sslConfig.ca = fs.readFileSync(caCertPath).toString();
    sslConfig.rejectUnauthorized = true;
  } catch (error) {
    // Ignore
  }
}

function cleanDatabaseUrl(url) {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('ssl');
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

const pool = new Pool({
  connectionString: cleanDatabaseUrl(process.env.DATABASE_URL),
  ssl: sslConfig,
});

async function createFunction() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Creating sp_calculate_test_score function...\n');

    // Drop function if exists
    await client.query('DROP FUNCTION IF EXISTS sp_calculate_test_score(INT)');

    // Create the function
    await client.query(`
      CREATE OR REPLACE FUNCTION sp_calculate_test_score(attempt_id_param INT)
      RETURNS VOID AS $$
      DECLARE
          total_score_val DECIMAL(10,2);
          max_score_val DECIMAL(10,2);
          percentage_val DECIMAL(5,2);
          questions_count_val INT;
          attempted_count_val INT;
          status_val text;
          auto_submitted_val BOOLEAN;
      BEGIN
          -- Get auto_submitted value
          SELECT auto_submitted INTO auto_submitted_val
          FROM test_attempts
          WHERE id = attempt_id_param;
          
          -- Calculate total score and max possible score
          SELECT 
              COALESCE(SUM(sa.score_obtained), 0),
              COALESCE(SUM(q.weightage), 0),
              COUNT(DISTINCT q.id),
              COUNT(DISTINCT sa.id)
          INTO total_score_val, max_score_val, questions_count_val, attempted_count_val
          FROM test_attempts ta
          JOIN questions q ON ta.question_paper_id = q.question_paper_id AND q.is_active = TRUE
          LEFT JOIN student_answers sa ON ta.id = sa.test_attempt_id AND q.id = sa.question_id
          WHERE ta.id = attempt_id_param;
          
          -- Calculate percentage
          IF max_score_val > 0 THEN
              percentage_val := (total_score_val / max_score_val) * 100;
          ELSE
              percentage_val := 0;
          END IF;
          
          -- Determine status value
          IF auto_submitted_val = TRUE THEN
              status_val := 'AUTO_SUBMITTED';
          ELSE
              status_val := 'COMPLETED';
          END IF;
          
          -- Update test attempt - cast to Prisma enum type "TestAttemptStatus"
          UPDATE test_attempts
          SET 
              total_score = total_score_val,
              max_possible_score = max_score_val,
              percentage_score = percentage_val,
              total_questions = questions_count_val,
              questions_attempted = attempted_count_val,
              submitted_at = NOW(),
              updated_at = NOW(),
              status = status_val::"TestAttemptStatus"
          WHERE id = attempt_id_param;
          
          -- Update student status if completed
          UPDATE students s
          SET status_id = 3, updated_at = NOW() -- COMPLETED status
          FROM test_attempts ta
          WHERE ta.id = attempt_id_param 
            AND s.id = ta.student_id 
            AND s.status_id = 1; -- Only if currently REGISTERED
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    console.log('✅ Function sp_calculate_test_score created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating function:', error.message);
    console.error('   Error code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function creation
createFunction()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Function creation failed:', error.message);
    process.exit(1);
  });

