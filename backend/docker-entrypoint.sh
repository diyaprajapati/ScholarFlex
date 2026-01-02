#!/bin/sh
set -e

echo "🚀 Starting ScholarFlex Backend..."

# Optional: Wait for database if DB_HOST is set (for docker-compose)
# For standalone deployment, skip this check or set DB_HOST in env
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  echo "⏳ Waiting for database to be ready..."
  until nc -z "$DB_HOST" "$DB_PORT"; do
    echo "   Database is unavailable - sleeping"
    sleep 1
  done
  echo "✅ Database is ready"
fi

# Try to sync database schema (migrations or db push)
echo "📦 Syncing database schema..."
# Use db push which works for both new and existing databases
# It will detect if schema is already in sync and won't make changes
set +e
DB_PUSH_OUTPUT=$(npx prisma db push --accept-data-loss --skip-generate 2>&1)
DB_PUSH_EXIT=$?
set -e

if [ $DB_PUSH_EXIT -eq 0 ]; then
  if echo "$DB_PUSH_OUTPUT" | grep -q "already in sync"; then
    echo "✅ Database schema is already in sync"
  else
    echo "✅ Database schema synced successfully"
  fi
else
  echo "❌ Database setup failed"
  echo "Error output: $DB_PUSH_OUTPUT"
  exit 1
fi

# Generate Prisma client (in case schema changed)
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the application
echo "✅ Starting application..."
exec "$@"