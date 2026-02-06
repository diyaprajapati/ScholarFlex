-- AlterTable (MySQL: nullable datetime for heartbeat; PostgreSQL would use TIMESTAMP(3))
ALTER TABLE `time_tracking_sessions` ADD COLUMN `last_heartbeat_at` DATETIME(3) NULL;
