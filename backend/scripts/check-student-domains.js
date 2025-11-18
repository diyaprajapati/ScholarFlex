/**
 * Check Student Domains Script
 * 
 * This script checks which students have domains and which don't
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

async function checkDomains() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking student domains...\n');

    // Get all students with their domain info
    const result = await client.query(`
      SELECT 
        s.id,
        s.email,
        s.full_name,
        s.domain_id,
        d.domain_name,
        CASE WHEN s.domain_id IS NULL THEN 'NO DOMAIN' ELSE 'HAS DOMAIN' END as domain_status
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE s.is_active = TRUE
      ORDER BY s.id
    `);

    console.log(`📊 Total students: ${result.rows.length}\n`);

    const withDomain = result.rows.filter(s => s.domain_id !== null);
    const withoutDomain = result.rows.filter(s => s.domain_id === null);

    console.log(`✅ Students with domain: ${withDomain.length}`);
    console.log(`❌ Students without domain: ${withoutDomain.length}\n`);

    if (withoutDomain.length > 0) {
      console.log('📋 Students without domain:');
      withoutDomain.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.full_name} (${student.email}) - ID: ${student.id}`);
      });
    }

    if (withDomain.length > 0) {
      console.log('\n📋 Students with domain:');
      withDomain.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.full_name} - Domain: ${student.domain_name}`);
      });
      if (withDomain.length > 5) {
        console.log(`   ... and ${withDomain.length - 5} more`);
      }
    }

    // Show available domains
    const domainsResult = await client.query(`
      SELECT id, domain_name, domain_code 
      FROM domains 
      WHERE is_active = TRUE 
      ORDER BY domain_name
    `);

    if (domainsResult.rows.length > 0) {
      console.log('\n📋 Available domains:');
      domainsResult.rows.forEach((domain, index) => {
        console.log(`   ${index + 1}. ${domain.domain_name} (ID: ${domain.id})`);
      });
    } else {
      console.log('\n⚠️  No domains found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDomains()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });

