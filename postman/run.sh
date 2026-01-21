#!/usr/bin/env bash
set -euo pipefail

#########################################
# SAR - Newman API Test Runner
# Executes Postman collections with Newman
# Generates JSON + HTML reports
#########################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENV="${1:-dev}"

# Paths
COLLECTION="$SCRIPT_DIR/collections/SAR-API-Tests.postman_collection.json"
ENVIRONMENT="$SCRIPT_DIR/environments/${ENV}.json"
REPORTS_DIR="$SCRIPT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_NAME="${ENV}_${TIMESTAMP}"

# Validate environment file exists
if [ ! -f "$ENVIRONMENT" ]; then
  echo -e "${RED}❌ Environment file not found: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}Available environments: dev, staging, prod${NC}"
  exit 1
fi

# Validate collection exists
if [ ! -f "$COLLECTION" ]; then
  echo -e "${RED}❌ Collection not found: $COLLECTION${NC}"
  exit 1
fi

# Create reports directory if needed
mkdir -p "$REPORTS_DIR"

# Print header
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   SAR - Newman API Test Runner${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Environment:${NC} $ENV"
echo -e "${YELLOW}Collection:${NC}  SAR-API-Tests"
echo -e "${YELLOW}Report:${NC}      $REPORT_NAME"
echo ""

# Run Newman with JSON + HTML reports
echo -e "${GREEN}🚀 Executing API tests...${NC}"
echo ""

newman run "$COLLECTION" \
  --environment "$ENVIRONMENT" \
  --reporters cli,json,htmlextra \
  --reporter-json-export "$REPORTS_DIR/${REPORT_NAME}.json" \
  --reporter-htmlextra-export "$REPORTS_DIR/${REPORT_NAME}.html" \
  --reporter-htmlextra-title "SAR API Tests - ${ENV}" \
  --reporter-htmlextra-showEnvironmentData \
  --reporter-htmlextra-showMarkdownLinks \
  --reporter-htmlextra-logs \
  --reporter-htmlextra-omitHeaders "Authorization,Cookie,Set-Cookie" \
  --color on \
  --disable-unicode \
  --timeout-request 30000

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create symlinks to latest reports
ln -sf "${REPORT_NAME}.json" "$REPORTS_DIR/latest.json"
ln -sf "${REPORT_NAME}.html" "$REPORTS_DIR/latest.html"

# Display results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All API tests passed!${NC}"
else
  echo -e "${RED}❌ Some API tests failed${NC}"
fi

echo ""
echo -e "${YELLOW}📊 Reports generated:${NC}"
echo -e "   JSON: ${REPORTS_DIR}/${REPORT_NAME}.json"
echo -e "   HTML: ${REPORTS_DIR}/${REPORT_NAME}.html"
echo ""
echo -e "${YELLOW}📖 View HTML report:${NC}"
echo -e "   npm run api:report"
echo -e "   OR"
echo -e "   open ${REPORTS_DIR}/latest.html"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $TEST_EXIT_CODE
