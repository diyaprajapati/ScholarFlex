-- Add is_selected column to students table
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_selected" BOOLEAN DEFAULT FALSE;

-- Create index for is_selected if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_students_is_selected" ON "students"("is_selected");

