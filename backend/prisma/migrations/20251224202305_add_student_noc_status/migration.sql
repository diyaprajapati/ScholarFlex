-- CreateTable (using IF NOT EXISTS to handle existing table)
-- This matches the existing table structure created by ensureNOCStatusTable()
CREATE TABLE IF NOT EXISTS "student_noc_status" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "is_received" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_noc_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (using IF NOT EXISTS) - matches existing index name
CREATE UNIQUE INDEX IF NOT EXISTS "student_noc_status_student_id_key" ON "student_noc_status"("student_id");

-- CreateIndex (using IF NOT EXISTS) - matches existing index name from code
CREATE INDEX IF NOT EXISTS "idx_student_noc_status_student_id" ON "student_noc_status"("student_id");

-- AddForeignKey (only if it doesn't exist) - matches existing constraint name from code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_student_noc_status_student'
    ) THEN
        ALTER TABLE "student_noc_status" 
        ADD CONSTRAINT "fk_student_noc_status_student" 
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;
    END IF;
END $$;

