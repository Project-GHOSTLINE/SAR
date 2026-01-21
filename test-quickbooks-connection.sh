#!/usr/bin/env bash
set -euo pipefail

# QuickBooks Connection Test Script
# Tests all connection manager APIs

BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 QuickBooks Connection Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# 1. Test Status
echo "1️⃣  Testing connection status..."
STATUS=$(curl -s "$BASE_URL/api/quickbooks/connection/status")
echo "$STATUS" | jq '.'
CONNECTED=$(echo "$STATUS" | jq -r '.connection.connected')
echo ""

if [ "$CONNECTED" = "true" ]; then
  echo "✅ QuickBooks is connected!"
  
  # 2. Test auto-refresh status
  echo ""
  echo "2️⃣  Checking auto-refresh status..."
  AUTO_REFRESH=$(echo "$STATUS" | jq -r '.connection.autoRefreshEnabled')
  if [ "$AUTO_REFRESH" = "true" ]; then
    echo "✅ Auto-refresh is ENABLED"
  else
    echo "⚠️  Auto-refresh is DISABLED"
    echo ""
    echo "Would you like to enable it? (y/n)"
    read -r ANSWER
    if [ "$ANSWER" = "y" ]; then
      echo "🔄 Starting auto-refresh..."
      curl -s -X POST "$BASE_URL/api/quickbooks/connection/auto-refresh" \
        -H "Content-Type: application/json" \
        -d '{"action": "start"}' | jq '.'
    fi
  fi
  
  # 3. Test connection
  echo ""
  echo "3️⃣  Testing live connection..."
  TEST_RESULT=$(curl -s "$BASE_URL/api/quickbooks/connection/test")
  echo "$TEST_RESULT" | jq '.'
  TEST_SUCCESS=$(echo "$TEST_RESULT" | jq -r '.success')
  
  if [ "$TEST_SUCCESS" = "true" ]; then
    echo "✅ Connection test PASSED"
  else
    echo "❌ Connection test FAILED"
  fi
  
  # 4. Check if refresh needed
  echo ""
  echo "4️⃣  Checking if refresh needed..."
  NEEDS_REFRESH=$(echo "$STATUS" | jq -r '.connection.needsRefresh')
  if [ "$NEEDS_REFRESH" = "true" ]; then
    echo "⚠️  Tokens need refresh"
    echo ""
    echo "Would you like to refresh now? (y/n)"
    read -r ANSWER
    if [ "$ANSWER" = "y" ]; then
      echo "🔄 Refreshing tokens..."
      curl -s -X POST "$BASE_URL/api/quickbooks/connection/refresh" | jq '.'
      echo "✅ Refresh complete"
    fi
  else
    echo "✅ Tokens are still valid"
    EXPIRES_AT=$(echo "$STATUS" | jq -r '.connection.expiresAt')
    echo "   Expires: $EXPIRES_AT"
  fi
  
else
  echo "❌ QuickBooks is NOT connected"
  echo ""
  echo "To connect, visit:"
  echo "👉 $BASE_URL/admin/quickbooks"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
