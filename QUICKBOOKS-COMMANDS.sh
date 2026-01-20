#!/bin/bash

# ============================================
# 🚀 COMMANDES QUICKBOOKS DEPLOYMENT
# ============================================
# Ce fichier contient toutes les commandes à exécuter
# Copier/coller dans le terminal

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 QUICKBOOKS DEPLOYMENT - ÉTAPE PAR ÉTAPE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# ÉTAPE 1: Diagnostic local
# ============================================
echo "📊 ÉTAPE 1: Diagnostic local"
echo "=============================="
echo ""
echo "Commande à exécuter:"
echo ""
echo "  ./scripts/verify-deployment.sh"
echo ""
read -p "Appuyer sur ENTER après avoir exécuté cette commande..."

# ============================================
# ÉTAPE 2: Variables Vercel (MANUEL)
# ============================================
echo ""
echo "⚙️  ÉTAPE 2: Configurer variables Vercel"
echo "=========================================="
echo ""
echo "1. Aller sur: https://vercel.com/project-ghostline/sar/settings/environment-variables"
echo ""
echo "2. Ajouter ces variables (cliquer 'Add New' pour chaque):"
echo ""
echo "   INTUIT_CLIENT_ID = ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u"
echo "   INTUIT_CLIENT_SECRET = Oewh6LtCjluiEjwBupTvolVeyBdmmaDnW7xtVySj"
echo "   INTUIT_ENVIRONMENT = sandbox"
echo "   INTUIT_WEBHOOK_TOKEN = votre-webhook-verifier-token"
echo ""
echo "3. Pour chaque variable, cocher: Production ✓ Preview ✓ Development ✓"
echo ""
read -p "Appuyer sur ENTER après avoir configuré les variables..."

# ============================================
# ÉTAPE 3: Migration SQL (MANUEL)
# ============================================
echo ""
echo "🗄️  ÉTAPE 3: Appliquer migration SQL Supabase"
echo "=============================================="
echo ""
echo "1. Aller sur: https://supabase.com/dashboard/project/tncbzpvpxscexfhqpmcd/sql/new"
echo ""
echo "2. Copier le contenu du fichier:"
echo ""
echo "   supabase/migrations/20260120000000_quickbooks_integration.sql"
echo ""
echo "3. Coller dans l'éditeur SQL et cliquer 'Run'"
echo ""
echo "4. Vérifier dans Table Editor que 8 nouvelles tables 'quickbooks_*' existent"
echo ""
read -p "Appuyer sur ENTER après avoir appliqué la migration..."

# ============================================
# ÉTAPE 4: Redéployer Vercel
# ============================================
echo ""
echo "🚀 ÉTAPE 4: Redéployer sur Vercel"
echo "=================================="
echo ""
echo "Commande à exécuter:"
echo ""
echo "  git commit --allow-empty -m 'chore: Trigger Vercel redeploy after QuickBooks config'"
echo "  git push origin main"
echo ""
read -p "Appuyer sur ENTER pour exécuter ces commandes..."

# Exécuter les commandes
git commit --allow-empty -m "chore: Trigger Vercel redeploy after QuickBooks config"
git push origin main

echo ""
echo "✅ Push effectué!"
echo ""

# ============================================
# ÉTAPE 5: Vérifier déploiement
# ============================================
echo ""
echo "✅ ÉTAPE 5: Vérifier le déploiement"
echo "===================================="
echo ""
echo "1. Aller sur: https://vercel.com/project-ghostline/sar"
echo ""
echo "2. Attendre que le déploiement soit terminé (1-3 minutes)"
echo ""
echo "3. Vérifier que le statut est '✓ Ready'"
echo ""
echo "4. Tester l'endpoint:"
echo ""
echo "   curl https://sar.vercel.app/api/quickbooks/status"
echo ""
echo "   Réponse attendue: {\"connected\": false} ou {\"connected\": true}"
echo ""
echo "5. Ouvrir la page admin:"
echo ""
echo "   https://sar.vercel.app/admin/quickbooks"
echo ""
read -p "Appuyer sur ENTER pour tester l'endpoint..."

# Test endpoint
echo ""
echo "🧪 Test de l'endpoint status..."
curl -s https://sar.vercel.app/api/quickbooks/status | jq . 2>/dev/null || curl -s https://sar.vercel.app/api/quickbooks/status

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DÉPLOIEMENT TERMINÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Checklist:"
echo "  ✓ Variables Vercel configurées"
echo "  ✓ Migration SQL appliquée"
echo "  ✓ Code déployé sur Vercel"
echo "  ✓ Endpoint testé"
echo ""
echo "🔗 Liens utiles:"
echo "  • Admin QuickBooks: https://sar.vercel.app/admin/quickbooks"
echo "  • Vercel Dashboard: https://vercel.com/project-ghostline/sar"
echo "  • Supabase Dashboard: https://supabase.com/dashboard/project/tncbzpvpxscexfhqpmcd"
echo ""
echo "📚 Documentation:"
echo "  • Guide complet: VERCEL-CONFIG-GUIDE.md"
echo "  • Diagnostic: QUICKBOOKS-DEPLOYMENT.md"
echo ""
