# 🔴 DIAGNOSTIC DÉPLOIEMENT QUICKBOOKS

## ✅ BUILD LOCAL: SUCCESS
```bash
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (92/92)
✓ Finalizing page optimization
```

**Le build local fonctionne à 100%.**

---

## 🔍 ANALYSE PROBLÈME VERCEL

### 1. Variables d'environnement requises sur Vercel

Vérifier que ces variables sont configurées dans Vercel Dashboard:

```env
# Supabase (DÉJÀ CONFIGURÉ)
NEXT_PUBLIC_SUPABASE_URL=https://tncbzpvpxscexfhqpmcd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# QuickBooks (À VÉRIFIER)
INTUIT_CLIENT_ID=ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u
INTUIT_CLIENT_SECRET=Oewh6LtCjluiEjwBupTvolVeyBdmmaDnW7xtVySj
INTUIT_ENVIRONMENT=sandbox
INTUIT_WEBHOOK_TOKEN=votre-webhook-verifier-token

# App URL (À VÉRIFIER)
NEXT_PUBLIC_APP_URL=https://sar.vercel.app
```

**🚨 ACTION REQUISE:**
- Aller sur Vercel Dashboard → SAR project → Settings → Environment Variables
- Ajouter les 4 variables QuickBooks ci-dessus
- Redéployer

---

### 2. Migrations SQL requises

Les tables QuickBooks doivent être créées sur Supabase Production:

```bash
# Étape 1: Se connecter à Supabase
psql "postgresql://postgres:[PASSWORD]@db.tncbzpvpxscexfhqpmcd.supabase.co:5432/postgres"

# Étape 2: Appliquer la migration
\i supabase/migrations/20260120000000_quickbooks_integration.sql

# Vérifier les tables créées
\dt quickbooks_*
```

**Tables requises:**
- quickbooks_tokens
- quickbooks_customers
- quickbooks_invoices
- quickbooks_payments
- quickbooks_accounts
- quickbooks_vendors
- quickbooks_webhooks
- quickbooks_sync_logs

**🚨 ACTION REQUISE:**
Si les tables n'existent pas, les créer manuellement via Supabase Dashboard:
1. Aller sur https://supabase.com/dashboard/project/tncbzpvpxscexfhqpmcd
2. SQL Editor → New Query
3. Copier le contenu de `supabase/migrations/20260120000000_quickbooks_integration.sql`
4. Exécuter

---

### 3. Autres problèmes détectés (NON-BLOQUANTS)

#### A. Routes memory sans dynamic export
```typescript
// src/app/api/memory/context/route.ts
// src/app/api/memory/recall/route.ts
export const dynamic = 'force-dynamic' // ← AJOUTER CETTE LIGNE
```

#### B. Vue SQL manquante
```sql
-- Erreur: Could not find the table 'public.vw_audit_stats_by_table'
-- Cette vue est utilisée dans /api/admin/analytics
-- NON-CRITIQUE: le build continue
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

- [x] Code corrigé (supabase client runtime)
- [x] Build local réussi
- [ ] Variables env QuickBooks ajoutées sur Vercel
- [ ] Migration SQL appliquée sur Supabase Production
- [ ] Redéploiement Vercel
- [ ] Test de connexion QuickBooks

---

## 🎯 PROCHAINES ÉTAPES

### Étape 1: Ajouter variables Vercel
```bash
# Via Vercel CLI (si installé)
vercel env add INTUIT_CLIENT_ID
vercel env add INTUIT_CLIENT_SECRET
vercel env add INTUIT_ENVIRONMENT
vercel env add INTUIT_WEBHOOK_TOKEN
vercel env add NEXT_PUBLIC_APP_URL

# Ou manuellement via Dashboard
# https://vercel.com/project-ghostline/sar/settings/environment-variables
```

### Étape 2: Appliquer migration SQL
```sql
-- Option A: Via Supabase CLI
supabase db push

-- Option B: Via Dashboard SQL Editor
-- Copier/coller le fichier migration
```

### Étape 3: Forcer redéploiement
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## 🐛 DEBUG SI ÇA ÉCHOUE ENCORE

### Vérifier les logs Vercel
```bash
# Aller sur le deployment URL
# Cliquer sur "View Function Logs"
# Chercher les erreurs spécifiques
```

### Tester les endpoints directement
```bash
# Test status QuickBooks
curl https://sar.vercel.app/api/quickbooks/status

# Devrait retourner:
# {"connected": false} ou {"connected": true, ...}
```

### Rollback si nécessaire
```bash
# Revenir au dernier déploiement stable
git revert HEAD
git push origin main
```

---

## 📞 ACCÈS VERCEL REQUIS

Pour diagnostiquer plus en détail, j'ai besoin de:
1. Voir les logs de build Vercel complets
2. Vérifier les variables d'environnement configurées
3. Voir les logs runtime des API routes

**Comment me donner accès:**
1. Vercel Dashboard → SAR project → Settings → Members
2. Inviter avec un email temporaire ou
3. Me partager un lien de déploiement avec logs visibles

---

## 🎯 DIAGNOSTIC FINAL

**Problème probable:** Variables d'environnement QuickBooks manquantes sur Vercel

**Solution:** Ajouter les 4 variables INTUIT_* dans Vercel Dashboard

**Temps estimé:** 5 minutes

**Risque:** Aucun - le code est correct et build localement
