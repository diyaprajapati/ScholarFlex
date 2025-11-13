-- ============================================
-- ScholarFlex - Intern Management System
-- Database Schema Design
-- ============================================

-- ============================================
-- MASTER TABLES
-- ============================================

-- Roles Master Table
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_code (role_code),
    INDEX idx_is_active (is_active)
);

-- Insert default roles
INSERT INTO roles (role_name, role_code, description) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full access to all features including marks'),
('Admin', 'ADMIN', 'Full access except viewing marks/scores'),
('Student', 'STUDENT', 'Can only attempt tests');

-- Domains Master Table
CREATE TABLE domains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_name VARCHAR(100) NOT NULL UNIQUE,
    domain_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_domain_code (domain_code),
    INDEX idx_is_active (is_active)
);

-- Intern Status Master Table
CREATE TABLE intern_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_code (status_code)
);

-- Insert default intern statuses
INSERT INTO intern_status (status_name, status_code, description) VALUES
('Registered', 'REGISTERED', 'Intern has registered but not started test'),
('In Progress', 'IN_PROGRESS', 'Intern is currently taking the test'),
('Completed', 'COMPLETED', 'Intern has completed the test'),
('Selected', 'SELECTED', 'Intern has been selected'),
('Rejected', 'REJECTED', 'Intern has been rejected');

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- Users Table (for Super Admin and Admin)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- For future password implementation
    full_name VARCHAR(255),
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_email (email),
    INDEX idx_role_id (role_id),
    INDEX idx_is_active (is_active)
);

-- Students/Interns Table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    domain_id INT,
    status_id INT DEFAULT 1, -- Default: REGISTERED
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    form_link_token VARCHAR(100) UNIQUE, -- For form link registration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (status_id) REFERENCES intern_status(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_email (email),
    INDEX idx_domain_id (domain_id),
    INDEX idx_status_id (status_id),
    INDEX idx_form_link_token (form_link_token),
    INDEX idx_is_active (is_active)
);

-- ============================================
-- QUESTION PAPER MANAGEMENT TABLES
-- ============================================

-- Question Papers Table
CREATE TABLE question_papers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    paper_name VARCHAR(255) NOT NULL,
    description TEXT,
    total_questions INT DEFAULT 0,
    total_weightage INT DEFAULT 0,
    duration_minutes INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Questions Table
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_paper_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT') DEFAULT 'MCQ',
    weightage INT DEFAULT 1,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NULL,
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_question_paper_id (question_paper_id),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active)
);

-- Question Options Table
CREATE TABLE question_options (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_label VARCHAR(10) NOT NULL, -- A, B, C, D, etc.
    is_correct BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id),
    INDEX idx_is_correct (is_correct),
    INDEX idx_display_order (display_order)
);

-- ============================================
-- TEST ATTEMPT TABLES
-- ============================================

-- Test Attempts Table
CREATE TABLE test_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    question_paper_id INT NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    auto_submitted BOOLEAN DEFAULT FALSE,
    time_taken_seconds INT NULL,
    total_questions INT DEFAULT 0,
    questions_attempted INT DEFAULT 0,
    total_score DECIMAL(10,2) DEFAULT 0.00,
    max_possible_score DECIMAL(10,2) DEFAULT 0.00,
    percentage_score DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('IN_PROGRESS', 'COMPLETED', 'AUTO_SUBMITTED') DEFAULT 'IN_PROGRESS',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id),
    INDEX idx_student_id (student_id),
    INDEX idx_question_paper_id (question_paper_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at)
);

-- Student Answers Table
CREATE TABLE student_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    test_attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    score_obtained DECIMAL(10,2) DEFAULT 0.00,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id),
    UNIQUE KEY unique_attempt_question (test_attempt_id, question_id),
    INDEX idx_test_attempt_id (test_attempt_id),
    INDEX idx_question_id (question_id),
    INDEX idx_is_correct (is_correct)
);

-- ============================================
-- AUDIT & LOGGING TABLES
-- ============================================

-- Activity Logs Table
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    user_type ENUM('USER', 'STUDENT') NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_entity_type_id (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- ============================================
-- FILE UPLOADS TABLE (for JSON imports)
-- ============================================

-- File Uploads Table
CREATE TABLE file_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    upload_type ENUM('QUESTION_PAPER', 'STUDENTS') NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    records_processed INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    error_message TEXT,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_upload_type (upload_type),
    INDEX idx_status (status),
    INDEX idx_uploaded_by (uploaded_by)
);

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View: Student Test Summary
CREATE VIEW vw_student_test_summary AS
SELECT 
    s.id AS student_id,
    s.email,
    s.full_name,
    s.phone,
    d.domain_name,
    ist.status_name AS intern_status,
    COUNT(DISTINCT ta.id) AS total_attempts,
    MAX(ta.percentage_score) AS best_score,
    MAX(ta.submitted_at) AS last_attempt_date
FROM students s
LEFT JOIN domains d ON s.domain_id = d.id
LEFT JOIN intern_status ist ON s.status_id = ist.id
LEFT JOIN test_attempts ta ON s.id = ta.student_id AND ta.status = 'COMPLETED'
GROUP BY s.id, s.email, s.full_name, s.phone, d.domain_name, ist.status_name;

-- View: Question Paper Details
CREATE VIEW vw_question_paper_details AS
SELECT 
    qp.id,
    qp.paper_name,
    qp.description,
    qp.total_questions,
    qp.total_weightage,
    qp.duration_minutes,
    COUNT(DISTINCT q.id) AS actual_questions_count,
    COUNT(DISTINCT ta.id) AS total_attempts,
    COUNT(DISTINCT ta.student_id) AS unique_students_attempted
FROM question_papers qp
LEFT JOIN questions q ON qp.id = q.question_paper_id AND q.is_active = TRUE
LEFT JOIN test_attempts ta ON qp.id = ta.question_paper_id
WHERE qp.is_active = TRUE
GROUP BY qp.id, qp.paper_name, qp.description, qp.total_questions, qp.total_weightage, qp.duration_minutes;

-- ============================================
-- STORED PROCEDURES (Optional - for complex operations)
-- ============================================

-- Procedure: Calculate Test Score
DELIMITER //
CREATE PROCEDURE sp_calculate_test_score(IN attempt_id INT)
BEGIN
    DECLARE total_score DECIMAL(10,2);
    DECLARE max_score DECIMAL(10,2);
    DECLARE percentage DECIMAL(5,2);
    DECLARE questions_count INT;
    DECLARE attempted_count INT;
    
    -- Calculate total score and max possible score
    SELECT 
        COALESCE(SUM(sa.score_obtained), 0),
        COALESCE(SUM(q.weightage), 0),
        COUNT(DISTINCT q.id),
        COUNT(DISTINCT sa.id)
    INTO total_score, max_score, questions_count, attempted_count
    FROM test_attempts ta
    JOIN questions q ON ta.question_paper_id = q.question_paper_id AND q.is_active = TRUE
    LEFT JOIN student_answers sa ON ta.id = sa.test_attempt_id AND q.id = sa.question_id
    WHERE ta.id = attempt_id;
    
    -- Calculate percentage
    IF max_score > 0 THEN
        SET percentage = (total_score / max_score) * 100;
    ELSE
        SET percentage = 0;
    END IF;
    
    -- Update test attempt
    UPDATE test_attempts
    SET 
        total_score = total_score,
        max_possible_score = max_score,
        percentage_score = percentage,
        total_questions = questions_count,
        questions_attempted = attempted_count,
        submitted_at = NOW(),
        status = CASE 
            WHEN auto_submitted = TRUE THEN 'AUTO_SUBMITTED'
            ELSE 'COMPLETED'
        END
    WHERE id = attempt_id;
    
    -- Update student status if completed
    UPDATE students s
    JOIN test_attempts ta ON s.id = ta.student_id
    SET s.status_id = 3 -- COMPLETED status
    WHERE ta.id = attempt_id AND s.status_id = 1; -- Only if currently REGISTERED
    
END //
DELIMITER ;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_students_domain_status ON students(domain_id, status_id, is_active);
CREATE INDEX idx_test_attempts_student_status ON test_attempts(student_id, status);
CREATE INDEX idx_questions_paper_active ON questions(question_paper_id, is_active, display_order);
CREATE INDEX idx_student_answers_attempt_question ON student_answers(test_attempt_id, question_id);

-- ============================================
-- END OF SCHEMA
-- ============================================

