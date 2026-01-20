#!/bin/bash

# QuickBooks API Test Script
# Tests all QuickBooks endpoints and webhooks

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="https://admin.solutionargentrapide.ca"
PASSED=0
FAILED=0

echo "════════════════════════════════════════════════════════"
echo "🔧 QuickBooks API & Webhook Test Suite"
echo "════════════════════════════════════════════════════════"
echo ""

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local expected_status=$4
  local data=$5

  echo -n "Testing $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
    echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body | head -c 100)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status)"
    echo "   Response: $(echo $body | jq -c . 2>/dev/null || echo $body | head -c 100)"
    ((FAILED++))
  fi
  echo ""
}

# ════════════════════════════════════════════════════════
# Test 1: QuickBooks Status
# ════════════════════════════════════════════════════════
echo "📊 Test Suite 1: Status & Health Checks"
echo "────────────────────────────────────────────────────────"
test_endpoint "QuickBooks Status" "GET" "/api/quickbooks/status" "200"

# ════════════════════════════════════════════════════════
# Test 2: OAuth Connect (should redirect)
# ════════════════════════════════════════════════════════
echo "📊 Test Suite 2: OAuth Flow"
echo "────────────────────────────────────────────────────────"

echo -n "Testing OAuth Connect... "
redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/quickbooks/auth/connect")

if [ "$redirect_status" = "307" ] || [ "$redirect_status" = "302" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $redirect_status - Redirect)"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (Expected 307/302, got $redirect_status)"
  ((FAILED++))
fi
echo ""

# ════════════════════════════════════════════════════════
# Test 3: Webhook Endpoint
# ════════════════════════════════════════════════════════
echo "📊 Test Suite 3: Webhooks"
echo "────────────────────────────────────────────────────────"

webhook_payload='{
  "eventNotifications": [{
    "realmId": "test-realm-123",
    "dataChangeEvent": {
      "entities": [{
        "name": "Customer",
        "id": "test-customer-456",
        "operation": "Create",
        "lastUpdated": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
      }]
    }
  }]
}'

# Expect 401 because we don't have valid signature
test_endpoint "Webhook Receiver (without signature)" "POST" "/api/webhooks/quickbooks" "401" "$webhook_payload"

# ════════════════════════════════════════════════════════
# Test 4: API Routes Existence
# ════════════════════════════════════════════════════════
echo "📊 Test Suite 4: Route Existence Checks"
echo "────────────────────────────────────────────────────────"

routes=(
  "GET /api/quickbooks/status 200"
  "GET /api/quickbooks/auth/connect 307"
  "POST /api/quickbooks/auth/refresh 401"
  "POST /api/webhooks/quickbooks 401"
)

for route_info in "${routes[@]}"; do
  read -r method path expected_code <<< "$route_info"

  echo -n "Testing $method $path... "

  if [ "$method" = "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" -d '{}')
  fi

  # For redirects, accept 307 or 302
  if [ "$expected_code" = "307" ] && ([ "$status" = "307" ] || [ "$status" = "302" ]); then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
    ((PASSED++))
  elif [ "$status" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $status)"
    ((FAILED++))
  fi
done
echo ""

# ════════════════════════════════════════════════════════
# Test 5: Admin Page Accessibility
# ════════════════════════════════════════════════════════
echo "📊 Test Suite 5: Frontend Pages"
echo "────────────────────────────────────────────────────────"

echo -n "Testing QuickBooks Admin Page... "
page_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/quickbooks")

if [ "$page_status" = "200" ] || [ "$page_status" = "307" ] || [ "$page_status" = "302" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $page_status)"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $page_status)"
  ((FAILED++))
fi
echo ""

# ════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════════════"
echo "📊 TEST SUMMARY"
echo "════════════════════════════════════════════════════════"
echo ""

TOTAL=$((PASSED + FAILED))
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")

echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "📊 Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Go to: $BASE_URL/admin/quickbooks"
  echo "  2. Click 'Connecter QuickBooks'"
  echo "  3. Authorize the connection"
  echo "  4. Verify connection status shows 'Connected'"
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check Vercel deployment: https://vercel.com/project-ghostline/sar"
  echo "  2. Verify environment variables are set"
  echo "  3. Check Supabase tables exist"
  echo "  4. Review function logs"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

exit $FAILED
