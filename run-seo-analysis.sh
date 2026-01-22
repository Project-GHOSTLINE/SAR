#!/bin/bash

###############################################################################
# Script d'Analyse Complète de /admin/seo
#
# Ce script:
# - Exécute le test Playwright complet sur la page /admin/seo
# - Génère des screenshots détaillés
# - Crée un rapport HTML et JSON
# - Affiche les résultats dans le terminal
#
# Usage: ./run-seo-analysis.sh
###############################################################################

set -e

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Dossiers
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/e2e" && pwd)"
ARTIFACTS_DIR="$E2E_DIR/test-artifacts/seo-analysis"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║       ANALYSE COMPLÈTE DE /admin/seo                      ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Créer le dossier pour les artifacts
mkdir -p "$ARTIFACTS_DIR"

echo -e "${BLUE}[1/5]${NC} Nettoyage des anciens artifacts..."
rm -rf "$ARTIFACTS_DIR"/*
echo -e "${GREEN}✓${NC} Nettoyage effectué\n"

echo -e "${BLUE}[2/5]${NC} Vérification de l'installation de Playwright..."
cd "$E2E_DIR"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠${NC}  Installation de Playwright..."
  npm install
fi
echo -e "${GREEN}✓${NC} Playwright prêt\n"

echo -e "${BLUE}[3/5]${NC} Exécution du test d'analyse..."
echo -e "${YELLOW}→${NC} URL: https://admin.solutionargentrapide.ca/admin/seo"
echo -e "${YELLOW}→${NC} Mot de passe: FredRosa%1978"
echo -e "${YELLOW}→${NC} Timeout: 3 minutes\n"

# Exécuter le test avec Playwright
if npx playwright test seo-complete-analysis.spec.ts --project=chromium; then
  echo -e "\n${GREEN}✓${NC} Test d'analyse complété avec succès\n"
  TEST_SUCCESS=true
else
  echo -e "\n${YELLOW}⚠${NC}  Test terminé avec avertissements\n"
  TEST_SUCCESS=false
fi

echo -e "${BLUE}[4/5]${NC} Génération du rapport..."
sleep 2

# Vérifier si les fichiers ont été créés
if [ -f "$ARTIFACTS_DIR/rapport-complet.json" ]; then
  echo -e "${GREEN}✓${NC} Rapport JSON généré"
else
  echo -e "${RED}✗${NC} Rapport JSON non trouvé"
fi

if [ -f "$ARTIFACTS_DIR/rapport-complet.html" ]; then
  echo -e "${GREEN}✓${NC} Rapport HTML généré"
else
  echo -e "${RED}✗${NC} Rapport HTML non trouvé"
fi

# Compter les screenshots
SCREENSHOT_COUNT=$(ls -1 "$ARTIFACTS_DIR"/*.png 2>/dev/null | wc -l | xargs)
echo -e "${GREEN}✓${NC} $SCREENSHOT_COUNT screenshots capturés\n"

echo -e "${BLUE}[5/5]${NC} Affichage des résultats...\n"

# Si le rapport JSON existe, l'afficher
if [ -f "$ARTIFACTS_DIR/rapport-complet.json" ]; then
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}                     RÉSULTATS DE L'ANALYSE                 ${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"

  # Extraire les données importantes avec jq (si disponible)
  if command -v jq &> /dev/null; then
    TYPE_DATA=$(jq -r '.donnees.typeData // "Inconnu"' "$ARTIFACTS_DIR/rapport-complet.json")
    UTILISATEURS=$(jq -r '.donnees.metriques.utilisateurs // "Non trouvé"' "$ARTIFACTS_DIR/rapport-complet.json")
    SESSIONS=$(jq -r '.donnees.metriques.sessions // "Non trouvé"' "$ARTIFACTS_DIR/rapport-complet.json")
    ENGAGEMENT=$(jq -r '.donnees.metriques.engagement // "Non trouvé"' "$ARTIFACTS_DIR/rapport-complet.json")
    CONVERSIONS=$(jq -r '.donnees.metriques.conversions // "Non trouvé"' "$ARTIFACTS_DIR/rapport-complet.json")
    NB_TABLEAUX=$(jq -r '.donnees.nombreTableaux // 0' "$ARTIFACTS_DIR/rapport-complet.json")
    MODAL_TROUVE=$(jq -r '.donnees.modal.trouve // false' "$ARTIFACTS_DIR/rapport-complet.json")
    NB_METRIQUES_MODAL=$(jq -r '.donnees.nombreMetriquesModal // "N/A"' "$ARTIFACTS_DIR/rapport-complet.json")
    NB_PROBLEMES=$(jq -r '.problemes | length' "$ARTIFACTS_DIR/rapport-complet.json")

    echo -e "${MAGENTA}TYPE DE DONNÉES:${NC}"
    if [[ "$TYPE_DATA" == *"CACHE"* ]]; then
      echo -e "  ${RED}⚠ $TYPE_DATA${NC}"
    else
      echo -e "  ${GREEN}✓ $TYPE_DATA${NC}"
    fi
    echo ""

    echo -e "${MAGENTA}MÉTRIQUES PRINCIPALES:${NC}"
    echo -e "  ${YELLOW}Utilisateurs:${NC}  $UTILISATEURS"
    echo -e "  ${YELLOW}Sessions:${NC}      $SESSIONS"
    echo -e "  ${YELLOW}Engagement:${NC}    $ENGAGEMENT"
    echo -e "  ${YELLOW}Conversions:${NC}   $CONVERSIONS"
    echo ""

    echo -e "${MAGENTA}TABLEAUX:${NC}"
    echo -e "  ${YELLOW}Nombre trouvé:${NC} $NB_TABLEAUX"
    echo ""

    echo -e "${MAGENTA}MODAL:${NC}"
    if [ "$MODAL_TROUVE" = "true" ]; then
      echo -e "  ${GREEN}✓ Modal trouvé${NC}"
      echo -e "  ${YELLOW}Métriques:${NC} $NB_METRIQUES_MODAL"
    else
      echo -e "  ${RED}✗ Modal non trouvé${NC}"
    fi
    echo ""

    echo -e "${MAGENTA}PROBLÈMES DÉTECTÉS:${NC}"
    if [ "$NB_PROBLEMES" -eq 0 ]; then
      echo -e "  ${GREEN}✓ Aucun problème${NC}"
    else
      echo -e "  ${RED}⚠ $NB_PROBLEMES problème(s)${NC}"
      jq -r '.problemes[] | "  - \(.)"' "$ARTIFACTS_DIR/rapport-complet.json"
    fi
    echo ""

  else
    # Si jq n'est pas disponible, afficher le JSON brut (extrait)
    echo -e "${YELLOW}Note: Installer 'jq' pour un meilleur affichage${NC}\n"
    head -n 50 "$ARTIFACTS_DIR/rapport-complet.json"
    echo ""
  fi
else
  echo -e "${RED}✗${NC} Impossible de lire le rapport JSON"
fi

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✓ ANALYSE TERMINÉE${NC}\n"

echo -e "${BLUE}📁 FICHIERS GÉNÉRÉS:${NC}"
echo -e "  ${YELLOW}Rapport HTML:${NC}  $ARTIFACTS_DIR/rapport-complet.html"
echo -e "  ${YELLOW}Rapport JSON:${NC}  $ARTIFACTS_DIR/rapport-complet.json"
echo -e "  ${YELLOW}Screenshots:${NC}   $ARTIFACTS_DIR/*.png"
echo ""

# Ouvrir le rapport HTML dans le navigateur
if [ "$TEST_SUCCESS" = true ]; then
  echo -e "${BLUE}🌐 Ouverture du rapport dans le navigateur...${NC}\n"
  if [ -f "$ARTIFACTS_DIR/rapport-complet.html" ]; then
    open "$ARTIFACTS_DIR/rapport-complet.html" 2>/dev/null || \
    xdg-open "$ARTIFACTS_DIR/rapport-complet.html" 2>/dev/null || \
    echo -e "${YELLOW}⚠${NC}  Ouvrez manuellement: $ARTIFACTS_DIR/rapport-complet.html"
  fi
fi

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}     Pour plus de détails, consultez le rapport HTML        ${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}\n"

exit 0
