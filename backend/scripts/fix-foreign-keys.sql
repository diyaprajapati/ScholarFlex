-- Fix Foreign Key Constraints to Support Cascade Deletion
-- This script adds ON DELETE CASCADE to foreign keys so that
-- deleting a student automatically deletes related test attempts

-- Drop the existing foreign key constraint
ALTER TABLE test_attempts 
DROP CONSTRAINT IF EXISTS test_attempts_student_id_fkey;

-- Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE test_attempts 
ADD CONSTRAINT test_attempts_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

-- Note: student_answers already has ON DELETE CASCADE from test_attempts,
-- so deleting test_attempts will automatically delete student_answers

