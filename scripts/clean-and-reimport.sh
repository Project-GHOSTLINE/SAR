#!/bin/bash

# Script de nettoyage et réimport complet
# Usage: ./scripts/clean-and-reimport.sh

set -e

echo "🧹 NETTOYAGE ET RÉIMPORT CLIENTS SAR"
echo "===================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Chemins
PROJECT_ROOT="/Users/xunit/Desktop/📁 Projets/sar"
XLSX_FILE="/Users/xunit/Desktop/Margiil Files/liste-client-sar.xlsx"

cd "$PROJECT_ROOT"

# Vérifier que le fichier XLSX existe
if [ ! -f "$XLSX_FILE" ]; then
  echo -e "${RED}❌ Fichier XLSX introuvable: $XLSX_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Fichier XLSX trouvé${NC}"
echo "   📁 $XLSX_FILE"
echo "   📊 Taille: $(du -h "$XLSX_FILE" | cut -f1)"
echo ""

# Demander confirmation
echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va:${NC}"
echo "   1. Vider complètement la table clients_sar"
echo "   2. Réimporter toutes les données depuis le XLSX"
echo ""
read -p "Continuer? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Opération annulée"
  exit 0
fi

echo ""
echo "🔧 Étape 1: Application de la migration 002..."
# Note: Cette commande doit être exécutée manuellement dans Supabase SQL Editor
echo "   📝 Veuillez exécuter la migration suivante dans Supabase SQL Editor:"
echo "   migrations/002_add_missing_columns.sql"
echo ""
read -p "Migration 002 appliquée? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Veuillez appliquer la migration d'abord"
  exit 1
fi

echo ""
echo "🗑️  Étape 2: Nettoyage de la table..."
echo "   ⚠️  Suppression de tous les enregistrements..."

# Créer un script SQL temporaire
cat > /tmp/clean-clients-sar.sql << 'EOF'
-- Vider la table
TRUNCATE TABLE clients_sar;

-- Vérifier
SELECT
  'Table nettoyée' as status,
  COUNT(*) as remaining_records
FROM clients_sar;
EOF

echo "   📝 Script SQL créé: /tmp/clean-clients-sar.sql"
echo "   📝 Veuillez exécuter ce script dans Supabase SQL Editor"
echo ""
read -p "Table nettoyée? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Veuillez nettoyer la table d'abord"
  exit 1
fi

echo ""
echo "📥 Étape 3: Import des données..."
npx tsx scripts/import-clients-sar-xlsx.ts "$XLSX_FILE"

echo ""
echo "✅ Opération terminée!"
echo ""
echo "📊 Prochaines étapes:"
echo "   1. Vérifier les données: node scripts/verify-setup.js"
echo "   2. Tester la recherche: http://localhost:3000/admin/clients-sar"
echo ""
