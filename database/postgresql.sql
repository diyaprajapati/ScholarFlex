-- ============================================
-- ScholarFlex - Intern Management System
-- Database Schema Design (PostgreSQL)
-- ============================================
--
-- FRONTEND TO DATABASE FIELD MAPPING:
-- ====================================
--
-- Students/Interns:
--   Frontend 'name' -> database 'full_name'
--   Frontend 'domain' -> database 'domain_name' (via domains table)
--   Frontend 'status' -> database 'status_name' (via intern_status table: Active, Pending, Inactive)
--   Frontend 'selectionStatus' -> database 'status_name' (via intern_status table: Selected, Not Selected)
--   Frontend 'registeredDate' -> database 'registration_date'
--   Frontend 'aptitudeScore' -> calculated from test_attempts.percentage_score (MAX value)
--   Frontend 'aptitudeStatus' -> calculated from test_attempts.status (Pending, Completed, In Progress)
--
-- Question Papers:
--   Frontend 'name' -> database 'paper_name'
--   Frontend 'subject' -> database 'subject'
--   Frontend 'year' -> database 'year'
--   Frontend 'semester' -> database 'semester'
--   Frontend 'totalQuestions' -> database 'total_questions'
--   Frontend 'duration' -> database 'duration_minutes'
--   Frontend 'maxMarks' -> database 'total_weightage'
--   Frontend 'status' -> database 'status' (draft, published)
--   Frontend 'createdAt' -> database 'created_at'
--
-- Questions:
--   Frontend 'type' -> database 'question_type' mapping:
--     'multiple-choice' -> 'MULTIPLE_SELECT' (multiple options, can have multiple correct)
--     'single-choice' -> 'SINGLE_CHOICE' (single correct answer)
--     'true-false' -> 'TRUE_FALSE'
--     'short-answer' -> 'SHORT_ANSWER'
--   Frontend 'text' -> database 'question_text'
--   Frontend 'weightage' -> database 'weightage'
--   Frontend 'correctAnswer' (for short-answer) -> database 'correct_answer'
--   Frontend 'correctOptions' -> database 'is_correct' in question_options table
--
-- ============================================

-- ============================================
-- CREATE ENUMS
-- ============================================

CREATE TYPE question_paper_status AS ENUM ('draft', 'published');
CREATE TYPE question_type_enum AS ENUM ('MCQ', 'SINGLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER');
CREATE TYPE test_attempt_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'AUTO_SUBMITTED');
CREATE TYPE user_type_enum AS ENUM ('USER', 'STUDENT');
CREATE TYPE upload_type_enum AS ENUM ('QUESTION_PAPER', 'STUDENTS');
CREATE TYPE upload_status_enum AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ============================================
-- MASTER TABLES
-- ============================================

-- Roles Master Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (role_name, role_code, description) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full access to all features including marks'),
('Admin', 'ADMIN', 'Full access except viewing marks/scores'),
('Student', 'STUDENT', 'Can only attempt tests');

-- Domains Master Table
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    domain_name VARCHAR(100) NOT NULL UNIQUE,
    domain_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Intern Status Master Table
CREATE TABLE intern_status (
    id SERIAL PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default intern statuses (matching frontend: Active, Pending, Inactive, Selected, Not Selected)
INSERT INTO intern_status (status_name, status_code, description) VALUES
('Active', 'ACTIVE', 'Intern is active'),
('Pending', 'PENDING', 'Intern registration pending'),
('Inactive', 'INACTIVE', 'Intern is inactive'),
('Selected', 'SELECTED', 'Intern has been selected'),
('Not Selected', 'NOT_SELECTED', 'Intern has not been selected'),
('Registered', 'REGISTERED', 'Intern has registered but not started test'),
('In Progress', 'IN_PROGRESS', 'Intern is currently taking the test'),
('Completed', 'COMPLETED', 'Intern has completed the test');

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- Users Table (for Super Admin and Admin)
-- Note: Currently uses OTP-based authentication (no password required)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    full_name VARCHAR(255),
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- OTP Verifications Table (for email OTP authentication)
CREATE TABLE otp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students/Interns Table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    domain_id INT,
    status_id INT DEFAULT 1, -- Default: REGISTERED
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    form_link_token VARCHAR(100) UNIQUE, -- For form link registration
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NULL,
    FOREIGN KEY (domain_id) REFERENCES domains(id),
    FOREIGN KEY (status_id) REFERENCES intern_status(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- QUESTION PAPER MANAGEMENT TABLES
-- ============================================

-- Question Papers Table
CREATE TABLE question_papers (
    id SERIAL PRIMARY KEY,
    paper_name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100), -- Added: matches frontend
    year VARCHAR(10), -- Added: matches frontend (e.g., '2024')
    semester VARCHAR(50), -- Added: matches frontend (e.g., 'Spring', 'Fall')
    total_questions INT DEFAULT 0,
    total_weightage INT DEFAULT 0, -- Maps to maxMarks in frontend
    duration_minutes INT DEFAULT 60, -- Maps to duration in frontend
    status question_paper_status DEFAULT 'draft', -- Added: matches frontend status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Questions Table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_paper_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type question_type_enum DEFAULT 'MCQ',
    -- Mapping: 'multiple-choice' -> 'MULTIPLE_SELECT', 'single-choice' -> 'SINGLE_CHOICE', 'true-false' -> 'TRUE_FALSE', 'short-answer' -> 'SHORT_ANSWER'
    weightage INT DEFAULT 1,
    correct_answer TEXT NULL, -- Added: for short-answer questions (matches frontend correctAnswer)
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    updated_by INT NULL,
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Question Options Table
CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    option_label VARCHAR(10) NOT NULL, -- A, B, C, D, etc.
    is_correct BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ============================================
-- TEST ATTEMPT TABLES
-- ============================================

-- Test Attempts Table
CREATE TABLE test_attempts (
    id SERIAL PRIMARY KEY,
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
    status test_attempt_status DEFAULT 'IN_PROGRESS',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id)
);

-- Student Answers Table
CREATE TABLE student_answers (
    id SERIAL PRIMARY KEY,
    test_attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NULL, -- For MCQ/Single/Multiple choice questions
    selected_option_ids TEXT NULL, -- JSON array for MULTIPLE_SELECT questions (stores multiple option IDs)
    answer_text TEXT NULL, -- For SHORT_ANSWER questions (matches frontend)
    is_correct BOOLEAN DEFAULT FALSE,
    score_obtained DECIMAL(10,2) DEFAULT 0.00,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (selected_option_id) REFERENCES question_options(id),
    UNIQUE (test_attempt_id, question_id)
);

-- ============================================
-- AUDIT & LOGGING TABLES
-- ============================================

-- Activity Logs Table (Enhanced for comprehensive admin activity tracking)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NULL,
    user_type user_type_enum NOT NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'CREATE_ADMIN', 'UPDATE_USER', 'DELETE_QUESTION_PAPER'
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'USER', 'QUESTION_PAPER', 'STUDENT'
    entity_id INT NULL, -- ID of the affected entity
    description TEXT, -- Detailed description of the action
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE, PATCH
    request_path VARCHAR(255), -- API endpoint path
    request_body JSONB NULL, -- Request body (for POST/PUT/PATCH)
    response_status INT NULL, -- HTTP response status code
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- File Uploads Table
CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    upload_type upload_type_enum NOT NULL,
    status upload_status_enum DEFAULT 'PENDING',
    records_processed INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    error_message TEXT,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Roles indexes
CREATE INDEX idx_role_code ON roles(role_code);
CREATE INDEX idx_is_active_roles ON roles(is_active);

-- Domains indexes
CREATE INDEX idx_domain_code ON domains(domain_code);
CREATE INDEX idx_is_active_domains ON domains(is_active);

-- Intern status indexes
CREATE INDEX idx_status_code ON intern_status(status_code);

-- Users indexes
CREATE INDEX idx_email_users ON users(email);
CREATE INDEX idx_role_id ON users(role_id);
CREATE INDEX idx_is_active_users ON users(is_active);

-- OTP indexes
CREATE INDEX idx_email_otp ON otp_verifications(email);
CREATE INDEX idx_otp ON otp_verifications(otp);
CREATE INDEX idx_expires_at ON otp_verifications(expires_at);
CREATE INDEX idx_is_used ON otp_verifications(is_used);

-- Students indexes
CREATE INDEX idx_email_students ON students(email);
CREATE INDEX idx_domain_id ON students(domain_id);
CREATE INDEX idx_status_id ON students(status_id);
CREATE INDEX idx_form_link_token ON students(form_link_token);
CREATE INDEX idx_is_active_students ON students(is_active);

-- Question papers indexes
CREATE INDEX idx_is_active_papers ON question_papers(is_active);
CREATE INDEX idx_status_papers ON question_papers(status);
CREATE INDEX idx_subject ON question_papers(subject);
CREATE INDEX idx_year ON question_papers(year);
CREATE INDEX idx_created_by_papers ON question_papers(created_by);

-- Questions indexes
CREATE INDEX idx_question_paper_id ON questions(question_paper_id);
CREATE INDEX idx_question_type ON questions(question_type);
CREATE INDEX idx_display_order ON questions(display_order);
CREATE INDEX idx_is_active_questions ON questions(is_active);

-- Question options indexes
CREATE INDEX idx_question_id_options ON question_options(question_id);
CREATE INDEX idx_is_correct ON question_options(is_correct);
CREATE INDEX idx_display_order_options ON question_options(display_order);

-- Test attempts indexes
CREATE INDEX idx_student_id ON test_attempts(student_id);
CREATE INDEX idx_question_paper_id_attempts ON test_attempts(question_paper_id);
CREATE INDEX idx_status_attempts ON test_attempts(status);
CREATE INDEX idx_submitted_at ON test_attempts(submitted_at);

-- Student answers indexes
CREATE INDEX idx_test_attempt_id ON student_answers(test_attempt_id);
CREATE INDEX idx_question_id_answers ON student_answers(question_id);
CREATE INDEX idx_is_correct_answers ON student_answers(is_correct);

-- Activity logs indexes
CREATE INDEX idx_user_id_logs ON activity_logs(user_id);
CREATE INDEX idx_entity_type_id ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_created_at_logs ON activity_logs(created_at);
CREATE INDEX idx_action_logs ON activity_logs(action);
CREATE INDEX idx_user_type_logs ON activity_logs(user_type);
CREATE INDEX idx_created_at_desc_logs ON activity_logs(created_at DESC);

-- File uploads indexes
CREATE INDEX idx_upload_type ON file_uploads(upload_type);
CREATE INDEX idx_status_uploads ON file_uploads(status);
CREATE INDEX idx_uploaded_by ON file_uploads(uploaded_by);

-- Composite indexes
CREATE INDEX idx_students_domain_status ON students(domain_id, status_id, is_active);
CREATE INDEX idx_test_attempts_student_status ON test_attempts(student_id, status);
CREATE INDEX idx_questions_paper_active ON questions(question_paper_id, is_active, display_order);
CREATE INDEX idx_student_answers_attempt_question ON student_answers(test_attempt_id, question_id);

-- ============================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_papers_updated_at BEFORE UPDATE ON question_papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE VIEWS
-- ============================================

-- View: Student Test Summary (Enhanced to match frontend requirements)
CREATE VIEW vw_student_test_summary AS
SELECT 
    s.id AS student_id,
    s.email,
    s.full_name AS name, -- Maps to frontend 'name'
    s.phone,
    d.domain_name AS domain, -- Maps to frontend 'domain'
    ist.status_name AS status, -- Maps to frontend 'status' (Active, Pending, Inactive)
    ist.status_name AS selectionStatus, -- Maps to frontend 'selectionStatus' (Selected, Not Selected)
    s.registration_date AS registeredDate, -- Maps to frontend 'registeredDate'
    MAX(ta.percentage_score) AS aptitudeScore, -- Maps to frontend 'aptitudeScore'
    CASE 
        WHEN MAX(ta.id) IS NULL THEN 'Pending'
        WHEN MAX(ta.status::text) = 'COMPLETED' OR MAX(ta.status::text) = 'AUTO_SUBMITTED' THEN 'Completed'
        WHEN MAX(ta.status::text) = 'IN_PROGRESS' THEN 'In Progress'
        ELSE 'Pending'
    END AS aptitudeStatus, -- Maps to frontend 'aptitudeStatus'
    COUNT(DISTINCT ta.id) AS total_attempts,
    MAX(ta.submitted_at) AS last_attempt_date
FROM students s
LEFT JOIN domains d ON s.domain_id = d.id
LEFT JOIN intern_status ist ON s.status_id = ist.id
LEFT JOIN test_attempts ta ON s.id = ta.student_id
GROUP BY s.id, s.email, s.full_name, s.phone, d.domain_name, ist.status_name, s.registration_date;

-- View: Question Paper Details (Enhanced to match frontend requirements)
CREATE VIEW vw_question_paper_details AS
SELECT 
    qp.id,
    qp.paper_name AS name, -- Maps to frontend 'name'
    qp.description,
    qp.subject, -- Maps to frontend 'subject'
    qp.year, -- Maps to frontend 'year'
    qp.semester, -- Maps to frontend 'semester'
    qp.total_questions AS totalQuestions, -- Maps to frontend 'totalQuestions'
    qp.duration_minutes AS duration, -- Maps to frontend 'duration'
    qp.total_weightage AS maxMarks, -- Maps to frontend 'maxMarks'
    qp.status, -- Maps to frontend 'status' (draft, published)
    qp.created_at AS createdAt, -- Maps to frontend 'createdAt'
    COUNT(DISTINCT q.id) AS actual_questions_count,
    COUNT(DISTINCT ta.id) AS total_attempts,
    COUNT(DISTINCT ta.student_id) AS unique_students_attempted
FROM question_papers qp
LEFT JOIN questions q ON qp.id = q.question_paper_id AND q.is_active = TRUE
LEFT JOIN test_attempts ta ON qp.id = ta.question_paper_id
WHERE qp.is_active = TRUE
GROUP BY qp.id, qp.paper_name, qp.description, qp.subject, qp.year, qp.semester, 
         qp.total_questions, qp.total_weightage, qp.duration_minutes, qp.status, qp.created_at;

-- ============================================
-- STORED PROCEDURES (Optional - for complex operations)
-- ============================================

CREATE OR REPLACE FUNCTION sp_calculate_test_score(attempt_id_param INT)
RETURNS VOID AS $$
DECLARE
    total_score_val DECIMAL(10,2);
    max_score_val DECIMAL(10,2);
    percentage_val DECIMAL(5,2);
    questions_count_val INT;
    attempted_count_val INT;
BEGIN
    -- Calculate total score and max possible score
    SELECT 
        COALESCE(SUM(sa.score_obtained), 0),
        COALESCE(SUM(q.weightage), 0),
        COUNT(DISTINCT q.id),
        COUNT(DISTINCT sa.id)
    INTO total_score_val, max_score_val, questions_count_val, attempted_count_val
    FROM test_attempts ta
    JOIN questions q ON ta.question_paper_id = q.question_paper_id AND q.is_active = TRUE
    LEFT JOIN student_answers sa ON ta.id = sa.test_attempt_id AND q.id = sa.question_id
    WHERE ta.id = attempt_id_param;
    
    -- Calculate percentage
    IF max_score_val > 0 THEN
        percentage_val := (total_score_val / max_score_val) * 100;
    ELSE
        percentage_val := 0;
    END IF;
    
    -- Update test attempt
    UPDATE test_attempts
    SET 
        total_score = total_score_val,
        max_possible_score = max_score_val,
        percentage_score = percentage_val,
        total_questions = questions_count_val,
        questions_attempted = attempted_count_val,
        submitted_at = NOW(),
        status = CASE 
            WHEN auto_submitted = TRUE THEN 'AUTO_SUBMITTED'::test_attempt_status
            ELSE 'COMPLETED'::test_attempt_status
        END
    WHERE id = attempt_id_param;
    
    -- Update student status if completed
    UPDATE students s
    SET status_id = 3 -- COMPLETED status
    FROM test_attempts ta
    WHERE ta.id = attempt_id_param 
      AND s.id = ta.student_id 
      AND s.status_id = 1; -- Only if currently REGISTERED
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- END OF SCHEMA
-- ============================================