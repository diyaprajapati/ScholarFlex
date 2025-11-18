/**
 * Database Seeding Script
 * 
 * This script seeds the database with initial/default data:
 * - Roles (Super Admin, Admin, Student)
 * - Intern Statuses (Active, Pending, Inactive, Selected, Not Selected, etc.)
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

// Configure SSL for self-signed certificates
const sslConfig = {
  rejectUnauthorized: false, // Accept self-signed certificates
};

// Try to load CA certificate if it exists
const caCertPath = path.join(__dirname, '..', 'config', 'certs', 'aiven-ca.pem');
if (fs.existsSync(caCertPath)) {
  try {
    sslConfig.ca = fs.readFileSync(caCertPath).toString();
    sslConfig.rejectUnauthorized = true; // Use CA cert if available
    console.log('✅ Using CA certificate for SSL connection');
  } catch (error) {
    console.warn('⚠️  Could not load CA certificate, using self-signed certificate mode');
  }
}

// Remove SSL parameters from connection string to avoid conflicts
function cleanDatabaseUrl(url) {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('ssl');
    urlObj.searchParams.delete('sslcert');
    urlObj.searchParams.delete('sslkey');
    urlObj.searchParams.delete('sslrootcert');
    urlObj.searchParams.delete('sslcertmode');
    return urlObj.toString();
  } catch (error) {
    return url.replace(/[?&]sslmode=[^&]*/gi, '')
              .replace(/[?&]ssl=[^&]*/gi, '')
              .replace(/[?&]sslcert=[^&]*/gi, '')
              .replace(/[?&]sslkey=[^&]*/gi, '')
              .replace(/[?&]sslrootcert=[^&]*/gi, '')
              .replace(/[?&]sslcertmode=[^&]*/gi, '');
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const cleanUrl = cleanDatabaseUrl(dbUrl);

const pool = new Pool({
  connectionString: cleanUrl,
  ssl: sslConfig,
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🌱 Seeding database...\n');

    // 1. Insert Roles
    console.log('📝 Inserting roles...');
    await client.query(`
      INSERT INTO roles (role_name, role_code, description, updated_at) 
      VALUES 
        ('Super Admin', 'SUPER_ADMIN', 'Full access to all features including marks', NOW()),
        ('Admin', 'ADMIN', 'Full access except viewing marks/scores', NOW()),
        ('Student', 'STUDENT', 'Can only attempt tests', NOW())
      ON CONFLICT (role_code) DO NOTHING
    `);
    console.log('✅ Roles inserted\n');

    // 2. Insert Intern Statuses
    console.log('📝 Inserting intern statuses...');
    await client.query(`
      INSERT INTO intern_status (status_name, status_code, description) 
      VALUES 
        ('Active', 'ACTIVE', 'Intern is active'),
        ('Pending', 'PENDING', 'Intern registration pending'),
        ('Inactive', 'INACTIVE', 'Intern is inactive'),
        ('Selected', 'SELECTED', 'Intern has been selected'),
        ('Not Selected', 'NOT_SELECTED', 'Intern has not been selected'),
        ('Registered', 'REGISTERED', 'Intern has registered but not started test'),
        ('In Progress', 'IN_PROGRESS', 'Intern is currently taking the test'),
        ('Completed', 'COMPLETED', 'Intern has completed the test')
      ON CONFLICT (status_code) DO NOTHING
    `);
    console.log('✅ Intern statuses inserted\n');

    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  });

