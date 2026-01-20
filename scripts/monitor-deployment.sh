#!/bin/bash

# ============================================
# 📊 Monitoring Déploiement Vercel
# ============================================

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERCEL_TOKEN="5Qjkd1qmU2PIwWopMZkBjvW2"
PROJECT_ID="prj_zrZxYj7W08vVPFyVQMtWG3qed4ri"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 MONITORING DÉPLOIEMENT VERCEL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Récupérer le dernier déploiement
deployment=$(curl -s -X GET \
  "https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}")

deployment_id=$(echo "$deployment" | jq -r '.deployments[0].uid')
deployment_url=$(echo "$deployment" | jq -r '.deployments[0].url')
initial_state=$(echo "$deployment" | jq -r '.deployments[0].state')

echo "🔗 Deployment ID: $deployment_id"
echo "🌐 URL: https://$deployment_url"
echo "📍 État initial: $initial_state"
echo ""

# Monitorer le statut
echo "⏳ Monitoring en cours..."
echo ""

max_attempts=60  # 5 minutes max (5s * 60)
attempt=0
prev_state=""

while [ $attempt -lt $max_attempts ]; do
  # Récupérer statut actuel
  status=$(curl -s -X GET \
    "https://api.vercel.com/v13/deployments/${deployment_id}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}")

  state=$(echo "$status" | jq -r '.state')
  ready_state=$(echo "$status" | jq -r '.readyState')

  # Afficher seulement si changement
  if [ "$state" != "$prev_state" ]; then
    timestamp=$(date +"%H:%M:%S")
    case $state in
      "BUILDING")
        echo -e "${BLUE}[$timestamp]${NC} 🔨 Building..."
        ;;
      "READY")
        echo -e "${GREEN}[$timestamp]${NC} ✅ Ready!"
        ;;
      "ERROR")
        echo -e "${RED}[$timestamp]${NC} ❌ Error!"
        ;;
      "CANCELED")
        echo -e "${YELLOW}[$timestamp]${NC} ⚠️  Canceled"
        ;;
    esac
    prev_state=$state
  fi

  # Vérifier si terminé
  if [ "$ready_state" = "READY" ] || [ "$state" = "READY" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🎉 DÉPLOIEMENT RÉUSSI${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 URL de production: https://sar.vercel.app"
    echo "🔗 URL du déploiement: https://$deployment_url"
    echo ""
    echo "🧪 Tests à effectuer:"
    echo "   1. curl https://sar.vercel.app/api/quickbooks/status"
    echo "   2. Ouvrir https://sar.vercel.app/admin/quickbooks"
    echo "   3. Vérifier le menu QuickBooks dans l'admin"
    echo ""
    exit 0
  fi

  if [ "$state" = "ERROR" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}❌ DÉPLOIEMENT ÉCHOUÉ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔍 Voir les logs:"
    echo "   https://vercel.com/project-ghostline/sar/${deployment_id}"
    echo ""
    exit 1
  fi

  if [ "$state" = "CANCELED" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}⚠️  DÉPLOIEMENT ANNULÉ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    exit 1
  fi

  sleep 5
  ((attempt++))
done

# Timeout
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⏱️  TIMEOUT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Le déploiement prend plus de temps que prévu."
echo "Vérifier manuellement: https://vercel.com/project-ghostline/sar"
echo ""
