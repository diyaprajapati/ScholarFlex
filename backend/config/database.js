const { PrismaClient } = require('@prisma/client');
// dotenv is already loaded in server.js, but load it here too for standalone scripts
if (!process.env.DATABASE_URL) {
  const path = require('path');
  const fs = require('fs');
  const rootEnvPath = path.join(__dirname, '..', '..', '.env');
  const backendEnvPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
  } else if (fs.existsSync(backendEnvPath)) {
    require('dotenv').config({ path: backendEnvPath });
  } else {
    require('dotenv').config();
  }
}

// Check if DATABASE_URL is set
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure connection pool settings
// Default: 20 connections (increased from Prisma default of 10)
// Can be overridden via DATABASE_CONNECTION_LIMIT env variable
const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20', 10);
const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '20', 10);

// Parse DATABASE_URL and append connection pool parameters if not already present
let enhancedDbUrl = dbUrl;
if (!enhancedDbUrl.includes('connection_limit') && !enhancedDbUrl.includes('pool_timeout')) {
  const separator = enhancedDbUrl.includes('?') ? '&' : '?';
  enhancedDbUrl = `${enhancedDbUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
}

// Initialize Prisma Client with enhanced connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: enhancedDbUrl,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

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

// Export Prisma as default and named exports
module.exports = prisma;
module.exports.prisma = prisma;
module.exports.db = prisma;