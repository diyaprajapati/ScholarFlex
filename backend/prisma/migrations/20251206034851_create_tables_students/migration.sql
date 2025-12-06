/*
  Warnings:

  - Made the column `is_selected` on table `students` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "idx_students_is_selected";

-- AlterTable
ALTER TABLE "playlists" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "student_activity_logs" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "is_selected" SET NOT NULL;

-- AlterTable
ALTER TABLE "videos" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
