/**
 * Create Enum Types
 * 
 * This script creates the enum types needed for the database
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

async function createEnumTypes() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Creating enum types...\n');

    // Create test_attempt_status enum if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE test_attempt_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'AUTO_SUBMITTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ test_attempt_status enum created/verified\n');

    await client.query('COMMIT');
    console.log('✅ All enum types created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating enum types:', error.message);
    console.error('   Error code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the enum creation
createEnumTypes()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Enum creation failed:', error.message);
    process.exit(1);
  });

