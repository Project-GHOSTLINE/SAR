#!/bin/bash
# Script de vérification finale GA4
# Vérifie que TOUT fonctionne à 100%

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        VÉRIFICATION FINALE GA4 - VRAIES DONNÉES                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="http://localhost:3002"
ADMIN_PASSWORD="FredRosa%1978"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
passed=0
failed=0

# Fonction de test
test_criterion() {
    local name=$1
    local command=$2

    echo -n "Test: $name ... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((passed++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((failed++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. VÉRIFICATIONS API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: API accessible
test_criterion "API accessible" \
    "curl -s -o /dev/null -w '%{http_code}' -H 'x-api-key: $ADMIN_PASSWORD' '$BASE_URL/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20' | grep -q '200'"

# Test 2: API retourne success
test_criterion "API retourne success:true" \
    "curl -s -H 'x-api-key: $ADMIN_PASSWORD' '$BASE_URL/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20' | grep -q '\"success\":true'"

# Test 3: Données présentes
test_criterion "Données présentes (> 0 records)" \
    "curl -s -H 'x-api-key: $ADMIN_PASSWORD' '$BASE_URL/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20' | grep -q '\"data\":\\[{'"

# Test 4: Pas de MODE MOCK
if curl -s -H "x-api-key: $ADMIN_PASSWORD" "$BASE_URL/api/seo/collect/ga4?startDate=2026-01-20&endDate=2026-01-20" | grep -q '"mock":true'; then
    echo -e "Test: Aucune donnée MOCK ... ${RED}❌ FAIL${NC}"
    ((failed++))
else
    echo -e "Test: Aucune donnée MOCK ... ${GREEN}✅ PASS${NC}"
    ((passed++))
fi

# Test 5: Au moins 30 jours collectés
RESPONSE=$(curl -s -H "x-api-key: $ADMIN_PASSWORD" "$BASE_URL/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21")
COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data['data']))" 2>/dev/null || echo "0")

if [ "$COUNT" -ge 30 ]; then
    echo -e "Test: Au moins 30 jours collectés (${COUNT} jours) ... ${GREEN}✅ PASS${NC}"
    ((passed++))
else
    echo -e "Test: Au moins 30 jours collectés (${COUNT} jours) ... ${RED}❌ FAIL${NC}"
    ((failed++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. VÉRIFICATIONS DONNÉES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 6: Données différentes (variance)
VARIANCE=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); users = [d['users'] for d in data['data']]; print(len(set(users)))" 2>/dev/null || echo "0")

if [ "$VARIANCE" -gt 5 ]; then
    echo -e "Test: Variance détectée (${VARIANCE} valeurs uniques) ... ${GREEN}✅ PASS${NC}"
    ((passed++))
else
    echo -e "Test: Variance détectée (${VARIANCE} valeurs uniques) ... ${RED}❌ FAIL${NC}"
    ((failed++))
fi

# Test 7: Top pages présentes
test_criterion "Top pages présentes" \
    "echo '$RESPONSE' | python3 -c \"import sys, json; data = json.load(sys.stdin); exit(0 if len(data['data'][0].get('top_pages', [])) > 0 else 1)\""

# Test 8: Top events présents
test_criterion "Top events présents" \
    "echo '$RESPONSE' | python3 -c \"import sys, json; data = json.load(sys.stdin); exit(0 if len(data['data'][0].get('top_events', [])) > 0 else 1)\""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. STATISTIQUES GLOBALES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

STATS=$(curl -s -H "x-api-key: $ADMIN_PASSWORD" "$BASE_URL/api/seo/collect/ga4?startDate=2025-12-22&endDate=2026-01-21" | \
    python3 -c "import sys, json; data = json.load(sys.stdin);
total_users = sum(d['users'] for d in data['data']);
total_sessions = sum(d['sessions'] for d in data['data']);
total_conversions = sum(d['conversions'] for d in data['data']);
print(f'{total_users}|{total_sessions}|{total_conversions}')" 2>/dev/null || echo "0|0|0")

IFS='|' read -r TOTAL_USERS TOTAL_SESSIONS TOTAL_CONVERSIONS <<< "$STATS"

echo "📊 Total Utilisateurs:    $(printf "%'d" $TOTAL_USERS)"
echo "📊 Total Sessions:        $(printf "%'d" $TOTAL_SESSIONS)"
echo "📊 Total Conversions:     $(printf "%'d" $TOTAL_CONVERSIONS)"
echo "📊 Jours collectés:       $COUNT"
echo "📊 Variance utilisateurs: $VARIANCE valeurs uniques"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. RÉSULTAT FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Tests passés:  ${GREEN}$passed${NC}"
echo "Tests échoués: ${RED}$failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✅ SUCCÈS À 100%                            ║${NC}"
    echo -e "${GREEN}║          TOUTES LES DONNÉES SONT RÉELLES (PAS MOCK)           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Vérifier manuellement l'interface: http://localhost:3002/admin/seo"
    echo "   2. Consulter le rapport: GA4-VALIDATION-REPORT.md"
    echo "   3. Exécuter les tests Playwright:"
    echo "      cd e2e && npx playwright test ga4-api-validation --project=ga4-validation"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ❌ ÉCHEC DÉTECTÉ                            ║${NC}"
    echo -e "${RED}║              Certains tests ont échoué                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🔧 Actions recommandées:"
    echo "   1. Vérifier les logs d'erreur ci-dessus"
    echo "   2. Relancer la collecte: bash tools/force-collect-30days.sh"
    echo "   3. Vérifier les credentials dans .env.local"
    echo ""
    exit 1
fi
