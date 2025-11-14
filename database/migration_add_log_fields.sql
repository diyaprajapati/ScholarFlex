-- Migration script to add new fields to activity_logs table
-- Run this if you already have the database created

-- For PostgreSQL
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS request_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS request_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS request_body JSONB NULL,
ADD COLUMN IF NOT EXISTS response_status INT NULL;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_action_logs ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_type_logs ON activity_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_created_at_desc_logs ON activity_logs(created_at DESC);

-- For MySQL (if using MySQL instead)
-- ALTER TABLE activity_logs 
-- ADD COLUMN request_method VARCHAR(10) AFTER description,
-- ADD COLUMN request_path VARCHAR(255) AFTER request_method,
-- ADD COLUMN request_body JSON NULL AFTER request_path,
-- ADD COLUMN response_status INT NULL AFTER request_body;

-- ALTER TABLE activity_logs 
-- ADD INDEX idx_action (action),
-- ADD INDEX idx_user_type (user_type);

