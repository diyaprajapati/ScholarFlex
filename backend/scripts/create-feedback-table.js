const { prisma } = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function createFeedbackTable() {
  try {
    console.log('🔄 Creating internship_feedback table...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'create_feedback_table.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL using Prisma transaction
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(sql);
    });
    
    // console.log('✅ internship_feedback table created successfully\n');
    // console.log('✨ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Error creating feedback table:', error.message);
    // MySQL error code for table already exists is different from PostgreSQL
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === '42P07') {
      // console.log('ℹ️  Table already exists. This is okay.\n');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

createFeedbackTable()
  .then(() => {
    // console.log('✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

