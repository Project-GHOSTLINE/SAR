#!/bin/bash
# Script d'exécution automatique SQL via psql

set -e

PROJECT_REF="dllyzfuqjzuhvshrlmuq"
PSQL_BIN="/opt/homebrew/opt/libpq/bin/psql"
SQL_FILE="database/titan-simple-no-verify.sql"

echo "🚀 Exécution automatique de la migration TITAN..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tenter connexion directe (sans mot de passe, pour tester)
echo "Tentative 1: Connexion via connection pooler..."
$PSQL_BIN "postgresql://postgres.${PROJECT_REF}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres" \
  -f "$SQL_FILE" 2>&1 | tee /tmp/titan-migration.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ✅ ✅ MIGRATION RÉUSSIE! ✅ ✅ ✅"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🧪 Lancement des tests..."
    echo ""
    node scripts/test-titan-system.mjs
    exit 0
fi

# Si échec, demander le mot de passe
echo ""
echo "⚠️  Connexion sans mot de passe a échoué"
echo ""
echo "Il faut le mot de passe de la base de données."
echo "Récupérez-le sur: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo ""
read -sp "Entrez le mot de passe DB: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Mot de passe vide, abandon"
    exit 1
fi

echo "Tentative 2: Connexion avec mot de passe..."
PGPASSWORD="$DB_PASSWORD" $PSQL_BIN \
  "postgresql://postgres.${PROJECT_REF}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres" \
  -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ ✅ ✅ MIGRATION RÉUSSIE! ✅ ✅ ✅"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🧪 Lancement des tests..."
    echo ""
    node scripts/test-titan-system.mjs
else
    echo ""
    echo "❌ Échec de la migration"
    echo "Vérifiez le mot de passe et réessayez"
    exit 1
fi
