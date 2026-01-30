/**
 * Create Enum Types
 * 
 * This script creates the enum types needed for the database
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createEnumTypes() {
  try {
    // console.log('🔄 Checking enum types...\n');

    // MySQL doesn't use ENUM types the same way as PostgreSQL
    // Prisma handles enum types through the schema, so this script
    // is mainly for verification. The enums are defined in schema.prisma
    // and Prisma will handle the MySQL ENUM creation during migrations.
    
    // console.log('ℹ️  Enum types are managed by Prisma schema.');
    // console.log('ℹ️  Run "npm run prisma:migrate" to apply enum types to the database.');
    // console.log('✅ Enum types are defined in schema.prisma and will be created during migration.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the enum creation
createEnumTypes()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Enum creation failed:', error.message);
    process.exit(1);
  });

