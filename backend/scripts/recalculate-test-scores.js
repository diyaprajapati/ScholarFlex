/**
 * Recalculate Test Scores
 * 
 * This script recalculates scores for all existing test attempts
 * using the updated stored procedure that considers only attempted questions
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

async function recalculateScores() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Recalculating test scores for all completed attempts...\n');

    // Get all completed test attempts
    const attemptsResult = await client.query(
      `SELECT id, student_id, question_paper_id 
       FROM test_attempts 
       WHERE status IN ('COMPLETED', 'AUTO_SUBMITTED')
       ORDER BY id`
    );

    const attempts = attemptsResult.rows;
    console.log(`Found ${attempts.length} test attempts to recalculate.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const attempt of attempts) {
      try {
        await client.query('SELECT sp_calculate_test_score($1)', [attempt.id]);
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ Recalculated ${successCount} attempts...`);
        }
      } catch (error) {
        console.error(`❌ Error recalculating attempt ${attempt.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✨ Recalculation complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error during recalculation:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the recalculation
recalculateScores()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recalculation failed:', error.message);
    process.exit(1);
  });

