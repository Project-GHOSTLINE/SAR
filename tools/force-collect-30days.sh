#!/bin/bash
# Force collection de 30 jours

cd "/Users/xunit/Desktop/📁 Projets/sar"
ADMIN_PASSWORD=$(grep "^ADMIN_PASSWORD=" .env.local | cut -d '=' -f2)

echo "Collecte forcée des 30 derniers jours..."

for i in {1..30}; do
    TARGET_DATE=$(date -j -v-${i}d +%Y-%m-%d)
    echo -n "Jour -$i ($TARGET_DATE): "

    RESPONSE=$(curl -s -X POST "http://localhost:3002/api/seo/collect/ga4" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $ADMIN_PASSWORD" \
        -d "{\"date\": \"$TARGET_DATE\", \"force\": true}")

    if echo "$RESPONSE" | grep -q '"success":true'; then
        if echo "$RESPONSE" | grep -q '"mock":true'; then
            echo "❌ MOCK"
        else
            echo "✅ OK"
        fi
    else
        echo "❌ ERROR"
    fi

    sleep 1
done

echo "Collecte terminée!"
