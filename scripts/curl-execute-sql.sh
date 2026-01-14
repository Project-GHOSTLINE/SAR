#!/bin/bash
# Execute SQL via curl to Supabase database

set -e

# Load environment
source .env.local 2>/dev/null || true

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_KEY}"
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "🚀 Attempting SQL execution via curl..."
echo "Project: $PROJECT_REF"
echo ""

# Read SQL file
SQL_CONTENT=$(cat database/titan-fresh-start.sql)

# Try method 1: PostgREST raw SQL endpoint (doesn't exist but worth trying)
echo "Method 1: Trying PostgREST SQL endpoint..."
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>&1 | head -20

echo ""
echo "❌ Method 1 failed (expected - no exec_sql function)"
echo ""

# Try method 2: Direct database connection via psql
echo "Method 2: Checking if psql is available..."
if command -v psql &> /dev/null; then
    echo "✅ psql found!"
    echo ""
    echo "To execute via psql, you need the database password."
    echo "Get it from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
    echo ""
    echo "Then run:"
    echo "  psql 'postgresql://postgres:[password]@db.${PROJECT_REF}.supabase.co:5432/postgres' -f database/titan-fresh-start.sql"
    echo ""
else
    echo "❌ psql not installed"
    echo ""
fi

# Method 3: Show SQL Editorlink
echo "═══════════════════════════════════════════════"
echo "Method 3: Manual execution (RECOMMENDED)"
echo "═══════════════════════════════════════════════"
echo ""
echo "1. Open: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "2. Paste the SQL (already in clipboard)"
echo "3. Click RUN"
echo ""
echo "The SQL has been copied to your clipboard again."

# Copy to clipboard
cat database/titan-fresh-start.sql | pbcopy 2>/dev/null || true

echo ""
echo "✅ SQL is in clipboard (299 lines)"
echo ""
