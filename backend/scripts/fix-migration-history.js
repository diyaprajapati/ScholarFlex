const pool = require('../config/database');

async function fixMigrationHistory() {
  const client = await pool.connect();
  try {
    // Check if is_selected column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'is_selected'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  is_selected column does not exist. Adding it...');
      await client.query(`
        ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_selected" BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS "idx_students_is_selected" ON "students"("is_selected");
      `);
      console.log('✅ is_selected column added');
    } else {
      console.log('✅ is_selected column already exists');
    }
    
    // Remove duplicate migration entries (keep the latest one)
    await client.query(`
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
    await client.query(`
      UPDATE _prisma_migrations 
      SET migration_name = '20251203040000_add_student_additional_fields'
      WHERE migration_name = 'add_student_additional_fields'
    `);
    
    console.log('✅ Migration history updated successfully');
    
    // Verify the update
    const result = await client.query(`
      SELECT migration_name, finished_at FROM _prisma_migrations 
      WHERE migration_name LIKE '%student%' OR migration_name LIKE '%selected%'
      ORDER BY finished_at
    `);
    
    console.log('\nMigration history:');
    result.rows.forEach(row => {
      console.log(`  - ${row.migration_name} (${row.finished_at})`);
    });
  } catch (error) {
    console.error('❌ Error fixing migration history:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixMigrationHistory()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

