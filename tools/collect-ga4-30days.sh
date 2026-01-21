#!/bin/bash
# Script de collecte GA4 pour 30 jours - VRAIES DONNEES
# Usage: bash tools/collect-ga4-30days.sh

set -e

BASE_URL="http://localhost:3002"
API_ENDPOINT="$BASE_URL/api/seo/collect/ga4"

# Récupérer le mot de passe admin depuis .env.local
ADMIN_PASSWORD=$(grep "^ADMIN_PASSWORD=" .env.local | cut -d '=' -f2)

echo "=========================================="
echo "COLLECTE GA4 - 30 DERNIERS JOURS"
echo "=========================================="
echo ""

# Calculer les 30 dernières dates
end_date=$(date -v-1d +%Y-%m-%d)  # Hier
start_date=$(date -v-30d +%Y-%m-%d)  # Il y a 30 jours

echo "📅 Période: $start_date à $end_date"
echo ""

# Fonction pour collecter une date
collect_date() {
    local target_date=$1
    echo "🔄 Collecte pour $target_date..."

    response=$(curl -s -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $ADMIN_PASSWORD" \
        -d "{\"date\": \"$target_date\", \"force\": true}")

    # Vérifier si c'est un succès
    if echo "$response" | grep -q '"success":true'; then
        if echo "$response" | grep -q '"mock":true'; then
            echo "   ❌ MODE MOCK détecté pour $target_date"
            return 1
        else
            echo "   ✅ Données réelles collectées pour $target_date"
            return 0
        fi
    else
        echo "   ❌ Erreur: $response"
        return 1
    fi
}

# Compteurs
success_count=0
mock_count=0
error_count=0

# Boucle sur les 30 derniers jours
for i in {1..30}; do
    current_date=$(date -j -v-${i}d +%Y-%m-%d)

    if collect_date "$current_date"; then
        ((success_count++))
    else
        if echo "$response" | grep -q '"mock":true'; then
            ((mock_count++))
        else
            ((error_count++))
        fi
    fi

    # Petit délai pour ne pas surcharger l'API
    sleep 0.5
done

echo ""
echo "=========================================="
echo "RÉSUMÉ DE LA COLLECTE"
echo "=========================================="
echo "✅ Succès (données réelles):  $success_count"
echo "⚠️  Mode MOCK:                $mock_count"
echo "❌ Erreurs:                   $error_count"
echo ""

if [ $mock_count -gt 0 ]; then
    echo "🚨 ATTENTION: Certaines données sont en MODE MOCK!"
    echo "   Vérifiez les credentials GA4 dans .env.local"
    exit 1
fi

if [ $success_count -eq 30 ]; then
    echo "🎉 SUCCÈS: Toutes les données réelles ont été collectées!"
    exit 0
else
    echo "⚠️  PARTIEL: Seulement $success_count/30 jours collectés"
    exit 1
fi
