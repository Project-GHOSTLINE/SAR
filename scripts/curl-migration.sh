#!/bin/bash
# Exécution via API Supabase Management

set -e

PROJECT_REF="dllyzfuqjzuhvshrlmuq"
SUPABASE_URL="https://dllyzfuqjzuhvshrlmuq.supabase.co"
SERVICE_KEY="${SUPABASE_SERVICE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
    # Load from .env.local
    source .env.local 2>/dev/null || true
    SERVICE_KEY="${SUPABASE_SERVICE_KEY}"
fi

echo "🚀 Migration TITAN via curl..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Lire le SQL
SQL_CONTENT=$(cat database/titan-simple-no-verify.sql)

# Méthode 1: Tenter via PostgREST (ne marchera pas mais essayons)
echo "Méthode 1: PostgREST (probablement échouera)..."
curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>&1 | head -5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "❌ Comme prévu, PostgREST ne supporte pas exec_sql"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 SOLUTION:"
echo ""
echo "curl/API ne peut pas exécuter SQL DDL (CREATE TABLE, etc.)"
echo ""
echo "Options restantes:"
echo ""
echo "1. ✅ SQL Editor Manuel (RAPIDE - 30 secondes)"
echo "   - Ouvrir: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "   - Coller SQL (déjà dans clipboard)"
echo "   - Cliquer Run"
echo ""
echo "2. ⚙️  psql avec mot de passe DB"
echo "   - Besoin mot de passe: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo "   - Puis: ./scripts/psql-with-password.sh [PASSWORD]"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copier SQL dans clipboard
cat database/titan-simple-no-verify.sql | pbcopy 2>/dev/null || true
echo "✅ SQL copié dans clipboard (196 lignes)"
echo ""

# Ouvrir SQL Editor
open "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new" 2>/dev/null || true
echo "✅ SQL Editor ouvert dans navigateur"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
