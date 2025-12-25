-- CreateEnum
CREATE TYPE "InternshipStatus" AS ENUM ('NOT_STARTED', 'ONGOING', 'COMPLETED');

-- CreateTable
CREATE TABLE "student_internship" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "status" "InternshipStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_internship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_projects" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "project_title" VARCHAR(255) NOT NULL,
    "project_description" TEXT,
    "deadline" DATE,
    "project_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_evaluations" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "week_no" INTEGER NOT NULL,
    "evaluation_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_internship_student_id_key" ON "student_internship"("student_id");

-- CreateIndex
CREATE INDEX "student_internship_student_id_idx" ON "student_internship"("student_id");

-- CreateIndex
CREATE INDEX "student_internship_status_idx" ON "student_internship"("status");

-- CreateIndex
CREATE INDEX "student_projects_student_id_idx" ON "student_projects"("student_id");

-- CreateIndex
CREATE INDEX "student_projects_deadline_idx" ON "student_projects"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "student_evaluations_student_id_week_no_key" ON "student_evaluations"("student_id", "week_no");

-- CreateIndex
CREATE INDEX "student_evaluations_student_id_idx" ON "student_evaluations"("student_id");

-- CreateIndex
CREATE INDEX "student_evaluations_week_no_idx" ON "student_evaluations"("week_no");

-- CreateIndex
CREATE INDEX "student_evaluations_student_id_week_no_idx" ON "student_evaluations"("student_id", "week_no");

-- AddForeignKey
ALTER TABLE "student_internship" ADD CONSTRAINT "student_internship_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

