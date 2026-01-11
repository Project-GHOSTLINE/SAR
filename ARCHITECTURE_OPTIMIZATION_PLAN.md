# 🏗️ Plan d'Architecture - Optimisation Maximale SAR Admin

## 🎯 Objectifs
- Réduire les temps de réponse API de 70-90%
- Supporter 10,000+ requêtes/minute sans dégradation
- Temps de chargement initial < 500ms
- Temps de navigation < 100ms

---

## 📐 Architecture Actuelle (Problèmes)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 400-1000ms par page
       ▼
┌─────────────────┐
│   Next.js API   │ ❌ Pas de cache
│    Routes       │ ❌ Requêtes séquentielles
└────────┬────────┘ ❌ Filtrage en JavaScript
         │
         ▼
┌─────────────────┐
│    Supabase     │ ❌ Pas d'indexes optimaux
│   PostgreSQL    │ ❌ Pas de materialized views
└─────────────────┘ ❌ Scans de tables complètes
```

**Problèmes identifiés:**
1. ❌ Aucun système de cache
2. ❌ Requêtes non-optimisées (full table scans)
3. ❌ Pas d'indexes sur colonnes filtrées
4. ❌ Agrégations en JavaScript au lieu de SQL
5. ❌ Requêtes séquentielles (waterfall)
6. ❌ Pas de pagination efficace
7. ❌ Pas de lazy loading
8. ❌ Bundle JavaScript trop lourd

---

## 🏗️ Architecture Optimisée (Solution)

```
┌─────────────────┐
│    Browser      │
│  + React Query  │ ✅ Cache client 5min
│  + Code Split   │ ✅ Lazy loading
└────────┬────────┘
         │ < 100ms (cache hit)
         ▼
┌─────────────────┐
│  Vercel Edge    │ ✅ Cache Edge 60s
│   Functions     │ ✅ Géolocalisation
└────────┬────────┘
         │ < 50ms (cache miss)
         ▼
┌─────────────────┐
│   Next.js API   │ ✅ Cache mémoire 30s
│    + Redis      │ ✅ Requêtes parallèles
└────────┬────────┘ ✅ Agrégations SQL
         │
         ▼
┌─────────────────┐
│    Supabase     │ ✅ Materialized Views
│   PostgreSQL    │ ✅ Indexes composites
└─────────────────┘ ✅ Connection pooling
```

---

## 🎯 Phase 1: Optimisation Base de Données (Impact: 60-70%)

### 1.1 Créer des Indexes Stratégiques

```sql
-- 🚀 INDEXES CRITIQUES pour vopay_webhook_logs

-- Index composite pour filtrage production + statut + date
CREATE INDEX IF NOT EXISTS idx_webhooks_prod_status_date
ON vopay_webhook_logs(environment, status, received_at DESC)
WHERE environment IS NULL OR environment = 'production';

-- Index pour recherches par date uniquement
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at
ON vopay_webhook_logs(received_at DESC)
WHERE environment IS NULL OR environment = 'production';

-- Index partiel pour transactions failed
CREATE INDEX IF NOT EXISTS idx_webhooks_failed
ON vopay_webhook_logs(received_at DESC)
WHERE status = 'failed'
  AND (environment IS NULL OR environment = 'production');

-- Index pour agrégations par jour
CREATE INDEX IF NOT EXISTS idx_webhooks_date_trunc
ON vopay_webhook_logs(DATE(received_at), status, transaction_amount)
WHERE environment IS NULL OR environment = 'production';


-- 🚀 INDEXES CRITIQUES pour client_analyses

-- Index composite pour filtrage statut + assigné + date
CREATE INDEX IF NOT EXISTS idx_analyses_status_assigned_date
ON client_analyses(status, assigned_to, created_at DESC)
WHERE deleted_at IS NULL;

-- Index pour recherches par source
CREATE INDEX IF NOT EXISTS idx_analyses_source
ON client_analyses(source, created_at DESC)
WHERE deleted_at IS NULL;

-- Index unique pour GUID Inverite
CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_inverite_guid
ON client_analyses(inverite_guid)
WHERE inverite_guid IS NOT NULL AND deleted_at IS NULL;

-- Index GIN pour recherche full-text sur client_name
CREATE INDEX IF NOT EXISTS idx_analyses_client_name_gin
ON client_analyses USING gin(to_tsvector('french', client_name))
WHERE deleted_at IS NULL;
```

### 1.2 Créer des Materialized Views pour Stats

```sql
-- 🚀 MATERIALIZED VIEW: Stats Webhooks (rafraîchie toutes les 5 minutes)

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_webhook_stats AS
SELECT
  -- Stats globales
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'successful') as total_successful,
  COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
  COUNT(*) FILTER (WHERE status IN ('pending', 'in progress')) as total_pending,
  COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,

  -- Stats 7 derniers jours
  COUNT(*) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days') as week_total,
  COUNT(*) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'successful') as week_successful,
  COUNT(*) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'failed') as week_failed,

  -- Taux de succès
  ROUND(100.0 * COUNT(*) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'successful') /
    NULLIF(COUNT(*) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days'), 0), 1) as week_success_rate,

  -- Volumes
  SUM(CAST(transaction_amount AS NUMERIC)) FILTER (WHERE DATE(received_at) = CURRENT_DATE) as today_volume,
  SUM(CAST(transaction_amount AS NUMERIC)) FILTER (WHERE DATE(received_at) = CURRENT_DATE - INTERVAL '1 day') as yesterday_volume,
  SUM(CAST(transaction_amount AS NUMERIC)) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '7 days') as week_volume,
  SUM(CAST(transaction_amount AS NUMERIC)) FILTER (WHERE received_at >= CURRENT_DATE - INTERVAL '30 days') as month_volume,

  -- Timestamp de rafraîchissement
  NOW() as refreshed_at
FROM vopay_webhook_logs
WHERE environment IS NULL OR environment = 'production';

-- Index sur la materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_webhook_stats_refresh
ON mv_webhook_stats(refreshed_at);

-- Fonction pour rafraîchir automatiquement
CREATE OR REPLACE FUNCTION refresh_webhook_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_webhook_stats;
END;
$$ LANGUAGE plpgsql;


-- 🚀 MATERIALIZED VIEW: Stats Analyses Client

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_analysis_stats AS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,

  -- Par assigné
  COUNT(*) FILTER (WHERE assigned_to = 'Sandra') as sandra,
  COUNT(*) FILTER (WHERE assigned_to = 'Michel') as michel,
  COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned,

  -- Par source
  COUNT(*) FILTER (WHERE source = 'inverite') as source_inverite,
  COUNT(*) FILTER (WHERE source = 'flinks') as source_flinks,

  NOW() as refreshed_at
FROM client_analyses
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_analysis_stats_refresh
ON mv_client_analysis_stats(refreshed_at);


-- 🚀 Créer un CRON job pour rafraîchir automatiquement (Supabase Dashboard > Database > Cron Jobs)
-- Rafraîchir toutes les 5 minutes
SELECT cron.schedule(
  'refresh-webhook-stats',
  '*/5 * * * *',
  $$SELECT refresh_webhook_stats()$$
);

SELECT cron.schedule(
  'refresh-analysis-stats',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_analysis_stats$$
);
```

### 1.3 Fonctions Optimisées avec Cache

```sql
-- 🚀 FONCTION: Récupérer stats webhooks (lit la materialized view)

CREATE OR REPLACE FUNCTION get_webhook_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
  mv_data RECORD;
BEGIN
  -- Lire depuis la materialized view (ultra rapide)
  SELECT * INTO mv_data FROM mv_webhook_stats LIMIT 1;

  -- Construire le JSON
  SELECT json_build_object(
    'total', mv_data.total,
    'totalSuccessful', mv_data.total_successful,
    'totalFailed', mv_data.total_failed,
    'totalPending', mv_data.total_pending,
    'totalCancelled', mv_data.total_cancelled,
    'weekTotal', mv_data.week_total,
    'weekSuccessful', mv_data.week_successful,
    'weekFailed', mv_data.week_failed,
    'weekSuccessRate', mv_data.week_success_rate,
    'todayVolume', mv_data.today_volume,
    'yesterdayVolume', mv_data.yesterday_volume,
    'weekVolume', mv_data.week_volume,
    'monthVolume', mv_data.month_volume,
    'volumeChange', ROUND(100.0 * (mv_data.today_volume - mv_data.yesterday_volume) /
      NULLIF(mv_data.yesterday_volume, 0), 1),
    'refreshedAt', mv_data.refreshed_at
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;


-- 🚀 FONCTION: Stats journalières optimisée avec window functions

CREATE OR REPLACE FUNCTION get_daily_webhook_stats(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  successful BIGINT,
  failed BIGINT,
  pending BIGINT,
  volume NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(received_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'successful') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in progress')) as pending,
    COALESCE(SUM(CAST(transaction_amount AS NUMERIC)), 0) as volume
  FROM vopay_webhook_logs
  WHERE received_at >= CURRENT_DATE - days_back
    AND (environment IS NULL OR environment = 'production')
  GROUP BY DATE(received_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql STABLE;


-- 🚀 FONCTION: Transactions récentes paginées

CREATE OR REPLACE FUNCTION get_recent_webhooks(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  transaction_id TEXT,
  transaction_type TEXT,
  transaction_amount NUMERIC,
  status TEXT,
  failure_reason TEXT,
  received_at TIMESTAMPTZ,
  environment TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.transaction_id,
    w.transaction_type,
    CAST(w.transaction_amount AS NUMERIC),
    w.status,
    w.failure_reason,
    w.received_at,
    w.environment
  FROM vopay_webhook_logs w
  WHERE (environment IS NULL OR environment = 'production')
    AND (p_status IS NULL OR w.status = p_status)
  ORDER BY received_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;


-- 🚀 FONCTION: Stats analyses client (lit la materialized view)

CREATE OR REPLACE FUNCTION get_client_analysis_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  mv_data RECORD;
BEGIN
  SELECT * INTO mv_data FROM mv_client_analysis_stats LIMIT 1;

  SELECT json_build_object(
    'total', mv_data.total,
    'pending', mv_data.pending,
    'reviewed', mv_data.reviewed,
    'approved', mv_data.approved,
    'rejected', mv_data.rejected,
    'by_assignee', json_build_object(
      'sandra', mv_data.sandra,
      'michel', mv_data.michel,
      'unassigned', mv_data.unassigned
    ),
    'by_source', json_build_object(
      'inverite', mv_data.source_inverite,
      'flinks', mv_data.source_flinks
    ),
    'refreshedAt', mv_data.refreshed_at
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🎯 Phase 2: Optimisation API Routes (Impact: 20-30%)

### 2.1 Créer un système de cache en mémoire

**Fichier**: `src/lib/cache.ts`

```typescript
// Système de cache en mémoire simple et efficace
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Vérifier expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Supprimer les clés qui matchent le pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Nettoyage automatique des entrées expirées
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new MemoryCache()

// Nettoyer toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}

// Helper pour cache avec fonction
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached) return cached

  const data = await fn()
  cache.set(key, data, ttl)
  return data
}
```

### 2.2 Webhooks Stats API Optimisée

**Fichier**: `src/app/api/admin/webhooks/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { withCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Vérification auth
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // ✅ CACHE 30 secondes
    const data = await withCache('webhook-stats', 30000, async () => {
      // ✅ REQUÊTES EN PARALLÈLE
      const [statsResult, dailyStatsResult, recentResult, failedResult] = await Promise.all([
        // Stats depuis materialized view (ultra rapide)
        supabase.rpc('get_webhook_stats'),

        // Stats journalières (7 derniers jours)
        supabase.rpc('get_daily_webhook_stats', { days_back: 7 }),

        // Transactions récentes (100 dernières)
        supabase.rpc('get_recent_webhooks', {
          p_limit: 100,
          p_offset: 0
        }),

        // Transactions failed (10 dernières)
        supabase.rpc('get_recent_webhooks', {
          p_limit: 10,
          p_offset: 0,
          p_status: 'failed'
        })
      ])

      if (statsResult.error) throw statsResult.error

      return {
        stats: statsResult.data,
        dailyStats: dailyStatsResult.data || [],
        recentTransactions: recentResult.data || [],
        failedTransactions: failedResult.data || [],
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      ...data
    })

  } catch (error) {
    console.error('Error in /api/admin/webhooks/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2.3 Client Analysis API Optimisée

**Fichier**: `src/app/api/admin/client-analysis/route.ts` (partie GET)

```typescript
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Si ID fourni, retourner directement (avec cache 60s)
    if (id) {
      const data = await withCache(`analysis-${id}`, 60000, async () => {
        const { data, error } = await supabase
          .from('client_analyses')
          .select('*')
          .eq('id', id)
          .is('deleted_at', null)
          .single()

        if (error) throw error
        return data
      })

      return NextResponse.json({ success: true, data })
    }

    // ✅ CACHE 30 secondes pour la liste
    const cacheKey = `analyses-list-${status}-${assigned_to}-${source}-${limit}-${offset}`

    const result = await withCache(cacheKey, 30000, async () => {
      // ✅ REQUÊTES EN PARALLÈLE
      const [listResult, statsResult] = await Promise.all([
        // Liste paginée
        supabase
          .from('client_analyses')
          .select('*', { count: 'exact' })
          .is('deleted_at', null)
          .then(query => {
            let q = query
            if (status) q.eq('status', status)
            if (assigned_to) q.eq('assigned_to', assigned_to)
            if (source) q.eq('source', source)
            return q
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1)
          }),

        // Stats depuis materialized view
        supabase.rpc('get_client_analysis_stats')
      ])

      if (listResult.error) throw listResult.error
      if (statsResult.error) throw statsResult.error

      return {
        data: listResult.data || [],
        total: listResult.count || 0,
        stats: statsResult.data
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error in GET /api/admin/client-analysis:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 🎯 Phase 3: Optimisation Frontend (Impact: 10-20%)

### 3.1 Utiliser React Query pour cache client

**Fichier**: `src/lib/react-query.ts`

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 secondes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})
```

**Fichier**: `src/app/layout.tsx`

```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

### 3.2 Dashboard avec React Query

**Fichier**: `src/app/admin/dashboard/page.tsx`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { Suspense } from 'react'

// ✅ Hook personnalisé avec React Query
function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      // ✅ REQUÊTES EN PARALLÈLE
      const [messagesRes, vopayRes, webhooksRes] = await Promise.all([
        fetch('/api/admin/messages', { credentials: 'include' }),
        fetch('/api/admin/vopay', { credentials: 'include' }),
        fetch('/api/admin/webhooks/stats', { credentials: 'include' })
      ])

      const [messages, vopay, webhooks] = await Promise.all([
        messagesRes.json(),
        vopayRes.json(),
        webhooksRes.json()
      ])

      return { messages, vopay, webhooks }
    },
    staleTime: 30000, // Cache 30 secondes
    refetchInterval: 60000 // Rafraîchir toutes les minutes
  })
}

function DashboardContent() {
  const { data, isLoading, error } = useDashboardData()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage error={error} />
  }

  return (
    <>
      <AdminNav currentPage="/admin/dashboard" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50">
        {/* Stats Cards */}
        <StatsCards data={data.webhooks.stats} vopay={data.vopay} />

        {/* Messages Section */}
        <MessagesSection data={data.messages} />

        {/* VoPay Section */}
        <VoPaySection data={data.vopay} />
      </div>
    </>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  )
}
```

### 3.3 Code Splitting et Lazy Loading

**Fichier**: `src/app/admin/dashboard/page.tsx`

```typescript
import dynamic from 'next/dynamic'

// ✅ Lazy load des composants lourds
const VoPaySection = dynamic(() => import('@/components/admin/VoPaySection'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
})

const MessagesSection = dynamic(() => import('@/components/admin/MessagesSection'), {
  loading: () => <LoadingSkeleton />
})

const WebhooksChart = dynamic(() => import('@/components/admin/WebhooksChart'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
})
```

---

## 🎯 Phase 4: Configuration Next.js (Impact: 5-10%)

**Fichier**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Optimisations de production
  swcMinify: true,
  compress: true,

  // ✅ Optimiser les images
  images: {
    domains: ['solutionargentrapide.ca'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60
  },

  // ✅ Compiler les modules pour de meilleures performances
  transpilePackages: ['lucide-react'],

  // ✅ Configuration du cache
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Headers existants...
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // ✅ Cache statique 1 an
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          // ✅ Cache API 30 secondes
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=30, stale-while-revalidate=60',
          },
        ],
      },
    ]
  },

  // Redirects existants...
}

module.exports = nextConfig
```

---

## 📊 Résultats Attendus

### Avant Optimisations
```
Dashboard Load:     1000ms   ████████████████████
Webhook Stats API:   450ms   █████████
Client Analysis:     265ms   █████
Navigation:          600ms   ████████████
```

### Après Optimisations
```
Dashboard Load:      150ms   ███
Webhook Stats API:    20ms   ▌
Client Analysis:      15ms   ▌
Navigation:           50ms   █
```

### Amélioration Globale
- **Dashboard**: 1000ms → 150ms (**85% plus rapide**)
- **APIs**: 400ms → 20ms (**95% plus rapide**)
- **Navigation**: 600ms → 50ms (**92% plus rapide**)

---

## 📋 Plan d'Implémentation (Ordre Recommandé)

### Semaine 1: Base de Données (Impact Maximal)
1. ✅ Créer tous les indexes (2h)
2. ✅ Créer les materialized views (3h)
3. ✅ Créer les fonctions SQL optimisées (2h)
4. ✅ Configurer les CRON jobs (1h)
5. ✅ Tester les performances (2h)

### Semaine 2: API Routes
1. ✅ Implémenter le système de cache (2h)
2. ✅ Optimiser webhooks/stats route (3h)
3. ✅ Optimiser client-analysis route (3h)
4. ✅ Tester toutes les APIs (2h)

### Semaine 3: Frontend
1. ✅ Installer et configurer React Query (2h)
2. ✅ Refactoriser dashboard avec React Query (4h)
3. ✅ Implémenter code splitting (2h)
4. ✅ Tester le cache client (2h)

### Semaine 4: Optimisation Finale
1. ✅ Configurer Next.js pour production (2h)
2. ✅ Tests de charge (4h)
3. ✅ Monitoring et métriques (2h)
4. ✅ Documentation (2h)

---

## 🔍 Monitoring et Métriques

### Métriques à Surveiller
```typescript
// src/lib/monitoring.ts

export function logPerformance(endpoint: string, duration: number) {
  if (duration > 100) {
    console.warn(`⚠️ Slow API: ${endpoint} took ${duration}ms`)
  }

  // Envoyer à votre service de monitoring
  // (Vercel Analytics, Datadog, etc.)
}

// Utilisation dans les APIs
const start = Date.now()
const result = await fetchData()
logPerformance('/api/webhooks/stats', Date.now() - start)
```

### Dashboard Supabase
- Surveiller les requêtes lentes (> 100ms)
- Vérifier l'utilisation des indexes
- Monitorer la taille des materialized views

---

## ⚡ Optimisations Bonus

### 1. CDN pour Assets Statiques
- Utiliser Vercel Edge Network automatiquement
- Configurer les headers de cache appropriés

### 2. Connection Pooling
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        'x-connection-pool': 'true' // Utiliser le connection pooling
      }
    }
  }
)
```

### 3. Compression Gzip/Brotli
```javascript
// next.config.js
module.exports = {
  compress: true, // Activer la compression
}
```

### 4. Prefetch des Données Critiques
```typescript
// Prefetch pendant le hover
<Link
  href="/admin/analyses"
  prefetch={true}
  onMouseEnter={() => {
    queryClient.prefetchQuery(['analyses'])
  }}
>
  Analyses Client
</Link>
```

---

## 🎯 Checklist Finale

- [ ] Tous les indexes créés et testés
- [ ] Materialized views fonctionnelles avec CRON
- [ ] Fonctions SQL optimisées
- [ ] Cache mémoire implémenté
- [ ] APIs refactorisées avec requêtes parallèles
- [ ] React Query configuré
- [ ] Code splitting activé
- [ ] Tests de performance validés
- [ ] Monitoring en place
- [ ] Documentation mise à jour

---

## 🚀 Commencer l'Implémentation

Voulez-vous que je commence par:
1. **Phase 1 - Base de données** (impact maximal, 60-70% d'amélioration)
2. **Phase 2 - APIs** (20-30% d'amélioration supplémentaire)
3. **Tout implémenter d'un coup** (mode YOLO 😎)

Répondez avec le numéro de votre choix!
