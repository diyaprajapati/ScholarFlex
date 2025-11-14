-- Script to create a test user for API testing
-- Run this in your PostgreSQL database

-- First, check available roles
SELECT id, role_name, role_code FROM roles;

-- Insert a test Super Admin user
-- Replace role_id with the actual id from roles table (usually 1 for SUPER_ADMIN)
INSERT INTO users (email, full_name, role_id) 
VALUES ('admin@scholarflex.com', 'Test Admin', 1)
ON CONFLICT (email) DO NOTHING;

-- Insert a test Admin user (if role_id = 2)
INSERT INTO users (email, full_name, role_id) 
VALUES ('admin2@scholarflex.com', 'Test Admin 2', 2)
ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT u.id, u.email, u.full_name, r.role_name, r.role_code 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.email IN ('admin@scholarflex.com', 'admin2@scholarflex.com');

