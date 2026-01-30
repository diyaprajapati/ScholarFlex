/**
 * Setup script for playlists feature
 * This script will:
 * 1. Run the migration to create playlists, videos, and student_activity_logs tables
 * 2. Regenerate Prisma client
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// console.log('🚀 Setting up playlists feature...\n');

try {
  // Step 1: Check if migration file exists
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20251206034550_create_playlists_videos_activity_logs', 'migration.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found!');
    process.exit(1);
  }

  // console.log('✅ Migration file found\n');

  // Step 2: Run Prisma migration
  // console.log('📦 Running database migration...');
  try {
    execSync('npm run prisma:migrate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    // console.log('✅ Migration completed\n');
  } catch (error) {
    console.error('❌ Migration failed. You may need to run it manually:');
    console.error('   npm run prisma:migrate');
    console.error('   Or use: npm run prisma:db:push\n');
  }

  // Step 3: Generate Prisma client
  // console.log('🔧 Regenerating Prisma client...');
  try {
    execSync('npm run prisma:generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    // console.log('✅ Prisma client regenerated\n');
  } catch (error) {
    console.error('❌ Prisma client generation failed. Make sure the server is stopped and try:');
    console.error('   npm run prisma:generate\n');
  }

  // console.log('✨ Setup complete! You can now start the server.\n');
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}

