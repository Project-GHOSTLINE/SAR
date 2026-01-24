#!/bin/bash

# Test Helper Functions Library
# Provides common utilities for API testing scripts

# ════════════════════════════════════════════════════════
# COLORS
# ════════════════════════════════════════════════════════

export GREEN='\033[0;32m'
export RED='\033[0;31m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# ════════════════════════════════════════════════════════
# COUNTERS
# ════════════════════════════════════════════════════════

export TOTAL_PASSED=0
export TOTAL_FAILED=0
export LAST_RESPONSE=""

# ════════════════════════════════════════════════════════
# AUTHENTICATION
# ════════════════════════════════════════════════════════

# Returns authentication header for API requests
# Uses x-api-key method with ADMIN_PASSWORD
authenticate() {
  local password="${ADMIN_PASSWORD:-}"

  if [ -z "$password" ]; then
    echo -e "${RED}❌ ERROR: ADMIN_PASSWORD not set${NC}" >&2
    echo "Please set ADMIN_PASSWORD environment variable" >&2
    exit 1
  fi

  # Return just the password, curl -H will be added by caller
  echo "$password"
}

# ════════════════════════════════════════════════════════
# HTTP TEST FUNCTION
# ════════════════════════════════════════════════════════

# Test an HTTP endpoint
# Usage: test_endpoint "Test Name" "GET|POST" "/endpoint" "expected_status" "optional_data"
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local expected_status=$4
  local data=${5:-}

  echo -n "Testing $name... "

  local password
  password=$(authenticate)

  local response
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -H "x-api-key: $password" "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" -H "x-api-key: $password" \
      -H "Content-Type: application/json" \
      -d "$data" "$BASE_URL$endpoint" 2>&1)
  fi

  local status
  status=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"
    if command -v jq &> /dev/null && echo "$body" | jq . &> /dev/null; then
      echo "   Response: $(echo "$body" | jq -c . | head -c 150)"
    else
      echo "   Response: $(echo "$body" | head -c 150)"
    fi
    ((TOTAL_PASSED++))
    # Export body to global variable for validation
    LAST_RESPONSE="$body"
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status)"
    if command -v jq &> /dev/null && echo "$body" | jq . &> /dev/null; then
      echo "   Response: $(echo "$body" | jq -c . | head -c 150)"
    else
      echo "   Response: $(echo "$body" | head -c 150)"
    fi
    ((TOTAL_FAILED++))
    LAST_RESPONSE=""
    return 1
  fi
}

# ════════════════════════════════════════════════════════
# JSON VALIDATION
# ════════════════════════════════════════════════════════

# Validate a JSON field exists and optionally check its type
# Usage: validate_field "$json" "field.path" "expected_type"
validate_field() {
  local json=$1
  local field=$2
  local expected_type=${3:-}

  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not installed - skipping field validation${NC}"
    return 0
  fi

  local value
  value=$(echo "$json" | jq -r ".$field" 2>/dev/null)

  if [ "$value" = "null" ] || [ -z "$value" ]; then
    echo -e "${RED}❌ Field missing or null: $field${NC}"
    return 1
  fi

  if [ -n "$expected_type" ]; then
    local actual_type
    actual_type=$(echo "$json" | jq -r ".$field | type" 2>/dev/null)

    if [ "$actual_type" != "$expected_type" ]; then
      echo -e "${RED}❌ Field type mismatch: $field (expected $expected_type, got $actual_type)${NC}"
      return 1
    fi
  fi

  echo -e "${GREEN}✅ Field valid: $field${NC}"
  return 0
}

# ════════════════════════════════════════════════════════
# RETRY LOGIC
# ════════════════════════════════════════════════════════

# Retry a command with exponential backoff
# Usage: retry_with_backoff command args...
retry_with_backoff() {
  local max_attempts=3
  local timeout=2
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if "$@"; then
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      echo -e "${YELLOW}⚠️  Attempt $attempt/$max_attempts failed. Retrying in ${timeout}s...${NC}"
      sleep $timeout
      timeout=$((timeout * 2))
    fi

    attempt=$((attempt + 1))
  done

  echo -e "${RED}❌ Max retries ($max_attempts) reached. Failing.${NC}"
  return 1
}

# ════════════════════════════════════════════════════════
# SUMMARY REPORT
# ════════════════════════════════════════════════════════

# Print test summary with pass/fail counts
# Usage: print_summary "Script Name"
print_summary() {
  local script_name=$1

  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "📊 SUMMARY: $script_name"
  echo "════════════════════════════════════════════════════════"
  echo -e "${GREEN}✅ Passed: $TOTAL_PASSED${NC}"
  echo -e "${RED}❌ Failed: $TOTAL_FAILED${NC}"

  local total=$((TOTAL_PASSED + TOTAL_FAILED))
  if [ $total -gt 0 ]; then
    local pass_rate=$((TOTAL_PASSED * 100 / total))
    echo "Pass Rate: ${pass_rate}%"
  fi

  echo ""

  if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    return 0
  else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    return 1
  fi
}

# ════════════════════════════════════════════════════════
# SECTION HEADERS
# ════════════════════════════════════════════════════════

# Print a test suite header
# Usage: print_suite_header "Suite Name"
print_suite_header() {
  local suite_name=$1
  echo ""
  echo "📊 Test Suite: $suite_name"
  echo "────────────────────────────────────────────────────────"
}

# Print main header
# Usage: print_main_header "Script Title"
print_main_header() {
  local title=$1
  echo "════════════════════════════════════════════════════════"
  echo "🔧 $title"
  echo "════════════════════════════════════════════════════════"
  echo ""
  echo "Base URL: ${BASE_URL:-https://admin.solutionargentrapide.ca}"
  echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
}

# ════════════════════════════════════════════════════════
# UTILITIES
# ════════════════════════════════════════════════════════

# Check if required commands are available
check_dependencies() {
  local deps=("curl")
  local missing=()

  for cmd in "${deps[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
      missing+=("$cmd")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required dependencies: ${missing[*]}${NC}"
    echo "Please install them before running this script"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not installed - JSON validation will be limited${NC}"
  fi
}

# Check if BASE_URL is set
check_base_url() {
  if [ -z "${BASE_URL:-}" ]; then
    export BASE_URL="https://admin.solutionargentrapide.ca"
    echo -e "${YELLOW}⚠️  BASE_URL not set, using default: $BASE_URL${NC}"
  fi
}
