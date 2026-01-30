# 🔍 AUDIT SEO MODULE - EXTENSION SANS CASSER

**Date**: 2026-01-30
**Projet**: Solution Argent Rapide - Module SEO
**Objectif**: Auditer l'existant avant extension (Command Center + Speed Insights + IP Explorer)

---

## ✅ ÉTAT ACTUEL (CE QUI EXISTE ET FONCTIONNE)

### 1️⃣ Tables Supabase (Toutes présentes ✅)

| Table | Rows | Status | Usage |
|-------|------|--------|-------|
| `seo_gsc_metrics_daily` | 3 | ✅ Existe | Google Search Console (clicks/impressions/CTR/position) |
| `seo_ga4_metrics_daily` | 31 | ✅ Existe | Google Analytics 4 (users/sessions/conversions/engagement) |
| `seo_semrush_domain_daily` | 4 | ✅ Existe | Semrush (keywords/traffic/backlinks/authority) |
| `telemetry_sessions` | 0 | ✅ Existe | Sessions tracking (prêt à utiliser) |
| `telemetry_events` | 0 | ✅ Existe | Events tracking (prêt à utiliser) |
| `client_sessions` | 983 | ✅ Existe | Sessions clients (déjà utilisé) |
| `vercel_speed_insights_raw` | 0 | ✅ Existe | Speed Insights brut (drain à configurer) |
| `vercel_speed_insights_daily` | 0 | ✅ Existe | Speed Insights agrégé (job à créer) |

**Statut**: ✅ **Toutes les tables nécessaires existent déjà**

### 2️⃣ Views Supabase (Existent mais vides)

| View | Status | À Populer |
|------|--------|-----------|
| `seo_unified_daily` | ✅ Existe | Oui - Join GA4 + GSC |
| `seo_unified_daily_plus` | ✅ Existe | Oui - + Speed Insights |
| `ip_to_seo_segment` | ✅ Existe | Oui - IP → segments SEO |

**Statut**: ✅ **Views créées, mais logique à implémenter/vérifier**

### 3️⃣ API Routes Existantes (25 routes)

**Collecte de données** (déjà fonctionnelles):
- ✅ `/api/seo/collect/gsc` - Google Search Console
- ✅ `/api/seo/collect/ga4` - Google Analytics 4
- ✅ `/api/seo/collect/semrush` - Semrush
- ✅ `/api/seo/collect/cloudflare` - Cloudflare Analytics
- ✅ `/api/seo/collect/pagespeed` - PageSpeed Insights
- ✅ `/api/cron/seo-collect` - Job automatique quotidien

**API de consultation**:
- ✅ `/api/seo/metrics` - Métriques combinées
- ✅ `/api/seo/analytics/detailed` - Analytics détaillé
- ✅ `/api/seo/gsc` - GSC data
- ✅ `/api/seo/ga4-status` - Status GA4
- ✅ `/api/seo/keywords` - Keywords analysis
- ✅ `/api/seo/health` - Health check
- ✅ `/api/seo/device-intelligence` - Device breakdown

**Semrush détails**:
- ✅ `/api/seo/semrush/backlinks` - Backlinks analysis
- ✅ `/api/seo/semrush/competitors` - Competitors
- ✅ `/api/seo/semrush/keyword-research` - Keyword research

**Télémétrie**:
- ✅ `/api/telemetry/track-event` - Track events
- ✅ `/api/telemetry/write` - Write telemetry
- ✅ `/api/telemetry/health` - Health check
- ✅ `/api/admin/telemetry/command-center` - Command center data

**Statut**: ✅ **Infrastructure API complète et fonctionnelle**

### 4️⃣ Pages Admin Existantes

| Page | Lignes | Status | Description |
|------|--------|--------|-------------|
| `/admin/seo/page.tsx` | 1031 | ✅ Existe | Page principale SEO actuelle |
| `/admin/seo/analytics/page.tsx` | ? | ✅ Existe | Analytics détaillé |
| `/admin/seo/command-center/page.tsx` | ? | ✅ Existe | Command center existant |
| `/admin/seo/analytics-old/page.tsx` | ? | ⚠️ Legacy | Ancienne version |

**Statut**: ✅ **UI existante fonctionnelle, mais refonte nécessaire**

### 5️⃣ Intégrations Actives

**Google Analytics 4**:
- ✅ Service Account configuré (`GA_SERVICE_ACCOUNT_JSON`)
- ✅ Property ID: 340237010
- ✅ Measurement ID: G-F130RBTZDC
- ✅ Collecte quotidienne: 31 jours de données
- ✅ Métriques: users, sessions, conversions, engagement, traffic sources, devices

**Google Search Console**:
- ✅ Service Account configuré (même que GA4)
- ✅ Domain: solutionargentrapide.ca
- ✅ Collecte quotidienne: 3 jours de données (délai API normal)
- ✅ Métriques: clicks, impressions, CTR, position, top queries, top pages

**Semrush**:
- ✅ API Key configuré (`SEMRUSH_API_KEY`)
- ✅ Database: Canada (ca)
- ✅ Collecte quotidienne: 4 jours de données
- ✅ Métriques: domain rank, keywords (346), traffic (1046), backlinks, authority score
- ✅ Position #1 sur mots-clés principaux

**Vercel Speed Insights**:
- ⚠️ Activé sur Vercel Dashboard
- ❌ Drain non configuré (à faire)
- ❌ Job d'agrégation non créé (à faire)

**Statut**: ✅ **GA4/GSC/Semrush fonctionnels**, ⚠️ **Speed Insights à intégrer**

---

## 🔧 CE QUI MANQUE (GAPS IDENTIFIÉS)

### 1. Vercel Speed Insights - Intégration Complète

**À faire**:
- [ ] Installer `@vercel/speed-insights` dans Root Layout
- [ ] Configurer Vercel Drain vers `/api/vercel/drains/speed-insights`
- [ ] Créer endpoint drain avec auth `VERCEL_DRAIN_SECRET`
- [ ] Parser JSON/NDJSON et stocker dans `vercel_speed_insights_raw`
- [ ] Créer job d'agrégation `jobs/aggregate_speed_insights_daily.ts`
- [ ] Calculer p50/p75/p95 pour LCP/INP/CLS/TTFB
- [ ] Upsert dans `vercel_speed_insights_daily`

**Fichiers à créer**:
```
src/app/api/vercel/drains/speed-insights/route.ts
src/jobs/aggregate_speed_insights_daily.ts
```

### 2. API Routes Unifiées (nouveau design)

**Routes à créer/refactorer**:
```
GET /api/seo/overview?range=30d&device=mobile&page=/
  → Retourne KPIs unifiés: GA4 + GSC + Semrush + Speed Insights
  → Données pour Command Center (3 colonnes)

GET /api/seo/ip/[ip]?range=30d
  → Retourne IP Intelligence + Attribution + Timeline
  → Données pour Explorer IP

GET /api/seo/perf?range=30d&path=/&device=mobile
  → Retourne Speed Insights détaillé par page/device
  → Données pour drawer "Perf Details"

GET /api/seo/timeline/[session_id]
  → Retourne timeline events d'une session
  → Données pour panneau Timeline
```

### 3. UI Refactor (Command Center + Explorer IP)

**Structure à créer**:
```
src/app/admin/seo/
  └── page.tsx (nouveau - 3 colonnes + tabs)

src/components/seo/
  ├── SeoTopBar.tsx           (filters: range/device/page)
  ├── SeoTabs.tsx             (Command Center / Explorer IP)
  ├── KpiGrid.tsx             (GA4/GSC/Semrush/Speed cards)
  ├── KpiCard.tsx             (carte clickable avec sparkline)
  ├── TopPagesTable.tsx       (top pages compact)
  ├── AttributionPanel.tsx    (page detail + GSC queries)
  ├── TimelinePanel.tsx       (session events timeline)
  ├── PerfImpactPanel.tsx     (Speed Insights per page)
  ├── RecommendationsPanel.tsx (CRIT/WARN/OK list)
  ├── ExplorerIpPanel.tsx     (IP search + intelligence)
  ├── DrawerDetails.tsx       (drawer pour détails)
  └── types.ts                (TypeScript types)
```

### 4. Views SQL - Logique à Implémenter

**`seo_unified_daily`**:
```sql
-- Join GA4 + GSC par date
-- Colonnes: date, ga4_users, ga4_sessions, ga4_conversions,
--           gsc_clicks, gsc_impressions, gsc_ctr, gsc_position
```

**`seo_unified_daily_plus`**:
```sql
-- seo_unified_daily + Speed Insights
-- Ajouter: lcp_p75, inp_p75, cls_p75, ttfb_p75, samples, status
```

**`ip_to_seo_segment`**:
```sql
-- IP → attribution SEO
-- Colonnes: ip, first_seen, last_seen, device, landing_page,
--           utm_source, utm_medium, top_gsc_query,
--           ga4_sessions, ga4_conversions, avg_lcp, avg_inp
```

---

## 📋 PLAN D'EXÉCUTION (ORDRE RECOMMANDÉ)

### Phase 1: SQL Migrations Incrémentales ⏱️ 30min
1. Créer `supabase/migrations/20260130_seo_module_extension.sql`
2. Vérifier que tables existent (IF NOT EXISTS)
3. Ajouter colonnes manquantes (IF NOT EXISTS)
4. Créer indexes de performance
5. Implémenter logique des 3 views
6. Tester views avec données existantes

### Phase 2: Vercel Speed Insights ⏱️ 1h
1. Installer `@vercel/speed-insights` package
2. Ajouter dans Root Layout (`src/app/layout.tsx`)
3. Créer endpoint drain `/api/vercel/drains/speed-insights`
4. Configurer Drain sur Vercel Dashboard
5. Créer job `jobs/aggregate_speed_insights_daily.ts`
6. Tester collecte + agrégation

### Phase 3: API Routes Unifiées ⏱️ 1h30
1. Créer `/api/seo/overview` (KPIs + top pages)
2. Créer `/api/seo/ip/[ip]` (IP Intelligence)
3. Créer `/api/seo/perf` (Speed Insights détaillé)
4. Créer `/api/seo/timeline/[session_id]` (timeline)
5. Tester endpoints avec Postman/curl

### Phase 4: UI Refactor ⏱️ 2h
1. Créer types (`src/components/seo/types.ts`)
2. Créer composants de base (TopBar, Tabs, Cards)
3. Créer KpiGrid + KpiCard avec sparklines
4. Créer panneaux A/B/C (Attribution, Timeline, Recommendations)
5. Créer Explorer IP Panel
6. Créer Drawer Details
7. Brancher sur APIs
8. Tester UI complète

### Phase 5: Tests & Validation ⏱️ 30min
1. Test collecte Speed Insights
2. Test agrégation daily
3. Test API `/overview` avec tous les filtres
4. Test Explorer IP avec vraie IP
5. Test drawer details
6. Vérifier performance (pas de N+1 queries)

**Durée totale estimée**: ~5-6 heures

---

## 🎯 CRITÈRES DE SUCCÈS

### Fonctionnel
- [ ] Speed Insights collecte des données réelles (via Drain)
- [ ] Views SQL retournent des données unifiées
- [ ] API `/overview` retourne KPIs GA4+GSC+Semrush+Speed
- [ ] API `/ip/:ip` retourne Intelligence + Attribution + Timeline
- [ ] UI Command Center affiche 3 colonnes fonctionnelles
- [ ] UI Explorer IP permet recherche et affichage détails
- [ ] Drawer details s'ouvre avec trend + anomalies

### Performance
- [ ] API `/overview` < 500ms
- [ ] API `/ip/:ip` < 300ms
- [ ] Pas de N+1 queries (utiliser views + indexes)
- [ ] UI responsive (mobile/tablet/desktop)

### Sécurité
- [ ] Tous les endpoints admin-only (auth vérifié)
- [ ] Pas de secrets dans logs/réponses API
- [ ] VERCEL_DRAIN_SECRET vérifié côté serveur
- [ ] Rate limiting sur endpoints publics

### Qualité
- [ ] TypeScript strict (pas de `any`)
- [ ] Composants réutilisables
- [ ] Code documenté (JSDoc)
- [ ] Tests unitaires (si temps)

---

## 📊 DONNÉES ACTUELLES (BASELINE)

### GA4 (2026-01-29)
- Users: 94
- Sessions: 117
- Conversions: 87 (74% taux!)
- Engagement: 0.8%
- Bounce: 0.2%
- Traffic: 83% organique

### GSC (2026-01-29)
- Clicks: 0 (délai API normal)
- Impressions: 0
- Keywords: En cours de collecte

### Semrush (2026-01-29)
- Domain Rank: 187,598
- Keywords: 346
- Traffic: 1,046/mois
- Positions #1: 5 keywords principaux
- Valeur: 4,215 CAD/mois

### Speed Insights
- Status: ⚠️ Non collecté (drain à configurer)
- Target: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

## ⚠️ RISQUES & MITIGATIONS

### Risque 1: Casser intégrations existantes
**Mitigation**:
- Migrations incrémentales avec IF NOT EXISTS
- Ne pas toucher aux routes `/api/seo/collect/*`
- Tester collecte existante avant/après

### Risque 2: Speed Insights Drain ne fonctionne pas
**Mitigation**:
- Tester avec `curl` en local d'abord
- Vérifier format JSON Vercel
- Logger toutes les entrées dans `vercel_speed_insights_raw`
- Fallback: mock data si drain fail

### Risque 3: UI trop complexe (UX)
**Mitigation**:
- Design system cohérent (Tailwind dark theme)
- Composants simples et focusés
- Progressive disclosure (drawer pour détails)
- Mobile-first approach

### Risque 4: Performance (queries lentes)
**Mitigation**:
- Indexes sur toutes les colonnes de filtrage
- Views matérialisées si besoin
- Cache Redis (si disponible)
- Pagination sur listes longues

---

## 🚀 PROCHAINES ÉTAPES

1. **VALIDER CE AUDIT** avec l'utilisateur
2. **PHASE 1**: Migrations SQL (views + indexes)
3. **PHASE 2**: Speed Insights integration
4. **PHASE 3**: API Routes unifiées
5. **PHASE 4**: UI Refactor (Command Center + Explorer IP)
6. **PHASE 5**: Tests & Validation

---

**Statut Audit**: ✅ **COMPLET**
**Prêt pour extension**: ✅ **OUI**
**Risque de casser existant**: ⚠️ **FAIBLE** (si migrations incrémentales)

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30
