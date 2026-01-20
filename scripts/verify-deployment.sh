#!/bin/bash

# ============================================
# 🔍 Script de Vérification Déploiement QuickBooks
# ============================================

set -e

echo "🔍 DIAGNOSTIC DÉPLOIEMENT QUICKBOOKS"
echo "====================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# 1. Vérifier variables d'environnement locales
# ============================================
echo "📦 1. Variables d'environnement locales"
echo "---------------------------------------"

check_env() {
  if grep -q "^$1=" .env.local 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $1 trouvé"
    return 0
  else
    echo -e "${RED}✗${NC} $1 MANQUANT"
    return 1
  fi
}

ENV_OK=true

check_env "INTUIT_CLIENT_ID" || ENV_OK=false
check_env "INTUIT_CLIENT_SECRET" || ENV_OK=false
check_env "INTUIT_ENVIRONMENT" || ENV_OK=false
check_env "INTUIT_WEBHOOK_TOKEN" || ENV_OK=false
check_env "NEXT_PUBLIC_APP_URL" || ENV_OK=false

echo ""

# ============================================
# 2. Vérifier fichiers API routes
# ============================================
echo "📁 2. Fichiers API Routes QuickBooks"
echo "------------------------------------"

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 MANQUANT"
    return 1
  fi
}

FILES_OK=true

check_file "src/app/api/quickbooks/auth/connect/route.ts" || FILES_OK=false
check_file "src/app/api/quickbooks/auth/callback/route.ts" || FILES_OK=false
check_file "src/app/api/quickbooks/auth/refresh/route.ts" || FILES_OK=false
check_file "src/app/api/quickbooks/status/route.ts" || FILES_OK=false
check_file "src/app/api/webhooks/quickbooks/route.ts" || FILES_OK=false

echo ""

# ============================================
# 3. Vérifier migration SQL
# ============================================
echo "🗄️  3. Migration SQL QuickBooks"
echo "-------------------------------"

if [ -f "supabase/migrations/20260120000000_quickbooks_integration.sql" ]; then
  echo -e "${GREEN}✓${NC} Migration SQL trouvée"

  # Compter les tables créées
  TABLE_COUNT=$(grep -c "CREATE TABLE IF NOT EXISTS" supabase/migrations/20260120000000_quickbooks_integration.sql || echo "0")
  echo "  → $TABLE_COUNT tables définies"
else
  echo -e "${RED}✗${NC} Migration SQL MANQUANTE"
  FILES_OK=false
fi

echo ""

# ============================================
# 4. Vérifier configuration Vercel
# ============================================
echo "⚡ 4. Configuration Vercel"
echo "-------------------------"

if [ -f "vercel.json" ]; then
  echo -e "${GREEN}✓${NC} vercel.json trouvé"

  if grep -q '"main": true' vercel.json; then
    echo -e "${GREEN}✓${NC} Branch 'main' configurée pour déploiement"
  else
    echo -e "${YELLOW}⚠${NC} Branch 'main' non configurée"
  fi
else
  echo -e "${YELLOW}⚠${NC} vercel.json non trouvé (optionnel)"
fi

echo ""

# ============================================
# 5. Test build local
# ============================================
echo "🔨 5. Test Build Local"
echo "----------------------"

if command -v npm &> /dev/null; then
  echo "Lancement du build (ceci peut prendre 30-60 secondes)..."

  if npm run build > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✓${NC} Build local réussi"

    # Vérifier si les routes QuickBooks sont générées
    if [ -d ".next/server/app/api/quickbooks" ]; then
      echo -e "${GREEN}✓${NC} Routes QuickBooks compilées"
    else
      echo -e "${RED}✗${NC} Routes QuickBooks non trouvées dans .next"
    fi
  else
    echo -e "${RED}✗${NC} Build local ÉCHOUÉ"
    echo "Voir les logs: /tmp/build-output.log"
    FILES_OK=false
  fi
else
  echo -e "${YELLOW}⚠${NC} npm non trouvé, skip build test"
fi

echo ""

# ============================================
# 6. Vérifier git status
# ============================================
echo "📝 6. Git Status"
echo "----------------"

if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  BRANCH=$(git branch --show-current)
  echo "Branch actuelle: $BRANCH"

  if [ "$BRANCH" = "main" ]; then
    echo -e "${GREEN}✓${NC} Sur la branche 'main'"
  else
    echo -e "${YELLOW}⚠${NC} Sur la branche '$BRANCH' (production = main)"
  fi

  if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✓${NC} Pas de modifications non commitées"
  else
    echo -e "${YELLOW}⚠${NC} Modifications non commitées présentes"
    git status --short
  fi
else
  echo -e "${RED}✗${NC} Pas un repo git"
fi

echo ""

# ============================================
# 7. Résumé et recommandations
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ALL_OK=true

if [ "$ENV_OK" = false ]; then
  ALL_OK=false
  echo -e "${RED}❌ Variables d'environnement manquantes${NC}"
  echo "   → Vérifier .env.local"
fi

if [ "$FILES_OK" = false ]; then
  ALL_OK=false
  echo -e "${RED}❌ Fichiers manquants ou build échoué${NC}"
  echo "   → Vérifier les fichiers listés ci-dessus"
fi

if [ "$ALL_OK" = true ]; then
  echo -e "${GREEN}✅ TOUT EST OK LOCALEMENT${NC}"
  echo ""
  echo "🚀 Prochaines étapes:"
  echo "   1. Ajouter les variables INTUIT_* sur Vercel Dashboard"
  echo "   2. Appliquer la migration SQL sur Supabase Production"
  echo "   3. git push origin main"
  echo "   4. Vérifier le déploiement sur Vercel"
else
  echo -e "${RED}❌ PROBLÈMES DÉTECTÉS${NC}"
  echo ""
  echo "🔧 Actions requises:"
  echo "   1. Corriger les problèmes listés ci-dessus"
  echo "   2. Re-exécuter ce script"
  echo "   3. Puis déployer sur Vercel"
fi

echo ""
echo "📚 Documentation: QUICKBOOKS-DEPLOYMENT.md"
echo ""
