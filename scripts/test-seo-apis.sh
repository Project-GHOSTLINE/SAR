#!/bin/bash

# SEO APIs Test Runner
# Unified test runner for Google Analytics and Semrush APIs

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# Start time
START_TIME=$(date +%s)

# Print main header
echo "════════════════════════════════════════════════════════"
echo "🚀 SEO APIs Test Runner"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Base URL: ${BASE_URL:-https://admin.solutionargentrapide.ca}"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if ADMIN_PASSWORD is set
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo -e "${RED}❌ ERROR: ADMIN_PASSWORD not set${NC}"
  echo "Please set ADMIN_PASSWORD environment variable"
  echo ""
  echo "Usage:"
  echo "  export ADMIN_PASSWORD='your-password'"
  echo "  ./scripts/test-seo-apis.sh"
  exit 1
fi

# ════════════════════════════════════════════════════════
# RUN TEST SUITE 1: GOOGLE ANALYTICS
# ════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Running Google Analytics Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/test-google-analytics.sh" ]; then
  chmod +x "$SCRIPT_DIR/test-google-analytics.sh"

  if "$SCRIPT_DIR/test-google-analytics.sh"; then
    GA_EXIT_CODE=0
    echo -e "${GREEN}✅ Google Analytics tests PASSED${NC}"
  else
    GA_EXIT_CODE=$?
    echo -e "${RED}❌ Google Analytics tests FAILED (exit code: $GA_EXIT_CODE)${NC}"
    TOTAL_FAILED=$((TOTAL_FAILED + GA_EXIT_CODE))
  fi
else
  echo -e "${RED}❌ test-google-analytics.sh not found${NC}"
  GA_EXIT_CODE=1
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

echo ""
echo ""

# ════════════════════════════════════════════════════════
# RUN TEST SUITE 2: SEMRUSH
# ════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Running Semrush Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/test-semrush-api.sh" ]; then
  chmod +x "$SCRIPT_DIR/test-semrush-api.sh"

  if "$SCRIPT_DIR/test-semrush-api.sh"; then
    SEMRUSH_EXIT_CODE=0
    echo -e "${GREEN}✅ Semrush tests PASSED${NC}"
  else
    SEMRUSH_EXIT_CODE=$?

    # Exit code 0 means skipped (no API key), not a failure
    if [ "$SEMRUSH_EXIT_CODE" -eq 0 ]; then
      echo -e "${YELLOW}⚠️  Semrush tests SKIPPED (no API key)${NC}"
    else
      echo -e "${RED}❌ Semrush tests FAILED (exit code: $SEMRUSH_EXIT_CODE)${NC}"
      TOTAL_FAILED=$((TOTAL_FAILED + SEMRUSH_EXIT_CODE))
    fi
  fi
else
  echo -e "${RED}❌ test-semrush-api.sh not found${NC}"
  SEMRUSH_EXIT_CODE=1
  TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi

echo ""
echo ""

# ════════════════════════════════════════════════════════
# FINAL REPORT
# ════════════════════════════════════════════════════════

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "════════════════════════════════════════════════════════"
echo "📊 FINAL TEST REPORT"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Test Suites:"
if [ $GA_EXIT_CODE -eq 0 ]; then
  echo -e "  Google Analytics: ${GREEN}✅ PASSED${NC}"
else
  echo -e "  Google Analytics: ${RED}❌ FAILED${NC} (exit code: $GA_EXIT_CODE)"
fi

if [ $SEMRUSH_EXIT_CODE -eq 0 ]; then
  echo -e "  Semrush:          ${GREEN}✅ PASSED${NC}"
else
  if [ -z "${SEMRUSH_API_KEY:-}" ]; then
    echo -e "  Semrush:          ${YELLOW}⚠️  SKIPPED${NC} (no API key)"
  else
    echo -e "  Semrush:          ${RED}❌ FAILED${NC} (exit code: $SEMRUSH_EXIT_CODE)"
  fi
fi

echo ""
echo "Total duration: ${DURATION}s"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All test suites passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}⚠️  $TOTAL_FAILED test suite(s) failed${NC}"
  echo ""
  echo "Recommendations:"
  echo "  - Check error messages above for details"
  echo "  - Verify API credentials in .env.local"
  echo "  - Run individual test scripts for more details:"
  echo "      ./scripts/test-google-analytics.sh"
  echo "      ./scripts/test-semrush-api.sh"
  echo ""
  exit $TOTAL_FAILED
fi
