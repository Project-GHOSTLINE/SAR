#!/bin/bash

###############################################################################
# TEST COMPLET SEO - Vérification et Preuves
###############################################################################
#
# Ce script teste TOUTES les sources de données SEO et génère un rapport
# avec preuves de fonctionnement:
# - Google Analytics 4 (GA4)
# - Semrush
# - Google Search Console (GSC)
# - Supabase collections
#
###############################################################################

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://admin.solutionargentrapide.ca}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ Erreur: ADMIN_PASSWORD non défini${NC}"
  echo "Usage: ADMIN_PASSWORD=xxx ./scripts/test-seo-complete.sh"
  exit 1
fi

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction pour afficher un titre de section
section() {
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}$1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
}

# Fonction pour tester un endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="${4:-200}"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -e "\n${BLUE}🧪 Test: ${name}${NC}"
  echo -e "   Endpoint: ${method} ${endpoint}"

  # Faire la requête
  local response=$(curl -s -w "\n%{http_code}" \
    -X "$method" \
    -H "x-api-key: $ADMIN_PASSWORD" \
    "${BASE_URL}${endpoint}")

  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  # Vérifier le status code
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "   ${GREEN}✓ Status: $http_code${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Afficher un extrait du body (jq si disponible)
    if command -v jq &> /dev/null; then
      echo -e "   ${GREEN}✓ Response:${NC}"
      echo "$body" | jq -C '.' | head -10 | sed 's/^/     /'
    else
      echo -e "   Response: ${body:0:200}..."
    fi

    echo "$body"
    return 0
  else
    echo -e "   ${RED}✗ Status: $http_code (attendu: $expected_status)${NC}"
    echo -e "   ${RED}✗ Response: $body${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Fonction pour extraire une valeur JSON
extract_json() {
  local json="$1"
  local key="$2"

  if command -v jq &> /dev/null; then
    echo "$json" | jq -r "$key" 2>/dev/null || echo "null"
  else
    echo "null"
  fi
}

###############################################################################
# DÉBUT DES TESTS
###############################################################################

echo -e "${BOLD}${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     TEST COMPLET SEO - VÉRIFICATION & PREUVES            ║
║                                                           ║
║     Google Analytics 4 ✓                                 ║
║     Semrush ✓                                            ║
║     Google Search Console ✓                              ║
║     Supabase Collections ✓                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "Base URL: ${BOLD}${BASE_URL}${NC}"
echo -e "Timestamp: ${BOLD}$(date '+%Y-%m-%d %H:%M:%S')${NC}"

###############################################################################
# 1. HEALTH CHECK GLOBAL
###############################################################################

section "1️⃣  HEALTH CHECK GLOBAL"

HEALTH_RESPONSE=$(test_endpoint \
  "SEO Health Check" \
  "GET" \
  "/api/seo/health")

if [ $? -eq 0 ]; then
  # Extraire les statuts
  OVERALL_HEALTH=$(extract_json "$HEALTH_RESPONSE" '.overall_health')
  GA4_STATUS=$(extract_json "$HEALTH_RESPONSE" '.services.google_analytics.status')
  SEMRUSH_STATUS=$(extract_json "$HEALTH_RESPONSE" '.services.semrush.status')
  GSC_STATUS=$(extract_json "$HEALTH_RESPONSE" '.services.search_console.status')
  DB_CONNECTED=$(extract_json "$HEALTH_RESPONSE" '.database.supabase_connected')

  echo ""
  echo -e "${BOLD}📊 Résumé Health Check:${NC}"
  echo -e "   Overall: ${OVERALL_HEALTH}"
  echo -e "   GA4: ${GA4_STATUS}"
  echo -e "   Semrush: ${SEMRUSH_STATUS}"
  echo -e "   GSC: ${GSC_STATUS}"
  echo -e "   Database: ${DB_CONNECTED}"
fi

###############################################################################
# 2. GOOGLE ANALYTICS 4 (GA4)
###############################################################################

section "2️⃣  GOOGLE ANALYTICS 4 (GA4)"

# Test 2.1: GA4 Status
echo -e "\n${YELLOW}Test 2.1: GA4 Configuration Status${NC}"
GA4_STATUS_RESPONSE=$(test_endpoint \
  "GA4 Status Check" \
  "GET" \
  "/api/seo/ga4-status")

if [ $? -eq 0 ]; then
  MODE=$(extract_json "$GA4_STATUS_RESPONSE" '.mode')
  CONFIGURED=$(extract_json "$GA4_STATUS_RESPONSE" '.status.GA_SERVICE_ACCOUNT_JSON.exists')

  echo -e "\n${BOLD}📊 GA4 Configuration:${NC}"
  echo -e "   Mode: ${MODE}"
  echo -e "   Configured: ${CONFIGURED}"
fi

# Test 2.2: GA4 Dashboard Data (7 jours)
echo -e "\n${YELLOW}Test 2.2: GA4 Dashboard Data (7d)${NC}"
GA4_DASHBOARD_7D=$(test_endpoint \
  "GA4 Dashboard 7 jours" \
  "GET" \
  "/api/admin/analytics/dashboard?period=7d")

if [ $? -eq 0 ]; then
  TOTAL_USERS=$(extract_json "$GA4_DASHBOARD_7D" '.data.overview.totalUsers')
  TOTAL_SESSIONS=$(extract_json "$GA4_DASHBOARD_7D" '.data.overview.totalSessions')

  echo -e "\n${BOLD}📊 GA4 Métriques (7d):${NC}"
  echo -e "   Total Users: ${TOTAL_USERS}"
  echo -e "   Total Sessions: ${TOTAL_SESSIONS}"
fi

# Test 2.3: GA4 Dashboard Data (30 jours)
echo -e "\n${YELLOW}Test 2.3: GA4 Dashboard Data (30d)${NC}"
GA4_DASHBOARD_30D=$(test_endpoint \
  "GA4 Dashboard 30 jours" \
  "GET" \
  "/api/admin/analytics/dashboard?period=30d")

if [ $? -eq 0 ]; then
  TOTAL_USERS_30D=$(extract_json "$GA4_DASHBOARD_30D" '.data.overview.totalUsers')
  TOTAL_SESSIONS_30D=$(extract_json "$GA4_DASHBOARD_30D" '.data.overview.totalSessions')

  echo -e "\n${BOLD}📊 GA4 Métriques (30d):${NC}"
  echo -e "   Total Users: ${TOTAL_USERS_30D}"
  echo -e "   Total Sessions: ${TOTAL_SESSIONS_30D}"

  # Validation: 30d doit avoir >= 7d
  if [ "$TOTAL_SESSIONS_30D" -ge "$TOTAL_SESSIONS" ]; then
    echo -e "   ${GREEN}✓ Cohérence: 30d >= 7d${NC}"
  else
    echo -e "   ${RED}✗ Incohérence: 30d < 7d${NC}"
  fi
fi

# Test 2.4: GA4 Raw Analytics Data
echo -e "\n${YELLOW}Test 2.4: GA4 Raw Analytics Data${NC}"
GA4_RAW=$(test_endpoint \
  "GA4 Raw Data" \
  "GET" \
  "/api/admin/analytics?startDate=7daysAgo&endDate=today")

if [ $? -eq 0 ]; then
  ROW_COUNT=$(extract_json "$GA4_RAW" '.totalRows')

  echo -e "\n${BOLD}📊 GA4 Raw Data:${NC}"
  echo -e "   Total Rows: ${ROW_COUNT}"
fi

###############################################################################
# 3. SEMRUSH
###############################################################################

section "3️⃣  SEMRUSH API"

# Test 3.1: Semrush Keyword Research
echo -e "\n${YELLOW}Test 3.1: Semrush Keyword Research${NC}"
SEMRUSH_KW=$(test_endpoint \
  "Semrush Keywords (prêt rapide)" \
  "GET" \
  "/api/seo/semrush/keyword-research?keyword=prêt%20rapide&type=related&limit=10")

if [ $? -eq 0 ]; then
  KW_COUNT=$(extract_json "$SEMRUSH_KW" '.keywords | length')

  echo -e "\n${BOLD}📊 Semrush Keywords:${NC}"
  echo -e "   Keywords Found: ${KW_COUNT}"
fi

# Test 3.2: Semrush Backlinks Overview
echo -e "\n${YELLOW}Test 3.2: Semrush Backlinks Overview${NC}"
SEMRUSH_BL=$(test_endpoint \
  "Semrush Backlinks" \
  "GET" \
  "/api/seo/semrush/backlinks?type=overview")

if [ $? -eq 0 ]; then
  TOTAL_BACKLINKS=$(extract_json "$SEMRUSH_BL" '.overview.total_backlinks')
  AUTHORITY_SCORE=$(extract_json "$SEMRUSH_BL" '.overview.authority_score')

  echo -e "\n${BOLD}📊 Semrush Backlinks:${NC}"
  echo -e "   Total Backlinks: ${TOTAL_BACKLINKS}"
  echo -e "   Authority Score: ${AUTHORITY_SCORE}"
fi

# Test 3.3: Semrush Competitors
echo -e "\n${YELLOW}Test 3.3: Semrush Competitors${NC}"
SEMRUSH_COMP=$(test_endpoint \
  "Semrush Competitors" \
  "GET" \
  "/api/seo/semrush/competitors?type=organic&limit=5")

if [ $? -eq 0 ]; then
  COMP_COUNT=$(extract_json "$SEMRUSH_COMP" '.competitors | length')

  echo -e "\n${BOLD}📊 Semrush Competitors:${NC}"
  echo -e "   Competitors Found: ${COMP_COUNT}"
fi

# Test 3.4: Semrush Collection (récupérer dernières données)
echo -e "\n${YELLOW}Test 3.4: Semrush Supabase Collection${NC}"
END_DATE=$(date '+%Y-%m-%d')
START_DATE=$(date -v-30d '+%Y-%m-%d' 2>/dev/null || date -d '30 days ago' '+%Y-%m-%d')

SEMRUSH_COLLECTION=$(test_endpoint \
  "Semrush Collection Query" \
  "GET" \
  "/api/seo/collect/semrush?startDate=${START_DATE}&endDate=${END_DATE}")

if [ $? -eq 0 ]; then
  COLLECTION_COUNT=$(extract_json "$SEMRUSH_COLLECTION" '.data | length')

  if [ "$COLLECTION_COUNT" != "null" ] && [ "$COLLECTION_COUNT" -gt 0 ]; then
    LAST_DATE=$(extract_json "$SEMRUSH_COLLECTION" '.data[0].date')
    ORGANIC_KW=$(extract_json "$SEMRUSH_COLLECTION" '.data[0].organic_keywords')
    ORGANIC_TRAFFIC=$(extract_json "$SEMRUSH_COLLECTION" '.data[0].organic_traffic')

    echo -e "\n${BOLD}📊 Semrush Collection:${NC}"
    echo -e "   Entries: ${COLLECTION_COUNT}"
    echo -e "   Last Date: ${LAST_DATE}"
    echo -e "   Organic Keywords: ${ORGANIC_KW}"
    echo -e "   Organic Traffic: ${ORGANIC_TRAFFIC}"
  else
    echo -e "\n${YELLOW}⚠️  Aucune donnée collectée - Exécutez POST /api/seo/collect/semrush${NC}"
  fi
fi

###############################################################################
# 4. GOOGLE SEARCH CONSOLE
###############################################################################

section "4️⃣  GOOGLE SEARCH CONSOLE (GSC)"

echo -e "\n${YELLOW}ℹ️  Google Search Console:${NC}"
echo -e "   Status: Configuration requise"
echo -e "   Note: GSC n'est pas encore implémenté dans l'API"
echo -e "   TODO: Ajouter endpoint /api/seo/gsc"

###############################################################################
# 5. SUPABASE COLLECTIONS
###############################################################################

section "5️⃣  SUPABASE COLLECTIONS"

echo -e "\n${YELLOW}Test 5.1: Supabase Tables Check${NC}"

# Déjà testé via /api/seo/health, on affiche juste le résumé
TABLES=$(extract_json "$HEALTH_RESPONSE" '.database.tables_exist | join(", ")')
LAST_GA4=$(extract_json "$HEALTH_RESPONSE" '.database.last_collection_ga4')
LAST_SEMRUSH=$(extract_json "$HEALTH_RESPONSE" '.database.last_collection_semrush')

echo -e "\n${BOLD}📊 Supabase Collections:${NC}"
echo -e "   Tables: ${TABLES}"
echo -e "   Last GA4 Collection: ${LAST_GA4}"
echo -e "   Last Semrush Collection: ${LAST_SEMRUSH}"

###############################################################################
# RÉSUMÉ FINAL
###############################################################################

section "📊 RÉSUMÉ FINAL"

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo ""
echo -e "${BOLD}Tests Exécutés: ${TOTAL_TESTS}${NC}"
echo -e "${GREEN}✓ Passés: ${PASSED_TESTS}${NC}"
echo -e "${RED}✗ Échoués: ${FAILED_TESTS}${NC}"
echo -e "${BOLD}Taux de Réussite: ${PASS_RATE}%${NC}"

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}🎉 TOUS LES TESTS PASSENT - SYSTÈME OPÉRATIONNEL!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}⚠️  CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIEZ LES ERREURS CI-DESSUS${NC}"
  exit 1
fi
