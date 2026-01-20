#!/bin/bash

# QuickBooks Webhook Signature Test
# Simulates a real QuickBooks webhook with proper HMAC-SHA256 signature

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

BASE_URL="${NEXT_PUBLIC_APP_URL:-https://admin.solutionargentrapide.ca}"
WEBHOOK_URL="$BASE_URL/api/webhooks/quickbooks"
WEBHOOK_TOKEN="${INTUIT_WEBHOOK_TOKEN}"

if [ -z "$WEBHOOK_TOKEN" ]; then
  echo -e "${RED}❌ INTUIT_WEBHOOK_TOKEN not found in .env.local${NC}"
  exit 1
fi

echo "════════════════════════════════════════════════════════"
echo "🔧 QuickBooks Webhook Signature Test"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo "Token: ${WEBHOOK_TOKEN:0:8}...${WEBHOOK_TOKEN: -8}"
echo ""

# Generate test webhook payload
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PAYLOAD=$(cat <<EOF
{
  "eventNotifications": [{
    "realmId": "9341453254077103",
    "dataChangeEvent": {
      "entities": [{
        "name": "Customer",
        "id": "123",
        "operation": "Create",
        "lastUpdated": "$TIMESTAMP"
      }]
    }
  }]
}
EOF
)

echo "📦 Payload:"
echo "$PAYLOAD" | jq .
echo ""

# Calculate HMAC-SHA256 signature
echo "🔐 Calculating HMAC-SHA256 signature..."

# Method 1: Using openssl (most compatible)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_TOKEN" -binary | base64)

echo "Signature: $SIGNATURE"
echo ""

# Send webhook with signature
echo "📤 Sending webhook with signature..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "intuit-signature: $SIGNATURE" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "════════════════════════════════════════════════════════"
echo "📊 RESPONSE"
echo "════════════════════════════════════════════════════════"
echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS - Webhook accepted!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Check Supabase quickbooks_webhooks table"
  echo "  2. Verify webhook was logged with processed=true"
  echo "  3. Check if entity was synced to appropriate table"
  exit 0
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}❌ FAILED - Signature verification failed${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Verify INTUIT_WEBHOOK_TOKEN matches Intuit Dashboard"
  echo "  2. Check that signature algorithm is HMAC-SHA256"
  echo "  3. Ensure payload is not modified before signing"
  exit 1
else
  echo -e "${YELLOW}⚠️  UNEXPECTED RESPONSE${NC}"
  echo ""
  echo "Review the response above and check:"
  echo "  1. Vercel function logs"
  echo "  2. Environment variables"
  echo "  3. Supabase connection"
  exit 1
fi
