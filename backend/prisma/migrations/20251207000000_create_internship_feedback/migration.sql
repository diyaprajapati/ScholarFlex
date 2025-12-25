-- CreateTable
CREATE TABLE "internship_feedback" (
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

-- CreateIndex
CREATE UNIQUE INDEX "internship_feedback_student_id_key" ON "internship_feedback"("student_id");

-- CreateIndex
CREATE INDEX "internship_feedback_student_id_idx" ON "internship_feedback"("student_id");

-- CreateIndex
CREATE INDEX "internship_feedback_submitted_at_idx" ON "internship_feedback"("submitted_at");

-- AddForeignKey
ALTER TABLE "internship_feedback" ADD CONSTRAINT "internship_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

