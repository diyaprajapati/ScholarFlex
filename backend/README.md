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

## Project Structure

```

## Development Notes

- OTP expires in 10 minutes (configurable)
- JWT tokens expire in 7 days (configurable)
- In development mode, if email fails, OTP is returned in response
- All routes are prefixed with `/api`

```
