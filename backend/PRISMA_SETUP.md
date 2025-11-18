# Prisma Setup Guide

This guide explains how Prisma has been set up in the ScholarFlex backend and how to resolve SSL certificate issues.

## Overview

Prisma has been integrated into the project to provide better database management and type safety. The setup includes:

- **Prisma Client**: Type-safe database client
- **Prisma Schema**: Complete schema definition matching your PostgreSQL database
- **SSL Configuration**: Automatic handling of self-signed certificates

## Installation

If you haven't installed Prisma yet, run:

```bash
npm install prisma @prisma/client
```

## SSL Certificate Configuration

The setup automatically handles self-signed certificates. The configuration:

1. **For pg Pool**: Uses `rejectUnauthorized: false` to accept self-signed certificates
2. **For Prisma**: Automatically appends `?sslmode=no-verify` to the DATABASE_URL

### Manual SSL Configuration (Optional)

If you have a CA certificate file, place it at:
```
backend/config/certs/aiven-ca.pem
```

The system will automatically detect and use it for more secure connections.

### Environment Variable

Your `DATABASE_URL` in `.env` can be configured in two ways:

**Option 1: Let the system handle SSL automatically (Recommended)**
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

**Option 2: Manually specify SSL mode**
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=no-verify
```

## Prisma Commands

After installation, you can use these npm scripts:

```bash
# Generate Prisma Client (runs automatically after npm install)
npm run prisma:generate

# Create and apply a new migration
npm run prisma:migrate

# Deploy migrations (for production)
npm run prisma:migrate:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Format Prisma schema
npm run prisma:format

# Validate Prisma schema
npm run prisma:validate
```

## Using Prisma in Your Code

### Option 1: Use the exported Prisma Client

```javascript
const { prisma } = require('./config/database');

// Example: Find a user
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { role: true }
});

// Example: Create a student
const student = await prisma.student.create({
  data: {
    email: 'student@example.com',
    fullName: 'John Doe',
    domainId: 1,
    statusId: 1
  }
});
```

### Option 2: Use the alias

```javascript
const { db } = require('./config/database');

const users = await db.user.findMany();
```

### Option 3: Continue using the pool (backward compatible)

```javascript
const pool = require('./config/database');

const result = await pool.query('SELECT * FROM users');
```

## Database Schema

The Prisma schema (`prisma/schema.prisma`) includes all tables from your PostgreSQL database:

- **Master Tables**: Roles, Domains, InternStatus
- **User Management**: Users, OtpVerifications, Students
- **Question Papers**: QuestionPapers, Questions, QuestionOptions
- **Test Attempts**: TestAttempts, StudentAnswers
- **Audit & Logging**: ActivityLogs, FileUploads

## Migration Strategy

Since you already have an existing database, you have two options:

### Option 1: Use Prisma Migrate (Recommended for new features)

1. Make changes to `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create and apply migrations
3. Prisma will sync your schema with the database

### Option 2: Keep existing migrations, use Prisma for queries only

1. Continue using your existing SQL migrations
2. Update `prisma/schema.prisma` manually when database changes
3. Run `npm run prisma:generate` to regenerate the client

## Troubleshooting

### SSL Certificate Error

If you still see "self-signed certificate in certificate chain" errors:

1. Check that `DATABASE_URL` is set correctly in `.env`
2. Verify the SSL configuration in `config/database.js`
3. Try adding `?sslmode=no-verify` manually to your `DATABASE_URL`

### Prisma Client Not Generated

If you see errors about Prisma Client not being found:

```bash
npm run prisma:generate
```

### Schema Out of Sync

If your Prisma schema doesn't match your database:

1. Update `prisma/schema.prisma` to match your database structure
2. Run `npm run prisma:generate` to regenerate the client

## Next Steps

1. **Install dependencies**: `npm install`
2. **Generate Prisma Client**: `npm run prisma:generate`
3. **Test the connection**: Start your server and check for connection success messages
4. **Gradually migrate**: Start using Prisma in new code while keeping existing pool queries

## Benefits of Using Prisma

- ✅ **Type Safety**: Get autocomplete and type checking for database queries
- ✅ **Better Developer Experience**: Intuitive query API
- ✅ **Database Management**: Easy migrations and schema management
- ✅ **Connection Pooling**: Built-in connection management
- ✅ **SSL Handling**: Automatic SSL configuration for self-signed certificates

