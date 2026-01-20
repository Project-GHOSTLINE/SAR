#!/bin/bash

# ============================================
# 🚀 Configuration Automatique Vercel - QuickBooks
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 CONFIGURATION VERCEL - QUICKBOOKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# Configuration
# ============================================
VERCEL_TOKEN="5Qjkd1qmU2PIwWopMZkBjvW2"
PROJECT_NAME="sar"

# ============================================
# Fonction: Ajouter variable d'environnement
# ============================================
add_env_var() {
  local key=$1
  local value=$2

  echo -ne "${BLUE}→${NC} Ajout de $key... "

  response=$(curl -s -X POST \
    "https://api.vercel.com/v10/projects/${PROJECT_NAME}/env" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\": \"${key}\",
      \"value\": \"${value}\",
      \"type\": \"encrypted\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }")

  if echo "$response" | grep -q '"key"'; then
    echo -e "${GREEN}✓${NC}"
    return 0
  elif echo "$response" | grep -q '"error"'; then
    error_msg=$(echo "$response" | grep -o '"message":"[^"]*' | cut -d'"' -f4)
    if echo "$error_msg" | grep -q "already exists"; then
      echo -e "${YELLOW}⚠ Existe déjà${NC}"
      return 0
    else
      echo -e "${RED}✗${NC} $error_msg"
      return 1
    fi
  else
    echo -e "${RED}✗${NC} Erreur inconnue"
    return 1
  fi
}

# ============================================
# Étape 1: Vérifier connexion API Vercel
# ============================================
echo "📡 1. Vérification connexion API Vercel"
echo "---------------------------------------"

response=$(curl -s -X GET \
  "https://api.vercel.com/v9/projects/${PROJECT_NAME}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}")

if echo "$response" | grep -q '"name":"sar"'; then
  echo -e "${GREEN}✓${NC} Connexion API réussie"
  echo -e "${GREEN}✓${NC} Projet trouvé: sar"
else
  echo -e "${RED}✗${NC} Erreur de connexion à l'API Vercel"
  echo "$response"
  exit 1
fi

echo ""

# ============================================
# Étape 2: Ajouter variables QuickBooks
# ============================================
echo "⚙️  2. Ajout des variables QuickBooks"
echo "------------------------------------"

success_count=0
total_count=4

add_env_var "INTUIT_CLIENT_ID" "ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u" && ((success_count++)) || true
sleep 0.5

add_env_var "INTUIT_CLIENT_SECRET" "Oewh6LtCjluiEjwBupTvolVeyBdmmaDnW7xtVySj" && ((success_count++)) || true
sleep 0.5

add_env_var "INTUIT_ENVIRONMENT" "sandbox" && ((success_count++)) || true
sleep 0.5

add_env_var "INTUIT_WEBHOOK_TOKEN" "votre-webhook-verifier-token-genere-par-intuit" && ((success_count++)) || true
sleep 0.5

echo ""
echo "Variables ajoutées: $success_count / $total_count"
echo ""

# ============================================
# Étape 3: Vérifier les variables ajoutées
# ============================================
echo "🔍 3. Vérification des variables"
echo "---------------------------------"

response=$(curl -s -X GET \
  "https://api.vercel.com/v9/projects/${PROJECT_NAME}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}")

for key in "INTUIT_CLIENT_ID" "INTUIT_CLIENT_SECRET" "INTUIT_ENVIRONMENT" "INTUIT_WEBHOOK_TOKEN"; do
  if echo "$response" | grep -q "\"key\":\"$key\""; then
    echo -e "${GREEN}✓${NC} $key configuré"
  else
    echo -e "${RED}✗${NC} $key MANQUANT"
  fi
done

echo ""

# ============================================
# Résumé
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $success_count -eq $total_count ]; then
  echo -e "${GREEN}✅ TOUTES LES VARIABLES CONFIGURÉES${NC}"
  echo ""
  echo "🚀 Prochaines étapes:"
  echo "   1. Appliquer la migration SQL sur Supabase"
  echo "   2. Redéployer: git push origin main"
  echo "   3. Tester: https://sar.vercel.app/api/quickbooks/status"
else
  echo -e "${YELLOW}⚠ CONFIGURATION PARTIELLE${NC}"
  echo ""
  echo "Variables configurées: $success_count / $total_count"
  echo "Vérifier les erreurs ci-dessus"
fi

echo ""
