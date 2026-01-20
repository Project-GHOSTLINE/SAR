#!/bin/bash
#
# SMOKE TEST - PHASE 2
#
# Tests 5 critical endpoints and verifies instrumentation works
#
# Usage:
#   ./scripts/perf/smoke.sh
#   ./scripts/perf/smoke.sh http://localhost:3001  # Custom base URL
#
# Requirements:
#   - Dev server running (npm run dev)
#   - jq installed (brew install jq)
#

set -e  # Exit on error

BASE_URL="${1:-http://localhost:3000}"
PERF_LOG="logs/perf.ndjson"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  SAR PERFORMANCE SMOKE TEST - PHASE 2"
echo "========================================"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Clear previous logs
if [ -f "$PERF_LOG" ]; then
  echo -e "${YELLOW}Clearing previous logs...${NC}"
  rm "$PERF_LOG"
  touch "$PERF_LOG"
fi

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local expected_status="${4:-200}"
  local max_time_ms="${5:-1000}"

  TOTAL=$((TOTAL + 1))

  echo -e "${BLUE}[$TOTAL] Testing:${NC} $method $path"

  # Make request and measure time
  local start=$(date +%s%3N)
  local response
  local status

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$path" 2>/dev/null || echo "FAILED\n000")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d '{}' 2>/dev/null || echo "FAILED\n000")
  else
    echo -e "${RED}✗ Unknown method: $method${NC}"
    FAILED=$((FAILED + 1))
    return
  fi

  local end=$(date +%s%3N)
  local duration=$((end - start))

  # Extract status code (last line)
  status=$(echo "$response" | tail -n 1)

  # Check status code
  if [ "$status" = "$expected_status" ]; then
    if [ "$duration" -lt "$max_time_ms" ]; then
      echo -e "${GREEN}✓ PASS${NC} - ${duration}ms (status=$status)"
      PASSED=$((PASSED + 1))
    else
      echo -e "${YELLOW}⚠ SLOW${NC} - ${duration}ms (expected <${max_time_ms}ms, status=$status)"
      PASSED=$((PASSED + 1))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} - Status $status (expected $expected_status)"
    FAILED=$((FAILED + 1))
  fi

  echo ""
}

# ============================================================================
# HOTPATH 1: /api/admin/messages
# ============================================================================
test_endpoint \
  "Messages Inbox" \
  "GET" \
  "/api/admin/messages" \
  200 \
  500

# ============================================================================
# HOTPATH 2: /api/admin/analytics/dashboard
# ============================================================================
test_endpoint \
  "Analytics Dashboard" \
  "GET" \
  "/api/admin/analytics/dashboard" \
  200 \
  800

# ============================================================================
# HOTPATH 3: /api/admin/client-analysis
# ============================================================================
# Note: POST requires valid payload, test with empty body for now
test_endpoint \
  "Client Analysis" \
  "POST" \
  "/api/admin/client-analysis" \
  400 \
  200  # Should fail fast with validation error

# ============================================================================
# HOTPATH 4: /api/applications/submit
# ============================================================================
# Note: POST requires valid payload, test with empty body for now
test_endpoint \
  "Application Submit" \
  "POST" \
  "/api/applications/submit" \
  400 \
  200  # Should fail fast with validation error

# ============================================================================
# HOTPATH 5: /api/webhooks/vopay
# ============================================================================
# Note: Webhook requires signature, test with empty body for now
test_endpoint \
  "VoPay Webhook" \
  "POST" \
  "/api/webhooks/vopay" \
  401 \
  100  # Should fail fast with auth error

# ============================================================================
# SUMMARY
# ============================================================================
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo ""
echo "Total:  $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

# Check if perf logs were created
if [ -f "$PERF_LOG" ]; then
  LOG_COUNT=$(wc -l < "$PERF_LOG" | tr -d ' ')
  echo -e "${GREEN}✓ Performance logs created:${NC} $LOG_COUNT entries in $PERF_LOG"
  echo ""

  # Show sample log entry
  echo "Sample log entry:"
  echo "---"
  head -n 1 "$PERF_LOG" | jq '.' 2>/dev/null || head -n 1 "$PERF_LOG"
  echo ""
else
  echo -e "${YELLOW}⚠ No performance logs found at $PERF_LOG${NC}"
  echo ""
fi

# Exit with failure if any tests failed
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}SMOKE TEST FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}SMOKE TEST PASSED${NC}"
  exit 0
fi
