/*
  Warnings:

  - You are about to drop the `test_retake_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "test_retake_permissions" DROP CONSTRAINT "test_retake_permissions_granted_by_fkey";

-- DropForeignKey
ALTER TABLE "test_retake_permissions" DROP CONSTRAINT "test_retake_permissions_question_paper_id_fkey";

-- DropForeignKey
ALTER TABLE "test_retake_permissions" DROP CONSTRAINT "test_retake_permissions_student_id_fkey";

-- DropTable
DROP TABLE "test_retake_permissions";
