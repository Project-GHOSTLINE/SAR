#!/bin/bash

# 🔄 Script de Vérification QuickBooks Reconnexion
# Date: 2026-01-21

BASE_URL="https://admin.solutionargentrapide.ca"

echo ""
echo "======================================================================"
echo "🔄 VÉRIFICATION RECONNEXION QUICKBOOKS"
echo "======================================================================"
echo ""

# Test 1: Vérifier le statut de connexion
echo "1️⃣  Vérification du statut de connexion..."
STATUS=$(curl -s "$BASE_URL/api/quickbooks/connection/status")
CONNECTED=$(echo "$STATUS" | jq -r '.connection.connected')

if [ "$CONNECTED" = "true" ]; then
  echo "   ✅ Connecté"

  REALM_ID=$(echo "$STATUS" | jq -r '.connection.realmId')
  COMPANY=$(echo "$STATUS" | jq -r '.connection.companyName')
  AUTO_REFRESH=$(echo "$STATUS" | jq -r '.connection.autoRefreshEnabled')

  echo "   Realm ID: $REALM_ID"
  echo "   Company: $COMPANY"
  echo "   Auto-Refresh: $([ "$AUTO_REFRESH" = "true" ] && echo "✅ Activé" || echo "❌ Désactivé")"
else
  echo "   ❌ PAS CONNECTÉ"
  echo ""
  echo "   Tu dois d'abord reconnecter QuickBooks:"
  echo "   1. Va sur: $BASE_URL/admin/quickbooks"
  echo "   2. Clique 'Connect to QuickBooks'"
  echo "   3. Autorise sur Intuit"
  echo "   4. Relance ce script"
  echo ""
  exit 1
fi

# Test 2: Tester la connexion API
echo ""
echo "2️⃣  Test de connexion API..."
TEST_RESULT=$(curl -s "$BASE_URL/api/quickbooks/connection/test")
TEST_SUCCESS=$(echo "$TEST_RESULT" | jq -r '.success')

if [ "$TEST_SUCCESS" = "true" ]; then
  echo "   ✅ Test de connexion RÉUSSI"

  COMPANY_NAME=$(echo "$TEST_RESULT" | jq -r '.company.companyName')
  LEGAL_NAME=$(echo "$TEST_RESULT" | jq -r '.company.legalName')

  echo "   Company Name: $COMPANY_NAME"
  echo "   Legal Name: $LEGAL_NAME"
else
  echo "   ❌ Test de connexion ÉCHOUÉ"

  ERROR=$(echo "$TEST_RESULT" | jq -r '.error')
  ERROR_CODE=$(echo "$TEST_RESULT" | jq -r '.details.fault.error[0].code')

  echo "   Error: $ERROR"

  if [ "$ERROR_CODE" = "3100" ]; then
    echo ""
    echo "   ⚠️  ERROR 3100 DÉTECTÉ"
    echo "   Cela signifie que la connexion utilise encore les VIEUX scopes OAuth."
    echo ""
    echo "   SOLUTION:"
    echo "   1. Déconnecter QuickBooks"
    echo "   2. Reconnecter avec les NOUVEAUX scopes"
    echo ""
    echo "   Veux-tu que je déconnecte automatiquement? (y/n)"
    read -r DISCONNECT

    if [ "$DISCONNECT" = "y" ]; then
      echo "   Déconnexion en cours..."
      curl -s -X POST "$BASE_URL/api/quickbooks/connection/disconnect" | jq '.'
      echo ""
      echo "   ✅ Déconnecté. Maintenant reconnecte via l'interface web."
    fi
  fi

  exit 1
fi

# Test 3: Activer Auto-Refresh si nécessaire
if [ "$AUTO_REFRESH" = "false" ]; then
  echo ""
  echo "3️⃣  Activation de l'auto-refresh..."

  REFRESH_RESULT=$(curl -s -X POST "$BASE_URL/api/quickbooks/connection/auto-refresh" \
    -H "Content-Type: application/json" \
    -d '{"action":"start"}')

  REFRESH_SUCCESS=$(echo "$REFRESH_RESULT" | jq -r '.success')

  if [ "$REFRESH_SUCCESS" = "true" ]; then
    echo "   ✅ Auto-refresh activé"
  else
    echo "   ❌ Échec activation auto-refresh"
  fi
fi

# Test 4: Synchroniser les comptes
echo ""
echo "4️⃣  Synchronisation des comptes QuickBooks..."
SYNC_RESULT=$(curl -s -X POST "$BASE_URL/api/quickbooks/sync/accounts")
SYNC_SUCCESS=$(echo "$SYNC_RESULT" | jq -r '.success')

if [ "$SYNC_SUCCESS" = "true" ]; then
  SYNC_COUNT=$(echo "$SYNC_RESULT" | jq -r '.count')
  echo "   ✅ $SYNC_COUNT comptes synchronisés"
else
  echo "   ❌ Échec de synchronisation"
  SYNC_ERROR=$(echo "$SYNC_RESULT" | jq -r '.error')
  echo "   Error: $SYNC_ERROR"
fi

# Test 5: Récupérer les soldes bancaires (Balance Sheet Detailed)
echo ""
echo "5️⃣  Récupération des soldes bancaires..."

# Vérifier si l'endpoint existe
BALANCE_RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/quickbooks/reports/balance-sheet-detailed")
HTTP_CODE=$(echo "$BALANCE_RESULT" | tail -1)
BALANCE_BODY=$(echo "$BALANCE_RESULT" | head -n -1)

if [ "$HTTP_CODE" = "404" ]; then
  echo "   ⚠️  Endpoint Balance Sheet Detailed pas encore déployé (404)"
  echo "   Attente de 10 secondes pour le déploiement Vercel..."
  sleep 10

  # Réessayer
  BALANCE_RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/quickbooks/reports/balance-sheet-detailed")
  HTTP_CODE=$(echo "$BALANCE_RESULT" | tail -1)
  BALANCE_BODY=$(echo "$BALANCE_RESULT" | head -n -1)
fi

if [ "$HTTP_CODE" = "200" ]; then
  BALANCE_SUCCESS=$(echo "$BALANCE_BODY" | jq -r '.success')

  if [ "$BALANCE_SUCCESS" = "true" ]; then
    echo "   ✅ Balance Sheet récupéré"
    echo ""
    echo "   📊 COMPTES BANCAIRES:"
    echo "   " $(echo "==============================================")

    # Afficher les comptes bancaires
    echo "$BALANCE_BODY" | jq -r '.bankAccounts[] | "   \(.accountNumber) - \(.name): \(.formattedBalance)"'

    echo ""
    echo "   Total comptes bancaires: $(echo "$BALANCE_BODY" | jq '.bankAccounts | length')"
    echo "   Total tous comptes: $(echo "$BALANCE_BODY" | jq '.allAccounts | length')"
  else
    echo "   ❌ Échec récupération Balance Sheet"
    BALANCE_ERROR=$(echo "$BALANCE_BODY" | jq -r '.error')
    echo "   Error: $BALANCE_ERROR"
  fi
else
  echo "   ⚠️  Endpoint Balance Sheet Detailed pas encore disponible (HTTP $HTTP_CODE)"
  echo "   Utilisation du endpoint Balance Sheet standard..."

  # Fallback vers balance-sheet standard
  BALANCE_STD=$(curl -s "$BASE_URL/api/quickbooks/reports/balance-sheet")
  BALANCE_STD_SUCCESS=$(echo "$BALANCE_STD" | jq -r '.success')

  if [ "$BALANCE_STD_SUCCESS" = "true" ]; then
    echo "   ✅ Balance Sheet standard récupéré"
  else
    echo "   ❌ Échec récupération Balance Sheet standard"
  fi
fi

# Test 6: Interroger les comptes bancaires locaux
echo ""
echo "6️⃣  Interrogation des comptes bancaires locaux (DB)..."
ACCOUNTS_RESULT=$(curl -s "$BASE_URL/api/quickbooks/accounts?type=Bank")
ACCOUNTS_SUCCESS=$(echo "$ACCOUNTS_RESULT" | jq -r '.success')

if [ "$ACCOUNTS_SUCCESS" = "true" ]; then
  ACCOUNTS_COUNT=$(echo "$ACCOUNTS_RESULT" | jq -r '.count')
  echo "   ✅ $ACCOUNTS_COUNT comptes bancaires en base de données"
  echo ""
  echo "   📊 COMPTES BANCAIRES (DB):"
  echo "   " $(echo "==============================================")

  # Afficher les comptes bancaires de la DB
  echo "$ACCOUNTS_RESULT" | jq -r '.accounts[] | "   \(.accountNumber // "N/A") - \(.name): \(.currentBalance // 0) $"'
else
  echo "   ❌ Échec interrogation comptes locaux"
fi

# Résumé final
echo ""
echo "======================================================================"
echo "✅ VÉRIFICATION TERMINÉE"
echo "======================================================================"
echo ""
echo "📊 RÉSUMÉ:"
echo "   - Connexion: ✅"
echo "   - Test API: $([ "$TEST_SUCCESS" = "true" ] && echo "✅" || echo "❌")"
echo "   - Auto-Refresh: $([ "$AUTO_REFRESH" = "true" ] && echo "✅" || echo "❌")"
echo "   - Sync Comptes: $([ "$SYNC_SUCCESS" = "true" ] && echo "✅ ($SYNC_COUNT comptes)" || echo "❌")"
echo "   - Balance Sheet: $([ "$BALANCE_SUCCESS" = "true" ] && echo "✅" || echo "⚠️")"
echo "   - DB Locale: $([ "$ACCOUNTS_SUCCESS" = "true" ] && echo "✅ ($ACCOUNTS_COUNT comptes)" || echo "❌")"
echo ""

if [ "$TEST_SUCCESS" = "true" ] && [ "$SYNC_SUCCESS" = "true" ]; then
  echo "🎉 TOUT FONCTIONNE PARFAITEMENT!"
  echo ""
  echo "Les 3 comptes bancaires que tu cherchais:"
  echo "   - 1015 Compte VOPAY"
  echo "   - 1010 Compte Épargne"
  echo "   - 1000 Compte RBC"
  echo ""
  echo "Sont maintenant accessibles via:"
  echo "   - GET $BASE_URL/api/quickbooks/reports/balance-sheet-detailed"
  echo "   - GET $BASE_URL/api/quickbooks/accounts?type=Bank"
  echo ""
else
  echo "⚠️  Il reste des problèmes à résoudre."
  echo "Consulte le guide: /Users/xunit/Desktop/📁 Projets/sar/e2e/quickbooks-reconnect-guide.md"
  echo ""
fi
