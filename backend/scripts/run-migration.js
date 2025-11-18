/**
 * Run Migration Script
 * 
 * This script runs the migration to create question_paper_domains and test_assignments tables
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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Running migration: Add domain support to question papers...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migration_add_domain_to_question_papers.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    console.log('📝 Creating question_paper_domains table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS question_paper_domains (
        id SERIAL PRIMARY KEY,
        question_paper_id INT NOT NULL,
        domain_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
        UNIQUE (question_paper_id, domain_id)
      )
    `);
    console.log('✅ question_paper_domains table created\n');

    console.log('📝 Creating indexes for question_paper_domains...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_question_paper_domains_question_paper_id
        ON question_paper_domains (question_paper_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_question_paper_domains_domain_id
        ON question_paper_domains (domain_id)
    `);
    console.log('✅ Indexes created\n');

    console.log('📝 Creating test_assignments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_assignments (
        id SERIAL PRIMARY KEY,
        question_paper_id INT NOT NULL,
        student_id INT NOT NULL,
        assigned_by INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id),
        UNIQUE (question_paper_id, student_id)
      )
    `);
    console.log('✅ test_assignments table created\n');

    console.log('📝 Creating indexes for test_assignments...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_assignments_question_paper_id
        ON test_assignments (question_paper_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_assignments_student_id
        ON test_assignments (student_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_assignments_is_active
        ON test_assignments (is_active)
    `);
    console.log('✅ Indexes created\n');

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error running migration:', error.message);
    console.error('   Error code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });

