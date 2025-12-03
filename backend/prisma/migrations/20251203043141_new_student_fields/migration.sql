/*
  Warnings:

  - You are about to drop the column `first_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `middle_name` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "middle_name",
ALTER COLUMN "internship_start_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "internship_end_date" SET DATA TYPE TIMESTAMP(3);
