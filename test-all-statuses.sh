#!/bin/bash

source .env.local

echo "🧪 Test de tous les statuts VoPay"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

statuses=("successful" "failed" "pending" "in progress" "cancelled")

for status in "${statuses[@]}"; do
  TRANSACTION_ID="TEST_${status/\  /_}_$(date +%s)"
  VALIDATION_KEY=$(echo -n "${TRANSACTION_ID}" | openssl dgst -sha1 -hmac "${VOPAY_SHARED_SECRET}" | awk '{print $2}')

  FAILURE_REASON=""
  if [ "$status" = "failed" ]; then
    FAILURE_REASON='"FailureReason": "NSF - Insufficient Funds",'
  fi

  PAYLOAD=$(cat <<EOF
{
  "Success": true,
  "TransactionType": "EFT Funding",
  "TransactionID": "$TRANSACTION_ID",
  "TransactionAmount": "150.00",
  "Status": "$status",
  "UpdatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "ValidationKey": "$VALIDATION_KEY",
  $FAILURE_REASON
  "Environment": "Production"
}
EOF
)

  echo "📤 Test: $status"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.solutionargentrapide.ca/api/webhooks/vopay \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ $status - OK"
  else
    echo "   ❌ $status - ERREUR ($HTTP_CODE)"
  fi

  sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tests terminés!"
echo ""
echo "🔍 Vérifier dans Supabase:"
echo "   Table Editor → vopay_webhook_logs"
echo "   Tu devrais voir 5 webhooks avec différents statuts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
