#!/bin/bash

# Google Analytics API Test Script
# Tests all Google Analytics 4 endpoints and validates data structure

set -e

# Load helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test-helpers.sh"

# Check dependencies
check_dependencies
check_base_url

# Print header
print_main_header "Google Analytics 4 API Test Suite"

# ════════════════════════════════════════════════════════
# TEST SUITE 1: GA4 CREDENTIALS DIAGNOSTIC
# ════════════════════════════════════════════════════════

print_suite_header "GA4 Credentials Diagnostic"

# Test 1.1: Check GA4 Status endpoint
test_endpoint \
  "GA4 Status Check" \
  "GET" \
  "/api/seo/ga4-status" \
  "200"

if [ $? -eq 0 ]; then
  # Validate response structure
  if command -v jq &> /dev/null; then
    validate_field "$LAST_RESPONSE" "success" "boolean"
    validate_field "$LAST_RESPONSE" "mode" "string"

    mode=$(echo "$LAST_RESPONSE" | jq -r '.mode')
    if [ "$mode" = "REAL DATA" ]; then
      echo -e "${GREEN}✅ GA4 in REAL DATA mode - credentials configured${NC}"
    elif [ "$mode" = "MOCK MODE" ]; then
      echo -e "${YELLOW}⚠️  GA4 in MOCK MODE - check credentials${NC}"
    fi

    # Check status fields
    validate_field "$LAST_RESPONSE" "status.GA_SERVICE_ACCOUNT_JSON.exists"
    validate_field "$LAST_RESPONSE" "status.GA_PROPERTY_ID.exists"
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 2: RAW ANALYTICS DATA
# ════════════════════════════════════════════════════════

print_suite_header "Raw Analytics Data Retrieval"

# Test 2.1: Get 7 days data
test_endpoint \
  "Analytics 7 days data" \
  "GET" \
  "/api/admin/analytics?startDate=7daysAgo&endDate=today" \
  "200"

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$LAST_RESPONSE" "success" "boolean"
    validate_field "$LAST_RESPONSE" "totalRows" "number"
    validate_field "$LAST_RESPONSE" "dateRange.startDate" "string"
    validate_field "$LAST_RESPONSE" "dateRange.endDate" "string"

    # Validate summary if present
    summary_exists=$(echo "$LAST_RESPONSE" | jq -r '.summary' 2>/dev/null)
    if [ "$summary_exists" != "null" ]; then
      validate_field "$LAST_RESPONSE" "summary.totalUsers" "number"
      validate_field "$LAST_RESPONSE" "summary.totalSessions" "number"
      validate_field "$LAST_RESPONSE" "summary.totalPageViews" "number"
      validate_field "$LAST_RESPONSE" "summary.totalConversions" "number"
    fi

    # Save 7d data for comparison
    response_7d="$LAST_RESPONSE"
  fi
fi

echo ""

# Test 2.2: Get 30 days data
test_endpoint \
  "Analytics 30 days data" \
  "GET" \
  "/api/admin/analytics?startDate=30daysAgo&endDate=today" \
  "200"

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$LAST_RESPONSE" "success" "boolean"

    # Compare 30d vs 7d (30d should have more or equal sessions)
    if [ "$summary_exists" != "null" ]; then
      sessions_7d=$(echo "$response_7d" | jq -r '.summary.totalSessions // 0')
      sessions_30d=$(echo "$LAST_RESPONSE" | jq -r '.summary.totalSessions // 0')

      if [ "$sessions_30d" -ge "$sessions_7d" ]; then
        echo -e "${GREEN}✅ Data consistency check: 30d ($sessions_30d) >= 7d ($sessions_7d)${NC}"
      else
        echo -e "${YELLOW}⚠️  Data inconsistency: 30d ($sessions_30d) < 7d ($sessions_7d)${NC}"
      fi
    fi
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 3: DASHBOARD AGGREGATED DATA
# ════════════════════════════════════════════════════════

print_suite_header "Dashboard Aggregated Data"

# Test 3.1: Dashboard 7 days
start_time=$(date +%s)
test_endpoint \
  "Dashboard 7d" \
  "GET" \
  "/api/admin/analytics/dashboard?period=7d" \
  "200"
end_time=$(date +%s)
duration=$((end_time - start_time))

if [ $? -eq 0 ]; then
  echo "   Response time: ${duration}s"

  if command -v jq &> /dev/null; then
    validate_field "$LAST_RESPONSE" "success" "boolean"
    validate_field "$LAST_RESPONSE" "data.overview" "object"
    validate_field "$LAST_RESPONSE" "data.devices" "array"
    validate_field "$LAST_RESPONSE" "data.trafficSources" "array"
    validate_field "$LAST_RESPONSE" "data.geography" "array"

    # Check overview metrics
    validate_field "$LAST_RESPONSE" "data.overview.totalUsers" "number"
    validate_field "$LAST_RESPONSE" "data.overview.totalSessions" "number"
    validate_field "$LAST_RESPONSE" "data.overview.bounceRate" "number"

    # Save 7d dashboard for structure validation
    response_dash_7d="$LAST_RESPONSE"
  fi
fi

echo ""

# Test 3.2: Dashboard 30 days (test caching)
start_time=$(date +%s)
test_endpoint \
  "Dashboard 30d (cache test)" \
  "GET" \
  "/api/admin/analytics/dashboard?period=30d" \
  "200"
end_time=$(date +%s)
duration=$((end_time - start_time))

if [ $? -eq 0 ]; then
  echo "   Response time: ${duration}s"

  if [ $duration -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Response time > 5s - cache may not be working${NC}"
  else
    echo -e "${GREEN}✅ Response time acceptable${NC}"
  fi

  if command -v jq &> /dev/null; then
    validate_field "$LAST_RESPONSE" "success" "boolean"
    validate_field "$LAST_RESPONSE" "period" "string"
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 4: DATA STRUCTURE VALIDATION
# ════════════════════════════════════════════════════════

print_suite_header "Data Structure Validation"

if command -v jq &> /dev/null && [ -n "$response_dash_7d" ]; then
  # Validate devices structure
  echo -n "Validating devices array structure... "
  devices_count=$(echo "$response_dash_7d" | jq -r '.data.devices | length')
  if [ "$devices_count" -gt 0 ]; then
    first_device=$(echo "$response_dash_7d" | jq -r '.data.devices[0]')
    if echo "$first_device" | jq -e '.category, .users, .sessions, .pageViews' &> /dev/null; then
      echo -e "${GREEN}✅ PASS${NC}"
      ((TOTAL_PASSED++))
    else
      echo -e "${RED}❌ FAIL - Missing required fields${NC}"
      ((TOTAL_FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠️  No devices data${NC}"
  fi

  # Validate traffic sources structure
  echo -n "Validating traffic sources structure... "
  sources_count=$(echo "$response_dash_7d" | jq -r '.data.trafficSources | length')
  if [ "$sources_count" -gt 0 ]; then
    first_source=$(echo "$response_dash_7d" | jq -r '.data.trafficSources[0]')
    if echo "$first_source" | jq -e '.source, .medium, .users, .sessions' &> /dev/null; then
      echo -e "${GREEN}✅ PASS${NC}"
      ((TOTAL_PASSED++))
    else
      echo -e "${RED}❌ FAIL - Missing required fields${NC}"
      ((TOTAL_FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠️  No traffic sources data${NC}"
  fi

  # Validate geography structure
  echo -n "Validating geography structure... "
  geo_count=$(echo "$response_dash_7d" | jq -r '.data.geography | length')
  if [ "$geo_count" -gt 0 ]; then
    first_geo=$(echo "$response_dash_7d" | jq -r '.data.geography[0]')
    if echo "$first_geo" | jq -e '.country, .city, .users, .sessions' &> /dev/null; then
      echo -e "${GREEN}✅ PASS${NC}"
      ((TOTAL_PASSED++))
    else
      echo -e "${RED}❌ FAIL - Missing required fields${NC}"
      ((TOTAL_FAILED++))
    fi
  else
    echo -e "${YELLOW}⚠️  No geography data${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  jq not available or no data - skipping structure validation${NC}"
fi

echo ""

# ════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════

print_summary "Google Analytics Test Suite"

# Exit with failure count
exit $TOTAL_FAILED
