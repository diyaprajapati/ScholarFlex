# Admin Management & Activity Logs API

## Overview

This API provides comprehensive admin management and activity logging features with role-based access control.

### Key Features:
- ✅ Super Admin can create new admins
- ✅ Comprehensive activity logging for all admin actions
- ✅ Super Admin can view all logs (including super admin logs)
- ✅ Admin can only view admin logs (cannot see super admin logs)
- ✅ All admin activities are automatically logged

---

## Admin Management Endpoints

### 1. Create Admin (Super Admin Only)

**POST** `/api/admin/create`

**Description:** Create a new admin user (only Super Admin can create admins)

**Headers:**
```
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "admin@example.com",
  "full_name": "Admin User",
  "role_code": "ADMIN"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Admin created successfully",
  "admin": {
    "id": 2,
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "ADMIN",
    "role_name": "Admin"
  }
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

---

### 2. Get All Admins (Super Admin Only)

**GET** `/api/admin/all`

**Description:** Get list of all admins (Super Admin and Admin users)

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "admins": [
    {
      "id": 1,
      "email": "superadmin@scholarflex.com",
      "full_name": "Super Admin",
      "role": "SUPER_ADMIN",
      "role_name": "Super Admin",
      "is_active": true,
      "last_login_at": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "email": "admin@example.com",
      "full_name": "Admin User",
      "role": "ADMIN",
      "role_name": "Admin",
      "is_active": true,
      "last_login_at": null,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Admin by ID (Super Admin Only)

**GET** `/api/admin/:id`

**Description:** Get admin details by ID

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "admin": {
    "id": 2,
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "ADMIN",
    "role_name": "Admin",
    "is_active": true,
    "last_login_at": null,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Update Admin (Super Admin Only)

**PUT** `/api/admin/:id`

**Description:** Update admin details (cannot update super admin)

**Headers:**
```
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "full_name": "Updated Admin Name",
  "is_active": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin updated successfully",
  "admin": {
    "id": 2,
    "email": "admin@example.com",
    "full_name": "Updated Admin Name",
    "role": "ADMIN",
    "role_name": "Admin",
    "is_active": true
  }
}
```

---

### 5. Delete Admin (Super Admin Only)

**DELETE** `/api/admin/:id`

**Description:** Soft delete admin (sets is_active = false, cannot delete super admin or yourself)

**Headers:**
```
Authorization: Bearer <super_admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Admin deleted successfully"
}
```

---

## Activity Logs Endpoints

### 1. Get Activity Logs

**GET** `/api/logs`

**Description:** Get activity logs with filters
- **Super Admin:** Can see all logs (including super admin logs)
- **Admin:** Can only see admin logs (super admin logs are excluded)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `user_type` (optional): Filter by user type (USER, STUDENT)
- `action` (optional): Filter by action (e.g., CREATE_ADMIN, LOGIN, LOGOUT)
- `entity_type` (optional): Filter by entity type (e.g., USER, QUESTION_PAPER)
- `start_date` (optional): Filter logs from this date (ISO format)
- `end_date` (optional): Filter logs until this date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example Request:**
```
GET /api/logs?action=CREATE_ADMIN&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "email": "superadmin@scholarflex.com",
        "name": "Super Admin",
        "role": "SUPER_ADMIN",
        "role_name": "Super Admin"
      },
      "user_type": "USER",
      "action": "CREATE_ADMIN",
      "entity_type": "USER",
      "entity_id": 2,
      "description": "superadmin@scholarflex.com created new admin: admin@example.com",
      "request_method": "POST",
      "request_path": "/api/admin/create",
      "response_status": 201,
      "ip_address": "127.0.0.1",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 2. Get Log by ID

**GET** `/api/logs/:id`

**Description:** Get specific log entry by ID
- **Super Admin:** Can view any log
- **Admin:** Cannot view super admin logs (403 error)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "log": {
    "id": 1,
    "user": {
      "id": 1,
      "email": "superadmin@scholarflex.com",
      "name": "Super Admin",
      "role": "SUPER_ADMIN",
      "role_name": "Super Admin"
    },
    "user_type": "USER",
    "action": "CREATE_ADMIN",
    "entity_type": "USER",
    "entity_id": 2,
    "description": "superadmin@scholarflex.com created new admin: admin@example.com",
    "request_method": "POST",
    "request_path": "/api/admin/create",
    "request_body": {
      "email": "admin@example.com",
      "full_name": "Admin User",
      "role_code": "ADMIN"
    },
    "response_status": 201,
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (403) - Admin trying to view super admin log:**
```json
{
  "success": false,
  "message": "Access denied. Cannot view super admin logs."
}
```

---

### 3. Get Log Statistics

**GET** `/api/logs/stats`

**Description:** Get log statistics (action breakdown, total counts)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `start_date` (optional): Filter from this date
- `end_date` (optional): Filter until this date

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_logs": 150,
    "action_breakdown": [
      {
        "action": "LOGIN",
        "count": "45"
      },
      {
        "action": "CREATE_ADMIN",
        "count": "12"
      },
      {
        "action": "VIEW_LOGS",
        "count": "30"
      }
    ]
  }
}
```

---

## Logged Actions

The following actions are automatically logged:

- `LOGIN` - User login
- `LOGOUT` - User logout
- `CREATE_ADMIN` - Create new admin
- `UPDATE_ADMIN` - Update admin details
- `DELETE_ADMIN` - Delete admin
- `VIEW_ADMINS` - View all admins
- `VIEW_ADMIN` - View specific admin
- `VIEW_LOGS` - View activity logs
- `VIEW_LOG` - View specific log entry
- `VIEW_LOG_STATS` - View log statistics

---

## Access Control Summary

| Action | Super Admin | Admin |
|--------|-------------|-------|
| Create Admin | ✅ | ❌ |
| View All Admins | ✅ | ❌ |
| Update Admin | ✅ | ❌ |
| Delete Admin | ✅ | ❌ |
| View All Logs | ✅ | ❌ (only admin logs) |
| View Super Admin Logs | ✅ | ❌ |
| View Admin Logs | ✅ | ✅ |

---

## Testing in Postman

### 1. Create Admin (as Super Admin)
```
POST http://localhost:5000/api/admin/create
Headers:
  Authorization: Bearer <super_admin_token>
  Content-Type: application/json
Body:
{
  "email": "newadmin@example.com",
  "full_name": "New Admin",
  "role_code": "ADMIN"
}
```

### 2. View All Logs (as Super Admin)
```
GET http://localhost:5000/api/logs?page=1&limit=50
Headers:
  Authorization: Bearer <super_admin_token>
```

### 3. View Logs (as Admin - will exclude super admin logs)
```
GET http://localhost:5000/api/logs?page=1&limit=50
Headers:
  Authorization: Bearer <admin_token>
```

### 4. View Log Statistics
```
GET http://localhost:5000/api/logs/stats
Headers:
  Authorization: Bearer <admin_token>
```

---

## Database Schema Update

The `activity_logs` table has been enhanced with:
- `request_method` - HTTP method (GET, POST, PUT, DELETE, PATCH)
- `request_path` - API endpoint path
- `request_body` - Request body (JSONB, excludes sensitive data)
- `response_status` - HTTP response status code

Run the updated schema to apply these changes:
```sql
-- The schema has been updated in postgresql.sql
-- Run the migration to add new columns
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS request_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS request_path VARCHAR(255),
ADD COLUMN IF NOT EXISTS request_body JSONB NULL,
ADD COLUMN IF NOT EXISTS response_status INT NULL;
```

