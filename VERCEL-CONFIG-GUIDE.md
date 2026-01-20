# 🚀 GUIDE CONFIGURATION VERCEL - QUICKBOOKS

## ✅ DIAGNOSTIC LOCAL: TOUT EST OK

Le script de vérification confirme:
- ✓ Toutes les variables d'environnement présentes localement
- ✓ Tous les fichiers API routes présents
- ✓ Migration SQL prête
- ✓ Build local réussi
- ✓ Routes QuickBooks compilées

**Conclusion: Le problème est sur Vercel (variables d'environnement ou migration SQL manquantes)**

---

## 🔧 ÉTAPE 1: CONFIGURER VARIABLES VERCEL

### Accéder aux variables d'environnement

1. Aller sur: https://vercel.com/project-ghostline/sar
2. Cliquer sur **Settings** (en haut)
3. Cliquer sur **Environment Variables** (menu gauche)

### Variables à ajouter

Cliquer sur **Add New** pour chaque variable:

#### Variable 1: INTUIT_CLIENT_ID
```
Key: INTUIT_CLIENT_ID
Value: ABHy8sBTOup0uRmPIIjnFTYHOA6XAoKbSn5hNn7aldAzISLC1u
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 2: INTUIT_CLIENT_SECRET
```
Key: INTUIT_CLIENT_SECRET
Value: Oewh6LtCjluiEjwBupTvolVeyBdmmaDnW7xtVySj
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 3: INTUIT_ENVIRONMENT
```
Key: INTUIT_ENVIRONMENT
Value: sandbox
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 4: INTUIT_WEBHOOK_TOKEN
```
Key: INTUIT_WEBHOOK_TOKEN
Value: votre-webhook-verifier-token
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variable 5: NEXT_PUBLIC_APP_URL (si manquante)
```
Key: NEXT_PUBLIC_APP_URL
Value: https://sar.vercel.app
Environments: ☑ Production ☑ Preview ☑ Development
```

### Vérifier les variables existantes

Vérifier que ces variables sont déjà configurées:
- ✓ NEXT_PUBLIC_SUPABASE_URL
- ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✓ SUPABASE_SERVICE_ROLE_KEY

Si elles sont manquantes, c'est un problème plus grave.

---

## 🗄️ ÉTAPE 2: APPLIQUER MIGRATION SQL SUR SUPABASE

### Option A: Via Supabase Dashboard (RECOMMANDÉ)

1. Aller sur: https://supabase.com/dashboard/project/tncbzpvpxscexfhqpmcd
2. Cliquer sur **SQL Editor** (menu gauche)
3. Cliquer sur **New Query**
4. Ouvrir le fichier: `supabase/migrations/20260120000000_quickbooks_integration.sql`
5. Copier tout le contenu
6. Coller dans l'éditeur SQL
7. Cliquer sur **Run** (ou Ctrl+Enter)

### Option B: Via Supabase CLI (si installé)

```bash
# Se connecter au projet
supabase link --project-ref tncbzpvpxscexfhqpmcd

# Appliquer les migrations
supabase db push

# Vérifier les tables créées
supabase db remote list
```

### Vérifier que les tables sont créées

Après avoir exécuté la migration, vérifier dans **Table Editor**:
- quickbooks_tokens
- quickbooks_customers
- quickbooks_invoices
- quickbooks_payments
- quickbooks_accounts
- quickbooks_vendors
- quickbooks_webhooks
- quickbooks_sync_logs

**Total: 8 nouvelles tables**

---

## 🚀 ÉTAPE 3: REDÉPLOYER SUR VERCEL

### Option A: Forcer un nouveau déploiement

```bash
# Dans le terminal du projet SAR
git commit --allow-empty -m "chore: Trigger Vercel redeploy after env config"
git push origin main
```

### Option B: Redéployer via Vercel Dashboard

1. Aller sur: https://vercel.com/project-ghostline/sar
2. Aller dans **Deployments**
3. Cliquer sur le dernier déploiement
4. Cliquer sur **⋯** (menu 3 points)
5. Cliquer sur **Redeploy**

---

## 🧪 ÉTAPE 4: TESTER LE DÉPLOIEMENT

### Test 1: Vérifier le build

1. Aller sur la page du déploiement
2. Vérifier que le **Build** est ✓ Success
3. Si échec, cliquer sur **View Build Logs**
4. Chercher les erreurs en rouge

### Test 2: Tester l'endpoint status

```bash
# Dans le terminal
curl https://sar.vercel.app/api/quickbooks/status

# Réponse attendue:
# {"connected": false} ou {"connected": true, ...}
```

### Test 3: Accéder à la page admin

1. Aller sur: https://sar.vercel.app/admin/quickbooks
2. Vérifier que la page charge
3. Vérifier que le menu "QuickBooks" est visible
4. Vérifier que le badge "v2.1.0" est visible

---

## 🐛 SI ÇA ÉCHOUE ENCORE

### Debug 1: Vérifier les logs Vercel

```bash
# Aller sur le deployment
https://vercel.com/project-ghostline/sar/[DEPLOYMENT-ID]

# Cliquer sur "Functions"
# Sélectionner une route QuickBooks
# Voir les logs d'erreur
```

### Debug 2: Vérifier les variables env sur Vercel

```bash
# Via Vercel CLI (si installé)
vercel env ls

# Devrait lister toutes les variables
```

### Debug 3: Test local vs production

```bash
# Build local
npm run build
npm start

# Test
curl http://localhost:3000/api/quickbooks/status
```

---

## 📋 CHECKLIST FINALE

- [ ] Variables INTUIT_* ajoutées sur Vercel
- [ ] Variable NEXT_PUBLIC_APP_URL ajoutée/vérifiée
- [ ] Migration SQL exécutée sur Supabase
- [ ] 8 tables quickbooks_* créées
- [ ] Redéploiement Vercel lancé
- [ ] Build Vercel réussi (vert)
- [ ] Endpoint /api/quickbooks/status répond
- [ ] Page /admin/quickbooks accessible
- [ ] Menu QuickBooks visible
- [ ] Badge v2.1.0 visible

---

## 🎯 ERREURS COMMUNES

### Erreur: "supabaseKey is required"
**Cause:** Variable SUPABASE_SERVICE_ROLE_KEY manquante sur Vercel
**Solution:** Ajouter la variable dans Vercel Dashboard

### Erreur: "Cannot find name 'supabase'"
**Cause:** Code essaie d'utiliser supabase à build-time
**Solution:** Déjà corrigé dans le code actuel

### Erreur: "table does not exist"
**Cause:** Migration SQL non appliquée sur Supabase Production
**Solution:** Exécuter la migration via SQL Editor

### Erreur: Build timeout
**Cause:** Build trop long (>10min)
**Solution:** Contacter Vercel support ou optimiser le build

---

## 🔑 ACCÈS REQUIS

Pour que je puisse diagnostiquer directement:

### Option 1: Accès lecture Vercel
```
Vercel Dashboard → Settings → Members
→ Inviter avec email
→ Role: Viewer
```

### Option 2: Partage logs
```
1. Copier l'URL du déploiement échoué
2. Cliquer "View Build Logs"
3. Copier tout le texte
4. Me le partager
```

### Option 3: Screenshots
```
1. Vercel: Build logs
2. Vercel: Environment Variables (masquer les secrets)
3. Supabase: Table Editor (liste des tables)
```

---

## 📞 SUPPORT

Si tout échoue:
1. Rollback: `git revert HEAD && git push`
2. Contacter Vercel Support
3. Vérifier status Vercel: https://www.vercel-status.com/

---

**Date:** 2026-01-20
**Version:** 1.0
**Auteur:** Claude Sonnet 4.5
