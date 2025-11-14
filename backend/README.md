# ScholarFlex Backend API

Node.js and Express backend for ScholarFlex application with OTP-based authentication.

## Features

- ✅ OTP-based email authentication
- ✅ JWT token-based session management
- ✅ MySQL database integration
- ✅ Email service for sending OTPs
- ✅ Role-based access control
- ✅ Error handling middleware
- ✅ CORS enabled for frontend integration

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

**Note:** The following packages are required for intern spreadsheet upload functionality:

- `multer` - For handling file uploads
- `xlsx` - For parsing Excel and CSV files

These should be installed automatically when you run `npm install`, but if you encounter issues, you can install them manually:

```bash
npm install multer xlsx
```

### 2. Environment Configuration

Create a `.env` file in the backend directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=scholarflex
DB_PORT=3306

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
```

### 3. Database Setup

1. Create MySQL database:

```sql
CREATE DATABASE scholarflex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Run the schema:

```bash
mysql -u root -p scholarflex < ../database/schema.sql
```

### 4. Email Configuration (Gmail)

For Gmail, you need to:

1. Enable 2-Step Verification
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

### 5. Run the Server

Development mode (with auto-reload):

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

### Question Papers Management (Admin and Super Admin)

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
- All operations are logged in the activity logs

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
