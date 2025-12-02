-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20),
    institute_name VARCHAR(255),
    course_taken VARCHAR(255),
    area_of_interests TEXT,
    internship_start_date DATE,
    internship_end_date DATE,
    reference_information TEXT,
    photograph_url TEXT,
    internal_faculty_name VARCHAR(255),
    faculty_contact VARCHAR(20),
    faculty_email VARCHAR(255),
    is_selected BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_is_active ON candidates(is_active);
CREATE INDEX IF NOT EXISTS idx_candidates_is_selected ON candidates(is_selected);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at);

