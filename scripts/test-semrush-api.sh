#!/bin/bash

# Semrush API Test Script
# Tests all Semrush API endpoints and validates data structure

set -e

# Load helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test-helpers.sh"

# Check dependencies
check_dependencies
check_base_url

# Print header
print_main_header "Semrush API Test Suite"

# Check if SEMRUSH_API_KEY is configured
if [ -z "${SEMRUSH_API_KEY:-}" ]; then
  echo -e "${YELLOW}⚠️  SEMRUSH_API_KEY not configured - skipping tests${NC}"
  echo "Set SEMRUSH_API_KEY environment variable to run Semrush tests"
  exit 0
fi

echo "API Key: ${SEMRUSH_API_KEY:0:20}..."
echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 1: KEYWORD RESEARCH
# ════════════════════════════════════════════════════════

print_suite_header "Keyword Research"

# Test 1.1: Related keywords
response_related=$(test_endpoint \
  "Related keywords search" \
  "GET" \
  "/api/seo/semrush/keyword-research?keyword=prêt+rapide&type=related&limit=10&database=ca" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_related" "success" "boolean"
    validate_field "$response_related" "keywords" "array"

    keywords_count=$(echo "$response_related" | jq -r '.keywords | length')
    echo "   Found $keywords_count related keywords"

    if [ "$keywords_count" -gt 0 ]; then
      # Validate first keyword structure
      first_keyword=$(echo "$response_related" | jq -r '.keywords[0]')
      echo -n "   Validating keyword structure... "
      if echo "$first_keyword" | jq -e '.keyword, .search_volume, .cpc, .difficulty' &> /dev/null; then
        echo -e "${GREEN}✅${NC}"
      else
        echo -e "${RED}❌${NC}"
      fi
    fi
  fi
fi

echo ""

# Test 1.2: Question keywords
response_questions=$(test_endpoint \
  "Questions keywords search" \
  "GET" \
  "/api/seo/semrush/keyword-research?keyword=prêt+rapide&type=questions&limit=5&database=ca" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_questions" "keywords" "array"

    keywords_count=$(echo "$response_questions" | jq -r '.keywords | length')
    echo "   Found $keywords_count question keywords"

    if [ "$keywords_count" -gt 0 ]; then
      # Check if keywords contain question words
      first_keyword=$(echo "$response_questions" | jq -r '.keywords[0].keyword')
      echo "   Sample question: $first_keyword"
    fi
  fi
fi

echo ""

# Test 1.3: Phrase match keywords
response_phrase=$(test_endpoint \
  "Phrase match keywords" \
  "GET" \
  "/api/seo/semrush/keyword-research?keyword=prêt+rapide&type=phrase&limit=10&database=ca" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_phrase" "keywords" "array"

    keywords_count=$(echo "$response_phrase" | jq -r '.keywords | length')
    echo "   Found $keywords_count phrase match keywords"
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 2: BACKLINKS ANALYSIS
# ════════════════════════════════════════════════════════

print_suite_header "Backlinks Analysis"

# Test 2.1: Backlinks overview
response_backlinks_overview=$(test_endpoint \
  "Backlinks overview" \
  "GET" \
  "/api/seo/semrush/backlinks?type=overview&domain=solutionargentrapide.ca" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_backlinks_overview" "success" "boolean"
    validate_field "$response_backlinks_overview" "overview" "object"

    # Extract key metrics
    total_backlinks=$(echo "$response_backlinks_overview" | jq -r '.overview.total_backlinks // "N/A"')
    referring_domains=$(echo "$response_backlinks_overview" | jq -r '.overview.referring_domains // "N/A"')
    authority_score=$(echo "$response_backlinks_overview" | jq -r '.overview.authority_score // "N/A"')

    echo "   Total backlinks: $total_backlinks"
    echo "   Referring domains: $referring_domains"
    echo "   Authority score: $authority_score"
  fi
fi

echo ""

# Test 2.2: Referring domains
response_referring=$(test_endpoint \
  "Referring domains" \
  "GET" \
  "/api/seo/semrush/backlinks?type=referring_domains&limit=10" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_referring" "referring_domains" "array"

    domains_count=$(echo "$response_referring" | jq -r '.referring_domains | length')
    echo "   Found $domains_count referring domains"

    if [ "$domains_count" -gt 0 ]; then
      # Show top 3 domains
      echo "   Top referring domains:"
      echo "$response_referring" | jq -r '.referring_domains[0:3][] | "     - \(.domain) (\(.backlinks_count) backlinks)"' 2>/dev/null || true
    fi
  fi
fi

echo ""

# Test 2.3: Anchor texts
response_anchors=$(test_endpoint \
  "Anchor texts analysis" \
  "GET" \
  "/api/seo/semrush/backlinks?type=anchors&limit=10" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_anchors" "anchor_texts" "array"

    anchors_count=$(echo "$response_anchors" | jq -r '.anchor_texts | length')
    echo "   Found $anchors_count anchor texts"
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 3: COMPETITORS ANALYSIS
# ════════════════════════════════════════════════════════

print_suite_header "Competitors Analysis"

# Test 3.1: Organic competitors
response_competitors=$(test_endpoint \
  "Organic competitors" \
  "GET" \
  "/api/seo/semrush/competitors?type=organic&limit=10" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_competitors" "success" "boolean"
    validate_field "$response_competitors" "competitors" "array"

    competitors_count=$(echo "$response_competitors" | jq -r '.competitors | length')
    echo "   Found $competitors_count organic competitors"

    if [ "$competitors_count" -gt 0 ]; then
      # Validate competitor structure
      first_competitor=$(echo "$response_competitors" | jq -r '.competitors[0]')
      echo -n "   Validating competitor structure... "
      if echo "$first_competitor" | jq -e '.domain, .common_keywords' &> /dev/null; then
        echo -e "${GREEN}✅${NC}"
      else
        echo -e "${RED}❌${NC}"
      fi

      # Show top 3 competitors
      echo "   Top organic competitors:"
      echo "$response_competitors" | jq -r '.competitors[0:3][] | "     - \(.domain) (\(.common_keywords) common keywords)"' 2>/dev/null || true
    fi
  fi
fi

echo ""

# Test 3.2: Keyword gap analysis
response_gap=$(test_endpoint \
  "Keyword gap analysis" \
  "GET" \
  "/api/seo/semrush/competitors?type=keyword_gap&limit=20" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_gap" "opportunities" "array"

    opportunities_count=$(echo "$response_gap" | jq -r '.opportunities | length')
    echo "   Found $opportunities_count keyword opportunities"

    if [ "$opportunities_count" -gt 0 ]; then
      # Show top 3 opportunities
      echo "   Top keyword opportunities:"
      echo "$response_gap" | jq -r '.opportunities[0:3][] | "     - \(.keyword) (found on: \(.found_on // "competitors"))"' 2>/dev/null || true
    fi
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# TEST SUITE 4: DATA COLLECTION & STORAGE
# ════════════════════════════════════════════════════════

print_suite_header "Data Collection & Supabase Storage"

# Test 4.1: Collect data with force
today=$(date '+%Y-%m-%d')
collect_payload="{\"date\": \"$today\", \"force\": true}"

response_collect=$(test_endpoint \
  "Collect Semrush data (forced)" \
  "POST" \
  "/api/seo/collect/semrush" \
  "200" \
  "$collect_payload")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_collect" "success" "boolean"

    # Check if data was collected
    has_data=$(echo "$response_collect" | jq -r '.data' 2>/dev/null)
    if [ "$has_data" != "null" ]; then
      validate_field "$response_collect" "data.domain" "string"
      validate_field "$response_collect" "data.organic_keywords" "number"

      domain=$(echo "$response_collect" | jq -r '.data.domain')
      organic_keywords=$(echo "$response_collect" | jq -r '.data.organic_keywords')
      authority_score=$(echo "$response_collect" | jq -r '.data.authority_score // "N/A"')

      echo "   Domain: $domain"
      echo "   Organic keywords: $organic_keywords"
      echo "   Authority score: $authority_score"
    fi
  fi
fi

echo ""

# Test 4.2: Retrieve collected data
start_date=$(date -v-7d '+%Y-%m-%d' 2>/dev/null || date -d '7 days ago' '+%Y-%m-%d')
end_date=$(date '+%Y-%m-%d')

response_retrieve=$(test_endpoint \
  "Retrieve collected data (7 days)" \
  "GET" \
  "/api/seo/collect/semrush?startDate=$start_date&endDate=$end_date" \
  "200")

if [ $? -eq 0 ]; then
  if command -v jq &> /dev/null; then
    validate_field "$response_retrieve" "success" "boolean"
    validate_field "$response_retrieve" "data" "array"

    data_count=$(echo "$response_retrieve" | jq -r '.data | length')
    echo "   Retrieved $data_count data points"

    if [ "$data_count" -gt 0 ]; then
      echo -e "${GREEN}✅ Supabase storage working correctly${NC}"
    else
      echo -e "${YELLOW}⚠️  No data found in Supabase for this period${NC}"
    fi
  fi
fi

echo ""

# ════════════════════════════════════════════════════════
# FINAL SUMMARY
# ════════════════════════════════════════════════════════

print_summary "Semrush API Test Suite"

# Exit with failure count
exit $TOTAL_FAILED
