# 🧪 PHASE 3 - API ROUTES - GUIDE DE TEST

**Date**: 2026-01-30
**Status**: ✅ **3 ROUTES CRÉÉES**

---

## 📦 ROUTES CRÉÉES

### 1️⃣ GET /api/seo/overview
**Fichier**: `src/app/api/seo/overview/route.ts` (148 lignes)
**Source**: View `seo_unified_daily_plus`
**Retourne**: KPIs GA4 + GSC + Semrush + Speed + Timeline + Top Pages

### 2️⃣ GET /api/seo/ip/[ip]
**Fichier**: `src/app/api/seo/ip/[ip]/route.ts` (168 lignes)
**Source**: View `ip_to_seo_segment` + Table `telemetry_requests`
**Retourne**: IP Intelligence + Stats + Timeline + Top Paths

### 3️⃣ GET /api/seo/perf
**Fichier**: `src/app/api/seo/perf/route.ts` (219 lignes)
**Source**: Table `vercel_speed_insights_daily`
**Retourne**: Speed Insights Summary + Timeline + By Page + By Device

---

## 🧪 TESTS À EXÉCUTER

### Prérequis
```bash
# 1. Committer et pousser
git add .
git commit -m "feat(seo): Phase 3 - API routes unifiées"
git push

# 2. Attendre déploiement (1-2 min)

# 3. Tester localement (dev) ou production
```

---

### Test 1: GET /api/seo/overview

**Local**:
```bash
curl "http://localhost:3000/api/seo/overview?range=30d&device=all&page=all"
```

**Production**:
```bash
curl "https://solutionargentrapide.ca/api/seo/overview?range=30d"
```

**Résultat attendu**:
```json
{
  "kpis": {
    "ga4": {
      "users": 94,
      "sessions": 117,
      "conversions": 87,
      "engagement_rate": 0.8,
      "bounce_rate": 0.2,
      "trend": {
        "users": 5,
        "sessions": 3,
        "conversions": 10
      }
    },
    "gsc": {
      "clicks": 0,
      "impressions": 0,
      "ctr": 0,
      "position": 0,
      "trend": { "clicks": 0, "impressions": 0 }
    },
    "semrush": {
      "keywords": 346,
      "traffic": 1046,
      "rank": 187598,
      "authority": 0,
      "backlinks": 0,
      "trend": { "keywords": 2, "traffic": 5 }
    },
    "speed": {
      "lcp_p75": 1850,
      "inp_p75": 150,
      "cls_p75": 0.08,
      "ttfb_p75": 600,
      "status": "GOOD",
      "samples": 245,
      "mobile_lcp": 2100,
      "desktop_lcp": 1400
    }
  },
  "timeline": [
    {
      "date": "2026-01-01",
      "ga4_users": 85,
      "ga4_sessions": 110,
      "gsc_clicks": 0,
      "avg_lcp_p75": 1900,
      "perf_status": "GOOD"
    },
    ...
  ],
  "topPages": [
    { "path": "/", "views": 1500 },
    { "path": "/demande-de-pret", "views": 850 },
    ...
  ],
  "meta": {
    "range": "30d",
    "days": 30,
    "dataPoints": 31,
    "lastUpdated": "2026-01-30"
  }
}
```

**Vérifications**:
- ✅ `kpis.ga4` rempli (users, sessions, conversions)
- ✅ `kpis.semrush` rempli (keywords, traffic)
- ✅ `kpis.speed` peut être null si Phase 2 pas encore collecté
- ✅ `timeline` contient 30 points de données
- ✅ `topPages` liste les pages populaires

---

### Test 2: GET /api/seo/ip/[ip]

**Trouver un IP hash**:
```sql
-- Dans Supabase SQL Editor
SELECT ip FROM ip_to_seo_segment LIMIT 1;
-- Copier le hash retourné (ex: "abc123def456...")
```

**Local**:
```bash
curl "http://localhost:3000/api/seo/ip/abc123def456?range=30d"
```

**Production**:
```bash
curl "https://solutionargentrapide.ca/api/seo/ip/abc123def456?range=30d"
```

**Résultat attendu**:
```json
{
  "intelligence": {
    "ip": "abc123def456",
    "first_seen": "2026-01-15T10:30:00Z",
    "last_seen": "2026-01-30T15:45:00Z",
    "landing_page": "/demande-de-pret",
    "most_visited_page": "/",
    "total_requests": 47,
    "active_days": 8,
    "unique_pages": 12,
    "avg_duration_ms": 234,
    "p50_duration_ms": 189,
    "p95_duration_ms": 876,
    "device": "mobile",
    "utm_source": "google",
    "utm_medium": "organic",
    "utm_campaign": null,
    "vercel_region": "iad1",
    "success_count": 45,
    "client_error_count": 2,
    "server_error_count": 0
  },
  "stats": {
    "total_requests": 47,
    "unique_paths": 12,
    "avg_duration": 234,
    "success_rate": 96,
    "regions": ["iad1", "cdg1"]
  },
  "topPaths": [
    { "path": "/", "count": 15 },
    { "path": "/demande-de-pret", "count": 12 },
    { "path": "/contact", "count": 8 }
  ],
  "dailyActivity": [
    { "date": "2026-01-28", "count": 8 },
    { "date": "2026-01-29", "count": 12 },
    { "date": "2026-01-30", "count": 5 }
  ],
  "timeline": [
    {
      "timestamp": "2026-01-30T15:45:00Z",
      "path": "/",
      "duration_ms": 189,
      "status": 200,
      "region": "iad1"
    },
    ...
  ],
  "meta": {
    "range": "30d",
    "days": 30,
    "timeline_size": 47
  }
}
```

**Vérifications**:
- ✅ `intelligence` contient infos IP complètes
- ✅ `topPaths` liste les pages visitées
- ✅ `dailyActivity` montre l'activité par jour
- ✅ `timeline` contient les dernières requêtes

---

### Test 3: GET /api/seo/perf

**Local**:
```bash
curl "http://localhost:3000/api/seo/perf?range=30d&path=all&device=all"
```

**Production**:
```bash
curl "https://solutionargentrapide.ca/api/seo/perf?range=7d&device=mobile"
```

**Résultat attendu**:
```json
{
  "summary": {
    "avg_lcp_p75": 1850,
    "avg_inp_p75": 150,
    "avg_cls_p75": 0.08,
    "avg_ttfb_p75": 600,
    "total_samples": 1245,
    "perf_status_distribution": {
      "GOOD": 25,
      "WARN": 3,
      "CRIT": 0
    }
  },
  "timeline": [
    {
      "date": "2026-01-24",
      "avg_lcp_p75": 1900,
      "avg_inp_p75": 145,
      "avg_cls_p75": 0.09,
      "samples": 180,
      "worst_status": "GOOD"
    },
    ...
  ],
  "byPage": [
    {
      "path": "/",
      "avg_lcp_p75": 1600,
      "avg_inp_p75": 120,
      "avg_cls_p75": 0.05,
      "samples": 650,
      "worst_status": "GOOD"
    },
    {
      "path": "/demande-de-pret",
      "avg_lcp_p75": 2100,
      "avg_inp_p75": 180,
      "avg_cls_p75": 0.12,
      "samples": 320,
      "worst_status": "WARN"
    }
  ],
  "byDevice": [
    {
      "device": "mobile",
      "avg_lcp_p75": 2100,
      "avg_inp_p75": 165,
      "avg_cls_p75": 0.09,
      "samples": 800
    },
    {
      "device": "desktop",
      "avg_lcp_p75": 1400,
      "avg_inp_p75": 130,
      "avg_cls_p75": 0.06,
      "samples": 445
    }
  ],
  "meta": {
    "range": "30d",
    "days": 30,
    "path": "all",
    "device": "all",
    "dataPoints": 28
  }
}
```

**Vérifications**:
- ✅ `summary` agrège toutes les métriques
- ✅ `timeline` montre évolution temporelle
- ✅ `byPage` liste les pages par performance
- ✅ `byDevice` compare mobile vs desktop
- ⚠️ Si Phase 2 pas encore collecté → message: "No Speed Insights data available yet"

---

## 🔍 TESTS AVEC FILTRES

### Overview - Différents ranges
```bash
curl "https://solutionargentrapide.ca/api/seo/overview?range=7d"
curl "https://solutionargentrapide.ca/api/seo/overview?range=30d"
curl "https://solutionargentrapide.ca/api/seo/overview?range=90d"
```

### Perf - Par device
```bash
curl "https://solutionargentrapide.ca/api/seo/perf?device=mobile"
curl "https://solutionargentrapide.ca/api/seo/perf?device=desktop"
```

### Perf - Par page
```bash
curl "https://solutionargentrapide.ca/api/seo/perf?path=/"
curl "https://solutionargentrapide.ca/api/seo/perf?path=/demande-de-pret"
```

---

## ⚠️ ERREURS POSSIBLES

### Erreur 404 - IP not found
```json
{ "error": "IP not found", "ip": "xxx" }
```
**Cause**: IP hash n'existe pas dans `ip_to_seo_segment`
**Solution**: Vérifier avec `SELECT ip FROM ip_to_seo_segment LIMIT 10`

### Erreur 500 - Internal error
```json
{ "error": "Internal error", "details": "..." }
```
**Cause**: Problème DB (view manquante, credentials, etc.)
**Solution**: Vérifier logs Vercel + Supabase

### Message "No data available"
```json
{ "kpis": null, "timeline": [], "message": "No data available" }
```
**Cause**: View `seo_unified_daily_plus` vide ou range trop restrictif
**Solution**: Vérifier `SELECT * FROM seo_unified_daily_plus LIMIT 1`

### Message "No Speed Insights data available yet"
```json
{ "summary": null, "timeline": [], "message": "No Speed Insights data available yet" }
```
**Cause**: Phase 2 pas encore collecté de données
**Solution**: Attendre collecte Drain + agrégation (voir Phase 2)

---

## 📊 PERFORMANCES ATTENDUES

| Route | Temps | Cache | Notes |
|-------|-------|-------|-------|
| `/api/seo/overview` | < 500ms | Oui | View optimisée avec indexes |
| `/api/seo/ip/[ip]` | < 300ms | Oui | Query simple sur indexes |
| `/api/seo/perf` | < 400ms | Oui | Agrégations en mémoire |

**Optimisations possibles**:
- Redis cache (5-15 min TTL)
- Materialized views (si volume élevé)
- CDN cache (pour overview)

---

## ✅ CHECKLIST DE VALIDATION

### Fonctionnel
- [ ] `/api/seo/overview` retourne KPIs
- [ ] `/api/seo/overview` retourne timeline
- [ ] `/api/seo/ip/[ip]` retourne intelligence
- [ ] `/api/seo/ip/[ip]` retourne timeline
- [ ] `/api/seo/perf` retourne summary
- [ ] `/api/seo/perf` retourne byPage
- [ ] `/api/seo/perf` retourne byDevice

### Filtres
- [ ] `range=7d/30d/90d` fonctionne
- [ ] `device=mobile/desktop` fonctionne
- [ ] `path=/xxx` fonctionne

### Erreurs
- [ ] IP invalide → 404
- [ ] Erreurs SQL → 500 avec details
- [ ] Pas de données → message clair

---

## 🔜 PROCHAINE ÉTAPE

**Une fois les 3 APIs testées et validées:**

**PHASE 4 - UI REFACTOR** (3h):
1. Types TypeScript (15 min)
2. Composants base (45 min)
3. Command Center (1h)
4. Explorer IP (45 min)
5. Page principale (15 min)

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30

**Status**: ✅ **3 ROUTES CRÉÉES - TESTS REQUIS**
