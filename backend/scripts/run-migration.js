/**
 * Run Migration Script
 * 
 * This script runs the migration to create question_paper_domains and test_assignments tables
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // console.log('🔄 Running migration: Add domain support to question papers...\n');

    // Execute migration using Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Create question_paper_domains table (MySQL compatible)
      // console.log('📝 Creating question_paper_domains table...');
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS question_paper_domains (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question_paper_id INT NOT NULL,
          domain_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
          FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
          UNIQUE KEY unique_question_paper_domain (question_paper_id, domain_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // console.log('✅ question_paper_domains table created\n');

      // console.log('📝 Creating indexes for question_paper_domains...');
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_question_paper_domains_question_paper_id
          ON question_paper_domains (question_paper_id)
      `);
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_question_paper_domains_domain_id
          ON question_paper_domains (domain_id)
      `);
      // console.log('✅ Indexes created\n');

      // Create test_assignments table (MySQL compatible)
      // console.log('📝 Creating test_assignments table...');
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS test_assignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question_paper_id INT NOT NULL,
          student_id INT NOT NULL,
          assigned_by INT NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id),
          UNIQUE KEY unique_test_assignment (question_paper_id, student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      // console.log('✅ test_assignments table created\n');

      // console.log('📝 Creating indexes for test_assignments...');
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_test_assignments_question_paper_id
          ON test_assignments (question_paper_id)
      `);
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_test_assignments_student_id
          ON test_assignments (student_id)
      `);
      await tx.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_test_assignments_is_active
          ON test_assignments (is_active)
      `);
      // console.log('✅ Indexes created\n');
    });

    // console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('   Error code:', error.code);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });

