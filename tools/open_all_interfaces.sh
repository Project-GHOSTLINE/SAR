#!/usr/bin/env bash
# Ouvre toutes les interfaces E2E Testing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🎨 Ouverture de toutes les interfaces E2E..."
echo ""

# 1. Dashboard principal
echo "1️⃣  Ouverture du Dashboard Principal..."
open "$PROJECT_ROOT/e2e-dashboard.html"
sleep 1

# 2. Rapport Playwright
if [ -f "$PROJECT_ROOT/test-artifacts/playwright-report/index.html" ]; then
  echo "2️⃣  Ouverture du Rapport Playwright..."
  open "$PROJECT_ROOT/test-artifacts/playwright-report/index.html"
  sleep 1
else
  echo "⚠️  Rapport Playwright non trouvé (lance 'make smoke' d'abord)"
fi

# 3. Guide d'accès rapide
echo "3️⃣  Ouverture du Guide d'Accès Rapide..."
open "$PROJECT_ROOT/ACCES-RAPIDE.md"
sleep 1

echo ""
echo "✅ Interfaces ouvertes!"
echo ""
echo "📌 Pour le Mode UI Interactif (le plus puissant):"
echo "   cd e2e && npx playwright test --ui"
echo ""
echo "📌 Pour n8n:"
echo "   make stack-up && open http://localhost:5678"
echo ""
