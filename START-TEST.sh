#!/bin/bash
#
# START TEST - Démarrage rapide pour tester SAR Performance sur localhost:4000
#
# Ce script:
# 1. Vérifie les dépendances
# 2. Lance le serveur sur port 4000
# 3. Affiche les instructions pour tester
#

set -e

echo ""
echo "🚀 =========================================="
echo "   SAR PERFORMANCE TEST - localhost:4000"
echo "   =========================================="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
  echo "❌ Erreur: package.json non trouvé"
  echo "Exécutez depuis la racine du projet:"
  echo "  cd /Users/xunit/Desktop/📁\ Projets/sar"
  echo "  ./START-TEST.sh"
  exit 1
fi

# Vérifier .env.local
if [ ! -f ".env.local" ]; then
  echo "❌ Erreur: .env.local non trouvé"
  echo "Copiez .env.local.backup vers .env.local"
  exit 1
fi

echo "✅ Fichiers de config présents"
echo ""

# Vérifier node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
  echo ""
fi

echo "✅ Dépendances installées"
echo ""

# Créer le dossier logs si nécessaire
if [ ! -d "logs" ]; then
  mkdir -p logs
  echo "✅ Dossier logs/ créé"
  echo ""
fi

# Afficher les instructions AVANT de démarrer
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 INSTRUCTIONS DE TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Le serveur va démarrer sur: http://localhost:4000"
echo ""
echo "⚠️  IMPORTANT: Vérifier que les migrations RPC sont appliquées!"
echo ""
echo "Pour vérifier (dans Supabase SQL Editor):"
echo "  SELECT proname FROM pg_proc WHERE proname LIKE '%get_messages%';"
echo ""
echo "Si pas appliquées, exécuter dans SQL Editor:"
echo "  supabase/migrations/20260118000001_rpc_functions.sql"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTS À FAIRE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. NAVIGATEUR:"
echo "   - http://localhost:4000"
echo "   - http://localhost:4000/admin"
echo "   - Login: admin@solutionargentrapide.ca / FredRosa%1978"
echo ""
echo "2. SMOKE TEST (dans un autre terminal):"
echo "   ./scripts/perf/smoke.sh http://localhost:4000"
echo ""
echo "3. ANALYSE PERFORMANCE:"
echo "   ./scripts/perf/analyze.sh"
echo ""
echo "4. LOGS EN TEMPS RÉEL:"
echo "   tail -f logs/perf.ndjson | jq '.'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Attendre 3 secondes pour que l'utilisateur lise
sleep 3

echo "🚀 Démarrage du serveur..."
echo ""

# Lancer le serveur
npm run dev:4000
