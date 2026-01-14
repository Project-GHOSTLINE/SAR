#!/bin/bash
# Execute SQL via PostgreSQL direct connection

set -e

PROJECT_REF="dllyzfuqjzuhvshrlmuq"
PSQL_BIN="/opt/homebrew/opt/libpq/bin/psql"

echo "🔐 PostgreSQL Direct Execution"
echo "═══════════════════════════════════════"
echo ""
echo "I've opened the Database Settings page in your browser."
echo ""
echo "TO GET YOUR DATABASE PASSWORD:"
echo "  1. Look for 'Database Password' section"
echo "  2. Click 'Reset database password' OR copy existing password"
echo "  3. Copy the password"
echo ""
echo "THEN RUN THIS COMMAND:"
echo ""
echo "  $PSQL_BIN \\"
echo "    'postgresql://postgres.dllyzfuqjzuhvshrlmuq:[YOUR_PASSWORD]@aws-0-ca-central-1.pooler.supabase.com:6543/postgres' \\"
echo "    -f database/titan-fresh-start.sql"
echo ""
echo "Replace [YOUR_PASSWORD] with the actual password from the settings page."
echo ""
echo "═══════════════════════════════════════"
echo ""

# Ask if they want to enter password now
read -p "Do you have the password? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -sp "Enter database password: " DB_PASSWORD
    echo ""
    echo ""
    echo "🚀 Executing SQL migration..."
    echo ""

    $PSQL_BIN "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres" \
        -f database/titan-fresh-start.sql

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ✅ ✅ SQL EXECUTED SUCCESSFULLY! ✅ ✅ ✅"
        echo ""
        echo "Running tests..."
        node scripts/test-titan-system.mjs
    else
        echo ""
        echo "❌ SQL execution failed"
        echo "Check the error messages above"
    fi
else
    echo ""
    echo "No problem! When you're ready, run this script again:"
    echo "  ./scripts/psql-execute.sh"
    echo ""
fi
