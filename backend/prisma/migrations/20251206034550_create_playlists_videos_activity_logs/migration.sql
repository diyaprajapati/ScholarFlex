-- Create playlists table
CREATE TABLE IF NOT EXISTS "playlists" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "domain_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playlists_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create index for playlists.domain_id
CREATE INDEX IF NOT EXISTS "playlists_domain_id_idx" ON "playlists"("domain_id");

-- Create videos table
CREATE TABLE IF NOT EXISTS "videos" (
  "id" SERIAL PRIMARY KEY,
  "playlist_id" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "youtube_url" VARCHAR(500) NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "videos_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for videos table
CREATE INDEX IF NOT EXISTS "videos_playlist_id_idx" ON "videos"("playlist_id");
CREATE INDEX IF NOT EXISTS "videos_order_index_idx" ON "videos"("order_index");
CREATE INDEX IF NOT EXISTS "videos_playlist_id_order_index_idx" ON "videos"("playlist_id", "order_index");

-- Create student_activity_logs table
-- Note: Using student_activity_logs to avoid conflict with existing activity_logs table
CREATE TABLE IF NOT EXISTS "student_activity_logs" (
  "id" SERIAL PRIMARY KEY,
  "student_id" INTEGER NOT NULL,
  "activity_type" VARCHAR(100) NOT NULL,
  "metadata" JSONB,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_activity_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for student_activity_logs table
CREATE INDEX IF NOT EXISTS "student_activity_logs_student_id_idx" ON "student_activity_logs"("student_id");
CREATE INDEX IF NOT EXISTS "student_activity_logs_activity_type_idx" ON "student_activity_logs"("activity_type");
CREATE INDEX IF NOT EXISTS "student_activity_logs_timestamp_idx" ON "student_activity_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "student_activity_logs_student_id_timestamp_idx" ON "student_activity_logs"("student_id", "timestamp");

