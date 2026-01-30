/**
 * Database Setup Script
 * 
 * This script helps set up the database tables in Aiven PostgreSQL.
 * It can either:
 * 1. Use Prisma db push (recommended for development)
 * 2. Run the SQL schema file directly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  // console.log('🚀 Database Setup for ScholarFlex\n');
  // console.log('This script will help you create tables in your Aiven PostgreSQL database.\n');
  
  const method = await question('Choose setup method:\n1. Prisma db push (Recommended - syncs Prisma schema)\n2. Run SQL file directly\nEnter choice (1 or 2): ');
  
  if (method === '1') {
    // console.log('\n📦 Using Prisma db push...');
    // console.log('This will sync your Prisma schema with the database.\n');
    
    try {
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      // console.log('\n✅ Database tables created successfully using Prisma!');
    } catch (error) {
      console.error('\n❌ Error running Prisma db push:', error.message);
      process.exit(1);
    }
  } else if (method === '2') {
    // console.log('\n📄 Running SQL schema file...');
    
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'postgresql.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at: ${sqlPath}`);
      process.exit(1);
    }
    
    // console.log(`\n📋 SQL file found: ${sqlPath}`);
    // console.log('\n⚠️  To run the SQL file, you can use one of these methods:');
    // console.log('\nMethod A - Using psql command line:');
    // console.log(`  psql "$DATABASE_URL" -f "${sqlPath}"`);
    // console.log('\nMethod B - Using Node.js script:');
    // console.log('  We can create a script to run it programmatically.');
    // console.log('\nMethod C - Copy and paste the SQL into your database client.');
    
    const runNow = await question('\nDo you want to run it now using Node.js? (y/n): ');
    
    if (runNow.toLowerCase() === 'y') {
      const { prisma } = require('../config/database');
      require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
      
      if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found in .env file');
        process.exit(1);
      }
      
      try {
        // console.log('\n📖 Reading SQL file...');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // console.log('🔌 Connecting to database...');
        
        // console.log('⚙️  Executing SQL...');
        await prisma.$executeRawUnsafe(sql);
        
        await prisma.$disconnect();
        
        // console.log('\n✅ Database tables created successfully from SQL file!');
      } catch (error) {
        console.error('\n❌ Error executing SQL:', error.message);
        await prisma.$disconnect();
        process.exit(1);
      }
    }
  } else {
    // console.log('❌ Invalid choice');
    process.exit(1);
  }
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});

