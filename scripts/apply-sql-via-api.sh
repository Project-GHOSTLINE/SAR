#!/bin/bash

# Read the SQL fix
SQL=$(cat supabase/migrations/20260202000001_fix_devops_stats_function.sql)

# Apply via Supabase Management API
# Note: This requires a personal access token from Supabase dashboard
# Get it from: https://supabase.com/dashboard/account/tokens

# For now, let's just test if we can apply it via a simple HTTP request to our own API
curl -X POST http://localhost:3000/api/admin/devops/apply-sql-fix \
  -H "Content-Type: application/json" \
  -d "{\"sql\": $(jq -Rs . < supabase/migrations/20260202000001_fix_devops_stats_function.sql)}"
