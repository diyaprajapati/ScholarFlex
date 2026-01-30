/**
 * Recalculate Test Scores
 * 
 * This script recalculates scores for all existing test attempts
 * using the updated stored procedure that considers only attempted questions
 */

const { prisma } = require('../config/database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function recalculateScores() {
  try {
    // console.log('🔄 Recalculating test scores for all completed attempts...\n');

    // Get all completed test attempts
    const attempts = await prisma.testAttempt.findMany({
      where: {
        status: {
          in: ['COMPLETED', 'AUTO_SUBMITTED'],
        },
      },
      select: {
        id: true,
        studentId: true,
        questionPaperId: true,
        maxPossibleScore: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    // console.log(`Found ${attempts.length} test attempts to recalculate.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const attempt of attempts) {
      try {
        // Calculate score manually (MySQL doesn't use stored procedures the same way)
        const studentAnswers = await prisma.studentAnswer.findMany({
          where: {
            testAttemptId: attempt.id,
          },
          select: {
            scoreObtained: true,
          },
        });

        const totalScore = studentAnswers.reduce(
          (sum, answer) => sum + parseFloat(answer.scoreObtained || 0),
          0
        );
        const maxPossibleScore = attempt.maxPossibleScore || 100;
        const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        // Update the test attempt
        await prisma.testAttempt.update({
          where: { id: attempt.id },
          data: {
            totalScore: totalScore,
            percentageScore: percentageScore,
            questionsAttempted: studentAnswers.length,
          },
        });

        successCount++;
        if (successCount % 10 === 0) {
          // console.log(`✅ Recalculated ${successCount} attempts...`);
        }
      } catch (error) {
        console.error(`❌ Error recalculating attempt ${attempt.id}:`, error.message);
        errorCount++;
      }
    }

    // console.log(`\n✨ Recalculation complete!`);
    // console.log(`   ✅ Success: ${successCount}`);
    // console.log(`   ❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error during recalculation:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recalculation
recalculateScores()
  .then(() => {
    // console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recalculation failed:', error.message);
    process.exit(1);
  });

