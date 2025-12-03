-- CreateTable
CREATE TABLE "test_retake_permissions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "question_paper_id" INTEGER NOT NULL,
    "granted_by" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_retake_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_retake_permissions_student_id_idx" ON "test_retake_permissions"("student_id");

-- CreateIndex
CREATE INDEX "test_retake_permissions_question_paper_id_idx" ON "test_retake_permissions"("question_paper_id");

-- CreateIndex
CREATE INDEX "test_retake_permissions_is_active_idx" ON "test_retake_permissions"("is_active");

-- CreateIndex
CREATE INDEX "test_retake_permissions_student_id_question_paper_id_is_act_idx" ON "test_retake_permissions"("student_id", "question_paper_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "test_retake_permissions_student_id_question_paper_id_key" ON "test_retake_permissions"("student_id", "question_paper_id");

-- AddForeignKey
ALTER TABLE "test_retake_permissions" ADD CONSTRAINT "test_retake_permissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_retake_permissions" ADD CONSTRAINT "test_retake_permissions_question_paper_id_fkey" FOREIGN KEY ("question_paper_id") REFERENCES "question_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_retake_permissions" ADD CONSTRAINT "test_retake_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
