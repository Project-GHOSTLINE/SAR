#!/bin/bash

# Script pour configurer le webhook VoPay
# Documentation: https://docs.vopay.com/docs/webhooks

# Variables d'environnement (depuis .env.local)
source .env.local

# URL du webhook
WEBHOOK_URL="https://api.solutionargentrapide.ca/api/webhooks/vopay"

# Calculer la signature (SHA1 de APIKey + SharedSecret + Date)
DATE=$(date +%Y-%m-%d)
SIGNATURE_STRING="${VOPAY_API_KEY}${VOPAY_SHARED_SECRET}${DATE}"
SIGNATURE=$(echo -n "$SIGNATURE_STRING" | shasum -a 1 | awk '{print $1}')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuration du Webhook VoPay"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 URL du webhook: $WEBHOOK_URL"
echo "📅 Date: $DATE"
echo "🔐 Signature: $SIGNATURE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configurer le webhook via l'API VoPay
echo "🚀 Configuration du webhook dans VoPay..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${VOPAY_API_URL}account/webhook-url" \
  -H "Content-Type: application/json" \
  -d "{
    \"AccountID\": \"${VOPAY_ACCOUNT_ID}\",
    \"Key\": \"${VOPAY_API_KEY}\",
    \"Signature\": \"${SIGNATURE}\",
    \"WebhookURL\": \"${WEBHOOK_URL}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Réponse de VoPay"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Status Code: $HTTP_CODE"
echo ""
echo "Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook configuré avec succès!"
  echo ""
  echo "📋 Prochaines étapes:"
  echo "  1. Vérifier dans le dashboard VoPay: https://app.vopay.com"
  echo "  2. Tester avec une transaction de test"
  echo "  3. Vérifier les logs dans Supabase"
else
  echo "❌ Erreur lors de la configuration"
  echo ""
  echo "🔧 Alternative: Configuration manuelle"
  echo "  1. Connectez-vous à: https://app.vopay.com"
  echo "  2. Allez dans Settings > Webhooks"
  echo "  3. Entrez l'URL: $WEBHOOK_URL"
  echo "  4. Sauvegardez"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
