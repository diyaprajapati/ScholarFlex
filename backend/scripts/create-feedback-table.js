const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

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

async function createFeedbackTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Creating internship_feedback table...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'create_feedback_table.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await client.query(sql);
    console.log('✅ internship_feedback table created successfully\n');

    await client.query('COMMIT');
    console.log('✨ Migration completed successfully!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating feedback table:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists. This is okay.\n');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createFeedbackTable()
  .then(() => {
    console.log('✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

