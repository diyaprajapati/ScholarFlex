# Fix Migration Drift Without Data Loss

## Problem
Prisma detected that migrations were modified after being applied, causing drift.

## Solution (When Database is Accessible)

Run these commands in order:

```bash
cd backend

# 1. Mark the modified migrations as applied (they already exist in DB)
npx prisma migrate resolve --applied 20251207000000_create_internship_feedback
npx prisma migrate resolve --applied 20251223061630_add_feedback_form
npx prisma migrate resolve --applied 20251224202305_add_student_noc_status

# 2. Check status
npx prisma migrate status

# 3. Apply the new internship tables migration
npx prisma migrate deploy
```

## Alternative: Create Baseline Migration

If the above doesn't work, create a baseline:

```bash
# This will create a migration that matches current database state
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > baseline.sql

# Then manually apply and mark as applied
```

## Important Notes
- **NO DATA WILL BE LOST** - We're only syncing migration history
- The tables already exist in the database
- We're just telling Prisma they're already applied

