-- This migration was already applied to the database
-- Adding columns that were created manually
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "institute_name" VARCHAR(255);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "course_taken" VARCHAR(255);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "area_of_interests" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "internship_start_date" TIMESTAMP(3);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "internship_end_date" TIMESTAMP(3);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "internship_duration" VARCHAR(50);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "reference_information" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "internal_faculty_name" VARCHAR(255);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "faculty_contact" VARCHAR(20);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "faculty_email" VARCHAR(255);
