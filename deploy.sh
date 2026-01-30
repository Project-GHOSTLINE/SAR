#!/bin/bash

# 🚀 Script de Déploiement - SAR Signature System
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Déploiement des améliorations du système de signature"
echo "========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Check environment variables
echo "📋 Étape 1: Vérification des variables d'environnement"
echo "-------------------------------------------------------"

if [ -f .env ]; then
    if grep -q "FROM_EMAIL" .env; then
        print_success "FROM_EMAIL trouvé dans .env"
    else
        print_warning "FROM_EMAIL manquant dans .env"
        echo "Ajouter: FROM_EMAIL=SAR <noreply@solutionargentrapide.ca>"
    fi

    if grep -q "ADMIN_SIGNATURE_EMAIL" .env; then
        print_success "ADMIN_SIGNATURE_EMAIL trouvé dans .env"
    else
        print_warning "ADMIN_SIGNATURE_EMAIL manquant dans .env"
        echo "Ajouter: ADMIN_SIGNATURE_EMAIL=anthony@solutionargentrapide.ca"
    fi
else
    print_warning "Fichier .env non trouvé (normal si déployé sur Vercel)"
fi
echo ""

# Step 2: Check dependencies
echo "📦 Étape 2: Vérification des dépendances"
echo "-----------------------------------------"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installé: $NODE_VERSION"
else
    print_error "Node.js non installé"
    exit 1
fi

if [ -f "package.json" ]; then
    print_success "package.json trouvé"
else
    print_error "package.json non trouvé. Êtes-vous dans le bon répertoire?"
    exit 1
fi
echo ""

# Step 3: Install/Update dependencies
echo "📥 Étape 3: Installation des dépendances"
echo "-----------------------------------------"
npm install
print_success "Dépendances installées"
echo ""

# Step 4: Check migrations
echo "🗄️  Étape 4: Vérification des migrations"
echo "-----------------------------------------"

if [ -f "supabase/migrations/20260129105911_add_email_tracking.sql" ]; then
    print_success "Migration email tracking trouvée"
else
    print_error "Migration email tracking manquante"
fi

if [ -f "supabase/migrations/20260129105911_add_composite_indexes.sql" ]; then
    print_success "Migration index composites trouvée"
else
    print_error "Migration index composites manquante"
fi

echo ""
print_warning "IMPORTANT: Les migrations doivent être appliquées manuellement"
echo "Options:"
echo "  1. Via Supabase CLI: supabase db push"
echo "  2. Via Dashboard: Copier le SQL dans SQL Editor"
echo "  3. Via psql: Exécuter les fichiers SQL"
echo ""
read -p "Migrations appliquées? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Veuillez appliquer les migrations avant de continuer"
    echo "Voir DEPLOY_GUIDE.md pour les instructions"
    exit 1
fi
print_success "Migrations confirmées"
echo ""

# Step 5: Build
echo "🔨 Étape 5: Build de production"
echo "--------------------------------"
npm run build
print_success "Build réussi"
echo ""

# Step 6: Git status
echo "📝 Étape 6: État Git"
echo "--------------------"
if git status --short | grep -q .; then
    echo "Fichiers modifiés:"
    git status --short
    echo ""
    read -p "Créer un commit? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "feat: Complete signature system improvements

✅ Critical Fixes:
- Configurable admin email
- Email delivery tracking
- Signature validation
- Field position validation
- PDF size limits

✅ New Features:
- Template preview modal
- Contract revocation API + UI
- Pagination (20 items/page)

✅ Security:
- Rate limiting (10/min, 5/hour)
- Strict email validation (RFC 5322)
- XSS sanitization
- Field length validation

✅ Performance:
- Optimized PDF rendering (memoization)
- Composite database indexes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
        print_success "Commit créé"
    fi
else
    print_success "Aucun changement à committer"
fi
echo ""

# Step 7: Deploy
echo "🚀 Étape 7: Déploiement"
echo "-----------------------"
echo "Options de déploiement:"
echo "  1. Vercel (automatique via git push)"
echo "  2. Autre plateforme"
echo ""
read -p "Pousser vers la branche main? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Branche actuelle: $CURRENT_BRANCH"

    if [ "$CURRENT_BRANCH" = "main" ]; then
        git push origin main
        print_success "Poussé vers origin/main"
        echo ""
        print_success "Vercel déploiera automatiquement!"
    else
        print_warning "Vous n'êtes pas sur la branche main"
        read -p "Pousser vers $CURRENT_BRANCH? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin "$CURRENT_BRANCH"
            print_success "Poussé vers origin/$CURRENT_BRANCH"
        fi
    fi
fi
echo ""

# Step 8: Post-deployment checklist
echo "✅ Étape 8: Checklist post-déploiement"
echo "---------------------------------------"
echo ""
echo "Vérifier dans Vercel/Production:"
echo "  [ ] Variables d'environnement configurées"
echo "  [ ] Build réussi sans erreurs"
echo "  [ ] Migrations appliquées en base"
echo "  [ ] Création de contrat fonctionne"
echo "  [ ] Email envoyé avec succès"
echo "  [ ] Révocation fonctionne"
echo "  [ ] Pagination s'affiche"
echo "  [ ] Rate limiting actif"
echo ""
echo "📖 Voir DEPLOY_GUIDE.md pour plus de détails"
echo ""
print_success "Déploiement terminé! 🎉"
echo ""
echo "URLs utiles:"
echo "  - Vercel Dashboard: https://vercel.com/dashboard"
echo "  - Supabase Dashboard: https://app.supabase.com"
echo "  - Resend Dashboard: https://resend.com/emails"
