-- CreateTable
CREATE TABLE "video_progress" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "video_id" INTEGER NOT NULL,
    "playlist_id" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3),
    "started_watching" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_position" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_progress_student_id_idx" ON "video_progress"("student_id");

-- CreateIndex
CREATE INDEX "video_progress_video_id_idx" ON "video_progress"("video_id");

-- CreateIndex
CREATE INDEX "video_progress_playlist_id_idx" ON "video_progress"("playlist_id");

-- CreateIndex
CREATE INDEX "video_progress_is_completed_idx" ON "video_progress"("is_completed");

-- CreateIndex
CREATE INDEX "video_progress_student_id_is_completed_idx" ON "video_progress"("student_id", "is_completed");

-- CreateIndex
CREATE INDEX "video_progress_student_id_video_id_idx" ON "video_progress"("student_id", "video_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_student_id_video_id_key" ON "video_progress"("student_id", "video_id");

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
