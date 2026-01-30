const { prisma } = require('../config/database');

async function fixMigrationHistory() {
  try {
    // Check if is_selected column exists (MySQL syntax)
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE()
        AND table_name = 'students' 
        AND column_name = 'is_selected'
    `;
    
    if (columnCheck.length === 0) {
      // console.log('⚠️  is_selected column does not exist. Adding it...');
      try {
        // MySQL doesn't support IF NOT EXISTS for ADD COLUMN, so we check first
        await prisma.$executeRawUnsafe(`
          ALTER TABLE students ADD COLUMN is_selected BOOLEAN DEFAULT FALSE;
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX idx_students_is_selected ON students(is_selected);
        `);
        // console.log('✅ is_selected column added');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          // console.log('✅ is_selected column already exists');
        } else {
          throw error;
        }
      }
    } else {
      // console.log('✅ is_selected column already exists');
    }
    
    // Remove duplicate migration entries (keep the latest one) - MySQL syntax
    await prisma.$executeRawUnsafe(`
      DELETE FROM _prisma_migrations 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, 
                 ROW_NUMBER() OVER (PARTITION BY migration_name ORDER BY finished_at DESC) as rn
          FROM _prisma_migrations
          WHERE migration_name = '20251203040000_add_student_additional_fields'
        ) t WHERE rn > 1
      )
    `);
    
    // Update the migration name from old to new (if old name exists)
    await prisma.$executeRawUnsafe(`
      UPDATE _prisma_migrations 
      SET migration_name = '20251203040000_add_student_additional_fields'
      WHERE migration_name = 'add_student_additional_fields'
    `);
    
    // console.log('✅ Migration history updated successfully');
    
    // Verify the update
    const result = await prisma.$queryRaw`
      SELECT migration_name, finished_at FROM _prisma_migrations 
      WHERE migration_name LIKE '%student%' OR migration_name LIKE '%selected%'
      ORDER BY finished_at
    `;
    
    // console.log('\nMigration history:');
    result.forEach(row => {
      // console.log(`  - ${row.migration_name} (${row.finished_at})`);
    });
  } catch (error) {
    console.error('❌ Error fixing migration history:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMigrationHistory()
  .then(() => {
    // console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

