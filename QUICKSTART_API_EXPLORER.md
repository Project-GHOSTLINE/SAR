# 🚀 API Explorer - Quick Start

---

## ⚡ TL;DR

```bash
# 1. Scanner les routes (déjà fait ✅)
npm run api:scan

# 2. Appliquer migration SQL (À FAIRE)
# Copier/coller supabase/migrations/010_api_explorer_functions.sql
# dans Supabase SQL Editor

# 3. Ouvrir dashboard
npm run api:explore
# → https://admin.solutionargentrapide.ca/admin/api-explorer
```

---

## 📊 État Actuel

### ✅ Complété
- [x] **188 routes scannées** et cataloguées
- [x] Script scanner fonctionnel (`scripts/scan-api-routes.ts`)
- [x] Lib normalisation paths (`src/lib/route-id.ts`)
- [x] 4 routes API admin (`/api/admin/api-explorer/*`)
- [x] UI dashboard 3 colonnes (`/admin/api-explorer`)
- [x] Migration SQL prête (`010_api_explorer_functions.sql`)
- [x] Documentation complète

### ⏳ À Faire
- [ ] **Appliquer migration SQL Supabase** (2 min)
- [ ] Tester en production
- [ ] Re-scanner après modifs futures

---

## 🎯 Application Migration SQL

### Méthode Recommandée (Dashboard)

1. **Aller sur**: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq

2. **SQL Editor** → New Query

3. **Copier/coller** le contenu de:
   ```
   /Users/xunit/Desktop/📁 Projets/sar/supabase/migrations/010_api_explorer_functions.sql
   ```

4. **Run** (Ctrl+Enter)

5. **Vérifier**:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE 'get_%';
   ```

   **Doit retourner**:
   - `get_api_summary`
   - `get_route_errors`
   - `get_live_requests`
   - `get_route_timeline`

---

## 🧪 Test Local

```bash
# Terminal 1: Dev server
cd "/Users/xunit/Desktop/📁 Projets/sar"
npm run dev

# Terminal 2: Test APIs
# Catalog
curl http://localhost:3000/api/admin/api-explorer/catalog | jq

# Summary
curl http://localhost:3000/api/admin/api-explorer/summary?days=7 | jq

# Browser
open http://localhost:3000/admin/api-explorer
```

---

## 🌐 URLs Production

| Ressource | URL |
|-----------|-----|
| Dashboard UI | https://admin.solutionargentrapide.ca/admin/api-explorer |
| API Catalog | https://admin.solutionargentrapide.ca/api/admin/api-explorer/catalog |
| API Summary | https://admin.solutionargentrapide.ca/api/admin/api-explorer/summary?days=7 |
| Supabase Dashboard | https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq |

---

## 📈 Statistiques Clés

### Routes Scannées: **188**
- Avec auth: 187
- Publiques: 1
- CORS: 3
- Rate limiting: 4

### Tables Supabase: **93 uniques**
Top 5:
1. webhook_logs (19 routes)
2. vopay_objects (18 routes)
3. quickbooks_tokens (16 routes)
4. telemetry_requests (13 routes)
5. contact_messages (8 routes)

### Services Externes: **7**
- api.resend.com
- api.twilio.com
- api.vopay.com
- flinks.io
- inverite.com
- quickbooks.intuit.com
- (+ 1 autre)

### Telemetry Data: **83,908 requêtes**
Prêt pour analyse en temps réel

---

## 🎨 UI Features

### Left Panel - Liste Routes
- 🔍 Search bar (path, description, tables)
- 🎛️ Filtres: All, Errors, Slow, DB Heavy
- 📊 Stats inline (hits, p95 latency)
- ⚠️ Icônes alertes (erreurs)

### Center Panel - Détails Route
- 📝 Description complète
- 🔐 Type d'authentification
- 🗄️ Tables DB touchées
- 🌐 Appels externes
- 📈 Runtime stats (7 jours)
- 💻 Lien VSCode

### Right Panel - Live Feed
- ⚡ 200 dernières requêtes
- 🔄 Refresh auto 2s
- 🎨 Status colorés (200/400/500)
- ⏱️ Durée (ms)
- 👆 Click → Trace détaillée

---

## 🔍 Cas d'Usage

### 1. Routes Lentes
```
Filtre: "Slow" → Routes avec P95 > 500ms
Action: Optimiser DB queries, ajouter cache
```

### 2. Erreurs Fréquentes
```
Filtre: "Errors" → Voir error_codes
Click trace → Timeline complète
```

### 3. DB Intensive
```
Filtre: "DB Heavy" → Routes avec >5 calls
Action: Batch queries, reduce N+1
```

### 4. Audit Sécurité
```
Search: "Public" auth
Vérifier: Rate limiting, CORS
```

### 5. Monitoring Live
```
Right panel → Live feed
Repérer: Pics erreurs, patterns
```

---

## 🔄 Workflow Maintenance

### Après modification de routes

```bash
# 1. Re-scanner
npm run api:scan

# 2. Vérifier diff
git diff src/app/\(admin\)/api-explorer/api-catalog.generated.json

# 3. Commit
git add src/app/\(admin\)/api-explorer/api-catalog.generated.json
git commit -m "Update API catalog"

# 4. Deploy
git push origin main
# ou
vercel --prod
```

---

## 🛠️ Commandes Utiles

```bash
# Scanner routes
npm run api:scan

# Ouvrir dashboard (production)
npm run api:explore

# Dev local
npm run dev

# Build production
npm run build

# Deploy Vercel
vercel --prod

# Test APIs (local)
curl http://localhost:3000/api/admin/api-explorer/catalog | jq '.routes | length'
curl http://localhost:3000/api/admin/api-explorer/summary | jq '.routes[0]'
```

---

## 📚 Docs Complètes

| Fichier | Description |
|---------|-------------|
| `API_EXPLORER_DEPLOYMENT.md` | Guide déploiement complet |
| `docs/API_EXPLORER_GUIDE.md` | Documentation technique détaillée |
| `scripts/scan-api-routes.ts` | Code du scanner |
| `supabase/migrations/010_*.sql` | Migration SQL |

---

## 🎉 Résultat

**Dashboard opérationnel** qui:
- ✅ Catalogue toutes les routes automatiquement
- ✅ Affiche stats runtime (hits, latency, erreurs)
- ✅ Permet debug avec traces complètes
- ✅ Identifie problèmes (lenteur, erreurs, DB)
- ✅ Monitoring temps réel (live feed)

**Next Step**: Appliquer migration SQL → Test production ✅

---

**Version**: 1.0.0
**Date**: 2026-01-30
**Status**: ✅ Ready to Use (après migration SQL)
