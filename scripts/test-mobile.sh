#!/bin/bash

# Script de test mobile complet pour Solution Argent Rapide
# Teste toutes les pages et fonctionnalités en mode mobile

set -e

echo "📱 =============================================="
echo "   TEST MOBILE COMPLET - Solution Argent Rapide"
echo "   =============================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que les dépendances sont installées
echo -e "${BLUE}🔍 Vérification des dépendances...${NC}"
if ! command -v npx &> /dev/null; then
    echo "❌ npx n'est pas installé. Installez Node.js."
    exit 1
fi

# Créer le dossier de résultats
echo -e "${BLUE}📁 Préparation des dossiers...${NC}"
mkdir -p test-results
mkdir -p test-artifacts/mobile-test

# Nettoyer les anciens résultats
rm -f test-results/mobile-*.png
rm -f test-artifacts/mobile-test/*

echo ""
echo -e "${GREEN}✅ Prêt à lancer les tests${NC}"
echo ""

# Lancer les tests Playwright en mode mobile
echo -e "${BLUE}🚀 Lancement des tests mobile...${NC}"
echo ""

npx playwright test e2e/specs/mobile-site-verification.spec.ts \
  --reporter=html \
  --reporter=list \
  --output=test-artifacts/mobile-test

TEST_EXIT_CODE=$?

echo ""
echo "================================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ TOUS LES TESTS MOBILE RÉUSSIS!${NC}"
else
  echo -e "${YELLOW}⚠️  CERTAINS TESTS ONT ÉCHOUÉ${NC}"
fi

echo "================================================"
echo ""

# Compter les screenshots
SCREENSHOT_COUNT=$(ls -1 test-results/mobile-*.png 2>/dev/null | wc -l)

echo "📊 RÉSUMÉ:"
echo "   - Tests exécutés: 10"
echo "   - Screenshots: $SCREENSHOT_COUNT"
echo "   - Dossier résultats: test-results/"
echo "   - Rapport HTML: playwright-report/"
echo ""

# Afficher les screenshots générés
if [ $SCREENSHOT_COUNT -gt 0 ]; then
  echo "📸 Screenshots générés:"
  ls -1 test-results/mobile-*.png | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "   - $(basename "$file") ($SIZE)"
  done
  echo ""
fi

# Ouvrir le rapport HTML
echo -e "${BLUE}📄 Ouverture du rapport HTML...${NC}"
if [ -f "playwright-report/index.html" ]; then
  open playwright-report/index.html 2>/dev/null || xdg-open playwright-report/index.html 2>/dev/null || echo "Ouvrez manuellement: playwright-report/index.html"
fi

echo ""
echo "✅ Test mobile terminé!"
echo ""

exit $TEST_EXIT_CODE
