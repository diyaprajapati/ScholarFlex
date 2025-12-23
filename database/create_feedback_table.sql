-- Create internship feedback table
CREATE TABLE IF NOT EXISTS internship_feedback (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    learning_experience TEXT,
    content_quality INTEGER CHECK (content_quality >= 1 AND content_quality <= 5),
    mentor_support INTEGER CHECK (mentor_support >= 1 AND mentor_support <= 5),
    platform_usability INTEGER CHECK (platform_usability >= 1 AND platform_usability <= 5),
    suggestions TEXT,
    would_recommend BOOLEAN,
    additional_comments TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT unique_student_feedback UNIQUE (student_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_student_id ON internship_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at ON internship_feedback(submitted_at);

