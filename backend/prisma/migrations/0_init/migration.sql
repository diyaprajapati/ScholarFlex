-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."QuestionPaperStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MCQ', 'SINGLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "public"."TestAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'AUTO_SUBMITTED');

-- CreateEnum
CREATE TYPE "public"."UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UploadType" AS ENUM ('QUESTION_PAPER', 'STUDENTS');

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('USER', 'STUDENT');

-- CreateTable
CREATE TABLE "public"."activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "user_type" "public"."UserType" NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "description" TEXT,
    "request_method" VARCHAR(10),
    "request_path" VARCHAR(255),
    "request_body" JSONB,
    "response_status" INTEGER,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."domains" (
    "id" SERIAL NOT NULL,
    "domain_name" VARCHAR(100) NOT NULL,
    "domain_code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_uploads" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" BIGINT,
    "upload_type" "public"."UploadType" NOT NULL,
    "status" "public"."UploadStatus" NOT NULL DEFAULT 'PENDING',
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "uploaded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intern_status" (
    "id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intern_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otp_verifications" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "option_text" TEXT NOT NULL,
    "option_label" VARCHAR(10) NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_paper_domains" (
    "id" SERIAL NOT NULL,
    "question_paper_id" INTEGER NOT NULL,
    "domain_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_paper_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_papers" (
    "id" SERIAL NOT NULL,
    "paper_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "subject" VARCHAR(100),
    "year" VARCHAR(10),
    "semester" VARCHAR(50),
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "total_weightage" INTEGER NOT NULL DEFAULT 0,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "status" "public"."QuestionPaperStatus" NOT NULL DEFAULT 'draft',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "question_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" SERIAL NOT NULL,
    "question_paper_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "public"."QuestionType" NOT NULL DEFAULT 'MCQ',
    "weightage" INTEGER NOT NULL DEFAULT 1,
    "correct_answer" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "section" VARCHAR(100),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "role_code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_answers" (
    "id" SERIAL NOT NULL,
    "test_attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "selected_option_id" INTEGER,
    "selected_option_ids" TEXT,
    "answer_text" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "score_obtained" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "domain_id" INTEGER,
    "status_id" INTEGER NOT NULL DEFAULT 1,
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "form_link_token" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."test_assignments" (
    "id" SERIAL NOT NULL,
    "question_paper_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "test_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."test_attempts" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "question_paper_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "auto_submitted" BOOLEAN NOT NULL DEFAULT false,
    "time_taken_seconds" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "questions_attempted" INTEGER NOT NULL DEFAULT 0,
    "total_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_possible_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "percentage_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "public"."TestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "question_pool" JSONB,

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(255),
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "public"."activity_logs"("action" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "public"."activity_logs"("entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "public"."activity_logs"("user_id" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_user_type_idx" ON "public"."activity_logs"("user_type" ASC);

-- CreateIndex
CREATE INDEX "idx_created_at_desc_logs" ON "public"."activity_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_code_key" ON "public"."domains"("domain_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "domains_domain_name_key" ON "public"."domains"("domain_name" ASC);

-- CreateIndex
CREATE INDEX "file_uploads_status_idx" ON "public"."file_uploads"("status" ASC);

-- CreateIndex
CREATE INDEX "file_uploads_upload_type_idx" ON "public"."file_uploads"("upload_type" ASC);

-- CreateIndex
CREATE INDEX "file_uploads_uploaded_by_idx" ON "public"."file_uploads"("uploaded_by" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "intern_status_status_code_key" ON "public"."intern_status"("status_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "intern_status_status_name_key" ON "public"."intern_status"("status_name" ASC);

-- CreateIndex
CREATE INDEX "otp_verifications_email_idx" ON "public"."otp_verifications"("email" ASC);

-- CreateIndex
CREATE INDEX "otp_verifications_expires_at_idx" ON "public"."otp_verifications"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "otp_verifications_is_used_idx" ON "public"."otp_verifications"("is_used" ASC);

-- CreateIndex
CREATE INDEX "otp_verifications_otp_idx" ON "public"."otp_verifications"("otp" ASC);

-- CreateIndex
CREATE INDEX "question_options_display_order_idx" ON "public"."question_options"("display_order" ASC);

-- CreateIndex
CREATE INDEX "question_options_is_correct_idx" ON "public"."question_options"("is_correct" ASC);

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "public"."question_options"("question_id" ASC);

-- CreateIndex
CREATE INDEX "question_paper_domains_domain_id_idx" ON "public"."question_paper_domains"("domain_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "question_paper_domains_question_paper_id_domain_id_key" ON "public"."question_paper_domains"("question_paper_id" ASC, "domain_id" ASC);

-- CreateIndex
CREATE INDEX "question_paper_domains_question_paper_id_idx" ON "public"."question_paper_domains"("question_paper_id" ASC);

-- CreateIndex
CREATE INDEX "question_papers_created_by_idx" ON "public"."question_papers"("created_by" ASC);

-- CreateIndex
CREATE INDEX "question_papers_is_active_idx" ON "public"."question_papers"("is_active" ASC);

-- CreateIndex
CREATE INDEX "question_papers_status_idx" ON "public"."question_papers"("status" ASC);

-- CreateIndex
CREATE INDEX "question_papers_subject_idx" ON "public"."question_papers"("subject" ASC);

-- CreateIndex
CREATE INDEX "question_papers_year_idx" ON "public"."question_papers"("year" ASC);

-- CreateIndex
CREATE INDEX "questions_display_order_idx" ON "public"."questions"("display_order" ASC);

-- CreateIndex
CREATE INDEX "questions_is_active_idx" ON "public"."questions"("is_active" ASC);

-- CreateIndex
CREATE INDEX "questions_question_paper_id_idx" ON "public"."questions"("question_paper_id" ASC);

-- CreateIndex
CREATE INDEX "questions_question_paper_id_is_active_display_order_idx" ON "public"."questions"("question_paper_id" ASC, "is_active" ASC, "display_order" ASC);

-- CreateIndex
CREATE INDEX "questions_question_type_idx" ON "public"."questions"("question_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_code_key" ON "public"."roles"("role_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "public"."roles"("role_name" ASC);

-- CreateIndex
CREATE INDEX "student_answers_is_correct_idx" ON "public"."student_answers"("is_correct" ASC);

-- CreateIndex
CREATE INDEX "student_answers_question_id_idx" ON "public"."student_answers"("question_id" ASC);

-- CreateIndex
CREATE INDEX "student_answers_test_attempt_id_idx" ON "public"."student_answers"("test_attempt_id" ASC);

-- CreateIndex
CREATE INDEX "student_answers_test_attempt_id_question_id_idx" ON "public"."student_answers"("test_attempt_id" ASC, "question_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_test_attempt_id_question_id_key" ON "public"."student_answers"("test_attempt_id" ASC, "question_id" ASC);

-- CreateIndex
CREATE INDEX "students_domain_id_idx" ON "public"."students"("domain_id" ASC);

-- CreateIndex
CREATE INDEX "students_domain_id_status_id_is_active_idx" ON "public"."students"("domain_id" ASC, "status_id" ASC, "is_active" ASC);

-- CreateIndex
CREATE INDEX "students_email_idx" ON "public"."students"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "public"."students"("email" ASC);

-- CreateIndex
CREATE INDEX "students_form_link_token_idx" ON "public"."students"("form_link_token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "students_form_link_token_key" ON "public"."students"("form_link_token" ASC);

-- CreateIndex
CREATE INDEX "students_is_active_idx" ON "public"."students"("is_active" ASC);

-- CreateIndex
CREATE INDEX "students_status_id_idx" ON "public"."students"("status_id" ASC);

-- CreateIndex
CREATE INDEX "test_assignments_is_active_idx" ON "public"."test_assignments"("is_active" ASC);

-- CreateIndex
CREATE INDEX "test_assignments_question_paper_id_idx" ON "public"."test_assignments"("question_paper_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "test_assignments_question_paper_id_student_id_key" ON "public"."test_assignments"("question_paper_id" ASC, "student_id" ASC);

-- CreateIndex
CREATE INDEX "test_assignments_student_id_idx" ON "public"."test_assignments"("student_id" ASC);

-- CreateIndex
CREATE INDEX "test_attempts_question_paper_id_idx" ON "public"."test_attempts"("question_paper_id" ASC);

-- CreateIndex
CREATE INDEX "test_attempts_status_idx" ON "public"."test_attempts"("status" ASC);

-- CreateIndex
CREATE INDEX "test_attempts_student_id_idx" ON "public"."test_attempts"("student_id" ASC);

-- CreateIndex
CREATE INDEX "test_attempts_student_id_status_idx" ON "public"."test_attempts"("student_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "test_attempts_submitted_at_idx" ON "public"."test_attempts"("submitted_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_uploads" ADD CONSTRAINT "file_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_paper_domains" ADD CONSTRAINT "question_paper_domains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_paper_domains" ADD CONSTRAINT "question_paper_domains_question_paper_id_fkey" FOREIGN KEY ("question_paper_id") REFERENCES "public"."question_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_papers" ADD CONSTRAINT "question_papers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_papers" ADD CONSTRAINT "question_papers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_question_paper_id_fkey" FOREIGN KEY ("question_paper_id") REFERENCES "public"."question_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_answers" ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_answers" ADD CONSTRAINT "student_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_answers" ADD CONSTRAINT "student_answers_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."intern_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_assignments" ADD CONSTRAINT "test_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_assignments" ADD CONSTRAINT "test_assignments_question_paper_id_fkey" FOREIGN KEY ("question_paper_id") REFERENCES "public"."question_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_assignments" ADD CONSTRAINT "test_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_attempts" ADD CONSTRAINT "test_attempts_question_paper_id_fkey" FOREIGN KEY ("question_paper_id") REFERENCES "public"."question_papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_attempts" ADD CONSTRAINT "test_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

