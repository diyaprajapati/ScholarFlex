-- AlterTable
ALTER TABLE "video_progress" ADD COLUMN     "replay_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "video_sessions" (
    "id" SERIAL NOT NULL,
    "video_progress_id" INTEGER NOT NULL,
    "session_id" VARCHAR(100) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "exit_reason" VARCHAR(50),
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_events" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "video_position" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "video_duration" DECIMAL(10,2),
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "playback_rate" DECIMAL(3,2) NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "video_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_access" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "playlist_id" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_sessions_session_id_key" ON "video_sessions"("session_id");

-- CreateIndex
CREATE INDEX "video_sessions_video_progress_id_idx" ON "video_sessions"("video_progress_id");

-- CreateIndex
CREATE INDEX "video_sessions_session_id_idx" ON "video_sessions"("session_id");

-- CreateIndex
CREATE INDEX "video_sessions_started_at_idx" ON "video_sessions"("started_at");

-- CreateIndex
CREATE INDEX "video_sessions_video_progress_id_started_at_idx" ON "video_sessions"("video_progress_id", "started_at");

-- CreateIndex
CREATE INDEX "video_events_session_id_idx" ON "video_events"("session_id");

-- CreateIndex
CREATE INDEX "video_events_event_type_idx" ON "video_events"("event_type");

-- CreateIndex
CREATE INDEX "video_events_timestamp_idx" ON "video_events"("timestamp");

-- CreateIndex
CREATE INDEX "video_events_session_id_event_type_idx" ON "video_events"("session_id", "event_type");

-- CreateIndex
CREATE INDEX "video_events_session_id_timestamp_idx" ON "video_events"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "playlist_access_student_id_idx" ON "playlist_access"("student_id");

-- CreateIndex
CREATE INDEX "playlist_access_playlist_id_idx" ON "playlist_access"("playlist_id");

-- CreateIndex
CREATE INDEX "playlist_access_student_id_playlist_id_idx" ON "playlist_access"("student_id", "playlist_id");

-- CreateIndex
CREATE INDEX "playlist_access_opened_at_idx" ON "playlist_access"("opened_at");

-- AddForeignKey
ALTER TABLE "video_sessions" ADD CONSTRAINT "video_sessions_video_progress_id_fkey" FOREIGN KEY ("video_progress_id") REFERENCES "video_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "video_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_access" ADD CONSTRAINT "playlist_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
