-- CreateTable (using IF NOT EXISTS to handle existing table from earlier migration)
CREATE TABLE IF NOT EXISTS "internship_feedback" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "learning_experience" TEXT,
    "content_quality" INTEGER,
    "mentor_support" INTEGER,
    "platform_usability" INTEGER,
    "suggestions" TEXT,
    "would_recommend" BOOLEAN,
    "additional_comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "internship_feedback_student_id_idx" ON "internship_feedback"("student_id");

-- CreateIndex (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "internship_feedback_submitted_at_idx" ON "internship_feedback"("submitted_at");

-- CreateIndex (using IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "internship_feedback_student_id_key" ON "internship_feedback"("student_id");

-- AddForeignKey (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'internship_feedback_student_id_fkey'
    ) THEN
        ALTER TABLE "internship_feedback" 
        ADD CONSTRAINT "internship_feedback_student_id_fkey" 
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
