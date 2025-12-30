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
  connectionTimeoutMillis: 30000, // Increased to 30 seconds for cloud database connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Add error handlers for better diagnostics
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client:', err.message);
  console.error('Error details:', {
    code: err.code,
    detail: err.detail,
    hint: err.hint,
  });
});

pool.on('connect', (client) => {
  console.log('✅ New database client connected');
});

pool.on('acquire', (client) => {
  // Client acquired from pool
});

pool.on('remove', (client) => {
  console.log('⚠️  Database client removed from pool');
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

// Test database connection (pool) with retry logic
// NOTE: This pool test is disabled for MySQL databases since pg (PostgreSQL) client
// cannot connect to MySQL. Prisma handles all database connections.
// If you need raw SQL queries, consider using mysql2 instead of pg for MySQL databases.
let poolConnectionAttempts = 0;
const maxPoolAttempts = 3;

// Check if we're using MySQL (Prisma schema indicates MySQL)
// Skip pool connection test for MySQL since pg client won't work
const isMySQL = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('mysql://') || 
  process.env.DATABASE_URL.includes('mysql2://') ||
  process.env.DATABASE_URL.includes('mariadb://')
);

function testPoolConnection() {
  // Skip pool test for MySQL databases
  if (isMySQL) {
    console.log('ℹ️  Skipping PostgreSQL pool connection test (MySQL database detected)');
    console.log('ℹ️  Prisma Client will handle all database connections');
    return;
  }

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      poolConnectionAttempts++;
      console.error(`❌ Database pool connection error (attempt ${poolConnectionAttempts}/${maxPoolAttempts}):`, err.message);
      if (poolConnectionAttempts < maxPoolAttempts) {
        // Retry after 5 seconds
        setTimeout(testPoolConnection, 5000);
      } else {
        console.error('❌ Failed to connect to database pool after multiple attempts');
      }
    } else {
      console.log('✅ Database pool connected successfully');
      poolConnectionAttempts = 0; // Reset on success
    }
  });
}

// Only test pool connection if not MySQL and not in CLI mode
if (!isMySQL && !isCLI) {
  testPoolConnection();
}

// Test Prisma connection with retry logic (only in server context, not during CLI commands)
// Skip connection test if this is being imported by Prisma CLI or migration scripts
const isCLI = process.argv[1] && (
  process.argv[1].includes('prisma') || 
  process.argv[1].includes('migrate') ||
  process.argv[1].includes('generate') ||
  process.argv[1].includes('studio') ||
  process.argv[1].includes('db push') ||
  process.argv[0].includes('node_modules')
);

// Also check if we're in a test environment or if NODE_ENV is set to skip connection
const shouldTestConnection = !isCLI && process.env.NODE_ENV !== 'test' && !process.env.SKIP_DB_CONNECTION_TEST;

if (shouldTestConnection) {
  let prismaConnectionAttempts = 0;
  const maxPrismaAttempts = 3;

  async function testPrismaConnection() {
    try {
      await prisma.$connect();
      console.log('✅ Prisma Client connected successfully');
      prismaConnectionAttempts = 0; // Reset on success
    } catch (err) {
      prismaConnectionAttempts++;
      // Only log error once to avoid spam
      if (prismaConnectionAttempts === 1) {
        console.error(`❌ Prisma Client connection error:`, err.message);
        console.error('   This might be normal if the database is temporarily unavailable.');
        console.error('   Connection will retry silently...');
      }
      if (prismaConnectionAttempts < maxPrismaAttempts) {
        // Retry after 5 seconds (silently)
        setTimeout(testPrismaConnection, 5000);
      } else {
        console.error('❌ Failed to connect to Prisma Client after multiple attempts');
        console.error('   Please check your DATABASE_URL and ensure the database server is running.');
        console.error('   To skip connection test, set SKIP_DB_CONNECTION_TEST=true');
      }
    }
  }

  // Delay connection test slightly to avoid blocking module load
  setTimeout(testPrismaConnection, 1000);
} else if (isCLI) {
  // For CLI operations, Prisma will handle its own connection
  // Don't test connection here to avoid errors during migrations/generate
}

// Graceful shutdown handlers are in server.js
// Do not add shutdown handlers here to avoid calling pool.end() multiple times

// Export pool as default for backward compatibility
module.exports = pool;

// Also export named exports for new Prisma usage
module.exports.pool = pool;
module.exports.prisma = prisma;
module.exports.db = prisma;