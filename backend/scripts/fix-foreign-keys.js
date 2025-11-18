/**
 * Fix Foreign Key Constraints Script
 * 
 * This script adds ON DELETE CASCADE to the test_attempts foreign key
 * so that deleting a student automatically deletes related test attempts
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

async function fixForeignKeys() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔧 Fixing foreign key constraints...\n');

    // Drop the existing foreign key constraint
    console.log('📝 Dropping existing constraint...');
    await client.query(`
      ALTER TABLE test_attempts 
      DROP CONSTRAINT IF EXISTS test_attempts_student_id_fkey
    `);
    console.log('✅ Constraint dropped\n');

    // Re-add the foreign key with ON DELETE CASCADE
    console.log('📝 Adding constraint with ON DELETE CASCADE...');
    await client.query(`
      ALTER TABLE test_attempts 
      ADD CONSTRAINT test_attempts_student_id_fkey 
      FOREIGN KEY (student_id) 
      REFERENCES students(id) 
      ON DELETE CASCADE
    `);
    console.log('✅ Constraint added with CASCADE\n');

    await client.query('COMMIT');
    console.log('✅ Foreign key constraints fixed successfully!');
    console.log('\n💡 Now deleting a student will automatically delete related test attempts.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing foreign keys:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixForeignKeys()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });

