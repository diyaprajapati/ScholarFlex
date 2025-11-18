/**
 * Database Check Script
 * 
 * This script checks if the database has the required seed data
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

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database seed data...\n');

    // Check roles
    const rolesResult = await client.query('SELECT COUNT(*) as count FROM roles');
    const rolesCount = parseInt(rolesResult.rows[0].count);
    console.log(`📋 Roles: ${rolesCount} found`);
    if (rolesCount === 0) {
      console.log('   ⚠️  No roles found. Need to seed.');
    } else {
      const roles = await client.query('SELECT role_name, role_code FROM roles');
      roles.rows.forEach(r => console.log(`   - ${r.role_name} (${r.role_code})`));
    }

    // Check intern_status
    const statusResult = await client.query('SELECT COUNT(*) as count FROM intern_status');
    const statusCount = parseInt(statusResult.rows[0].count);
    console.log(`\n📋 Intern Statuses: ${statusCount} found`);
    if (statusCount === 0) {
      console.log('   ⚠️  No intern statuses found. Need to seed.');
    } else {
      const statuses = await client.query('SELECT status_name, status_code FROM intern_status ORDER BY id');
      statuses.rows.forEach(s => console.log(`   - ${s.status_name} (${s.status_code})`));
    }

    // Check for REGISTERED status specifically
    const registeredResult = await client.query(
      "SELECT id FROM intern_status WHERE status_code = 'REGISTERED' AND is_active = TRUE"
    );
    if (registeredResult.rows.length === 0) {
      console.log('\n❌ REGISTERED status not found! This is required for adding interns.');
      console.log('\n💡 To fix this, run: npm run db:seed');
      process.exit(1);
    } else {
      console.log('\n✅ REGISTERED status found - database is ready for adding interns!');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();

