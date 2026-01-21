#!/bin/bash

# ============================================
# Script d'application de la migration SEO
# ============================================

echo "🚀 Application de la migration SEO Metrics System..."
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Chemin vers la migration
MIGRATION_FILE="/Users/xunit/Desktop/📁 Projets/sar/supabase/migrations/20260121000000_seo_metrics_system.sql"

# Vérifier si le fichier existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Fichier de migration non trouvé: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📄 Fichier de migration: $MIGRATION_FILE${NC}"
echo ""

# Option 1: Via Supabase Dashboard (Recommandé)
echo -e "${GREEN}=== OPTION 1: Via Supabase Dashboard (RECOMMANDÉ) ===${NC}"
echo ""
echo "1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor"
echo "2. Cliquer sur 'SQL Editor' dans la sidebar"
echo "3. Cliquer sur 'New Query'"
echo "4. Copier-coller le contenu du fichier:"
echo "   $MIGRATION_FILE"
echo "5. Cliquer sur 'Run' (ou Ctrl+Enter)"
echo ""
echo -e "${YELLOW}Voulez-vous ouvrir le fichier maintenant? [y/N]${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cat "$MIGRATION_FILE"
    echo ""
    echo -e "${GREEN}✅ Fichier affiché ci-dessus. Copiez-le dans Supabase Dashboard.${NC}"
fi

echo ""
echo -e "${GREEN}=== OPTION 2: Via psql (Terminal) ===${NC}"
echo ""
echo "Si vous avez psql installé, exécutez:"
echo ""
echo "psql \"postgresql://postgres.dllyzfuqjzuhvshrlmuq:Solution%99@aws-0-ca-central-1.pooler.supabase.com:6543/postgres\" -f \"$MIGRATION_FILE\""
echo ""

echo ""
echo -e "${GREEN}=== OPTION 3: Via Supabase CLI ===${NC}"
echo ""
echo "supabase db push"
echo ""

echo ""
echo -e "${YELLOW}⚠️  Après avoir appliqué la migration:${NC}"
echo ""
echo "1. Vérifiez que les 6 tables ont été créées:"
echo "   - seo_ga4_metrics_daily"
echo "   - seo_gsc_metrics_daily"
echo "   - seo_semrush_domain_daily"
echo "   - seo_keywords_tracking"
echo "   - seo_audit_log"
echo "   - seo_collection_jobs"
echo ""
echo "2. Testez la collecte:"
echo "   curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/ga4 \\"
echo "     -H 'x-api-key: FredRosa%1978' \\"
echo "     -H 'Content-Type: application/json'"
echo ""
echo -e "${GREEN}✅ Migration prête à être appliquée!${NC}"
