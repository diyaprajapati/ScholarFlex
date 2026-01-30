/**
 * Check Student Domains Script
 * 
 * This script checks which students have domains and which don't
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function checkDomains() {
  try {
    // console.log('🔍 Checking student domains...\n');

    // Get all students with their domain info using Prisma
    const students = await prisma.student.findMany({
      where: {
        isActive: true,
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    // console.log(`📊 Total students: ${students.length}\n`);

    const withDomain = students.filter(s => s.domainId !== null);
    const withoutDomain = students.filter(s => s.domainId === null);

    // console.log(`✅ Students with domain: ${withDomain.length}`);
    // console.log(`❌ Students without domain: ${withoutDomain.length}\n`);

    if (withoutDomain.length > 0) {
      // console.log('📋 Students without domain:');
      withoutDomain.forEach((student, index) => {
        // console.log(`   ${index + 1}. ${student.fullName} (${student.email}) - ID: ${student.id}`);
      });
    }

    if (withDomain.length > 0) {
      // console.log('\n📋 Students with domain:');
      withDomain.slice(0, 5).forEach((student, index) => {
        // console.log(`   ${index + 1}. ${student.fullName} - Domain: ${student.domain?.domainName || 'N/A'}`);
      });
      if (withDomain.length > 5) {
        // console.log(`   ... and ${withDomain.length - 5} more`);
      }
    }

    // Show available domains
    const domains = await prisma.domain.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        domainName: true,
        domainCode: true,
      },
      orderBy: {
        domainName: 'asc',
      },
    });

    if (domains.length > 0) {
      // console.log('\n📋 Available domains:');
      domains.forEach((domain, index) => {
        // console.log(`   ${index + 1}. ${domain.domainName} (ID: ${domain.id})`);
      });
    } else {
      // console.log('\n⚠️  No domains found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDomains()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });

