#!/bin/bash
# Deploy Client Sessions & Telemetry Migration to Supabase
# Uses Supabase Management API to execute SQL

set -e

echo "🚀 Deploying Client Sessions & Telemetry Migration..."
echo ""

# Load environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  exit 1
fi

source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials"
  exit 1
fi

# Read migration file
MIGRATION_FILE="supabase/migrations/20260125000200_client_sessions_telemetry.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo "📏 Size: $(wc -c < "$MIGRATION_FILE" | xargs) bytes"
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's/https:\/\/\([^.]*\).*/\1/')
echo "🔗 Project: $PROJECT_REF"
echo ""

# Read SQL content
SQL_CONTENT=$(cat "$MIGRATION_FILE")

echo "⏳ Executing migration via Supabase Management API..."
echo ""

# Execute SQL via Supabase Management API
# Note: This requires using the database connection directly
# We'll use a simpler approach: psql via connection pooler

# Build connection string
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-Solution%99}"
CONNECTION_STRING="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "🔌 Connecting to Supabase database..."

# Try with docker psql if available
if command -v docker &> /dev/null; then
  echo "Using docker postgres client..."
  docker run --rm -i postgres:15 psql "$CONNECTION_STRING" < "$MIGRATION_FILE"

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration deployed successfully!"
    echo ""
    echo "📋 Verification steps:"
    echo "   1. Check tables created in Supabase Dashboard"
    echo "   2. Run: npm run dev && ./audit_artifacts/telemetry/SECURITY_PASS_VERIFICATION.sh"
    echo ""
    exit 0
  fi
fi

# Fallback: Show manual instructions
echo ""
echo "⚠️  Automatic deployment not available (docker/psql not found)"
echo ""
echo "📋 Manual deployment steps:"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
echo "2. Copy and paste the following file content:"
echo "   $MIGRATION_FILE"
echo ""
echo "3. Click 'Run' button"
echo ""
echo "4. Verify tables created:"
echo "   SELECT table_name FROM information_schema.tables"
echo "   WHERE table_schema = 'public'"
echo "   AND table_name IN ('client_sessions', 'client_telemetry_events');"
echo ""
echo "Press Enter to open Supabase SQL Editor in browser..."
read

# Open SQL Editor in browser
open "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

echo ""
echo "📄 Migration file ready to copy:"
echo "   $PWD/$MIGRATION_FILE"
echo ""
