#!/bin/bash

echo "=================================="
echo "🔍 DEBUG COMPLET - SAR + VOPAY"
echo "=================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
PROD_URL="https://sar-nu.vercel.app"
LOCAL_URL="http://localhost:3000"
URL="${1:-$LOCAL_URL}"

echo "🌐 Testing: $URL"
echo ""

# Test 1: Page d'accueil
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  PAGE D'ACCUEIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
fi

# Vérifier erreurs d'hydration dans le HTML
HTML=$(curl -s "$URL/")
if echo "$HTML" | grep -q "suppressHydrationWarning"; then
    echo -e "${GREEN}✅ suppressHydrationWarning présent${NC}"
else
    echo -e "${YELLOW}⚠️  suppressHydrationWarning manquant${NC}"
fi

# Chercher montant
if echo "$HTML" | grep -q "4 700\|4,700\|4700"; then
    MONTANT=$(echo "$HTML" | grep -oP '(4[\s,]?700)' | head -1)
    echo -e "${GREEN}✅ Montant trouvé: $MONTANT${NC}"
else
    echo -e "${RED}❌ Montant non trouvé dans HTML${NC}"
fi
echo ""

# Test 2: Page admin login
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  ADMIN LOGIN PAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/admin")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
fi
echo ""

# Test 3: Login API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  LOGIN API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_RESPONSE=$(curl -s -c /tmp/sar-cookies.txt -X POST "$URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"FredRosa%1978"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -oP 'HTTP_CODE:\K\d+')
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_CODE:.*//')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Login réussi: $HTTP_CODE${NC}"
    echo "Response: $RESPONSE_BODY"

    # Vérifier cookie
    if [ -f /tmp/sar-cookies.txt ]; then
        COOKIE=$(grep "admin-session" /tmp/sar-cookies.txt | awk '{print $7}')
        if [ -n "$COOKIE" ]; then
            echo -e "${GREEN}✅ Cookie admin-session: ${COOKIE:0:20}...${NC}"
        else
            echo -e "${RED}❌ Cookie admin-session non trouvé${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Login échoué: $HTTP_CODE${NC}"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 4: Dashboard (avec auth)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  DASHBOARD (authentifié)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /tmp/sar-cookies.txt ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/sar-cookies.txt "$URL/admin/dashboard")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Dashboard accessible: $HTTP_CODE${NC}"
    else
        echo -e "${RED}❌ Dashboard inaccessible: $HTTP_CODE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Pas de cookies - skip${NC}"
fi
echo ""

# Test 5: API VoPay (avec auth)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  API VOPAY (authentifié)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f /tmp/sar-cookies.txt ]; then
    VOPAY_RESPONSE=$(curl -s -b /tmp/sar-cookies.txt "$URL/api/admin/vopay" \
      -w "\nHTTP_CODE:%{http_code}")

    HTTP_CODE=$(echo "$VOPAY_RESPONSE" | grep -oP 'HTTP_CODE:\K\d+')
    RESPONSE_BODY=$(echo "$VOPAY_RESPONSE" | sed 's/HTTP_CODE:.*//')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ VoPay API: $HTTP_CODE${NC}"

        # Parser JSON
        if echo "$RESPONSE_BODY" | grep -q "success.*true"; then
            BALANCE=$(echo "$RESPONSE_BODY" | grep -oP '"balance":\K[0-9.]+' | head -1)
            AVAILABLE=$(echo "$RESPONSE_BODY" | grep -oP '"available":\K[0-9.]+' | head -1)

            if [ -n "$BALANCE" ]; then
                echo -e "${GREEN}✅ Solde: \$${BALANCE}${NC}"
                echo -e "${GREEN}✅ Disponible: \$${AVAILABLE}${NC}"
            else
                echo -e "${YELLOW}⚠️  Données vides${NC}"
            fi
        else
            echo -e "${RED}❌ Success=false${NC}"
        fi

        echo "Response: $RESPONSE_BODY"
    else
        echo -e "${RED}❌ VoPay API échoué: $HTTP_CODE${NC}"
        echo "Response: $RESPONSE_BODY"
    fi
else
    echo -e "${YELLOW}⚠️  Pas de cookies - skip${NC}"
fi
echo ""

# Test 6: VoPay direct (sans proxy)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  VOPAY API DIRECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Charger credentials
if [ -f .env.local ]; then
    export $(grep -E 'VOPAY_' .env.local | xargs)

    # Générer signature
    TODAY=$(date +%Y-%m-%d)
    SIGNATURE_STRING="${VOPAY_API_KEY}${VOPAY_SHARED_SECRET}${TODAY}"
    SIGNATURE=$(echo -n "$SIGNATURE_STRING" | openssl dgst -sha1 | awk '{print $2}')

    echo "Date: $TODAY"
    echo "Signature: ${SIGNATURE:0:20}..."
    echo ""

    VOPAY_URL="https://earthnode.vopay.com/api/v2/account/balance"
    VOPAY_URL="${VOPAY_URL}?AccountID=${VOPAY_ACCOUNT_ID}&Key=${VOPAY_API_KEY}&Signature=${SIGNATURE}"

    DIRECT_RESPONSE=$(curl -s "$VOPAY_URL" -w "\nHTTP_CODE:%{http_code}")
    HTTP_CODE=$(echo "$DIRECT_RESPONSE" | grep -oP 'HTTP_CODE:\K\d+')
    RESPONSE_BODY=$(echo "$DIRECT_RESPONSE" | sed 's/HTTP_CODE:.*//')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ VoPay Direct: $HTTP_CODE${NC}"

        if echo "$RESPONSE_BODY" | grep -q '"Success":true'; then
            ACCOUNT_BALANCE=$(echo "$RESPONSE_BODY" | grep -oP '"AccountBalance":"\K[0-9.]+')
            AVAILABLE=$(echo "$RESPONSE_BODY" | grep -oP '"AvailableFunds":"\K[0-9.]+')

            echo -e "${GREEN}✅ AccountBalance: \$${ACCOUNT_BALANCE}${NC}"
            echo -e "${GREEN}✅ AvailableFunds: \$${AVAILABLE}${NC}"
        else
            echo -e "${RED}❌ Success=false${NC}"
        fi
    else
        echo -e "${RED}❌ VoPay Direct échoué: $HTTP_CODE${NC}"
    fi

    echo "Response: $RESPONSE_BODY"
else
    echo -e "${YELLOW}⚠️  .env.local non trouvé${NC}"
fi
echo ""

# Résumé
echo "=================================="
echo "📊 RÉSUMÉ"
echo "=================================="

# Cleanup
rm -f /tmp/sar-cookies.txt

echo ""
echo "Pour tester en production:"
echo "./debug-full.sh https://sar-nu.vercel.app"
