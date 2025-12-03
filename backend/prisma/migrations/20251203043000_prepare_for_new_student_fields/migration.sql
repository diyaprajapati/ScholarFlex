-- This migration prepares the database for the new_student_fields migration
-- It adds columns that will be dropped in the next migration (if they don't exist)
-- This is needed for shadow database validation in migrate dev

DO $$ 
BEGIN
    -- Add first_name column if it doesn't exist (will be dropped in next migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'first_name') THEN
        ALTER TABLE "students" ADD COLUMN "first_name" VARCHAR(255);
    END IF;
    
    -- Add middle_name column if it doesn't exist (will be dropped in next migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'middle_name') THEN
        ALTER TABLE "students" ADD COLUMN "middle_name" VARCHAR(255);
    END IF;
    
    -- Add last_name column if it doesn't exist (will be dropped in next migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'last_name') THEN
        ALTER TABLE "students" ADD COLUMN "last_name" VARCHAR(255);
    END IF;
END $$;

