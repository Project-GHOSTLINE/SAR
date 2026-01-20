#!/bin/bash
#
# CHECK MIGRATIONS - Vérifie si les migrations RPC sont appliquées
#
# Usage: ./scripts/check-migrations.sh
#

set -e

echo ""
echo "========================================"
echo "  VÉRIFICATION MIGRATIONS SUPABASE"
echo "========================================"
echo ""

# Charger les credentials
if [ ! -f .env.local ]; then
  echo "❌ Erreur: .env.local non trouvé"
  exit 1
fi

source .env.local

echo "🔍 Vérification des RPC functions..."
echo ""

# Query SQL pour vérifier les fonctions
SQL_QUERY="SELECT proname FROM pg_proc WHERE proname IN ('get_messages_with_details', 'get_message_emails_and_notes', 'process_vopay_webhook') ORDER BY proname;"

# Utiliser psql si disponible
if command -v psql &> /dev/null; then
  # Construire connection string
  DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||').supabase.co
  DB_NAME="postgres"
  DB_USER="postgres"

  echo "Connexion: $DB_HOST"
  echo ""

  RESULT=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -A -c "$SQL_QUERY" 2>&1)

  if echo "$RESULT" | grep -q "get_messages_with_details"; then
    echo "✅ get_messages_with_details - TROUVÉE"
  else
    echo "❌ get_messages_with_details - MANQUANTE"
  fi

  if echo "$RESULT" | grep -q "get_message_emails_and_notes"; then
    echo "✅ get_message_emails_and_notes - TROUVÉE"
  else
    echo "❌ get_message_emails_and_notes - MANQUANTE"
  fi

  if echo "$RESULT" | grep -q "process_vopay_webhook"; then
    echo "✅ process_vopay_webhook - TROUVÉE"
  else
    echo "❌ process_vopay_webhook - MANQUANTE"
  fi

  echo ""

  # Compter les fonctions trouvées
  COUNT=$(echo "$RESULT" | grep -c "get_\|process_" || echo "0")

  if [ "$COUNT" -eq 3 ]; then
    echo "✅ TOUTES LES MIGRATIONS RPC SONT APPLIQUÉES"
    echo ""
    echo "Vous pouvez démarrer le serveur:"
    echo "  npm run dev:4000"
    exit 0
  else
    echo "⚠️  MIGRATIONS RPC MANQUANTES ($COUNT/3 trouvées)"
    echo ""
    echo "Pour appliquer les migrations:"
    echo "1. Aller sur https://supabase.com/dashboard"
    echo "2. SQL Editor → New Query"
    echo "3. Copier/coller: supabase/migrations/20260118000001_rpc_functions.sql"
    echo "4. Exécuter (Run)"
    echo ""
    echo "Ou via CLI:"
    echo "  supabase db push"
    exit 1
  fi

else
  echo "⚠️  psql non installé - Impossible de vérifier automatiquement"
  echo ""
  echo "Pour vérifier manuellement:"
  echo "1. Aller sur https://supabase.com/dashboard"
  echo "2. SQL Editor → New Query"
  echo "3. Exécuter:"
  echo "   SELECT proname FROM pg_proc WHERE proname IN ("
  echo "     'get_messages_with_details',"
  echo "     'get_message_emails_and_notes',"
  echo "     'process_vopay_webhook'"
  echo "   );"
  echo ""
  echo "Attendu: 3 lignes"
  echo ""
  exit 2
fi
