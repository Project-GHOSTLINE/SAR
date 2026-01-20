#!/bin/bash

# ============================================
# 🗄️  Application Migration SQL Supabase - QuickBooks
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  MIGRATION SQL SUPABASE - QUICKBOOKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# Configuration
# ============================================
SUPABASE_URL="https://dllyzfuqjzuhvshrlmuq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo"
MIGRATION_FILE="supabase/migrations/20260120000000_quickbooks_integration.sql"

# ============================================
# Étape 1: Vérifier fichier migration
# ============================================
echo "📁 1. Vérification fichier migration"
echo "-------------------------------------"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}✗${NC} Fichier migration non trouvé: $MIGRATION_FILE"
  exit 1
fi

echo -e "${GREEN}✓${NC} Fichier migration trouvé"

# Compter les tables
table_count=$(grep -c "CREATE TABLE IF NOT EXISTS" "$MIGRATION_FILE" || echo "0")
echo -e "${GREEN}✓${NC} $table_count tables à créer"
echo ""

# ============================================
# Étape 2: Vérifier connexion Supabase
# ============================================
echo "📡 2. Vérification connexion Supabase"
echo "--------------------------------------"

response=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Connexion Supabase réussie"
else
  echo -e "${RED}✗${NC} Erreur de connexion à Supabase"
  exit 1
fi

echo ""

# ============================================
# Étape 3: Appliquer migration via API
# ============================================
echo "🚀 3. Application de la migration SQL"
echo "--------------------------------------"

# Lire le fichier SQL
sql_content=$(cat "$MIGRATION_FILE")

# Envoyer via l'API Supabase SQL
response=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")

# Note: Si l'API exec_sql n'existe pas, utiliser la méthode directe PostgreSQL
if echo "$response" | grep -q "error"; then
  echo -e "${YELLOW}⚠${NC} API RPC non disponible, utilisation de psql..."
  echo ""

  # Méthode alternative: utiliser psql si disponible
  if command -v psql &> /dev/null; then
    echo "🔧 Utilisation de psql pour appliquer la migration..."

    # Extraire les credentials de connexion
    DB_HOST="db.dllyzfuqjzuhvshrlmuq.supabase.co"
    DB_PORT="5432"
    DB_NAME="postgres"
    DB_USER="postgres"
    DB_PASSWORD="Solution%99"

    # Appliquer la migration
    PGPASSWORD="$DB_PASSWORD" psql \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      -f "$MIGRATION_FILE"

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓${NC} Migration appliquée avec succès via psql"
    else
      echo -e "${RED}✗${NC} Erreur lors de l'application de la migration"
      exit 1
    fi
  else
    echo -e "${RED}✗${NC} psql non disponible"
    echo ""
    echo "📋 INSTRUCTIONS MANUELLES:"
    echo "1. Aller sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new"
    echo "2. Copier le contenu de: $MIGRATION_FILE"
    echo "3. Coller dans l'éditeur SQL"
    echo "4. Cliquer 'Run'"
    exit 1
  fi
else
  echo -e "${GREEN}✓${NC} Migration appliquée avec succès via API"
fi

echo ""

# ============================================
# Étape 4: Vérifier tables créées
# ============================================
echo "🔍 4. Vérification des tables créées"
echo "-------------------------------------"

# Liste des tables QuickBooks attendues
tables=(
  "quickbooks_tokens"
  "quickbooks_customers"
  "quickbooks_invoices"
  "quickbooks_payments"
  "quickbooks_accounts"
  "quickbooks_vendors"
  "quickbooks_webhooks"
  "quickbooks_sync_logs"
)

success_count=0

for table in "${tables[@]}"; do
  response=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/${table}?limit=0" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

  if [ $? -eq 0 ] && ! echo "$response" | grep -q "error"; then
    echo -e "${GREEN}✓${NC} $table"
    ((success_count++))
  else
    echo -e "${RED}✗${NC} $table MANQUANTE"
  fi
done

echo ""
echo "Tables créées: $success_count / ${#tables[@]}"
echo ""

# ============================================
# Résumé
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $success_count -eq ${#tables[@]} ]; then
  echo -e "${GREEN}✅ MIGRATION RÉUSSIE${NC}"
  echo ""
  echo "🎉 Toutes les tables QuickBooks créées!"
  echo ""
  echo "🚀 Prochaine étape:"
  echo "   Redéployer: git push origin main"
else
  echo -e "${YELLOW}⚠ MIGRATION PARTIELLE${NC}"
  echo ""
  echo "Tables créées: $success_count / ${#tables[@]}"
  echo ""
  echo "📋 Action requise:"
  echo "   Appliquer manuellement via Supabase Dashboard"
fi

echo ""
