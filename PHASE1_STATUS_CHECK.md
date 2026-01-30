# ✅ PHASE 1 - STATUS CHECK

**Date**: 2026-01-30
**Migration**: `supabase/migrations/20260130_seo_extension.sql`
**Status**: ✅ **EXÉCUTÉE AVEC SUCCÈS**

---

## ✅ CE QUI A ÉTÉ FAIT (PHASE 1 COMPLÈTE)

### 1️⃣ Base de Données - COMPLET ✅

**Tables Speed Insights créées** (2):
- ✅ `vercel_speed_insights_raw` - Stockage brut des payloads Vercel
- ✅ `vercel_speed_insights_daily` - Agrégations quotidiennes (p50/p75/p95)

**Views unifiées créées** (3):
- ✅ `seo_unified_daily` - GA4 + GSC + Semrush par date
- ✅ `seo_unified_daily_plus` - seo_unified_daily + Speed Insights
- ✅ `ip_to_seo_segment` - IP → activité/attribution (investigation)

**Indexes de performance créés** (16):
- ✅ GA4: date, users, conversions
- ✅ GSC: date, domain, clicks
- ✅ Semrush: date, keywords, traffic
- ✅ Speed: date, path, device, status
- ✅ Telemetry: ip_hash + created_at

**Helper Function créée** (1):
- ✅ `calculate_perf_status(lcp, inp, cls, ttfb)` - Détermine GOOD/WARN/CRIT

### 2️⃣ Speed Insights SDK - DÉJÀ INSTALLÉ ✅

- ✅ Package `@vercel/speed-insights` installé (v1.3.1)
- ✅ Intégré dans `src/app/layout.tsx`
- ✅ SDK collecte déjà les Core Web Vitals côté client

---

## 🚧 CE QUI MANQUE (PHASES 2-4)

### PHASE 2: VERCEL DRAIN + AGRÉGATION ⏱️ 1h

**Objectif**: Récupérer les données Speed Insights via webhook Vercel

#### 2.1 Endpoint Drain (30min)
**À créer**: `src/app/api/vercel/drains/speed-insights/route.ts`

```typescript
// POST /api/vercel/drains/speed-insights
// Authorization: Bearer ${VERCEL_DRAIN_SECRET}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 1. Vérifier VERCEL_DRAIN_SECRET
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.VERCEL_DRAIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parser le payload (JSON ou NDJSON)
  const contentType = req.headers.get('content-type')
  const body = await req.text()

  // 3. Extraire les métriques
  const payload = JSON.parse(body)
  const { url, device, lcp, inp, cls, ttfb, fcp } = payload

  // 4. Stocker dans vercel_speed_insights_raw
  const supabase = createClient()
  await supabase.from('vercel_speed_insights_raw').insert({
    payload: payload,
    extracted_url: url,
    extracted_device: device,
    extracted_lcp: lcp,
    extracted_inp: inp,
    extracted_cls: cls,
    extracted_ttfb: ttfb,
    extracted_fcp: fcp
  })

  return NextResponse.json({ ok: true })
}
```

#### 2.2 Configuration Vercel Dashboard (10min)
1. Aller sur https://vercel.com/[team]/[project]/settings/speed-insights
2. Ajouter Drain:
   - URL: `https://solutionargentrapide.ca/api/vercel/drains/speed-insights`
   - Secret: `${VERCEL_DRAIN_SECRET}` (à générer et ajouter dans .env)
   - Format: JSON
3. Activer le Drain

#### 2.3 Job d'Agrégation Quotidien (20min)
**À créer**: `src/app/api/cron/aggregate-speed-insights/route.ts`

```typescript
// GET /api/cron/aggregate-speed-insights
// Cron Vercel: 0 1 * * * (tous les jours à 1h)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  // 1. Récupérer les données non traitées
  const { data: raw } = await supabase
    .from('vercel_speed_insights_raw')
    .select('*')
    .eq('processed', false)

  // 2. Grouper par (date, path, device)
  // 3. Calculer p50, p75, p95 pour LCP/INP/CLS/TTFB
  // 4. Calculer perf_status avec calculate_perf_status()
  // 5. Upsert dans vercel_speed_insights_daily
  // 6. Marquer raw comme processed

  return NextResponse.json({ aggregated: raw?.length || 0 })
}
```

**Configurer dans `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/cron/aggregate-speed-insights",
      "schedule": "0 1 * * *"
    }
  ]
}
```

---

### PHASE 3: API ROUTES UNIFIÉES ⏱️ 1h30

**Objectif**: Créer les APIs qui lisent les views SQL

#### 3.1 API Overview (30min)
**À créer**: `src/app/api/seo/overview/route.ts`

```typescript
// GET /api/seo/overview?range=30d&device=mobile&page=/

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '30d'
  const device = searchParams.get('device') || 'all'
  const page = searchParams.get('page') || null

  const supabase = createClient()

  // Query seo_unified_daily_plus view
  const { data } = await supabase
    .from('seo_unified_daily_plus')
    .select('*')
    .order('date', { ascending: false })
    .limit(30)

  return NextResponse.json({
    kpis: {
      ga4: {
        users: data?.[0]?.ga4_users,
        sessions: data?.[0]?.ga4_sessions,
        conversions: data?.[0]?.ga4_conversions,
        trend: calculateTrend(data, 'ga4_users')
      },
      gsc: {
        clicks: data?.[0]?.gsc_clicks,
        impressions: data?.[0]?.gsc_impressions,
        ctr: data?.[0]?.gsc_ctr,
        position: data?.[0]?.gsc_position
      },
      semrush: {
        keywords: data?.[0]?.semrush_keywords,
        traffic: data?.[0]?.semrush_traffic,
        rank: data?.[0]?.semrush_rank
      },
      speed: {
        lcp_p75: data?.[0]?.avg_lcp_p75,
        inp_p75: data?.[0]?.avg_inp_p75,
        cls_p75: data?.[0]?.avg_cls_p75,
        status: data?.[0]?.perf_status
      }
    },
    timeline: data
  })
}
```

#### 3.2 API IP Intelligence (30min)
**À créer**: `src/app/api/seo/ip/[ip]/route.ts`

```typescript
// GET /api/seo/ip/[ip]?range=30d

export async function GET(
  req: NextRequest,
  { params }: { params: { ip: string } }
) {
  const supabase = createClient()

  // Query ip_to_seo_segment view
  const { data } = await supabase
    .from('ip_to_seo_segment')
    .select('*')
    .eq('ip', params.ip)
    .single()

  // Query telemetry_requests for timeline
  const { data: timeline } = await supabase
    .from('telemetry_requests')
    .select('created_at, path, duration_ms, status')
    .eq('ip_hash', params.ip)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({
    intelligence: data,
    timeline: timeline
  })
}
```

#### 3.3 API Performance Détaillé (30min)
**À créer**: `src/app/api/seo/perf/route.ts`

```typescript
// GET /api/seo/perf?range=30d&path=/&device=mobile

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '30d'
  const path = searchParams.get('path') || null
  const device = searchParams.get('device') || 'all'

  const supabase = createClient()

  let query = supabase
    .from('vercel_speed_insights_daily')
    .select('*')
    .order('date', { ascending: false })

  if (path) query = query.eq('path', path)
  if (device !== 'all') query = query.eq('device', device)

  const { data } = await query.limit(30)

  return NextResponse.json({ data })
}
```

---

### PHASE 4: UI REFACTOR (COMMAND CENTER + IP EXPLORER) ⏱️ 3h

**Objectif**: Créer l'interface unifiée en 3 colonnes + onglet Explorer IP

#### 4.1 Types TypeScript (15min)
**À créer**: `src/components/seo/types.ts`

```typescript
export interface SeoKpis {
  ga4: {
    users: number
    sessions: number
    conversions: number
    trend: number
  }
  gsc: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  semrush: {
    keywords: number
    traffic: number
    rank: number
  }
  speed: {
    lcp_p75: number
    inp_p75: number
    cls_p75: number
    status: 'GOOD' | 'WARN' | 'CRIT'
  }
}

export interface IpIntelligence {
  ip: string
  first_seen: string
  last_seen: string
  landing_page: string
  most_visited_page: string
  total_requests: number
  active_days: number
  unique_pages: number
  avg_duration_ms: number
  device: string
  utm_source: string
  utm_medium: string
}
```

#### 4.2 Composants de Base (45min)
**À créer**:
- `src/components/seo/SeoTopBar.tsx` - Filtres (range, device, page)
- `src/components/seo/SeoTabs.tsx` - Tabs (Command Center / Explorer IP)
- `src/components/seo/KpiCard.tsx` - Carte KPI avec sparkline

#### 4.3 Command Center (1h)
**Structure 3 colonnes**:

**Colonne A - KPI Grid**:
- `src/components/seo/KpiGrid.tsx`
- 4 cartes: GA4, GSC, Semrush, Speed
- Cliquables → ouvre drawer avec détails

**Colonne B - Attribution & Timeline**:
- `src/components/seo/AttributionPanel.tsx`
- Top pages (GA4/GSC)
- Timeline des événements

**Colonne C - Recommandations**:
- `src/components/seo/RecommendationsPanel.tsx`
- Liste CRIT / WARN / OK
- Basée sur perf_status + métriques SEO

#### 4.4 Explorer IP (45min)
**À créer**: `src/components/seo/ExplorerIpPanel.tsx`

```typescript
// Features:
// - Input IP hash
// - Afficher IP Intelligence (via API)
// - Timeline des requêtes
// - Pages vues
// - Performance vécue (avg_duration_ms, p50, p95)
// - Device / UTM info
// - Lien vers session si dispo
```

#### 4.5 Page Principale (15min)
**Refactor**: `src/app/admin/seo/page.tsx`

```typescript
'use client'

export default function SeoPage() {
  return (
    <div className="p-6">
      <SeoTopBar />
      <SeoTabs>
        <Tab label="Command Center">
          <div className="grid grid-cols-3 gap-6">
            <KpiGrid />
            <AttributionPanel />
            <RecommendationsPanel />
          </div>
        </Tab>
        <Tab label="Explorer IP">
          <ExplorerIpPanel />
        </Tab>
      </SeoTabs>
    </div>
  )
}
```

---

## 📊 RÉSUMÉ DES TÂCHES

| Phase | Tâche | Durée | Status |
|-------|-------|-------|--------|
| **1** | Migration SQL | 30min | ✅ FAIT |
| **2.1** | Endpoint Drain | 30min | ⏳ À faire |
| **2.2** | Config Vercel | 10min | ⏳ À faire |
| **2.3** | Job Agrégation | 20min | ⏳ À faire |
| **3.1** | API Overview | 30min | ⏳ À faire |
| **3.2** | API IP Intelligence | 30min | ⏳ À faire |
| **3.3** | API Perf | 30min | ⏳ À faire |
| **4.1** | Types TS | 15min | ⏳ À faire |
| **4.2** | Composants Base | 45min | ⏳ À faire |
| **4.3** | Command Center | 1h | ⏳ À faire |
| **4.4** | Explorer IP | 45min | ⏳ À faire |
| **4.5** | Page Principale | 15min | ⏳ À faire |

**Total restant**: ~5h30

---

## 🎯 PROCHAINE ÉTAPE RECOMMANDÉE

**Option A - Compléter Phase 2 (Speed Insights)**:
1. Créer endpoint Drain
2. Configurer Vercel
3. Créer job d'agrégation
4. Tester collecte

**Option B - Compléter Phase 3 (APIs)**:
1. Créer les 3 API routes
2. Tester avec Postman/curl
3. Vérifier performance

**Option C - Compléter Phase 4 (UI)**:
1. Créer composants base
2. Créer Command Center
3. Créer Explorer IP

**Recommandation**: **Option A** (Phase 2) car Speed Insights doit collecter des données avant qu'on puisse tester les APIs/UI.

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30
