#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  🔐 SOLUTION FINALE - Avec Mot de Passe Database
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_REF="dllyzfuqjzuhvshrlmuq"
PSQL="/opt/homebrew/opt/libpq/bin/psql"
SQL_FILE="database/titan-simple-no-verify.sql"

clear
echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 TITAN - Exécution Automatique avec Mot de Passe"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "J'ai ouvert la page Settings Database dans votre navigateur."
echo ""
echo "ÉTAPE 1: Récupérer le mot de passe"
echo "────────────────────────────────────────────────────────────"
echo "  1. Regardez la section 'Database Password'"
echo "  2. Si vous le voyez (●●●●●●), copiez-le"
echo "  3. Si non visible, cliquez 'Reset database password'"
echo "  4. Copiez le nouveau mot de passe"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Ouvrir page settings
open "https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"

sleep 3

# Demander mot de passe
read -sp "Collez le mot de passe ici (caché): " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Mot de passe vide. Abandon."
    exit 1
fi

echo "🔐 Mot de passe reçu!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 Exécution de la Migration SQL..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Exécuter le SQL
PGPASSWORD="$DB_PASSWORD" $PSQL \
  "postgresql://postgres.${PROJECT_REF}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres" \
  -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ✅ ✅ ✅ MIGRATION RÉUSSIE! ✅ ✅ ✅"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "🧪 Lancement des tests dans 3 secondes..."
    sleep 3
    echo ""
    node scripts/test-titan-system.mjs
else
    echo ""
    echo "❌ Échec de la migration"
    echo ""
    echo "Causes possibles:"
    echo "  - Mot de passe incorrect"
    echo "  - Problème de connexion réseau"
    echo "  - Erreur SQL"
    echo ""
    echo "Vérifiez le mot de passe et réessayez:"
    echo "  ./FINAL-SOLUTION-PASSWORD.sh"
    exit 1
fi
