-- Migration: Add domain support to question papers
-- This allows question papers to be assigned to specific domains
-- Multiple domains can share the same question paper (e.g., MERN and React)

-- Create junction table for many-to-many relationship between question papers and domains
CREATE TABLE IF NOT EXISTS question_paper_domains (
    id SERIAL PRIMARY KEY,
    question_paper_id INT NOT NULL,
    domain_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE (question_paper_id, domain_id)
);

CREATE INDEX idx_question_paper_domains_question_paper_id
  ON question_paper_domains (question_paper_id);

CREATE INDEX idx_question_paper_domains_domain_id
  ON question_paper_domains (domain_id);

-- Create table for manual test assignments (assign specific tests to specific students)
CREATE TABLE IF NOT EXISTS test_assignments (
    id SERIAL PRIMARY KEY,
    question_paper_id INT NOT NULL,
    student_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (question_paper_id) REFERENCES question_papers(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE (question_paper_id, student_id)
);
CREATE INDEX idx_test_assignments_question_paper_id
  ON test_assignments (question_paper_id);

CREATE INDEX idx_test_assignments_student_id
  ON test_assignments (student_id);

CREATE INDEX idx_test_assignments_is_active
  ON test_assignments (is_active);
