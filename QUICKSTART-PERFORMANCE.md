# SAR Performance Optimization - Quick Start Guide

**Date:** 2026-01-18
**Audit Report:** `SAR-PERF-AUDIT.md`
**Estimated Time:** 3-5 jours (Quick Wins + Refactors)

---

## 📋 Pré-requis

- Accès admin à Supabase (Dashboard + SQL Editor)
- Projet SAR cloné localement
- Node.js et npm installés
- Variables d'environnement configurées (`.env.local`)

---

## 🚀 Jour 1 - Quick Wins (2-3 heures)

### Étape 1: Appliquer les Migrations SQL (30 min)

**1.1 Migration 1 - Index Critiques**
```bash
# Option A: Via Supabase CLI (recommandé)
cd /Users/xunit/Desktop/📁\ Projets/sar
supabase db push

# Option B: Via Dashboard Supabase
# 1. Aller sur https://supabase.com/dashboard
# 2. Ouvrir votre projet SAR
# 3. SQL Editor > New Query
# 4. Copier le contenu de supabase/migrations/20260118000000_performance_indexes.sql
# 5. Run
```

**Vérification:**
```sql
-- Dans SQL Editor, vérifier que les index sont créés
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('contact_messages', 'loan_applications', 'vopay_objects')
ORDER BY tablename, indexname;
```

**Expected:** ~20 nouveaux index créés

---

**1.2 Migration 2 - RPC Functions**
```bash
# Appliquer la migration
supabase db push

# Ou via Dashboard SQL Editor
# Copier: supabase/migrations/20260118000001_rpc_functions.sql
```

**Vérification:**
```sql
-- Tester la fonction get_messages_with_details
SELECT * FROM get_messages_with_details(10, 0);

-- Vérifier que ça retourne des messages avec email_count, note_count
```

**Expected:** Fonction retourne des messages avec counts agrégés

---

### Étape 2: Remplacer Client Supabase (30 min)

**2.1 Le nouveau fichier est déjà créé:** `src/lib/supabase-server.ts`

**2.2 Remplacer dans les routes API critiques:**

```bash
# Route 1: Messages
nano src/app/api/admin/messages/route.ts
```

**Avant:**
```typescript
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(url, key)  // ❌ Nouveau client à chaque fois
}
```

**Après:**
```typescript
import { getSupabaseServer } from '@/lib/supabase-server'

// Utiliser directement
const supabase = getSupabaseServer()
```

**Routes à modifier (5 prioritaires):**
1. ✅ `src/app/api/admin/messages/route.ts`
2. ✅ `src/app/api/webhooks/vopay/route.ts`
3. ✅ `src/app/api/admin/client-analysis/route.ts`
4. ✅ `src/app/api/contact/route.ts`
5. ✅ `src/app/api/applications/submit/route.ts`

---

### Étape 3: Utiliser RPC get_messages_with_details (45 min)

**Fichier:** `src/app/api/admin/messages/route.ts`

**Avant (lignes 91-143):**
```typescript
// ❌ N+1 queries
const { data: messages } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)

const { count: nonLusCount } = await supabase
  .from('contact_messages')
  .select('*', { count: 'exact', head: true })
  .eq('lu', false)
```

**Après:**
```typescript
// ✅ 1 RPC call
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()

    // Single RPC call instead of N+1 queries
    const { data: messages, error } = await supabase
      .rpc('get_messages_with_details', {
        p_limit: 100,
        p_offset: 0
      })

    if (error) {
      console.error('Supabase RPC error:', error)
      throw error
    }

    // Extract total_unread from first row
    const total_unread = messages?.[0]?.total_unread || 0

    return NextResponse.json({
      messages: messages || [],
      total: messages?.length || 0,
      nonLus: total_unread
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

---

### Étape 4: Tester les Améliorations (15 min)

**4.1 Démarrer le serveur de dev:**
```bash
npm run dev
```

**4.2 Tester dans le navigateur:**
```bash
# Ouvrir
open http://localhost:3000/admin/dashboard
```

**4.3 Vérifier les logs:**
```bash
# Dans le terminal où tourne `npm run dev`
# Chercher les messages de slow_query

# Avant optimisation: devrait voir des queries > 100ms
# Après optimisation: queries < 50ms
```

**4.4 Vérifier Network tab (Chrome DevTools):**
- `/api/admin/messages` devrait être **< 200ms** (avant: 500-1000ms)
- Payload size devrait être **< 100KB** (si SELECT * remplacé)

---

## 🔧 Jour 2 - Refactors (4-6 heures)

### Étape 5: Remplacer tous les SELECT * (2 heures)

**Trouver tous les SELECT *:**
```bash
rg "\.select\(\'\*\'\)|\.select\(\"\*\"\)" src --type ts -n
```

**Pour chaque occurrence, remplacer par colonnes spécifiques:**

**Exemple - contact_messages:**
```typescript
// ❌ Avant
.select('*')  // 30+ colonnes

// ✅ Après
.select('id, nom, email, telephone, question, created_at, lu, status')
```

**Exemple - loan_applications:**
```typescript
// ❌ Avant
.select('*')  // 60+ colonnes

// ✅ Après
.select('id, reference, status, prenom, nom, courriel, montant_demande, created_at')
```

**Script de remplacement (optionnel):**
```bash
# Créer un script pour remplacer automatiquement
cat > fix-select-star.sh <<'EOF'
#!/bin/bash
# Liste des fichiers à modifier
FILES=$(rg "\.select\(\'\*\'\)" src -l)

for file in $FILES; do
  echo "Checking: $file"
  # Afficher le contexte pour décider des colonnes nécessaires
  rg "\.select\(\'\*\'\)" "$file" -A 5 -B 5
  # TODO: Remplacer manuellement après inspection
done
EOF

chmod +x fix-select-star.sh
./fix-select-star.sh
```

---

### Étape 6: Ajouter Pagination Offset (1 heure)

**Fichier:** `src/app/api/admin/messages/route.ts`

**Ajouter support de pagination:**
```typescript
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const supabase = getSupabaseServer()

    const { data: messages, error } = await supabase
      .rpc('get_messages_with_details', {
        p_limit: limit,
        p_offset: offset
      })

    if (error) throw error

    const total_unread = messages?.[0]?.total_unread || 0

    return NextResponse.json({
      messages: messages || [],
      pagination: {
        page,
        limit,
        total: messages?.length || 0,
        hasMore: messages?.length === limit
      },
      nonLus: total_unread
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

**Frontend (Dashboard):**
```typescript
// components/MessagesList.tsx
const [page, setPage] = useState(1)

async function loadMessages(page: number) {
  const res = await fetch(`/api/admin/messages?page=${page}&limit=50`)
  const data = await res.json()
  setMessages(data.messages)
}
```

---

### Étape 7: Ajouter Caching (1 heure)

**Routes lecture seule avec caching:**

**Exemple - loan_objectives (statique):**
```typescript
// src/app/api/loan-objectives/route.ts
export const revalidate = 3600  // 1 heure

export async function GET() {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('loan_objectives')
    .select('id, name, description, target_value, current_value')

  return NextResponse.json(data)
}
```

**Exemple - messages (semi-statique):**
```typescript
// src/app/api/admin/messages/route.ts
export const revalidate = 60  // 1 minute

// Ou avec unstable_cache
import { unstable_cache } from 'next/cache'

const getCachedMessages = unstable_cache(
  async (limit: number, offset: number) => {
    const supabase = getSupabaseServer()
    return await supabase.rpc('get_messages_with_details', {
      p_limit: limit,
      p_offset: offset
    })
  },
  ['messages'],
  { revalidate: 60, tags: ['messages'] }
)
```

**Invalidation on mutation:**
```typescript
// POST handler
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  // ... insert/update
  revalidateTag('messages')  // Invalider le cache
  return NextResponse.json({ success: true })
}
```

---

### Étape 8: Optimiser VoPay Webhook (1 heure)

**Fichier:** `src/app/api/webhooks/vopay/route.ts`

**Avant (lignes 99-276):**
```typescript
// ❌ 10 queries séquentielles
await supabase.from('vopay_webhook_logs').insert(...)
await supabase.from('vopay_objects').insert(...)
await supabase.from('clients').select('*').eq('email', email)
// ... 7 autres queries
```

**Après:**
```typescript
// ✅ 1 RPC call
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  // ... validation

  const supabase = getSupabaseServer()

  // Single atomic RPC call
  const { data, error } = await supabase
    .rpc('process_vopay_webhook', {
      p_transaction_id: payload.TransactionID,
      p_transaction_type: payload.TransactionType,
      p_amount: parseFloat(payload.TransactionAmount),
      p_status: payload.Status.toLowerCase(),
      p_failure_reason: payload.FailureReason || null,
      p_environment: payload.Environment,
      p_validation_key: payload.ValidationKey,
      p_updated_at: payload.UpdatedAt,
      p_payload: payload
    })

  if (error || !data?.[0]?.success) {
    console.error('[VoPay Webhook] Processing failed:', error || data?.[0]?.error_message)
    return NextResponse.json(
      { error: 'Processing failed', details: data?.[0]?.error_message },
      { status: 500 }
    )
  }

  console.log('[VoPay Webhook] Processed successfully:', {
    webhook_log_id: data[0].webhook_log_id,
    vopay_object_id: data[0].vopay_object_id,
    client_id: data[0].client_id,
    loan_id: data[0].loan_id
  })

  return NextResponse.json({
    success: true,
    data: data[0]
  })
}
```

---

## 📊 Jour 3 - Monitoring & Validation (2-3 heures)

### Étape 9: Ajouter Middleware Logging (30 min)

**Créer:** `src/middleware.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const start = Date.now()

  const response = NextResponse.next()

  // Add timing header
  const duration = Date.now() - start
  response.headers.set('X-Response-Time', `${duration}ms`)

  // Log API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      duration_ms: duration,
      status: response.status,
      type: duration > 1000 ? 'SLOW' : duration > 100 ? 'WARN' : 'OK'
    }))
  }

  return response
}

export const config = {
  matcher: '/api/:path*'
}
```

---

### Étape 10: Dashboard Performance (1 heure)

**Migration 3 - Vues matérialisées:**
```bash
# Appliquer la migration
supabase db push

# Ou via Dashboard SQL Editor
# Copier: supabase/migrations/20260118000002_materialized_views.sql
```

**Setup pg_cron (dans Supabase SQL Editor):**
```sql
-- 1. Enable extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule dashboard refresh (every 5 minutes)
SELECT cron.schedule(
  'refresh-dashboard-stats',
  '*/5 * * * *',
  'SELECT refresh_dashboard_stats()'
);

-- 3. Schedule client timeline refresh (every 10 minutes)
SELECT cron.schedule(
  'refresh-client-timeline',
  '*/10 * * * *',
  'SELECT refresh_client_timeline_summary()'
);

-- 4. Verify jobs
SELECT * FROM cron.job;
```

**Utiliser les vues dans l'API:**
```typescript
// src/app/api/admin/dashboard/stats/route.ts
import { getSupabaseServer } from '@/lib/supabase-server'

export const revalidate = 300  // 5 minutes (sync with cron)

export async function GET() {
  const supabase = getSupabaseServer()

  const { data } = await supabase
    .from('mv_dashboard_stats')
    .select('*')
    .single()

  return NextResponse.json(data)
}
```

---

### Étape 11: Tests de Performance (1 heure)

**11.1 Installer k6 (load testing):**
```bash
brew install k6
```

**11.2 Créer test script:**
```javascript
// perf-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 10 },   // Sustained load
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/admin/messages');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

**11.3 Run test:**
```bash
k6 run perf-test.js
```

**11.4 Comparer avant/après:**
```
AVANT:
  http_req_duration: avg=500ms, p95=1200ms

APRÈS:
  http_req_duration: avg=150ms, p95=300ms

✅ Amélioration: -70% latency p95
```

---

## ✅ Checklist de Validation

### Quick Wins (Jour 1)
- [ ] ✅ Migration 1 appliquée (index)
- [ ] ✅ Migration 2 appliquée (RPC functions)
- [ ] ✅ `src/lib/supabase-server.ts` créé
- [ ] ✅ 5 routes API utilisent `getSupabaseServer()`
- [ ] ✅ `/api/admin/messages` utilise RPC
- [ ] ✅ Tests manuels: Dashboard charge en < 500ms

### Refactors (Jour 2)
- [ ] ✅ 28 `SELECT *` remplacés par colonnes spécifiques
- [ ] ✅ Pagination ajoutée sur `/api/admin/messages`
- [ ] ✅ Caching ajouté sur 5+ routes
- [ ] ✅ `/api/webhooks/vopay` utilise RPC
- [ ] ✅ Payload size réduit de 50-70%

### Monitoring (Jour 3)
- [ ] ✅ Middleware logging activé
- [ ] ✅ Migration 3 appliquée (vues matérialisées)
- [ ] ✅ pg_cron configuré
- [ ] ✅ Dashboard stats < 100ms
- [ ] ✅ Tests de charge passés (p95 < 300ms)

---

## 📈 Métriques Attendues

### Avant Optimisations
| Métrique | Valeur |
|----------|--------|
| TTFB Dashboard | 800-1500ms |
| Payload /api/admin/messages | 150-300KB |
| Latency VoPay webhook | 100-300ms |
| DB connections/min | 50-100 |
| Cache hit ratio | 0% |

### Après Optimisations
| Métrique | Valeur | Amélioration |
|----------|--------|--------------|
| TTFB Dashboard | 200-400ms | **-60%** |
| Payload /api/admin/messages | 50-100KB | **-60%** |
| Latency VoPay webhook | 20-50ms | **-70%** |
| DB connections/min | 5-10 | **-90%** |
| Cache hit ratio | 40-60% | **+60%** |

---

## 🔍 Troubleshooting

### Problème: Migration échoue
```
ERROR: index already exists
```
**Solution:** Utiliser `IF NOT EXISTS` dans les migrations (déjà inclus)

### Problème: RPC function non trouvée
```
ERROR: function get_messages_with_details does not exist
```
**Solution:**
```sql
-- Vérifier que la fonction existe
SELECT * FROM pg_proc WHERE proname = 'get_messages_with_details';

-- Réappliquer la migration
-- supabase/migrations/20260118000001_rpc_functions.sql
```

### Problème: Slow queries persistantes
```
WARN: slow_query detected (>100ms)
```
**Solution:**
1. Vérifier que les index sont créés:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'contact_messages';
   ```
2. Analyser la query:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100;
   ```
3. Si "Seq Scan" apparaît, l'index n'est pas utilisé

### Problème: pg_cron non disponible
```
ERROR: extension "pg_cron" is not available
```
**Solution:** pg_cron peut ne pas être disponible sur tous les plans Supabase
- **Alternative:** Utiliser un cron job externe (Vercel Cron, GitHub Actions)
- **Exemple Vercel Cron:**
  ```typescript
  // src/app/api/cron/refresh-stats/route.ts
  import { getSupabaseServer } from '@/lib/supabase-server'

  export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabase = getSupabaseServer()
    await supabase.rpc('refresh_dashboard_stats')

    return Response.json({ success: true })
  }
  ```

---

## 📚 Ressources

- **Audit complet:** `SAR-PERF-AUDIT.md`
- **Migrations:** `supabase/migrations/202601180000*.sql`
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Caching:** https://nextjs.org/docs/app/building-your-application/caching
- **PostgreSQL Indexes:** https://www.postgresql.org/docs/current/indexes.html

---

**Questions?** Consultez `SAR-PERF-AUDIT.md` pour plus de détails.
