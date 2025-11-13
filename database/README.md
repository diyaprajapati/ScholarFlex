# ScholarFlex Database Schema

## Overview
This database schema is designed for an Intern Management System with role-based access control.

## Roles
1. **Super Admin** - Full access including viewing marks/scores
2. **Admin** - Full access except viewing marks/scores
3. **Student** - Can only attempt tests

## Database Structure

### Master Tables
- `roles` - User roles (Super Admin, Admin, Student)
- `domains` - Intern domains (Web Development, Data Science, etc.)
- `intern_status` - Status tracking (Registered, In Progress, Completed, Selected, Rejected)

### User Management
- `users` - Super Admin and Admin accounts
- `students` - Intern/Student records

### Question Management
- `question_papers` - Test papers
- `questions` - Individual questions
- `question_options` - Answer options for each question

### Test Management
- `test_attempts` - Student test attempts
- `student_answers` - Answers submitted by students

### Supporting Tables
- `activity_logs` - Audit trail
- `file_uploads` - Track JSON file imports

## Key Features

### 1. Role-Based Access
- Role-based permissions enforced at application level
- Admin cannot see marks (application-level restriction)

### 2. Test Attempts
- Tracks start time, submission time, and auto-submission
- Calculates scores based on question weightage
- Supports multiple attempts per student

### 3. Scoring System
- Weighted scoring based on question weightage
- Automatic score calculation via stored procedure
- Percentage and absolute scores tracked

### 4. Data Integrity
- Foreign key constraints
- Unique constraints on emails
- Cascade deletes for related records

## Installation

1. Create database:
```sql
CREATE DATABASE scholarflex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scholarflex;
```

2. Run schema:
```bash
mysql -u username -p scholarflex < schema.sql
```

## Views

- `vw_student_test_summary` - Student performance summary
- `vw_question_paper_details` - Question paper statistics

## Stored Procedures

- `sp_calculate_test_score(attempt_id)` - Calculate and update test scores

## Notes

- All timestamps use `TIMESTAMP` type
- Email addresses are unique across users and students
- Soft deletes using `is_active` flag
- Audit trail maintained via `activity_logs`
- Form link tokens for student self-registration

