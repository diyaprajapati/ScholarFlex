/**
 * Database Check Script
 * 
 * This script checks if the database has the required seed data
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function checkDatabase() {
  try {
    // console.log('🔍 Checking database seed data...\n');

    // Check roles
    const rolesCount = await prisma.role.count();
    // console.log(`📋 Roles: ${rolesCount} found`);
    if (rolesCount === 0) {
      // console.log('   ⚠️  No roles found. Need to seed.');
    } else {
      const roles = await prisma.role.findMany({
        select: {
          roleName: true,
          roleCode: true,
        },
      });
      // roles.forEach(r => console.log(`   - ${r.roleName} (${r.roleCode})`));
    }

    // Check intern_status
    const statusCount = await prisma.internStatus.count();
    // console.log(`\n📋 Intern Statuses: ${statusCount} found`);
    if (statusCount === 0) {
      // console.log('   ⚠️  No intern statuses found. Need to seed.');
    } else {
      const statuses = await prisma.internStatus.findMany({
        select: {
          statusName: true,
          statusCode: true,
        },
        orderBy: {
          id: 'asc',
        },
      });
      // statuses.forEach(s => console.log(`   - ${s.statusName} (${s.statusCode})`));
    }

    // Check for REGISTERED status specifically
    const registeredStatus = await prisma.internStatus.findFirst({
      where: {
        statusCode: 'REGISTERED',
        isActive: true,
      },
    });
    if (!registeredStatus) {
      // console.log('\n❌ REGISTERED status not found! This is required for adding interns.');
      // console.log('\n💡 To fix this, run: npm run db:seed');
      process.exit(1);
    } else {
      // console.log('\n✅ REGISTERED status found - database is ready for adding interns!');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

