#!/bin/bash

source .env.local

TRANSACTION_ID="TEST_$(date +%s)"
VALIDATION_KEY=$(echo -n "${TRANSACTION_ID}" | openssl dgst -sha1 -hmac "${VOPAY_SHARED_SECRET}" | awk '{print $2}')

echo "🧪 Test LOCAL du webhook VoPay"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Transaction ID: $TRANSACTION_ID"
echo "Validation Key: $VALIDATION_KEY"
echo "SharedSecret: ${VOPAY_SHARED_SECRET:0:10}..."
echo ""

PAYLOAD=$(cat <<EOF
{
  "Success": true,
  "TransactionType": "EFT Funding",
  "TransactionID": "$TRANSACTION_ID",
  "TransactionAmount": "250.00",
  "Status": "successful",
  "UpdatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "ValidationKey": "$VALIDATION_KEY",
  "Environment": "Production"
}
EOF
)

echo "📤 Envoi au serveur local (port 3000)..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/webhooks/vopay \
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
  echo "✅ Webhook traité avec succès!"
else
  echo "❌ Erreur HTTP $HTTP_CODE"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
