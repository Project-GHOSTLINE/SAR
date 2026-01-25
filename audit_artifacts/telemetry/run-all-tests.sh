#!/bin/bash

# Telemetry System Verification Script
# Run from project root: bash audit_artifacts/telemetry/run-all-tests.sh

echo "🧪 TELEMETRY SYSTEM VERIFICATION"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
  fi
}

# Test 1: Track event with UTM params
echo "1️⃣  Testing track-event endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/telemetry/track-event \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sar_session_id=test123456789012345678901234567890123456789012345678901234567890' \
  -d '{
    "event_type": "page_view",
    "event_name": "/test-verification",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "test-campaign"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  test_result 0
else
  echo "HTTP code: $HTTP_CODE"
  test_result 1
fi
echo ""

# Test 2: Check session in database
echo "2️⃣  Checking last session in database..."
DB_OUTPUT=$(node scripts/check-last-session.js 2>&1)
if echo "$DB_OUTPUT" | grep -q "✅ Session trouvée"; then
  test_result 0
  echo "Session ID: $(echo "$DB_OUTPUT" | grep "Session ID:" | awk '{print $3}' | head -c 20)..."
else
  test_result 1
fi
echo ""

# Test 3: Verify UTM capture
echo "3️⃣  Verifying UTM params captured..."
if echo "$DB_OUTPUT" | grep -q "UTM Source:.*google"; then
  test_result 0
  echo "UTM Source: $(echo "$DB_OUTPUT" | grep "UTM Source:" | awk -F: '{print $2}' | xargs)"
else
  test_result 1
fi
echo ""

# Test 4: Verify geolocation data
echo "4️⃣  Verifying geolocation data..."
if echo "$DB_OUTPUT" | grep -q "ASN:" && echo "$DB_OUTPUT" | grep -q "Country:"; then
  test_result 0
  echo "ASN: $(echo "$DB_OUTPUT" | grep "ASN:" | awk -F: '{print $2}' | xargs)"
  echo "Country: $(echo "$DB_OUTPUT" | grep "Country:" | awk -F: '{print $2}' | xargs)"
else
  test_result 1
fi
echo ""

# Test 5: Verify IP/UA hashing
echo "5️⃣  Verifying IP/UA hashing..."
if echo "$DB_OUTPUT" | grep -q "IP Hash:" && echo "$DB_OUTPUT" | grep -q "UA Hash:"; then
  IP_HASH=$(echo "$DB_OUTPUT" | grep "IP Hash:" | awk -F: '{print $2}' | xargs)
  UA_HASH=$(echo "$DB_OUTPUT" | grep "UA Hash:" | awk -F: '{print $2}' | xargs)
  
  if [ ${#IP_HASH} -eq 16 ] && [ ${#UA_HASH} -eq 16 ]; then
    test_result 0
    echo "IP Hash: $IP_HASH (16 chars)"
    echo "UA Hash: $UA_HASH (16 chars)"
  else
    echo "Hash length incorrect: IP=${#IP_HASH}, UA=${#UA_HASH}"
    test_result 1
  fi
else
  test_result 1
fi
echo ""

# Test 6: Verify anonymous session (privacy)
echo "6️⃣  Verifying session anonymous by default..."
if echo "$DB_OUTPUT" | grep -q "Client ID:.*null"; then
  test_result 0
  echo "Session is anonymous (client_id = NULL)"
else
  test_result 1
fi
echo ""

# Summary
echo "================================="
echo "SUMMARY"
echo "================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
fi
