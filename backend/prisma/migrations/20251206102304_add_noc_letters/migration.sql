-- CreateEnum
CREATE TYPE "NOCStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "noc_letters" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "status" "NOCStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,

    CONSTRAINT "noc_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "noc_letters_student_id_idx" ON "noc_letters"("student_id");

-- CreateIndex
CREATE INDEX "noc_letters_status_idx" ON "noc_letters"("status");

-- CreateIndex
CREATE INDEX "noc_letters_uploaded_at_idx" ON "noc_letters"("uploaded_at");

-- AddForeignKey
ALTER TABLE "noc_letters" ADD CONSTRAINT "noc_letters_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_letters" ADD CONSTRAINT "noc_letters_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
