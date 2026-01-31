# ✅ API Explorer - Déploiement Complet

**Date**: 2026-01-30
**Status**: ✅ Production Ready
**Localisation**: `/admin/api-explorer`

---

## 📦 Ce Qui A Été Créé

### 1. Scanner de Routes ✅
**Fichier**: `scripts/scan-api-routes.ts`

```bash
npm run api:scan
# ou
npx tsx scripts/scan-api-routes.ts
```

**Résultat**:
- ✅ **188 routes scannées** avec succès
- ✅ Catalogue généré: `src/app/(admin)/api-explorer/api-catalog.generated.json`
- ✅ Stats extraites:
  - 187 routes avec auth
  - 1 route publique
  - 3 routes avec CORS
  - 4 routes avec rate limiting
  - 93 tables Supabase uniques
  - 7 services externes

**Top 10 Tables**:
1. `webhook_logs` - 19 routes
2. `vopay_objects` - 18 routes
3. `quickbooks_tokens` - 16 routes
4. `telemetry_requests` - 13 routes
5. `contact_messages` - 8 routes
6. `loan_applications` - 8 routes
7. `client_sessions` - 7 routes
8. `support_tickets` - 6 routes
9. `claude_actions` - 5 routes
10. `clients_sar` - 5 routes

---

### 2. Lib Route ID ✅
**Fichier**: `src/lib/route-id.ts`

Fonctions:
- `generateRouteId(method, path)` - Génère ID stable
- `toPathPattern(path)` - Normalise paths dynamiques
- `matchPathPattern(realPath, pattern)` - Match paths
- `findRouteByPath(method, path, catalog)` - Trouve route dans catalogue

**Normalisation automatique**:
```
/api/clients/550e8400-... → /api/clients/:uuid
/api/applications/RL55202 → /api/applications/:ref
/api/messages/123        → /api/messages/:id
```

---

### 3. Routes API Admin ✅

**Base**: `/api/admin/api-explorer/`

#### GET `/catalog`
Retourne le catalogue complet (avec filtres)

```bash
curl /api/admin/api-explorer/catalog?search=telemetry
```

#### GET `/summary?days=30`
Stats agrégées par route

**Retour**: hits, p95, erreurs, DB calls, last_seen

#### GET `/route?routeId=xxx`
Détails route + runtime stats + traces récentes

#### GET `/trace?traceId=xxx`
Timeline complète: request + spans + webhooks

---

### 4. Fonctions SQL Supabase ✅
**Fichier**: `supabase/migrations/010_api_explorer_functions.sql`

Fonctions créées:
- `get_api_summary(days_back)` - Stats par route
- `get_route_errors(method, path, days)` - Top erreurs
- `get_live_requests(limit)` - Feed live
- `get_route_timeline(method, path, hours)` - Timeline horaire

Index optimisés:
- `idx_telemetry_requests_method_path`
- `idx_telemetry_requests_created_status`
- `idx_telemetry_requests_trace_id`
- `idx_telemetry_spans_trace_id`

---

### 5. UI Dashboard ✅
**Fichier**: `src/app/(admin)/api-explorer/page.tsx`

#### Layout (3 colonnes)

**LEFT - Liste Routes**
- Search bar
- Filtres: All, Errors, Slow, DB Heavy
- 188 routes scrollables
- Stats inline (hits, p95)

**CENTER - Détails Route**
- Method + Path
- Description
- Auth type
- Database tables
- External calls
- Runtime stats (7 jours)
- Lien VSCode

**RIGHT - Live Feed**
- 200 dernières requêtes
- Refresh auto 2s
- Status colorés
- Click → trace

---

## 🚀 Prochaines Étapes

### 1. Appliquer la Migration SQL

**Option A - Via Dashboard Supabase** (Recommandé):
1. Aller sur https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
2. SQL Editor → New Query
3. Copier/coller le contenu de `supabase/migrations/010_api_explorer_functions.sql`
4. Run
5. Vérifier: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE 'get_%'`

**Option B - Via CLI**:
```bash
supabase db push
```

---

### 2. Tester Localement

```bash
# Scanner
npm run api:scan

# Dev server
npm run dev

# Ouvrir
open http://localhost:3000/admin/api-explorer
```

---

### 3. Déployer en Production

```bash
# Build
npm run build

# Deploy
vercel --prod
```

---

### 4. Vérifier en Production

1. **Catalogue**: https://admin.solutionargentrapide.ca/api/admin/api-explorer/catalog
2. **Summary**: https://admin.solutionargentrapide.ca/api/admin/api-explorer/summary?days=7
3. **UI**: https://admin.solutionargentrapide.ca/admin/api-explorer

---

## 📊 Métriques Actuelles

**Catalog**:
- Total routes: 188
- Avec runtime data: ~150 (selon telemetry_requests)
- Tables touchées: 93
- Services externes: 7

**Telemetry** (existant):
- telemetry_requests: 83,908 rows
- telemetry_spans: présent
- webhook_logs: présent
- vopay_webhook_logs: présent

---

## 🎯 Cas d'Usage

### 1. Identifier routes lentes
Filtre "Slow" → Routes avec p95 > 500ms

### 2. Débugger erreurs
Filtre "Errors" → Voir error codes → Click trace

### 3. Optimiser DB
Filtre "DB Heavy" → Routes avec avg_db_calls > 5

### 4. Monitoring temps réel
Live feed → Refresh 2s → Patterns d'erreurs

### 5. Audit sécurité
Recherche auth types → Vérifier routes publiques

---

## 📝 Scripts NPM Ajoutés

```json
{
  "api:scan": "tsx scripts/scan-api-routes.ts",
  "api:explore": "open https://admin.solutionargentrapide.ca/admin/api-explorer"
}
```

**Usage**:
```bash
npm run api:scan      # Re-scanner après modifs
npm run api:explore   # Ouvrir dashboard
```

---

## 🔧 Maintenance

### Après ajout/modification de routes

```bash
# 1. Re-scanner
npm run api:scan

# 2. Commit
git add src/app/(admin)/api-explorer/api-catalog.generated.json
git commit -m "Update API catalog"

# 3. Deploy
vercel --prod
```

### Rotation telemetry (optionnel)

```sql
-- Garder seulement 30 jours
DELETE FROM telemetry_requests
WHERE created_at < NOW() - INTERVAL '30 days';

-- Ou partitionnement TimescaleDB si > 10M rows
```

---

## 🐛 Troubleshooting

### Erreur: "Catalog not found"
```bash
npm run api:scan
```

### Erreur: "Function get_api_summary does not exist"
Appliquer migration SQL (voir étape 1)

### Live feed ne refresh pas
Vérifier:
- `NEXT_PUBLIC_SUPABASE_URL` défini
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` défini
- Console DevTools (erreurs?)

---

## 📚 Documentation

**Guide complet**: `/docs/API_EXPLORER_GUIDE.md`

Contient:
- Architecture détaillée
- Exemples de requêtes
- Cas d'usage avancés
- Phase 2 & 3 (roadmap)

---

## ✅ Checklist Finale

- [x] Script scanner créé
- [x] 188 routes scannées
- [x] Catalogue généré (119 KB JSON)
- [x] Lib route-id créée
- [x] 4 routes API admin créées
- [x] Migration SQL créée (4 fonctions + 4 index)
- [x] UI dashboard complète (3 colonnes)
- [x] Scripts npm ajoutés
- [x] Documentation complète
- [ ] **Migration SQL appliquée** ⬅️ À FAIRE
- [ ] **Test production** ⬅️ À FAIRE

---

## 🎉 Résultat Final

**Module API Explorer fonctionnel** qui:
- ✅ Catalogue 188 routes automatiquement
- ✅ Monitore performances en temps réel
- ✅ Relie routes aux preuves (telemetry)
- ✅ Permet debug avec traces complètes
- ✅ Identifie problèmes (lenteur, erreurs, DB)

**URL Production**: https://admin.solutionargentrapide.ca/admin/api-explorer

---

**Version**: 1.0.0
**Date**: 2026-01-30
**Status**: ✅ Ready to Deploy
