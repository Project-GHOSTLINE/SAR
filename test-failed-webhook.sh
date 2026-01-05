#!/bin/bash

source .env.local

TRANSACTION_ID="TEST_FAILED_$(date +%s)"
VALIDATION_KEY=$(echo -n "${TRANSACTION_ID}" | openssl dgst -sha1 -hmac "${VOPAY_SHARED_SECRET}" | awk '{print $2}')

echo "🧪 Test webhook VoPay - Transaction ÉCHOUÉE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Transaction ID: $TRANSACTION_ID"
echo "Validation Key: $VALIDATION_KEY"
echo ""

PAYLOAD=$(cat <<EOF
{
  "Success": true,
  "TransactionType": "EFT Funding",
  "TransactionID": "$TRANSACTION_ID",
  "TransactionAmount": "350.00",
  "Status": "failed",
  "UpdatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "ValidationKey": "$VALIDATION_KEY",
  "FailureReason": "NSF - Insufficient Funds",
  "Environment": "Production"
}
EOF
)

echo "📤 Envoi du webhook failed..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.solutionargentrapide.ca/api/webhooks/vopay \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Réponse:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status: $HTTP_CODE"
echo ""
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook failed traité avec succès!"
  echo ""
  echo "🔍 Cette transaction apparaîtra en ROUGE dans la page admin"
  echo "   avec la raison: NSF - Insufficient Funds"
  echo ""
  echo "📧 Tu peux maintenant tester le bouton 'Envoyer Alerte'"
  echo "   sur cette transaction dans: https://admin.solutionargentrapide.ca/webhooks"
else
  echo "❌ Erreur HTTP $HTTP_CODE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
