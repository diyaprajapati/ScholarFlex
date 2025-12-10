# ScholarFlex Backend API

Node.js and Express backend for ScholarFlex application with OTP-based authentication.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ScholarFlex/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:

- Express.js - Web framework
- Prisma - ORM for database management
- PostgreSQL client (pg)
- JWT - Token-based authentication
- Nodemailer - Email service
- Multer - File upload handling
- XLSX - Excel/CSV parsing
- And other dependencies

### Step 3: Environment Configuration

Create a `.env` file in the backend directory:

```bash
# On Windows (PowerShell)
copy .env.example .env

# On Linux/Mac
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
# Example for Aiven/Cloud PostgreSQL:
# DATABASE_URL=postgresql://user:pass@host.aivencloud.com:12345/defaultdb?sslmode=require

# Alternative Database Configuration (if not using DATABASE_URL)
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=scholarflex
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# OTP Configuration
OTP_EXPIRE_MINUTES=10
OTP_LENGTH=6

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=ScholarFlex <noreply@scholarflex.com>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# YouTube Data API v3 Configuration (for playlist import)
# Get your API key from: https://console.cloud.google.com/apis/credentials
# Enable "YouTube Data API v3" in Google Cloud Console
YOUTUBE_DATA_API_KEY=your-youtube-api-key-here
```

### Step 4: Database Setup

#### Option A: Using Prisma (Recommended)

1. **Generate Prisma Client:**

   ```bash
   npm run prisma:generate
   ```

2. **Push database schema:**

   ```bash
   npm run prisma:db:push
   ```

3. **Seed the database with initial data:**

   ```bash
   npm run db:seed
   ```

4. **Create required database functions and enums:**
   ```bash
   npm run db:create-enums
   npm run db:create-function
   ```

#### Option B: Using SQL Scripts

1. **Create PostgreSQL database:**

   ```sql
   CREATE DATABASE scholarflex;
   ```

2. **Run the schema:**

   ```bash
   psql -U postgres -d scholarflex -f ../database/postgresql.sql
   ```

3. **Run migrations (if any):**

   ```bash
   npm run db:migrate
   ```

4. **Seed the database:**
   ```bash
   npm run db:seed
   ```

### Step 5: Email Configuration (Gmail)

For Gmail SMTP, you need to:

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Use the App Password** in your `.env` file as `EMAIL_PASS`

### Step 6: Run the Server

**Development mode** (with auto-reload using nodemon):

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in your `.env` file).

### Step 7: Verify Installation

1. **Check server health:**

   ```bash
   curl http://localhost:5000/health
   ```

2. **Verify database connection:**

   ```bash
   npm run db:check
   ```

3. **Open Prisma Studio** (optional, for database GUI):
   ```bash
   npm run prisma:studio
   ```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:db:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with initial data
- `npm run db:check` - Check database connection
- `npm run db:create-enums` - Create required enum types
- `npm run db:create-function` - Create stored procedures

## Troubleshooting

### Database Connection Issues

If you encounter SSL certificate errors:

- The database configuration in `config/database.js` handles SSL certificates automatically
- For self-signed certificates, `rejectUnauthorized: false` is set

### Port Already in Use

If port 5000 is already in use:

- Change the `PORT` in your `.env` file
- Or kill the process using port 5000:

  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F

  # Linux/Mac
  lsof -ti:5000 | xargs kill
  ```

### Prisma Client Generation Issues

If you see Prisma client errors:

```bash
npm run prisma:generate
```

## Features

- ✅ OTP-based email authentication
- ✅ JWT token-based session management
- ✅ PostgreSQL database integration with Prisma ORM
- ✅ Email service for sending OTPs
- ✅ Role-based access control (Super Admin, Admin, Student)
- ✅ Error handling middleware
- ✅ CORS enabled for frontend integration
- ✅ Activity logging
- ✅ File upload support (Excel/CSV for intern management)
- ✅ Dashboard statistics API
- ✅ Question paper management
- ✅ Test attempt tracking and scoring

## API Documentation

For detailed API documentation, see the sections below:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication

#### Send OTP

```
POST /api/auth/send-otp
Body: { "email": "user@example.com" }
```

#### Verify OTP

```
POST /api/auth/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
Response: { "success": true, "token": "...", "user": {...} }
```

#### Get Current User

```
GET /api/auth/me
Headers: { "Authorization": "Bearer <token>" }
```

#### Logout

```
POST /api/auth/logout
Headers: { "Authorization": "Bearer <token>" }
```

### Create Admin (Super admin only)

POST /api/admin/create
Headers: { "Authorization": Bearer <super_admin_token>,
"Content-Type": application/json }
Body:
{
"email": "admin@example.com",
"full_name": "Admin User",
"role_code": "ADMIN"
}

### Get all admins (Super admin only)

GET /api/admin/all
Headers: { "Authorization": Bearer <super_admin_token> }

### Get admin by ID (Super admin only)

GET /api/admin/:id
Headers: { "Authorization": Bearer <super_admin_token> }

### Update admin (supar admin only)

PUT /api/admin/:id
Headers: { "Authorization": Bearer <super_admin_token>,
"Content-Type": application/json }
Body:
{
"full_name": "Updated Admin Name",
"is_active": true
}

### Delete admin (super admin only)

DELETE /api/admin/:id
Headers: { "Authorization": Bearer <super_admin_token> }

### Interns Management (Admin and Super Admin)

#### Upload Spreadsheet to Bulk Insert Interns

```
POST /api/interns/upload
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
Body: FormData with 'file' field (Excel .xlsx/.xls or CSV file)
```

**Required Spreadsheet Columns:**

- First Name
- Middle Name (optional)
- Last Name
- Email
- Mobile Number (WhatsApp) (optional)
- Area of Interests (will be mapped to Domain)

**Response:**

```json
{
  "success": true,
  "message": "Successfully processed 95 students",
  "data": {
    "total": 100,
    "successful": 95,
    "skipped": 3,
    "failed": 2,
    "details": {
      "successful": [...],
      "skipped": [...],
      "failed": [...]
    }
  }
}
```

**Notes:**

- Maximum file size: 10MB
- Supported formats: Excel (.xlsx, .xls) and CSV
- **Duplicate Prevention:**
  - Duplicate emails within the spreadsheet are automatically detected and skipped
  - Emails that already exist in the database are automatically skipped
  - All email checks are case-insensitive (e.g., "John@Example.com" and "john@example.com" are treated as duplicates)
- Domains are automatically created if they don't exist
- Only Name, Email, and Domain are displayed on the website (other data is stored in database)

#### Get All Interns

```
GET /api/interns
Headers: { "Authorization": "Bearer <token>" }
Query Parameters (optional):
  - domain_id: Filter by domain ID
  - status_id: Filter by status ID
  - limit: Limit number of results
  - offset: Offset for pagination
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "domain": "Web Development",
      "status": "Registered",
      "registration_date": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

#### Get Intern by ID

```
GET /api/interns/:id
Headers: { "Authorization": "Bearer <token>" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "domain": "Web Development",
    "phone": "+1234567890",
    "status": "Registered",
    "registration_date": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Intern

```
PUT /api/interns/:id
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "full_name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+1234567890",
  "domain_name": "Web Development",  // Optional: domain name (will be resolved to domain_id)
  "domain_id": 1,                     // Optional: domain ID (alternative to domain_name)
  "status_name": "Active",            // Optional: status name (will be resolved to status_id)
  "status_id": 1                      // Optional: status ID (alternative to status_name)
}
```

**Response:**

```json
{
  "success": true,
  "message": "Intern updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Name",
    "email": "updated@example.com",
    "domain": "Web Development",
    "phone": "+1234567890",
    "status": "Active",
    "registration_date": "2024-01-15T10:30:00Z"
  }
}
```

**Notes:**

- You can provide either `domain_name` or `domain_id` (domain_name will be resolved automatically)
- You can provide either `status_name` or `status_id` (status_name will be resolved automatically)
- If domain doesn't exist, it will be created automatically
- All fields except `id` are optional
- **Duplicate Prevention:** If updating email, the system will check if the new email already exists for another intern (case-insensitive check). If it does, the update will fail with an error message.

#### Delete Intern

```
DELETE /api/interns/:id
Headers: { "Authorization": "Bearer <token>" }
```

**Response:**

```json
{
  "success": true,
  "message": "Intern deleted successfully"
}
```

**Notes:**

- This is a **hard delete** - the intern record is permanently removed from the database
- This action cannot be undone
- Related test attempts and student answers are also deleted automatically

### Domains

#### Get All Domains

```
GET /api/domains
Headers: { "Authorization": "Bearer <token>" }
```

**Response:**

```json
{
  "success": true,
  "message": "Domains retrieved successfully",
  "data": [
    {
      "id": 1,
      "domain_name": "MERN Stack",
      "domain_code": "MERN",
      "description": "MongoDB, Express, React, Node"
    }
  ]
}
```

**Notes:**

- Accessible to Admin, Super Admin, and Student roles
- Only returns active domains
- Use when creating question papers or assigning students

### Question Papers Management (Admin and Super Admin)

#### Get All Question Papers

```
GET /api/question-papers
Headers: {
  "Authorization": "Bearer <token>"
}
Query Parameters (optional):
- status: Filter by status (draft, published)
- subject: Filter by subject
- year: Filter by year
- semester: Filter by semester
- limit: Limit number of results
- offset: Offset for pagination
```

**Response:**

```json
{
  "success": true,
  "message": "Question papers retrieved successfully",
  "data": [
    {
      "id": 1,
      "paper_name": "JavaScript Fundamentals Test",
      "description": "Basic JavaScript concepts test",
      "subject": "JavaScript",
      "year": "2024",
      "semester": "Spring",
      "total_questions": 3,
      "total_weightage": 8,
      "duration_minutes": 60,
      "status": "draft",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

#### Get Question Paper by ID

```
GET /api/question-papers/:id
Headers: {
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question paper retrieved successfully",
  "data": {
    "id": 1,
    "paper_name": "JavaScript Fundamentals Test",
    "description": "Basic JavaScript concepts test",
    "subject": "JavaScript",
    "year": "2024",
    "semester": "Spring",
    "total_questions": 3,
    "total_weightage": 8,
    "duration_minutes": 60,
    "status": "draft",
    "questions": [
      {
        "id": 1,
        "text": "What is the capital of France?",
        "type": "multiple-choice",
        "weightage": 2,
        "options": ["London", "Paris", "Berlin", "Madrid"],
        "correctOptions": [1]
      }
    ]
  }
}
```

#### Create Question Paper from JSON

```
POST /api/question-papers
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "paper_name": "JavaScript Fundamentals Test",
  "description": "Basic JavaScript concepts test",
  "subject": "JavaScript",
  "year": "2024",
  "semester": "Spring",
  "duration_minutes": 60,
  "status": "draft",
  "domain_ids": [1, 2],
  "questions": [
    {
      "text": "What is the capital of France?",
      "type": "multiple-choice",
      "weightage": 2,
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctOptions": [1]
    },
    {
      "text": "JavaScript is a programming language.",
      "type": "true-false",
      "weightage": 1,
      "options": ["True", "False"],
      "correctOptions": [0]
    },
    {
      "text": "Explain the concept of closures in JavaScript.",
      "type": "short-answer",
      "weightage": 5,
      "correctAnswer": "A closure is a function that has access to variables in its outer scope even after the outer function has returned."
    }
  ]
}
```

**Required Fields:**

- `paper_name` - Name of the question paper
- `questions` - Array of question objects (must not be empty)

**Question Object Required Fields:**

- `text` - Question text
- `type` - Question type: `"multiple-choice"`, `"single-choice"`, `"true-false"`, or `"short-answer"`
- `weightage` - Points/weightage for the question (optional, defaults to 1)

**Question Type Specific Fields:**

- For `multiple-choice`, `single-choice`, and `true-false`:
  - `options` - Array of option strings (required)
  - `correctOptions` - Array of indices indicating correct options (required, 0-based)
- For `short-answer`:
  - `correctAnswer` - The correct answer text (required)

**Optional Fields:**

- `description` - Description of the question paper
- `subject` - Subject name
- `year` - Year (e.g., "2024")
- `semester` - Semester (e.g., "Spring", "Fall")
- `duration_minutes` - Duration in minutes (defaults to 60)
- `status` - Status: `"draft"` or `"published"` (defaults to "draft")
- `domain_ids` - Array of domain IDs to assign this paper to (e.g., [1, 2] for MERN and React domains)

**Response:**

```json
{
  "success": true,
  "message": "Question paper created successfully",
  "data": {
    "id": 1,
    "paper_name": "JavaScript Fundamentals Test",
    "description": "Basic JavaScript concepts test",
    "subject": "JavaScript",
    "year": "2024",
    "semester": "Spring",
    "total_questions": 3,
    "total_weightage": 8,
    "duration_minutes": 60,
    "status": "draft",
    "created_at": "2024-01-15T10:30:00Z",
    "questions": [
      {
        "id": 1,
        "question_text": "What is the capital of France?",
        "question_type": "MULTIPLE_SELECT",
        "weightage": 2,
        "options": [
          {
            "id": 1,
            "option_text": "London",
            "option_label": "A",
            "is_correct": false
          },
          {
            "id": 2,
            "option_text": "Paris",
            "option_label": "B",
            "is_correct": true
          }
        ]
      }
    ]
  }
}
```

**Notes:**

- Question types are mapped as follows:
  - `"multiple-choice"` → `MULTIPLE_SELECT` (allows multiple correct answers)
  - `"single-choice"` → `SINGLE_CHOICE` (single correct answer)
  - `"true-false"` → `TRUE_FALSE`
  - `"short-answer"` → `SHORT_ANSWER`
- Options are automatically labeled as A, B, C, D, etc.
- `total_questions` and `total_weightage` are automatically calculated from the questions array
- `domain_ids` allows assigning the same question paper to multiple domains (e.g., MERN and React can share the same paper)
- All operations are logged in the activity logs

#### Update Question Paper

```
PUT /api/question-papers/:id
Headers: {
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
Body: {
  "paper_name": "Updated JavaScript Fundamentals Test",
  "description": "Updated description",
  "subject": "JavaScript",
  "year": "2024",
  "semester": "Spring",
  "duration_minutes": 90,
  "status": "published",
  "domain_ids": [1, 2],
  "questions": [
    {
      "id": 1,
      "text": "Updated question text",
      "type": "multiple-choice",
      "weightage": 3,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptions": [1]
    },
    {
      "text": "New question",
      "type": "true-false",
      "weightage": 1,
      "options": ["True", "False"],
      "correctOptions": [0]
    }
  ]
}
```

**Notes:**

- Questions with `id` field will be updated
- Questions without `id` field will be added as new questions
- Questions not included in the array will be soft-deleted
- All fields except `id` are optional
- `domain_ids` can be updated to change domain assignments

**Response:**

```json
{
  "success": true,
  "message": "Question paper updated successfully",
  "data": {
    "id": 1,
    "paper_name": "Updated JavaScript Fundamentals Test",
    "questions": [...]
  }
}
```

#### Delete Question Paper

```
DELETE /api/question-papers/:id
Headers: {
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Question paper deleted successfully"
}
```

**Notes:**

- This is a **soft delete** - the question paper is marked as inactive
- Related questions and options are also soft-deleted
- The action is logged in activity logs

### Student Test Management

#### Get Available Tests for Student

```
GET /api/student/tests
Headers: {
  "Authorization": "Bearer <student_token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Tests retrieved successfully",
  "data": [
    {
      "id": 1,
      "paper_name": "JavaScript Fundamentals Test",
      "description": "Basic JavaScript concepts test",
      "subject": "JavaScript",
      "year": "2024",
      "semester": "Spring",
      "total_questions": 3,
      "total_weightage": 8,
      "duration_minutes": 60,
      "status": "published",
      "is_attempted": false,
      "attempt_id": null,
      "attempt_status": null,
      "attempt_score": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Notes:**

- Returns tests assigned to the student's domain
- Also includes manually assigned tests
- Shows attempt status if student has already taken the test
- Only returns published tests

#### Start Test Attempt (Student)

```
POST /api/student/tests/:testId/start
Headers: {
  "Authorization": "Bearer <student_token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test attempt started successfully",
  "data": {
    "attempt_id": 15,
    "duration_minutes": 60
  }
}
```

**Notes:**

- Creates (or resumes) an `IN_PROGRESS` attempt for the student
- Validates that the test is published and assigned to the student's domain or manually
- Returns the attempt ID used for submitting answers

#### Get Test Details (Student)

```
GET /api/student/tests/:testId/details
Headers: {
  "Authorization": "Bearer <student_token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "paper_name": "JavaScript Fundamentals Test",
    "duration_minutes": 60,
    "total_questions": 3,
    "questions": [
      {
        "id": 10,
        "text": "What is the capital of France?",
        "type": "multiple-choice",
        "weightage": 2,
        "options": ["London", "Paris", "Berlin", "Madrid"]
      }
    ]
  }
}
```

**Notes:**

- Returns sanitized questions (no correct answers)
- Used by the student test page to render the actual question paper

#### Get Next Question for Adaptive Testing

```
GET /api/student/test-attempts/:testAttemptId/next-question
Headers: {
  "Authorization": "Bearer <student_token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "question": {
      "id": 1,
      "text": "What is the capital of France?",
      "type": "multiple-choice",
      "weightage": 2,
      "options": [
        {
          "id": 1,
          "text": "London",
          "label": "A",
          "is_correct": false
        },
        {
          "id": 2,
          "text": "Paris",
          "label": "B",
          "is_correct": true
        }
      ]
    },
    "progress": {
      "current_marks": 2,
      "total_marks": 8,
      "questions_answered": 1,
      "total_questions": 3
    }
  }
}
```

**Adaptive Testing Logic:**

- **First question**: Always starts with the lowest marks (easiest question)
- **After correct answer**: Moves to a harder question (higher marks)
- **After wrong answer**: Goes back to an easier question (lower marks)
- **Test completion**: When all questions are answered or total marks reached, returns `test_complete: true`

**Notes:**

- Questions are sorted by weightage (marks) - lower marks = easier, higher marks = harder
- The system adapts based on student's performance
- Test continues until student completes total marks of the test paper

#### Submit Test

```
POST /api/student/test-attempts/:attemptId/submit
Headers: {
  "Authorization": "Bearer <student_token>",
  "Content-Type": "application/json"
}
Body: {
  "answers": [
    { "question_id": 10, "selected_option_index": 1 },
    { "question_id": 11, "selected_option_indexes": [0, 2] },
    { "question_id": 12, "answer_text": "Closures capture outer scope variables." }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "id": 15,
    "status": "COMPLETED",
    "total_score": 24,
    "max_possible_score": 30,
    "percentage_score": 80,
    "submitted_at": "2024-01-15T11:45:00Z",
    "paper_name": "JavaScript Fundamentals Test"
  }
}
```

**Notes:**

- Stores each answer in `student_answers`, calculates score per question, and finalizes the attempt
- Invokes the scoring procedure to update totals and status
- Returns a summary used by the student submission page

### Test Attempts (Admin and Super Admin)

#### Get All Test Attempts

```
GET /api/test-attempts
Headers: {
  "Authorization": "Bearer <token>"
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "student_name": "Jane Doe",
      "student_email": "jane@example.com",
      "domain_name": "MERN Stack",
      "paper_name": "JavaScript Fundamentals Test",
      "status": "COMPLETED",
      "total_score": 24,
      "max_possible_score": 30,
      "percentage_score": 80,
      "submitted_at": "2024-01-15T11:45:00Z"
    }
  ]
}
```

**Notes:**

- Available to Admin and Super Admin roles
- Shows all attempts, including auto-submitted ones
- Can be filtered client-side to analyze performance by domain or paper

## Project Structure

```

## Development Notes

- OTP expires in 10 minutes (configurable)
- JWT tokens expire in 1 hour (configurable via JWT_EXPIRE environment variable)
- In development mode, if email fails, OTP is returned in response
- All routes are prefixed with `/api`
- File uploads are limited to 10MB for spreadsheet uploads
- Intern spreadsheet upload supports Excel (.xlsx, .xls) and CSV formats

```
