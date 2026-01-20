# Performance Optimization - Code Examples

Quick copy-paste examples pour implémenter les optimisations du rapport SAR-PERF-AUDIT.md

---

## 🔧 1. Supabase Singleton (PRIORITÉ 1)

### Fichier déjà créé: `src/lib/supabase-server.ts`

### Migration dans routes API:

**Route Example 1: Messages**
```typescript
// src/app/api/admin/messages/route.ts

// ❌ AVANT
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  return createClient(url, key)  // Nouvelle connexion à chaque requête
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  // ...
}

// ✅ APRÈS
import { getSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer()  // Singleton réutilisé
  // ...
}
```

**Route Example 2: Webhooks**
```typescript
// src/app/api/webhooks/vopay/route.ts

// ❌ AVANT
import { getSupabase } from '@/lib/supabase'  // Ancien helper

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  // ...
}

// ✅ APRÈS
import { getSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()
  // ...
}
```

---

## 📊 2. Remplacer SELECT * (PRIORITÉ 1)

### Example 1: contact_messages

```typescript
// ❌ AVANT (overfetch 30+ colonnes)
const { data } = await supabase
  .from('contact_messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)

// ✅ APRÈS (seulement 8 colonnes nécessaires)
const { data } = await supabase
  .from('contact_messages')
  .select('id, nom, email, telephone, question, created_at, lu, status')
  .order('created_at', { ascending: false })
  .limit(100)

// Impact: Payload -70% (300KB → 90KB)
```

### Example 2: loan_applications

```typescript
// ❌ AVANT (overfetch 60+ colonnes)
const { data } = await supabase
  .from('loan_applications')
  .select('*')

// ✅ APRÈS (colonnes essentielles)
const { data } = await supabase
  .from('loan_applications')
  .select(`
    id,
    reference,
    status,
    prenom,
    nom,
    courriel,
    telephone,
    montant_demande,
    duree_pret_mois,
    cortex_score,
    risk_level,
    created_at,
    submitted_at
  `)
```

### Example 3: vopay_objects

```typescript
// ❌ AVANT
const { data } = await supabase
  .from('vopay_objects')
  .select('*')
  .eq('client_id', clientId)

// ✅ APRÈS
const { data } = await supabase
  .from('vopay_objects')
  .select('id, object_type, vopay_id, status, amount, occurred_at')
  .eq('client_id', clientId)
  .order('occurred_at', { ascending: false })
  .limit(50)
```

### Example 4: Support Tickets

```typescript
// ❌ AVANT
const { data } = await supabase
  .from('support_tickets')
  .select('*')

// ✅ APRÈS
const { data } = await supabase
  .from('support_tickets')
  .select(`
    id,
    ticket_number,
    subject,
    status,
    priority,
    created_at,
    updated_at,
    assigned_to
  `)
  .order('created_at', { ascending: false })
```

---

## 🔄 3. N+1 Fix avec RPC (PRIORITÉ 1)

### Complete Route Refactor: /api/admin/messages

**Fichier:** `src/app/api/admin/messages/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabase-server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET!

// Verify JWT auth
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')
  if (!token) return false

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token.value, secret)
    return true
  } catch {
    return false
  }
}

// ✅ NEW: Using RPC to fix N+1 queries
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const messageId = searchParams.get('messageId')

    const supabase = getSupabaseServer()

    // If requesting specific message details
    if (messageId) {
      const { data, error } = await supabase
        .rpc('get_message_emails_and_notes', {
          p_message_id: parseInt(messageId)
        })

      if (error) throw error

      // Group by type
      const emails = data
        ?.filter(row => row.email_id !== null)
        .map(row => ({
          id: row.email_id.toString(),
          messageId: messageId,
          type: row.email_type,
          to: row.email_to,
          subject: row.email_subject,
          content: row.email_content,
          sentBy: row.email_sent_by,
          date: row.email_date
        })) || []

      const notes = data
        ?.filter(row => row.note_id !== null)
        .map(row => ({
          id: row.note_id.toString(),
          messageId: messageId,
          from: row.note_from,
          to: row.note_to,
          content: row.note_content,
          date: row.note_date
        })) || []

      return NextResponse.json({ emails, notes })
    }

    // Get all messages with aggregated counts
    const { data: messages, error } = await supabase
      .rpc('get_messages_with_details', {
        p_limit: limit,
        p_offset: offset
      })

    if (error) {
      console.error('Supabase RPC error:', error)
      throw error
    }

    const totalUnread = messages?.[0]?.total_unread || 0

    return NextResponse.json({
      messages: messages || [],
      total: messages?.length || 0,
      nonLus: totalUnread,
      pagination: {
        page,
        limit,
        hasMore: messages?.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ✅ POST/PATCH handlers stay the same but use getSupabaseServer()
export async function POST(request: NextRequest) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = getSupabaseServer()
  // ... rest of POST logic
}
```

---

## 🚀 4. VoPay Webhook Optimization

**Fichier:** `src/app/api/webhooks/vopay/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'

// Types
interface VoPayWebhookPayload {
  Success: boolean
  TransactionType: string
  TransactionID: string
  TransactionAmount: string
  Status: string
  UpdatedAt: string
  ValidationKey: string
  FailureReason?: string
  Environment: string
}

// Validate signature (unchanged)
function validateWebhookSignature(
  transactionId: string,
  validationKey: string,
  sharedSecret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(transactionId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('Validation error:', error)
    return false
  }
}

// ✅ NEW: Optimized with single RPC call
export async function POST(request: NextRequest) {
  try {
    const payload: VoPayWebhookPayload = await request.json()

    // Validate required fields
    if (!payload.TransactionID || !payload.Status || !payload.ValidationKey) {
      console.error('[VoPay Webhook] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate signature
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const isValid = validateWebhookSignature(
      payload.TransactionID,
      payload.ValidationKey,
      sharedSecret
    )

    if (!isValid) {
      console.error('[VoPay Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServer()

    // ✅ Single RPC call instead of 10 sequential queries
    const { data, error } = await supabase
      .rpc('process_vopay_webhook', {
        p_transaction_id: payload.TransactionID,
        p_transaction_type: payload.TransactionType || 'unknown',
        p_amount: parseFloat(payload.TransactionAmount) || 0,
        p_status: payload.Status.toLowerCase(),
        p_failure_reason: payload.FailureReason || null,
        p_environment: payload.Environment,
        p_validation_key: payload.ValidationKey,
        p_updated_at: payload.UpdatedAt || new Date().toISOString(),
        p_payload: payload as any
      })

    if (error || !data?.[0]?.success) {
      console.error('[VoPay Webhook] Processing failed:', {
        error,
        errorMessage: data?.[0]?.error_message
      })
      return NextResponse.json(
        {
          error: 'Processing failed',
          details: error?.message || data?.[0]?.error_message
        },
        { status: 500 }
      )
    }

    const result = data[0]

    console.log('[VoPay Webhook] Processed successfully:', {
      webhook_log_id: result.webhook_log_id,
      vopay_object_id: result.vopay_object_id,
      client_id: result.client_id,
      loan_id: result.loan_id,
      transaction_id: payload.TransactionID
    })

    return NextResponse.json({
      success: true,
      webhook_log_id: result.webhook_log_id,
      vopay_object_id: result.vopay_object_id,
      client_linked: !!result.client_id,
      loan_linked: !!result.loan_id
    })

  } catch (error) {
    console.error('[VoPay Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Impact:**
- Avant: 10 queries séquentielles (100-300ms)
- Après: 1 RPC atomic (20-50ms)
- Amélioration: **-70% latency**

---

## 📄 5. Pagination

### Offset Pagination (Simple)

```typescript
// src/app/api/admin/messages/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .rpc('get_messages_with_details', {
      p_limit: limit,
      p_offset: offset
    })

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      hasMore: data?.length === limit
    }
  })
}
```

### Keyset Pagination (Optimal pour grandes tables)

```typescript
// src/app/api/admin/messages/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')  // ISO timestamp
  const limit = parseInt(searchParams.get('limit') || '50')

  const supabase = getSupabaseServer()

  let query = supabase
    .from('contact_messages')
    .select('id, nom, email, created_at, lu, status')
    .order('created_at', { ascending: false })
    .limit(limit + 1)  // +1 to check if hasMore

  // Apply cursor filter
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? items[items.length - 1].created_at : null

  return NextResponse.json({
    data: items,
    pagination: {
      cursor: nextCursor,
      hasMore,
      limit
    }
  })
}
```

**Frontend usage:**
```typescript
// Keyset pagination
const [cursor, setCursor] = useState<string | null>(null)

async function loadMore() {
  const url = cursor
    ? `/api/admin/messages?cursor=${cursor}&limit=50`
    : `/api/admin/messages?limit=50`

  const res = await fetch(url)
  const json = await res.json()

  setMessages(prev => [...prev, ...json.data])
  setCursor(json.pagination.cursor)
}
```

---

## 💾 6. Caching Strategy

### Static Data (Rarely Changes)

```typescript
// src/app/api/loan-objectives/route.ts
import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const revalidate = 3600  // ✅ Cache 1 hour

export async function GET() {
  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .from('loan_objectives')
    .select('id, name, description, target_value, current_value, period')

  if (error) throw error

  return NextResponse.json(data)
}
```

### Semi-Static Data (Updates Frequently)

```typescript
// src/app/api/admin/messages/route.ts
import { unstable_cache } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase-server'

export const revalidate = 60  // ✅ Cache 1 minute

// Or use unstable_cache for more control
const getCachedMessages = unstable_cache(
  async (limit: number, offset: number) => {
    const supabase = getSupabaseServer()
    return await supabase.rpc('get_messages_with_details', {
      p_limit: limit,
      p_offset: offset
    })
  },
  ['messages'],
  {
    revalidate: 60,
    tags: ['messages']
  }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const { data, error } = await getCachedMessages(limit, offset)

  return NextResponse.json({ data })
}
```

### Cache Invalidation

```typescript
// src/app/api/admin/messages/route.ts
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()

  // ... insert new message
  await supabase.from('contact_messages').insert(...)

  // ✅ Invalidate cache
  revalidateTag('messages')

  return NextResponse.json({ success: true })
}
```

---

## 🔍 7. Middleware Logging

**Fichier:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const start = Date.now()

  // Continue to route handler
  const response = NextResponse.next()

  // Calculate duration
  const duration = Date.now() - start

  // Add performance header
  response.headers.set('X-Response-Time', `${duration}ms`)

  // Log API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const logLevel = duration > 1000 ? 'ERROR' : duration > 100 ? 'WARN' : 'INFO'

    const logEntry = {
      level: logLevel,
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
      duration_ms: duration,
      status: response.status,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    }

    if (logLevel === 'ERROR') {
      console.error('[SLOW QUERY]', JSON.stringify(logEntry))
    } else if (logLevel === 'WARN') {
      console.warn('[PERF WARNING]', JSON.stringify(logEntry))
    } else {
      console.log('[API]', JSON.stringify(logEntry))
    }
  }

  return response
}

export const config = {
  matcher: '/api/:path*'
}
```

---

## 📊 8. Dashboard Stats avec Vues Matérialisées

**Fichier:** `src/app/api/admin/dashboard/stats/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

// ✅ Cache aligned with materialized view refresh (5 minutes)
export const revalidate = 300

export async function GET() {
  const supabase = getSupabaseServer()

  // ✅ Single query to materialized view instead of 15+ aggregations
  const { data, error } = await supabase
    .from('mv_dashboard_stats')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    refresh_age_seconds: Math.floor(
      (Date.now() - new Date(data.last_refresh).getTime()) / 1000
    )
  })
}

// ✅ Manual refresh endpoint (admin only)
export async function POST(request: Request) {
  // Verify admin auth
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServer()

  const { data, error } = await supabase
    .rpc('refresh_dashboard_stats')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    duration_ms: data?.[0]?.duration_ms,
    refreshed_at: data?.[0]?.last_refresh
  })
}
```

**Frontend usage:**
```typescript
// Dashboard component
'use client'
import { useEffect, useState } from 'react'

interface DashboardStats {
  total_applications: number
  approved_count: number
  unread_messages: number
  successful_payments: number
  total_payment_volume: number
  // ... autres stats
  last_refresh: string
  refresh_age_seconds: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const res = await fetch('/api/admin/dashboard/stats')
      const data = await res.json()
      setStats(data)
      setLoading(false)
    }

    loadStats()

    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Loading stats...</div>

  return (
    <div>
      <h2>Dashboard Stats</h2>
      <p>Applications: {stats?.total_applications}</p>
      <p>Approved: {stats?.approved_count}</p>
      <p>Unread Messages: {stats?.unread_messages}</p>
      <p>Payment Volume: ${stats?.total_payment_volume?.toFixed(2)}</p>
      <p className="text-xs text-gray-500">
        Last refresh: {stats?.refresh_age_seconds}s ago
      </p>
    </div>
  )
}
```

---

## 🧪 9. Testing Performance

### Manual Test Script

```bash
#!/bin/bash
# perf-test.sh

echo "=== Performance Test ==="
echo ""

# Test 1: Messages API
echo "Test 1: /api/admin/messages"
time curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  -H "Cookie: admin-session=YOUR_TOKEN" \
  http://localhost:3000/api/admin/messages

echo ""

# Test 2: Dashboard Stats
echo "Test 2: /api/admin/dashboard/stats"
time curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  http://localhost:3000/api/admin/dashboard/stats

echo ""

# Test 3: VoPay Stats
echo "Test 3: /api/vopay/stats"
time curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" \
  http://localhost:3000/api/vopay/stats
```

### k6 Load Test

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% under 300ms
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Test messages endpoint
  const res1 = http.get(`${BASE_URL}/api/admin/messages?limit=50`);
  check(res1, {
    'messages: status 200': (r) => r.status === 200,
    'messages: duration < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Test dashboard stats
  const res2 = http.get(`${BASE_URL}/api/admin/dashboard/stats`);
  check(res2, {
    'stats: status 200': (r) => r.status === 200,
    'stats: duration < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
```

Run:
```bash
k6 run load-test.js
```

---

## 📝 Notes

### Ordre d'Implémentation Recommandé

1. **Jour 1 (Quick Wins):**
   - ✅ Migrations SQL (index + RPC)
   - ✅ Singleton Supabase
   - ✅ RPC pour messages

2. **Jour 2 (Refactors):**
   - ✅ Remplacer SELECT *
   - ✅ Pagination
   - ✅ RPC pour VoPay webhook

3. **Jour 3 (Monitoring):**
   - ✅ Middleware logging
   - ✅ Vues matérialisées
   - ✅ Tests de charge

### Commandes Utiles

```bash
# Appliquer migrations
supabase db push

# Rollback dernière migration
supabase db reset

# Voir status migrations
supabase migration list

# Créer nouvelle migration
supabase migration new my_migration_name

# Tests
npm run dev
k6 run load-test.js

# Monitoring logs
npm run dev | grep "SLOW QUERY"
```

---

**Fin des exemples. Consultez SAR-PERF-AUDIT.md pour le contexte complet.**
