const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Helper function to get database URL with SSL configuration
function getDatabaseUrlWithSSL() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if URL already has query parameters
  const hasQueryParams = dbUrl.includes('?');
  
  // For self-signed certificates, use sslmode=require or sslmode=no-verify
  // sslmode=no-verify will accept self-signed certificates without verification
  const sslParam = 'sslmode=no-verify';
  
  if (hasQueryParams) {
    // Append SSL parameter if not already present
    if (!dbUrl.includes('sslmode=')) {
      return `${dbUrl}&${sslParam}`;
    }
    return dbUrl;
  } else {
    return `${dbUrl}?${sslParam}`;
  }
}

// Configure SSL for pg Pool
// For self-signed certificates, we need to set rejectUnauthorized to false
const sslConfig = {
  rejectUnauthorized: false, // Accept self-signed certificates
};

// Try to load CA certificate if it exists
const caCertPath = path.join(__dirname, "certs", "aiven-ca.pem");
if (fs.existsSync(caCertPath)) {
  try {
    sslConfig.ca = fs.readFileSync(caCertPath).toString();
    sslConfig.rejectUnauthorized = true; // Use CA cert if available
    console.log('✅ Using CA certificate for SSL connection');
  } catch (error) {
    console.warn('⚠️  Could not load CA certificate, using self-signed certificate mode');
  }
} else {
  console.log('ℹ️  Using self-signed certificate mode (rejectUnauthorized: false)');
}

// Remove SSL parameters from connection string to avoid conflicts
function cleanDatabaseUrl(url) {
  if (!url) return url;
  
  try {
    // Remove sslmode and ssl-related query parameters
    // We'll handle SSL via the ssl config option instead
    const urlObj = new URL(url);
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('ssl');
    urlObj.searchParams.delete('sslcert');
    urlObj.searchParams.delete('sslkey');
    urlObj.searchParams.delete('sslrootcert');
    urlObj.searchParams.delete('sslcertmode');
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try to remove SSL params manually
    console.warn('⚠️  Could not parse DATABASE_URL, using as-is with SSL config override');
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
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean the connection string and create pool with explicit SSL config
const cleanUrl = cleanDatabaseUrl(dbUrl);

// Create connection pool with SSL configuration
// The ssl option will override any SSL settings in the connection string
const pool = new Pool({
  connectionString: cleanUrl,
  ssl: sslConfig, // This will override any SSL settings in the connection string
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Prisma Client with SSL configuration
// Prisma Client will use DATABASE_URL from environment
// For SSL with self-signed certificates, ensure DATABASE_URL includes ?sslmode=no-verify
// Or set it via the datasource override
const prismaDatabaseUrl = getDatabaseUrlWithSSL();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: prismaDatabaseUrl,
    },
  },
});

// Test database connection (pool)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database pool connection error:', err.message);
  } else {
    console.log('✅ Database pool connected successfully');
  }
});

// Test Prisma connection
prisma.$connect()
  .then(() => {
    console.log('✅ Prisma Client connected successfully');
  })
  .catch((err) => {
    console.error('❌ Prisma Client connection error:', err.message);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

// Export pool as default for backward compatibility
module.exports = pool;

// Also export named exports for new Prisma usage
module.exports.pool = pool;
module.exports.prisma = prisma;
module.exports.db = prisma;