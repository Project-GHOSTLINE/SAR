# 🔄 Guide de Mise à Jour - Solution Argent Rapide

Ce guide documente le processus de mise à jour du système et de mise à jour de la documentation.

**Dernière mise à jour**: 2026-01-27

---

## 📋 Table des Matières

1. [Avant de Commencer](#avant-de-commencer)
2. [Types de Mises à Jour](#types-de-mises-à-jour)
3. [Processus de Mise à Jour](#processus-de-mise-à-jour)
4. [Mise à Jour de la Documentation](#mise-à-jour-de-la-documentation)
5. [Checklist Post-Mise à Jour](#checklist-post-mise-à-jour)

---

## 🚦 Avant de Commencer

### Prérequis

```bash
# 1. Vérifier l'état Git
git status

# 2. Vérifier la branche actuelle
git branch --show-current

# 3. Vérifier le build actuel
npm run build

# 4. Créer un backup AVANT toute modification
./scripts/backup-system.sh
```

### Règles d'Or

1. **Toujours créer un backup avant modification**
2. **Tester localement avant deploy**
3. **Documenter tous les changements**
4. **Commiter régulièrement (petit commits)**
5. **Ne jamais commit de secrets**

---

## 📦 Types de Mises à Jour

### 1. Mise à Jour Mineure (Patch)

**Exemples**: Bug fix, typo, amélioration UX mineure

```bash
# 1. Créer branche
git checkout -b fix/nom-du-bug

# 2. Faire les modifications
# ... éditer fichiers ...

# 3. Tester localement
npm run dev
# Vérifier que tout fonctionne

# 4. Build
npm run build

# 5. Commit
git add .
git commit -m "fix: Description du bug fix

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. Push et merge
git push origin fix/nom-du-bug
# Créer PR sur GitHub et merge
```

**Documentation requise**: ❌ Non (sauf si API change)

### 2. Mise à Jour de Feature (Minor)

**Exemples**: Nouvelle fonctionnalité, nouveau endpoint API

```bash
# 1. Créer branche
git checkout -b feat/nom-feature

# 2. Faire les modifications
# ... développement ...

# 3. Tester
npm run dev
npm run build

# 4. Créer documentation
# Voir section "Mise à Jour de la Documentation"

# 5. Commit avec doc
git add .
git commit -m "feat: Description de la feature

**New Feature**: Description détaillée

**Files Changed**:
- src/app/api/nouvelle-route/route.ts
- src/app/admin/nouvelle-page/page.tsx

**Documentation**:
- FEATURE_NAME_DOC.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. Push et PR
git push origin feat/nom-feature
```

**Documentation requise**: ✅ Oui (obligatoire)

### 3. Mise à Jour Majeure (Breaking Change)

**Exemples**: Changement de schéma DB, refactoring complet, migration

```bash
# 1. Créer backup complet
./scripts/backup-system.sh

# 2. Créer branche
git checkout -b major/nom-changement

# 3. Planifier la migration
# Créer MIGRATION_PLAN.md

# 4. Exécuter la migration par étapes
# Tester chaque étape

# 5. Mettre à jour TOUTE la documentation
# Voir section documentation

# 6. Commit détaillé
git commit -m "BREAKING CHANGE: Description

**Breaking Changes**:
- Liste des changements incompatibles
- Migration path pour les utilisateurs

**Documentation Updated**:
- README.md
- API_DOCS.md
- MIGRATION_GUIDE.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Documentation requise**: ✅✅✅ Oui (OBLIGATOIRE + migration guide)

---

## 🔄 Processus de Mise à Jour

### Workflow Standard

```
1. Backup
   ↓
2. Branch
   ↓
3. Develop
   ↓
4. Test Local
   ↓
5. Build
   ↓
6. Document
   ↓
7. Commit
   ↓
8. Push
   ↓
9. PR & Review
   ↓
10. Merge to Main
   ↓
11. Auto-Deploy (Vercel)
   ↓
12. Verify Production
   ↓
13. Update Backup
```

### Commandes par Étape

#### Étape 1-2: Backup & Branch

```bash
# Backup
./scripts/backup-system.sh

# Nouvelle branche
git checkout -b type/nom-descriptif

# Types: feat, fix, docs, refactor, test, chore
```

#### Étape 3-5: Développement & Test

```bash
# Développement
code .

# Test local continu
npm run dev

# Build final
npm run build

# Vérifier erreurs TypeScript
npm run type-check  # Si configuré
```

#### Étape 6: Documentation

Voir section "Mise à Jour de la Documentation" ci-dessous

#### Étape 7-8: Commit & Push

```bash
# Status
git status

# Add
git add .

# Ou add sélectif
git add src/app/api/nouvelle-route/
git add FEATURE_DOC.md

# Commit avec message structuré
git commit -m "type: Description courte

Description détaillée si nécessaire

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push
git push origin branche-name
```

#### Étape 9-10: PR & Merge

```bash
# Via GitHub CLI
gh pr create --title "feat: Description" --body "Description détaillée"

# Ou via interface GitHub
# Créer PR, demander review, merger
```

#### Étape 11-12: Deploy & Verification

```bash
# Vercel auto-deploy après merge to main

# Vérifier logs Vercel
vercel logs --prod

# Tester en production
curl https://admin.solutionargentrapide.ca/api/health

# Vérifier feature en production
open https://admin.solutionargentrapide.ca/admin/nouvelle-page
```

#### Étape 13: Backup Post-Deploy

```bash
# Créer nouveau backup avec nouvelle version
./scripts/backup-system.sh

# Vérifier backup
./scripts/verify-backup.sh backups/$(date +%Y-%m-%d)
```

---

## 📚 Mise à Jour de la Documentation

### Documentation Obligatoire

#### Pour Nouvelle Feature

1. **README.md** (si feature majeure)
   ```markdown
   ## Nouvelle Feature: Nom

   Description courte

   [Documentation complète](./FEATURE_NAME_DOC.md)
   ```

2. **FEATURE_NAME_DOC.md** (fichier dédié)
   ```markdown
   # Feature: Nom de la Feature

   **Date**: YYYY-MM-DD
   **Status**: ✅ Production / 🚧 En cours / 📋 Planifié

   ## Objectif

   ## Architecture

   ## API Endpoints

   ## Usage

   ## Exemples

   ## Troubleshooting
   ```

3. **Code Comments** (dans le code)
   ```typescript
   /**
    * API: POST /api/nouvelle-route
    *
    * Description de ce que fait cet endpoint
    *
    * @param {string} client_id - Description
    * @returns {object} - Description du retour
    */
   ```

#### Pour Changement API

1. **API_REFERENCE.md** (si existe)
2. **Mettre à jour BACKUP_REPORT.md**:
   ```bash
   # Ajouter dans section "API Endpoints"
   ```

#### Pour Migration DB

1. **Migration SQL file**:
   ```sql
   -- Migration: Description
   -- Date: YYYY-MM-DD
   -- Author: Claude Sonnet 4.5

   -- Up Migration
   CREATE TABLE nouvelle_table (...);

   -- Indexes
   CREATE INDEX idx_... ON nouvelle_table(...);

   -- RLS
   ALTER TABLE nouvelle_table ENABLE ROW LEVEL SECURITY;
   ```

2. **MIGRATION_GUIDE.md**:
   ```markdown
   # Migration: Nom

   ## Avant Migration

   ## Étapes

   ## Après Migration

   ## Rollback
   ```

### Template de Documentation Feature

```markdown
# Feature: [NOM DE LA FEATURE]

**Date**: 2026-01-27
**Version**: 1.0
**Status**: ✅ Production
**Auteur**: Claude Sonnet 4.5

---

## 🎯 OBJECTIF

[Description de ce que fait la feature]

---

## 📊 ARCHITECTURE

### Composants
1. **API**: `/api/...`
2. **Page**: `/admin/...`
3. **Database**: Tables utilisées

### Flux de Données
```
User → Page → API → Supabase → API → Page → User
```

---

## 🔗 API ENDPOINTS

### GET /api/...

**Query Params**:
- `param1` (required): Description

**Response**:
```json
{
  "success": true,
  "data": {}
}
```

---

## 🚀 USAGE

### Accès Admin

1. Aller sur `/admin/...`
2. ...

### Programmation

```typescript
const result = await fetch('/api/...')
```

---

## 📝 EXEMPLES

### Exemple 1: Cas d'usage courant

```bash
curl https://admin.solutionargentrapide.ca/api/...
```

---

## 🐛 TROUBLESHOOTING

### Erreur: "..."

**Solution**: ...

---

## 📋 MAINTENANCE

### Monitoring

### Cleanup

---

## 🔐 SÉCURITÉ

### Authentication
### Privacy

---

**Dernière mise à jour**: YYYY-MM-DD
```

---

## ✅ Checklist Post-Mise à Jour

### Immédiat (dans les 5 minutes)

- [ ] Build réussi
- [ ] Deploy Vercel terminé
- [ ] Page charge sans erreur 500
- [ ] API endpoint répond
- [ ] Console browser sans erreurs critiques

### Court terme (dans l'heure)

- [ ] Feature fonctionne comme prévu
- [ ] Tests manuels passent
- [ ] Documentation créée/mise à jour
- [ ] Backup créé avec nouvelle version
- [ ] BACKUP_REPORT.md mis à jour
- [ ] README.md mis à jour (si nécessaire)

### Moyen terme (dans la journée)

- [ ] Monitoring: Aucune alerte
- [ ] Logs: Aucune erreur inattendue
- [ ] Performance: Temps de réponse OK
- [ ] Users: Aucun feedback négatif

### Long terme (dans la semaine)

- [ ] Documentation validée
- [ ] Tests utilisateurs positifs
- [ ] Métriques d'usage (analytics)
- [ ] Aucun bug report
- [ ] Backup archivé en lieu sûr

---

## 📊 Tracking des Mises à Jour

### Fichier: UPDATE_LOG.md

Créer et maintenir un log des mises à jour:

```markdown
# Log des Mises à Jour

## 2026-01-27

### ✨ Feature: Unified Client Coherence System
- **Type**: Major Feature
- **Files**: 5 nouveaux, 3 modifiés
- **Documentation**: CLIENT_UNIFIED_METRICS_DOC.md
- **Deploy**: 15:30 UTC
- **Status**: ✅ Success
- **Backup**: backups/2026-01-27/

### 🐛 Fix: TypeScript error in SSL route
- **Type**: Bug Fix
- **Files**: 1 modifié
- **Deploy**: 15:15 UTC
- **Status**: ✅ Success

## 2026-01-26

...
```

---

## 🔧 Scripts Utiles

### Vérifier État Actuel

```bash
# Status complet
cat << 'EOF' > scripts/check-status.sh
#!/bin/bash
echo "=== GIT STATUS ==="
git status

echo ""
echo "=== BUILD STATUS ==="
npm run build > /dev/null 2>&1 && echo "✅ Build OK" || echo "❌ Build Failed"

echo ""
echo "=== LAST BACKUP ==="
ls -lt backups/ | head -5

echo ""
echo "=== LAST DEPLOY ==="
vercel ls --prod 2>/dev/null | head -3
EOF

chmod +x scripts/check-status.sh
./scripts/check-status.sh
```

### Préparer Mise à Jour

```bash
# Script de préparation
cat << 'EOF' > scripts/prepare-update.sh
#!/bin/bash
echo "🔄 Préparation mise à jour..."

# Backup
echo "1. Backup..."
./scripts/backup-system.sh

# Git pull
echo "2. Git pull..."
git pull origin main

# Install deps
echo "3. Dependencies..."
npm install

# Build test
echo "4. Build test..."
npm run build

echo "✅ Prêt pour mise à jour!"
EOF

chmod +x scripts/prepare-update.sh
```

---

## 📞 Support

### En Cas de Problème

1. **Build échoue**: Vérifier les erreurs TypeScript
2. **Deploy échoue**: Vérifier logs Vercel
3. **Feature ne marche pas**: Vérifier console browser + API logs
4. **Rollback nécessaire**: Restaurer depuis backup

### Contacts

- **Documentation système**: Ce fichier (UPDATE_GUIDE.md)
- **Backup**: backups/README.md
- **Scripts**: scripts/

---

**Dernière mise à jour**: 2026-01-27
**Version**: 1.0
