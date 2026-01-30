/**
 * Database Seeding Script
 * 
 * This script seeds the database with initial/default data:
 * - Roles (Super Admin, Admin, Student)
 * - Intern Statuses (Active, Pending, Inactive, Selected, Not Selected, etc.)
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function seedDatabase() {
  try {
    // console.log('🌱 Seeding database...\n');

    // 1. Insert Roles using Prisma upsert (MySQL compatible)
    // console.log('📝 Inserting roles...');
    await prisma.role.upsert({
      where: { roleCode: 'SUPER_ADMIN' },
      update: {},
      create: {
        roleName: 'Super Admin',
        roleCode: 'SUPER_ADMIN',
        description: 'Full access to all features including marks',
      },
    });
    await prisma.role.upsert({
      where: { roleCode: 'ADMIN' },
      update: {},
      create: {
        roleName: 'Admin',
        roleCode: 'ADMIN',
        description: 'Full access except viewing marks/scores',
      },
    });
    await prisma.role.upsert({
      where: { roleCode: 'STUDENT' },
      update: {},
      create: {
        roleName: 'Student',
        roleCode: 'STUDENT',
        description: 'Can only attempt tests',
      },
    });
    // console.log('✅ Roles inserted\n');

    // 2. Insert Intern Statuses using Prisma upsert
    // console.log('📝 Inserting intern statuses...');
    const statuses = [
      { statusName: 'Active', statusCode: 'ACTIVE', description: 'Intern is active' },
      { statusName: 'Pending', statusCode: 'PENDING', description: 'Intern registration pending' },
      { statusName: 'Inactive', statusCode: 'INACTIVE', description: 'Intern is inactive' },
      { statusName: 'Selected', statusCode: 'SELECTED', description: 'Intern has been selected' },
      { statusName: 'Not Selected', statusCode: 'NOT_SELECTED', description: 'Intern has not been selected' },
      { statusName: 'Registered', statusCode: 'REGISTERED', description: 'Intern has registered but not started test' },
      { statusName: 'In Progress', statusCode: 'IN_PROGRESS', description: 'Intern is currently taking the test' },
      { statusName: 'Completed', statusCode: 'COMPLETED', description: 'Intern has completed the test' },
    ];

    for (const status of statuses) {
      await prisma.internStatus.upsert({
        where: { statusCode: status.statusCode },
        update: {},
        create: status,
      });
    }
    // console.log('✅ Intern statuses inserted\n');

    // console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  });

