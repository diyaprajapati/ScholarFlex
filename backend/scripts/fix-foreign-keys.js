/**
 * Fix Foreign Key Constraints Script
 * 
 * This script adds ON DELETE CASCADE to the test_attempts foreign key
 * so that deleting a student automatically deletes related test attempts
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function fixForeignKeys() {
  try {
    // console.log('🔧 Fixing foreign key constraints...\n');

    // Use Prisma transaction for MySQL
    await prisma.$transaction(async (tx) => {
      // Drop the existing foreign key constraint (MySQL syntax)
      // console.log('📝 Dropping existing constraint...');
      await tx.$executeRawUnsafe(`
        ALTER TABLE test_attempts 
        DROP FOREIGN KEY IF EXISTS test_attempts_student_id_fkey
      `);
      // console.log('✅ Constraint dropped\n');

      // Re-add the foreign key with ON DELETE CASCADE (MySQL syntax)
      // console.log('📝 Adding constraint with ON DELETE CASCADE...');
      await tx.$executeRawUnsafe(`
        ALTER TABLE test_attempts 
        ADD CONSTRAINT test_attempts_student_id_fkey 
        FOREIGN KEY (student_id) 
        REFERENCES students(id) 
        ON DELETE CASCADE
      `);
      // console.log('✅ Constraint added with CASCADE\n');
    });

    // console.log('✅ Foreign key constraints fixed successfully!');
    // console.log('\n💡 Now deleting a student will automatically delete related test attempts.');
    
  } catch (error) {
    console.error('❌ Error fixing foreign keys:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixForeignKeys()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });

