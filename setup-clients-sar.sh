#!/bin/bash
#
# Script d'installation rapide du système de détection de fraude
# Usage: ./setup-clients-sar.sh
#

set -e  # Exit on error

echo "========================================="
echo "🚀 Installation Système Détection Fraude"
echo "========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier Node.js
echo "📦 Vérification des dépendances..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installé${NC}"

# Vérifier tsx
if ! command -v tsx &> /dev/null; then
    echo "📦 Installation de tsx..."
    npm install -g tsx
fi
echo -e "${GREEN}✅ tsx disponible${NC}"

# Vérifier csv-parse
echo "📦 Vérification de csv-parse..."
if ! npm list csv-parse &> /dev/null; then
    echo "📦 Installation de csv-parse..."
    npm install csv-parse
fi
echo -e "${GREEN}✅ csv-parse installé${NC}"

echo ""
echo "========================================="
echo "📊 Étape 1: Création de la table Supabase"
echo "========================================="
echo ""
echo -e "${YELLOW}⚠️  ACTION MANUELLE REQUISE${NC}"
echo ""
echo "1. Ouvrez https://dllyzfuqjzuhvshrlmuq.supabase.co"
echo "2. Allez dans 'SQL Editor'"
echo "3. Copiez le contenu de: migrations/001_create_clients_fraud_detection.sql"
echo "4. Collez dans l'éditeur et cliquez 'Run'"
echo ""
read -p "Appuyez sur Entrée quand c'est fait..."

echo ""
echo -e "${GREEN}✅ Table créée${NC}"

echo ""
echo "========================================="
echo "📁 Étape 2: Import des données CSV"
echo "========================================="
echo ""

# Chercher le fichier CSV
CSV_FILE=""
if [ -f "/Users/xunit/Desktop/clientsar.csv" ]; then
    CSV_FILE="/Users/xunit/Desktop/clientsar.csv"
elif [ -f "./clientsar.csv" ]; then
    CSV_FILE="./clientsar.csv"
else
    echo -e "${YELLOW}⚠️  Fichier clientsar.csv non trouvé${NC}"
    read -p "Entrez le chemin complet du fichier CSV: " CSV_FILE
fi

# Vérifier que le fichier existe
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}❌ Fichier introuvable: $CSV_FILE${NC}"
    exit 1
fi

echo "📄 Fichier trouvé: $CSV_FILE"
echo ""

# Options d'import
echo "Options d'import:"
echo "1. Import standard (nouveaux clients seulement)"
echo "2. Import avec mise à jour (upsert - recommandé)"
echo "3. Test sans insertion (dry-run)"
echo ""
read -p "Choisissez une option (1-3) [2]: " IMPORT_OPTION
IMPORT_OPTION=${IMPORT_OPTION:-2}

# Construire la commande
CMD="tsx scripts/import-clients-sar.ts \"$CSV_FILE\""

case $IMPORT_OPTION in
    2)
        CMD="$CMD --skip-duplicates"
        echo "Mode: Upsert (update + insert)"
        ;;
    3)
        CMD="$CMD --dry-run"
        echo "Mode: Test (pas d'insertion)"
        ;;
    *)
        echo "Mode: Standard (nouveaux seulement)"
        ;;
esac

echo ""
echo "🚀 Lancement de l'import..."
echo "Commande: $CMD"
echo ""

# Exécuter l'import
eval $CMD

echo ""
echo "========================================="
echo "✅ Installation Terminée!"
echo "========================================="
echo ""
echo "📍 Accès à l'interface:"
echo "   https://admin.solutionargentrapide.ca/admin/clients-sar"
echo ""
echo "📚 Documentation:"
echo "   - Guide complet: CLIENTS-SAR-FRAUD-DETECTION.md"
echo "   - Guide rapide: INSTALLATION-CLIENTS-SAR.md"
echo ""
echo "🎯 Prochaines étapes:"
echo "   1. Ouvrez l'interface admin"
echo "   2. Testez une recherche avec filtre 'Sans IBV'"
echo "   3. Examinez les clients à risque élevé (score ≥ 60)"
echo ""
echo "💡 Astuce: Mettez à jour les données chaque semaine depuis Margill"
echo "   Commande: tsx scripts/import-clients-sar.ts ~/Desktop/clientsar.csv --skip-duplicates"
echo ""
echo -e "${GREEN}🎉 Système de détection de fraude opérationnel!${NC}"
echo ""
