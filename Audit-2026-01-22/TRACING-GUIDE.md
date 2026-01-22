# TRACING GUIDE - DEBUG & MONITORING

Guide complet pour le debugging, le monitoring et le tracing de l'application SAR.

## Table des Matières

1. [Points de Tracing Critiques](#1-points-de-tracing-critiques)
2. [Database Query Tracing](#2-database-query-tracing)
3. [API Request/Response Logging](#3-api-requestresponse-logging)
4. [Webhook Event Tracking](#4-webhook-event-tracking)
5. [External API Calls](#5-external-api-calls)
6. [Performance Monitoring Points](#6-performance-monitoring-points)
7. [Error Tracking](#7-error-tracking)
8. [Logging Utilities](#8-logging-utilities)
9. [Debugging Tools](#9-debugging-tools)
10. [Alerting Strategy](#10-alerting-strategy)

---

## 1. Points de Tracing Critiques

### 1.1 Loan Application Flow

**Fichier:** `/src/app/api/applications/submit/route.ts`

**Points de tracing existants:**
```typescript
// Rate limiting
await logRateLimitHit(clientIP, '/api/applications/submit')

// Validation errors
for (const error of validation.errors) {
  await logValidationError(5, error.field, body.origin)
}

// Margill success/failure
await logMargillSuccess(body.origin, body.montant_demande, Date.now() - startTime)
await logMargillFailure(body.origin, margillError)

// Form completion
await logFormCompleted(body.origin, Date.now() - startTime)
```

**Points manquants à ajouter:**
```typescript
// Au début de la requête
console.log('[LoanApp] Request started', {
  timestamp: new Date().toISOString(),
  clientIP,
  userAgent,
  origin: body.origin
})

// Après insertion en DB
console.log('[LoanApp] Application saved', {
  applicationId: application.id,
  reference: application.reference,
  duration_ms: Date.now() - startTime
})

// Après calcul Cortex
console.log('[LoanApp] Cortex score calculated', {
  applicationId: application.id,
  score: cortexScore,
  riskLevel,
  duration_ms: Date.now() - startTime
})
```

### 1.2 VoPay Transaction Flow

**Fichier:** `/src/app/api/webhooks/vopay/route.ts`

**Points de tracing existants:**
```typescript
console.error('[VoPay Webhook] Missing required fields')
console.error('[VoPay Webhook] Invalid signature for transaction:', payload.TransactionID)
console.error('[VoPay Webhook] RPC error:', rpcError)
console.log('[VoPay Webhook] Processed via RPC:', { logId, voPayObjectId, clientId, loanId })
console.log('[VoPay Webhook] Marked installment as paid:', installments[0].id)
console.log('[VoPay Webhook] Payment event created for loan:', loanId)
console.log('[VoPay Webhook] NSF event created for loan:', loanId)
console.warn('[VoPay Webhook] Unknown status:', payload.Status)
console.error('[VoPay Webhook] Error:', error)
```

**Format recommandé (structuré):**
```typescript
// Bon format structuré
console.log(JSON.stringify({
  type: 'vopay_webhook',
  event: 'payment_received',
  transaction_id: payload.TransactionID,
  status: payload.Status,
  amount: payload.TransactionAmount,
  client_id: clientId,
  loan_id: loanId,
  timestamp: new Date().toISOString()
}))

// Au lieu de
console.log('[VoPay Webhook] Marked installment as paid:', installments[0].id)
```

### 1.3 QuickBooks Sync Flow

**Points critiques à tracer:**
- Connection status checks
- OAuth token refresh
- Data sync operations (customers, invoices, payments)
- API rate limiting
- Sync errors and retries

**Exemple de tracing:**
```typescript
// src/app/api/quickbooks/sync/customers/route.ts
import { APILogger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  const requestId = APILogger.startRequest(request)
  const startTime = Date.now()

  try {
    APILogger.log('QB_SYNC', 'Starting customer sync')

    // Check connection
    APILogger.log('QB_AUTH', 'Checking QuickBooks connection')
    const isConnected = await checkConnection()

    if (!isConnected) {
      APILogger.warn('QB_AUTH', 'Not connected, attempting token refresh')
      await refreshToken()
    }

    // Fetch customers
    APILogger.log('QB_API', 'Fetching customers from QuickBooks')
    const customers = await fetchCustomers()
    APILogger.log('QB_API', `Fetched ${customers.length} customers`)

    // Sync to database
    APILogger.log('QB_SYNC', 'Syncing to database')
    await syncCustomersToDb(customers)

    APILogger.perf('QB_CUSTOMER_SYNC', Date.now() - startTime)
    APILogger.endRequest(200, Date.now() - startTime)

    return Response.json({ success: true, count: customers.length })
  } catch (error) {
    APILogger.error('QB_SYNC', 'Customer sync failed', error)
    APILogger.endRequest(500, Date.now() - startTime)
    throw error
  }
}
```

---

## 2. Database Query Tracing

### 2.1 Automatic Query Logging

**Fichier:** `/src/lib/supabase-server.ts`

Le client Supabase inclut déjà un wrapper de tracing automatique:

```typescript
global: {
  fetch: (url, options) => {
    const start = Date.now()

    return fetch(url, options).then(res => {
      const duration = Date.now() - start

      // Track in perf context
      trackDbCall(duration)

      // Log slow queries (> 100ms)
      if (duration > 100) {
        console.warn(JSON.stringify({
          type: 'slow_query',
          url: url.toString(),
          duration_ms: duration,
          method: options?.method || 'GET',
          timestamp: new Date().toISOString()
        }))
      }

      // Log critical slow queries (> 1000ms)
      if (duration > 1000) {
        console.error(JSON.stringify({
          type: 'critical_slow_query',
          url: url.toString(),
          duration_ms: duration,
          method: options?.method || 'GET',
          timestamp: new Date().toISOString()
        }))
      }

      return res
    })
  }
}
```

### 2.2 Manual Query Tracing

Pour tracer des queries spécifiques:

```typescript
import { getSupabaseServer } from '@/lib/supabase-server'

const supabase = getSupabaseServer()
const queryStart = Date.now()

const { data, error } = await supabase
  .from('loan_applications')
  .select('*')
  .eq('status', 'submitted')
  .order('created_at', { ascending: false })
  .limit(100)

const queryDuration = Date.now() - queryStart

console.log(JSON.stringify({
  type: 'db_query',
  table: 'loan_applications',
  operation: 'select',
  duration_ms: queryDuration,
  row_count: data?.length || 0,
  has_error: !!error,
  timestamp: new Date().toISOString()
}))

if (error) {
  console.error(JSON.stringify({
    type: 'db_error',
    table: 'loan_applications',
    error: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    timestamp: new Date().toISOString()
  }))
}
```

### 2.3 RPC Function Tracing

**Exemple avec VoPay webhook RPC:**

```typescript
const rpcStart = Date.now()

const { data: rpcData, error: rpcError } = await supabase
  .rpc('process_vopay_webhook', {
    p_transaction_id: payload.TransactionID,
    p_transaction_type: payload.TransactionType,
    p_amount: parseFloat(payload.TransactionAmount),
    // ... autres params
  })

const rpcDuration = Date.now() - rpcStart

console.log(JSON.stringify({
  type: 'rpc_call',
  function: 'process_vopay_webhook',
  duration_ms: rpcDuration,
  success: !rpcError && rpcData?.[0]?.success,
  transaction_id: payload.TransactionID,
  timestamp: new Date().toISOString()
}))

if (rpcError) {
  console.error(JSON.stringify({
    type: 'rpc_error',
    function: 'process_vopay_webhook',
    error: rpcError.message,
    code: rpcError.code,
    details: rpcError.details,
    timestamp: new Date().toISOString()
  }))
}
```

### 2.4 Query Performance Best Practices

**Seuils recommandés:**
- < 50ms: Excellent (vert)
- 50-100ms: Bon (jaune)
- 100-500ms: Lent (orange) - À investiguer
- > 500ms: Critique (rouge) - À optimiser immédiatement

**Queries à surveiller particulièrement:**
- Full table scans sans WHERE clause
- JOINs complexes (> 3 tables)
- Queries sans index
- Queries paginées sans LIMIT
- Aggregations sur grandes tables

---

## 3. API Request/Response Logging

### 3.1 Utilisation du wrapper `withPerf`

**Fichier:** `/src/lib/perf.ts`

**Wrapper automatique pour toutes les routes API:**

```typescript
import { withPerf } from '@/lib/perf'
import { NextRequest, NextResponse } from 'next/server'

async function handleGET(request: NextRequest) {
  // Votre logique ici
  return NextResponse.json({ data: 'ok' })
}

// Export avec wrapper de performance
export const GET = withPerf('admin/messages', handleGET)
```

**Métriques collectées automatiquement:**
- `route`: Nom de la route
- `requestId`: ID unique de requête
- `msTotal`: Durée totale en millisecondes
- `status`: Code HTTP de réponse
- `bytesOut`: Taille de la réponse
- `dbCalls`: Nombre d'appels DB
- `dbMsTotal`: Temps total DB en ms

**Output console (dev):**
```
[PERF] admin/messages | 145ms | 3 DB calls (98ms) | 12.3KB | status=200
```

**Output fichier (production):**
```json
// logs/perf.ndjson
{"route":"admin/messages","requestId":"req_1706123456789_abc123","msTotal":145,"status":200,"bytesOut":12595,"dbCalls":3,"dbMsTotal":98,"timestamp":"2026-01-22T10:30:45.123Z"}
```

### 3.2 Utilisation de APILogger

**Fichier:** `/src/lib/utils/logger.ts`

**Pour un contrôle plus fin:**

```typescript
import { APILogger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  // 1. Démarrer le logging
  const requestId = APILogger.startRequest(request)
  const startTime = Date.now()

  try {
    // 2. Logger chaque étape
    APILogger.log('AUTH', 'Checking authentication')
    const user = await authenticate(request)

    APILogger.log('DB', 'Fetching user data')
    const userData = await fetchUserData(user.id)

    APILogger.log('PROCESS', 'Processing request')
    const result = await processData(userData)

    // 3. Logger les performances
    APILogger.perf('DATA_PROCESSING', Date.now() - startTime)

    // 4. Terminer avec succès
    APILogger.endRequest(200, Date.now() - startTime)

    return Response.json({ success: true, data: result })
  } catch (error) {
    // 5. Logger l'erreur
    APILogger.error('REQUEST', 'Request failed', error as Error)
    APILogger.endRequest(500, Date.now() - startTime)

    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Output console:**
```
[API] [abc12345] ► POST /api/admin/users {"timestamp":"2026-01-22T10:30:45.123Z","headers":{...}}
[API] [abc12345] [AUTH] Checking authentication {"timestamp":"2026-01-22T10:30:45.234Z"}
[API] [abc12345] [DB] Fetching user data {"timestamp":"2026-01-22T10:30:45.345Z"}
[API] [abc12345] [PROCESS] Processing request {"timestamp":"2026-01-22T10:30:45.456Z"}
[API] [abc12345] [PERF] DATA_PROCESSING: 333ms {"timestamp":"2026-01-22T10:30:45.567Z"}
[API] [abc12345] ◄ ✅ 200 (422ms)
```

### 3.3 Request Context avec Request ID

**Chaque requête a un ID unique pour tracer tout le flow:**

```typescript
// Request ID généré automatiquement
const requestId = crypto.randomUUID().slice(0, 8) // Ex: "abc12345"

// Utilisé dans tous les logs de cette requête
[API] [abc12345] [AUTH] Checking user
[API] [abc12345] [DB] Query users table
[API] [abc12345] [PROCESS] Processing data
```

**Pour récupérer le Request ID dans un service:**
```typescript
import { getPerfContext } from '@/lib/perf'

function myService() {
  const ctx = getPerfContext()
  if (ctx) {
    console.log(`[Service] [${ctx.requestId}] Doing work`)
  }
}
```

---

## 4. Webhook Event Tracking

### 4.1 VoPay Webhooks

**Fichier:** `/src/app/api/webhooks/vopay/route.ts`

**Tracing actuel:**
```typescript
// Signature validation
if (!isValid) {
  console.error('[VoPay Webhook] Invalid signature for transaction:', payload.TransactionID)
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}

// Processing success
console.log('[VoPay Webhook] Processed via RPC:', {
  logId,
  voPayObjectId,
  clientId,
  loanId
})

// Status handling
switch (payload.Status.toLowerCase()) {
  case 'successful':
    console.log('[VoPay Webhook] Payment event created for loan:', loanId)
    break
  case 'failed':
    console.log('[VoPay Webhook] NSF event created for loan:', loanId)
    break
}
```

**Format structuré recommandé:**

```typescript
// Au début du webhook
console.log(JSON.stringify({
  type: 'webhook_received',
  source: 'vopay',
  transaction_id: payload.TransactionID,
  status: payload.Status,
  amount: payload.TransactionAmount,
  environment: payload.Environment,
  timestamp: new Date().toISOString()
}))

// Validation signature
if (!isValid) {
  console.error(JSON.stringify({
    type: 'webhook_validation_failed',
    source: 'vopay',
    transaction_id: payload.TransactionID,
    reason: 'invalid_signature',
    timestamp: new Date().toISOString()
  }))
}

// Processing success
console.log(JSON.stringify({
  type: 'webhook_processed',
  source: 'vopay',
  transaction_id: payload.TransactionID,
  status: payload.Status,
  client_id: clientId,
  loan_id: loanId,
  vopay_object_id: voPayObjectId,
  webhook_log_id: logId,
  duration_ms: Date.now() - startTime,
  timestamp: new Date().toISOString()
}))

// Payment success
console.log(JSON.stringify({
  type: 'payment_event',
  event: 'payment_received',
  loan_id: loanId,
  amount: parseFloat(payload.TransactionAmount),
  vopay_transaction_id: payload.TransactionID,
  installment_id: installments[0]?.id,
  timestamp: new Date().toISOString()
}))

// NSF failure
console.error(JSON.stringify({
  type: 'payment_event',
  event: 'nsf',
  loan_id: loanId,
  amount: parseFloat(payload.TransactionAmount),
  vopay_transaction_id: payload.TransactionID,
  failure_reason: payload.FailureReason,
  timestamp: new Date().toISOString()
}))
```

### 4.2 QuickBooks Webhooks

**Fichier:** `/src/app/api/webhooks/quickbooks/route.ts`

**Points à tracer:**
```typescript
// Webhook reçu
console.log(JSON.stringify({
  type: 'webhook_received',
  source: 'quickbooks',
  event_notifications: payload.eventNotifications.length,
  realm_id: payload.eventNotifications[0]?.realmId,
  timestamp: new Date().toISOString()
}))

// Pour chaque notification
payload.eventNotifications.forEach(notification => {
  notification.dataChangeEvent.entities.forEach(entity => {
    console.log(JSON.stringify({
      type: 'quickbooks_entity_change',
      entity_name: entity.name, // Customer, Invoice, Payment, etc.
      entity_id: entity.id,
      operation: entity.operation, // Create, Update, Delete
      realm_id: notification.realmId,
      timestamp: new Date().toISOString()
    }))
  })
})

// Validation signature
const isValidSignature = verifySignature(request)
if (!isValidSignature) {
  console.error(JSON.stringify({
    type: 'webhook_validation_failed',
    source: 'quickbooks',
    reason: 'invalid_signature',
    timestamp: new Date().toISOString()
  }))
}
```

### 4.3 Margill Callbacks

**Points à tracer lors de la soumission:**

```typescript
// src/lib/margill-client.ts

// Tentative de soumission
console.log(JSON.stringify({
  type: 'margill_submission',
  attempt: attempt,
  max_attempts: this.config.retryAttempts,
  origin: payload.origin,
  amount: payload.answer12, // montant_demande
  timestamp: new Date().toISOString()
}))

// Retry avec backoff
console.log(JSON.stringify({
  type: 'margill_retry',
  attempt: attempt,
  backoff_ms: backoffMs,
  reason: error.message,
  timestamp: new Date().toISOString()
}))

// Succès
console.log(JSON.stringify({
  type: 'margill_success',
  origin: payload.origin,
  amount: payload.answer12,
  response_data: result.data,
  duration_ms: Date.now() - startTime,
  timestamp: new Date().toISOString()
}))

// Échec final
console.error(JSON.stringify({
  type: 'margill_failure',
  origin: payload.origin,
  amount: payload.answer12,
  attempts: this.config.retryAttempts,
  error: lastError?.message,
  timestamp: new Date().toISOString()
}))
```

---

## 5. External API Calls

### 5.1 VoPay API

**Fichier:** `/src/lib/vopay.ts`

**Points à tracer:**

```typescript
class VoPayClient {
  async getBalance(): Promise<VoPayBalance> {
    const callStart = Date.now()
    const url = `${this.config.apiUrl}account/balance?${authParams.toString()}`

    console.log(JSON.stringify({
      type: 'external_api_call',
      service: 'vopay',
      endpoint: 'account/balance',
      method: 'GET',
      timestamp: new Date().toISOString()
    }))

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      const duration = Date.now() - callStart

      if (!response.ok) {
        console.error(JSON.stringify({
          type: 'external_api_error',
          service: 'vopay',
          endpoint: 'account/balance',
          status: response.status,
          duration_ms: duration,
          timestamp: new Date().toISOString()
        }))
        throw new Error(`VoPay API Error (${response.status})`)
      }

      const data = await response.json()

      console.log(JSON.stringify({
        type: 'external_api_success',
        service: 'vopay',
        endpoint: 'account/balance',
        status: response.status,
        duration_ms: duration,
        balance: data.AccountBalance,
        timestamp: new Date().toISOString()
      }))

      return data
    } catch (error) {
      console.error(JSON.stringify({
        type: 'external_api_exception',
        service: 'vopay',
        endpoint: 'account/balance',
        error: error.message,
        duration_ms: Date.now() - callStart,
        timestamp: new Date().toISOString()
      }))
      throw error
    }
  }

  async getTransactions(params?: {...}): Promise<VoPayTransaction[]> {
    const callStart = Date.now()

    console.log(JSON.stringify({
      type: 'external_api_call',
      service: 'vopay',
      endpoint: 'account/transactions',
      method: 'GET',
      params: {
        start_date: startDate,
        end_date: endDate,
        limit: params?.limit
      },
      timestamp: new Date().toISOString()
    }))

    // ... fetch logic

    console.log(JSON.stringify({
      type: 'external_api_success',
      service: 'vopay',
      endpoint: 'account/transactions',
      status: response.status,
      duration_ms: Date.now() - callStart,
      transaction_count: transactions.length,
      timestamp: new Date().toISOString()
    }))

    return transactions
  }
}
```

### 5.2 Margill API

**Fichier:** `/src/lib/margill-client.ts`

**Tracing déjà implémenté (à améliorer):**

```typescript
// Logging actuel (console.error)
console.error(`[MargillClient] Attempt ${attempt}/${this.config.retryAttempts} failed:`, error)
console.log(`[MargillClient] Retrying in ${backoffMs}ms... (attempt ${attempt + 1})`)
console.error(`[MargillClient] Error response:`, errorText)

// Format structuré recommandé
console.log(JSON.stringify({
  type: 'external_api_call',
  service: 'margill',
  endpoint: this.config.endpoint,
  method: 'POST',
  origin: payload.origin,
  attempt: attempt,
  max_attempts: this.config.retryAttempts,
  timestamp: new Date().toISOString()
}))

console.log(JSON.stringify({
  type: 'external_api_success',
  service: 'margill',
  endpoint: this.config.endpoint,
  status: response.status,
  duration_ms: Date.now() - callStart,
  origin: payload.origin,
  timestamp: new Date().toISOString()
}))

console.error(JSON.stringify({
  type: 'external_api_error',
  service: 'margill',
  endpoint: this.config.endpoint,
  status: response.status,
  error_text: errorText,
  duration_ms: Date.now() - callStart,
  timestamp: new Date().toISOString()
}))
```

### 5.3 Flinks/Inverite (Bank Verification)

**Points à tracer:**

```typescript
// Si intégration existe
console.log(JSON.stringify({
  type: 'external_api_call',
  service: 'flinks',
  endpoint: 'authorize',
  method: 'POST',
  timestamp: new Date().toISOString()
}))

console.log(JSON.stringify({
  type: 'external_api_success',
  service: 'flinks',
  endpoint: 'authorize',
  login_id: response.LoginId,
  duration_ms: Date.now() - startTime,
  timestamp: new Date().toISOString()
}))
```

### 5.4 Resend (Email)

**Points à tracer:**

```typescript
// src/lib/email.ts (à créer si n'existe pas)
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendEmail(to: string, subject: string, html: string) {
  const sendStart = Date.now()

  console.log(JSON.stringify({
    type: 'external_api_call',
    service: 'resend',
    endpoint: 'emails/send',
    method: 'POST',
    to: to,
    subject: subject,
    timestamp: new Date().toISOString()
  }))

  try {
    const { data, error } = await resend.emails.send({
      from: 'SAR <noreply@solutionargentrapide.ca>',
      to: [to],
      subject: subject,
      html: html,
    })

    if (error) {
      console.error(JSON.stringify({
        type: 'external_api_error',
        service: 'resend',
        endpoint: 'emails/send',
        error: error.message,
        duration_ms: Date.now() - sendStart,
        timestamp: new Date().toISOString()
      }))
      throw error
    }

    console.log(JSON.stringify({
      type: 'external_api_success',
      service: 'resend',
      endpoint: 'emails/send',
      email_id: data?.id,
      to: to,
      duration_ms: Date.now() - sendStart,
      timestamp: new Date().toISOString()
    }))

    return data
  } catch (error) {
    console.error(JSON.stringify({
      type: 'external_api_exception',
      service: 'resend',
      endpoint: 'emails/send',
      error: error.message,
      duration_ms: Date.now() - sendStart,
      timestamp: new Date().toISOString()
    }))
    throw error
  }
}
```

### 5.5 Google Analytics

**Fichier:** `/src/lib/analytics.ts`

**Tracing client-side (déjà implémenté):**

```typescript
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventParams,
      timestamp: new Date().toISOString()
    })

    // Log en console en dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4]', eventName, eventParams)
    }
  }
}
```

**Pour tracer les événements côté serveur:**

```typescript
// src/lib/analytics-server.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data'

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY,
  }
})

export async function logServerEvent(eventName: string, params: Record<string, any>) {
  console.log(JSON.stringify({
    type: 'analytics_event',
    service: 'google_analytics',
    event_name: eventName,
    params: params,
    timestamp: new Date().toISOString()
  }))

  // Envoyer via Measurement Protocol si nécessaire
}
```

---

## 6. Performance Monitoring Points

### 6.1 Métriques Automatiques (withPerf)

**Collectées automatiquement pour toutes les routes wrappées:**

```typescript
export const GET = withPerf('route-name', handler)
```

**Métriques:**
- Response Time (ms_total)
- DB Calls Count (db_calls)
- DB Time Total (db_ms_total)
- Response Size (bytes_out)
- Status Code (status)

**Seuils de performance:**

| Métrique | Excellent | Bon | Lent | Critique |
|----------|-----------|-----|------|----------|
| API Response Time | < 50ms | < 150ms | < 300ms | > 300ms |
| DB Query Time | < 20ms | < 50ms | < 100ms | > 100ms |
| External API | < 200ms | < 500ms | < 1000ms | > 1000ms |
| Page Load (SSR) | < 500ms | < 1000ms | < 2000ms | > 2000ms |

### 6.2 Database Query Performance

**Monitoring automatique des slow queries:**

```typescript
// src/lib/supabase-server.ts
// Automatiquement log les queries > 100ms
if (duration > 100) {
  console.warn(JSON.stringify({
    type: 'slow_query',
    url: url.toString(),
    duration_ms: duration,
    method: options?.method || 'GET',
    timestamp: new Date().toISOString()
  }))
}

// Automatiquement log les queries critiques > 1000ms
if (duration > 1000) {
  console.error(JSON.stringify({
    type: 'critical_slow_query',
    url: url.toString(),
    duration_ms: duration,
    method: options?.method || 'GET',
    timestamp: new Date().toISOString()
  }))
}
```

### 6.3 API Endpoint Latency

**Top routes à monitorer:**

1. **POST /api/applications/submit** (max 3000ms acceptable)
2. **POST /api/webhooks/vopay** (max 500ms acceptable)
3. **GET /api/admin/vopay** (max 1000ms acceptable)
4. **GET /api/admin/clients-sar/search** (max 200ms acceptable)
5. **POST /api/quickbooks/sync/all** (max 5000ms acceptable)

**Exemple de monitoring custom:**

```typescript
// src/app/api/applications/submit/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const perfMarks = {
    rateLimit: 0,
    validation: 0,
    dbInsert: 0,
    cortex: 0,
    margill: 0,
    email: 0
  }

  try {
    // Rate limiting
    const rlStart = Date.now()
    await rateLimitFormSubmission(clientIP)
    perfMarks.rateLimit = Date.now() - rlStart

    // Validation
    const valStart = Date.now()
    const validation = validateLoanApplication(body)
    perfMarks.validation = Date.now() - valStart

    // DB Insert
    const dbStart = Date.now()
    const application = await insertApplication(data)
    perfMarks.dbInsert = Date.now() - dbStart

    // Cortex
    const cortexStart = Date.now()
    const score = await calculateCortexScore(application)
    perfMarks.cortex = Date.now() - cortexStart

    // Margill
    const margillStart = Date.now()
    await margillClient.submitApplication(body)
    perfMarks.margill = Date.now() - margillStart

    // Email
    const emailStart = Date.now()
    await sendConfirmationEmail(application)
    perfMarks.email = Date.now() - emailStart

    // Log performance breakdown
    console.log(JSON.stringify({
      type: 'performance_breakdown',
      route: '/api/applications/submit',
      total_ms: Date.now() - startTime,
      breakdown: perfMarks,
      timestamp: new Date().toISOString()
    }))

    return NextResponse.json({ success: true })
  } catch (error) {
    // ...
  }
}
```

### 6.4 External API Response Times

**Créer un tracker centralisé:**

```typescript
// src/lib/external-api-tracker.ts

interface APICall {
  service: string
  endpoint: string
  method: string
  duration_ms: number
  status: number
  success: boolean
  timestamp: string
}

const apiCalls: APICall[] = []

export function trackAPICall(call: APICall) {
  apiCalls.push(call)

  // Log en console
  const emoji = call.success ? '✅' : '❌'
  const color = call.duration_ms < 200 ? '\x1b[32m' :
                call.duration_ms < 500 ? '\x1b[33m' : '\x1b[31m'

  console.log(
    `${emoji} ${color}[EXT-API]${'\x1b[0m'} ${call.service}/${call.endpoint} - ${call.duration_ms}ms`
  )

  // Log structuré
  console.log(JSON.stringify({
    type: 'external_api_performance',
    ...call
  }))

  // Garder seulement les 1000 derniers appels en mémoire
  if (apiCalls.length > 1000) {
    apiCalls.shift()
  }
}

export function getAPIStats() {
  const byService = new Map<string, { total: number; avg: number; p95: number }>()

  // Grouper par service
  const grouped = new Map<string, number[]>()
  apiCalls.forEach(call => {
    if (!grouped.has(call.service)) {
      grouped.set(call.service, [])
    }
    grouped.get(call.service)!.push(call.duration_ms)
  })

  // Calculer stats
  grouped.forEach((durations, service) => {
    const sorted = durations.sort((a, b) => a - b)
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    const p95Index = Math.floor(sorted.length * 0.95)
    const p95 = sorted[p95Index]

    byService.set(service, {
      total: durations.length,
      avg: Math.round(avg),
      p95: Math.round(p95)
    })
  })

  return Object.fromEntries(byService)
}
```

**Usage:**

```typescript
import { trackAPICall } from '@/lib/external-api-tracker'

const start = Date.now()
const response = await fetch('https://api.vopay.com/...')
const duration = Date.now() - start

trackAPICall({
  service: 'vopay',
  endpoint: 'account/balance',
  method: 'GET',
  duration_ms: duration,
  status: response.status,
  success: response.ok,
  timestamp: new Date().toISOString()
})
```

### 6.5 Background Job Duration

**Pour les workers:**

```typescript
// src/lib/utils/logger.ts - WorkerLogger déjà existant

const logger = new WorkerLogger(jobId, analysisId)

const jobStart = Date.now()

try {
  // Étape 1
  const step1Start = Date.now()
  await doStep1()
  logger.perf('STEP_1', Date.now() - step1Start)

  // Étape 2
  const step2Start = Date.now()
  await doStep2()
  logger.perf('STEP_2', Date.now() - step2Start)

  // Success
  logger.success(Date.now() - jobStart, { steps_completed: 2 })
} catch (error) {
  logger.error('JOB', 'Job failed', error)
}
```

---

## 7. Error Tracking

### 7.1 Try/Catch Blocks Pattern

**Pattern recommandé pour toutes les routes API:**

```typescript
export async function POST(request: NextRequest) {
  const requestId = APILogger.startRequest(request)
  const startTime = Date.now()

  try {
    // Logique métier
    const result = await processRequest(request)

    APILogger.endRequest(200, Date.now() - startTime)
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    // Identifier le type d'erreur
    const errorType = error instanceof ValidationError ? 'validation' :
                      error instanceof DatabaseError ? 'database' :
                      error instanceof ExternalAPIError ? 'external_api' :
                      'unknown'

    // Logger l'erreur de manière structurée
    APILogger.error('REQUEST', `Request failed: ${errorType}`, error as Error)

    console.error(JSON.stringify({
      type: 'api_error',
      route: '/api/...',
      request_id: requestId,
      error_type: errorType,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }))

    APILogger.endRequest(500, Date.now() - startTime)

    // Retourner une erreur appropriée
    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur est survenue',
        requestId // Pour le support
      },
      { status: 500 }
    )
  }
}
```

### 7.2 Custom Error Classes

**Créer des classes d'erreurs typées:**

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field })
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, query?: string) {
    super(message, 'DATABASE_ERROR', 500, { query })
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, statusCode?: number) {
    super(message, 'EXTERNAL_API_ERROR', statusCode || 502, { service })
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

export class RateLimitError extends AppError {
  constructor(resetAt: Date) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429, { resetAt })
  }
}
```

**Usage:**

```typescript
import { ValidationError, ExternalAPIError } from '@/lib/errors'

// Validation
if (!data.email) {
  throw new ValidationError('Email is required', 'email')
}

// External API
const response = await fetch('https://api.margill.com/...')
if (!response.ok) {
  throw new ExternalAPIError('margill', `Margill API returned ${response.status}`, response.status)
}

// Dans le catch
catch (error) {
  if (error instanceof ValidationError) {
    console.error(JSON.stringify({
      type: 'validation_error',
      field: error.metadata?.field,
      message: error.message,
      timestamp: new Date().toISOString()
    }))
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof ExternalAPIError) {
    console.error(JSON.stringify({
      type: 'external_api_error',
      service: error.metadata?.service,
      message: error.message,
      status: error.statusCode,
      timestamp: new Date().toISOString()
    }))
    return NextResponse.json({ error: 'External service error' }, { status: 502 })
  }

  // Erreur inconnue
  console.error(JSON.stringify({
    type: 'unknown_error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  }))
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

### 7.3 Database Error Handling

**Pattern pour toutes les queries Supabase:**

```typescript
const { data, error } = await supabase
  .from('loan_applications')
  .select('*')
  .eq('id', id)
  .single()

if (error) {
  // Log structuré
  console.error(JSON.stringify({
    type: 'database_error',
    operation: 'select',
    table: 'loan_applications',
    error_code: error.code,
    error_message: error.message,
    error_details: error.details,
    error_hint: error.hint,
    timestamp: new Date().toISOString()
  }))

  // Throw custom error
  throw new DatabaseError(
    `Failed to fetch loan application: ${error.message}`,
    `SELECT * FROM loan_applications WHERE id = '${id}'`
  )
}

if (!data) {
  console.warn(JSON.stringify({
    type: 'database_warning',
    operation: 'select',
    table: 'loan_applications',
    issue: 'no_data_found',
    query_params: { id },
    timestamp: new Date().toISOString()
  }))
  throw new AppError('Loan application not found', 'NOT_FOUND', 404)
}
```

### 7.4 Integration Error Handling

**Pattern pour les appels externes:**

```typescript
// src/lib/margill-client.ts

async submitApplication(data: LoanApplicationFormData): Promise<MargillResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
    try {
      console.log(JSON.stringify({
        type: 'integration_attempt',
        service: 'margill',
        attempt: attempt,
        max_attempts: this.config.retryAttempts,
        timestamp: new Date().toISOString()
      }))

      const response = await this.sendRequest(payload, attempt)

      console.log(JSON.stringify({
        type: 'integration_success',
        service: 'margill',
        attempt: attempt,
        timestamp: new Date().toISOString()
      }))

      return response

    } catch (error) {
      lastError = error as Error

      console.error(JSON.stringify({
        type: 'integration_error',
        service: 'margill',
        attempt: attempt,
        max_attempts: this.config.retryAttempts,
        error: error.message,
        will_retry: attempt < this.config.retryAttempts,
        timestamp: new Date().toISOString()
      }))

      if (attempt === this.config.retryAttempts) {
        break
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await this.sleep(backoffMs)
    }
  }

  // Toutes les tentatives ont échoué
  console.error(JSON.stringify({
    type: 'integration_failure',
    service: 'margill',
    total_attempts: this.config.retryAttempts,
    final_error: lastError?.message,
    timestamp: new Date().toISOString()
  }))

  throw new ExternalAPIError(
    'margill',
    `Margill API failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`,
    500
  )
}
```

### 7.5 Error Response Format

**Format uniforme pour toutes les erreurs API:**

```typescript
interface ErrorResponse {
  success: false
  error: string // Message user-friendly
  code?: string // Error code (pour le code client)
  requestId?: string // Pour tracer dans les logs
  details?: any // Détails techniques (seulement en dev)
  timestamp: string
}

// Helper function
function createErrorResponse(
  error: Error,
  requestId: string,
  isDev: boolean = process.env.NODE_ENV === 'development'
): ErrorResponse {
  return {
    success: false,
    error: error instanceof AppError ? error.message : 'Une erreur est survenue',
    code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
    requestId,
    ...(isDev && { details: error.stack }), // Stack trace seulement en dev
    timestamp: new Date().toISOString()
  }
}

// Usage
catch (error) {
  const response = createErrorResponse(error, requestId)
  return NextResponse.json(response, {
    status: error instanceof AppError ? error.statusCode : 500
  })
}
```

---

## 8. Logging Utilities

### 8.1 APILogger

**Fichier:** `/src/lib/utils/logger.ts`

**Classes disponibles:**
- `APILogger`: Pour les routes API Next.js
- `WorkerLogger`: Pour les background workers
- `ExtensionLoggerConfig`: Pour l'extension Chrome

**Méthodes APILogger:**

```typescript
// Démarrer une requête (génère un request ID)
const requestId = APILogger.startRequest(request)
// Output: [API] [abc12345] ► POST /api/admin/users

// Logger une étape
APILogger.log('STAGE', 'Message', { optional: 'data' })
// Output: [API] [abc12345] [STAGE] Message {"timestamp":"...","optional":"data"}

// Logger une erreur
APILogger.error('STAGE', 'Error message', error)
// Output: [API] [abc12345] [STAGE] ❌ Error message {"timestamp":"...","error":"...","stack":"..."}

// Logger un warning
APILogger.warn('STAGE', 'Warning message', { data })
// Output: [API] [abc12345] [STAGE] ⚠️ Warning message {"timestamp":"...","data":{}}

// Logger une métrique de performance
APILogger.perf('OPERATION', durationMs, { optional: 'data' })
// Output: [API] [abc12345] [PERF] OPERATION: 145ms {"timestamp":"..."}

// Terminer la requête
APILogger.endRequest(statusCode, durationMs)
// Output: [API] [abc12345] ◄ ✅ 200 (422ms)
```

**Exemple complet:**

```typescript
import { APILogger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  const requestId = APILogger.startRequest(request)
  const startTime = Date.now()

  try {
    // Authentification
    APILogger.log('AUTH', 'Checking user authentication')
    const user = await authenticateUser(request)
    APILogger.log('AUTH', 'User authenticated', { userId: user.id })

    // Validation
    APILogger.log('VALIDATION', 'Validating request body')
    const body = await request.json()
    const validation = validateBody(body)
    if (!validation.valid) {
      APILogger.warn('VALIDATION', 'Validation failed', { errors: validation.errors })
      return Response.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Database
    const dbStart = Date.now()
    APILogger.log('DB', 'Inserting data')
    const result = await insertData(body)
    APILogger.perf('DB_INSERT', Date.now() - dbStart)
    APILogger.log('DB', 'Data inserted', { id: result.id })

    // Success
    APILogger.endRequest(200, Date.now() - startTime)
    return Response.json({ success: true, data: result })

  } catch (error) {
    APILogger.error('REQUEST', 'Request failed', error as Error)
    APILogger.endRequest(500, Date.now() - startTime)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### 8.2 WorkerLogger

**Pour les background jobs:**

```typescript
import { WorkerLogger } from '@/lib/utils/logger'

async function processJob(jobId: string, analysisId: string) {
  const logger = new WorkerLogger(jobId, analysisId)
  const jobStart = Date.now()

  try {
    logger.log('START', 'Job started')

    // Étape 1
    logger.log('FETCH', 'Fetching data from source')
    const data = await fetchData()
    logger.log('FETCH', `Fetched ${data.length} records`)

    // Étape 2
    const processStart = Date.now()
    logger.log('PROCESS', 'Processing data')
    const processed = await processData(data)
    logger.perf('PROCESS_DATA', Date.now() - processStart)

    // Étape 3
    logger.log('STORE', 'Storing results')
    await storeResults(processed)

    // Success
    logger.success(Date.now() - jobStart, {
      records_processed: processed.length
    })

  } catch (error) {
    logger.error('JOB', 'Job failed', error as Error)
    throw error
  }
}
```

**Output:**
```
[Worker] [Job:job123] [START] Job started {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] [FETCH] Fetching data from source {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] [FETCH] Fetched 1000 records {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] [PROCESS] Processing data {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] [PERF] PROCESS_DATA: 2456ms {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] [STORE] Storing results {"timestamp":"...","analysis_id":"analysis456"}
[Worker] [Job:job123] ✅ COMPLETED (3124ms) {"timestamp":"...","analysis_id":"analysis456","records_processed":1000}
```

### 8.3 Metrics Logger

**Fichier:** `/src/lib/utils/metrics-logger.ts`

**Fonctions disponibles:**

```typescript
// Formulaire
await logFormStarted(origin, device)
await logStepCompleted(step, origin, timeMs)
await logFormCompleted(origin, totalTimeMs)

// Margill
await logMargillSuccess(origin, amount, durationMs)
await logMargillFailure(origin, reason)

// Validation
await logValidationError(step, field, origin)

// Rate limiting
await logRateLimitHit(identifier, endpoint)

// Cortex
await logCortexScore(applicationId, score, rulesApplied)

// Workflow
await logWorkflowExecution(workflowId, success, durationMs)

// Notifications
await logNotificationSent('email' | 'sms', 'sent' | 'failed')

// ML
await logMLPrediction(modelType, confidence)

// API Keys
await logAPIKeyUsage(apiKeyId, endpoint)

// Fonction générique
await logMetric({
  metric_name: 'custom_metric',
  value: 100,
  dimension_1: 'category',
  dimension_2: 'subcategory',
  metadata: { custom: 'data' }
})
```

**Toutes ces métriques sont stockées dans la table `metrics_log` de Supabase.**

### 8.4 Performance Logger

**Fichier:** `/src/lib/perf.ts`

**Usage avec wrapper:**

```typescript
import { withPerf } from '@/lib/perf'

async function handleGET(request: NextRequest) {
  // Votre logique
  return NextResponse.json({ data: 'ok' })
}

export const GET = withPerf('admin/messages', handleGET)
```

**Collecte automatiquement:**
- Route name
- Request ID
- Total duration (ms)
- HTTP status
- Response size (bytes)
- DB call count
- DB total time (ms)

**Logs dans:**
- Console (development)
- Fichier `logs/perf.ndjson` (production)

**Analyser les logs:**

```typescript
import { analyzePerfLogs } from '@/lib/perf'

const summary = analyzePerfLogs()
console.log(summary)
```

**Output:**
```
=== PERFORMANCE SUMMARY ===

admin/messages (45 requests)
  p50: 89ms | p95: 145ms ✅ | p99: 203ms ⚠️
  DB calls: 3 avg | Payload: 12.3KB

admin/vopay (23 requests)
  p50: 456ms | p95: 892ms ❌ | p99: 1245ms ❌
  DB calls: 8 avg | Payload: 45.6KB
```

### 8.5 Structured Logging Pattern

**Format JSON recommandé pour tous les logs:**

```typescript
// ❌ BAD - Hard to parse
console.log('[VoPay] Payment received for loan 123, amount: $500')

// ✅ GOOD - Structured and parseable
console.log(JSON.stringify({
  type: 'payment_event',
  event: 'payment_received',
  loan_id: 123,
  amount: 500,
  currency: 'CAD',
  timestamp: new Date().toISOString()
}))
```

**Avantages du logging structuré:**
- Facile à parser et filtrer
- Peut être indexé dans des outils comme Elasticsearch
- Facilite l'analyse et les alertes
- Compatible avec les outils de monitoring (Datadog, New Relic, etc.)

**Template de log structuré:**

```typescript
interface StructuredLog {
  type: string // Type d'événement
  level?: 'info' | 'warn' | 'error' | 'debug' // Niveau de log
  message?: string // Message lisible
  [key: string]: any // Données additionnelles
  timestamp: string // ISO 8601
}

function logStructured(log: StructuredLog) {
  const fullLog = {
    ...log,
    timestamp: log.timestamp || new Date().toISOString(),
    level: log.level || 'info'
  }

  console.log(JSON.stringify(fullLog))
}

// Usage
logStructured({
  type: 'api_request',
  level: 'info',
  method: 'POST',
  path: '/api/applications/submit',
  status: 200,
  duration_ms: 456
})
```

---

## 9. Debugging Tools

### 9.1 Chrome DevTools

**Network Tab:**
- Voir toutes les requêtes API
- Temps de réponse
- Headers et payload
- Response body

**Console Tab:**
- Voir les logs `console.log/error/warn`
- Filtrer par niveau
- Chercher avec Ctrl+F

**Application Tab:**
- LocalStorage
- SessionStorage
- Cookies
- Cache

**Performance Tab:**
- Profiler les performances frontend
- Identifier les bottlenecks
- Analyser les reflows

### 9.2 React DevTools

**Installation:**
```bash
# Chrome Extension
https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi
```

**Usage:**
- Components Tab: Voir l'arbre de composants
- Profiler Tab: Profiler les rendus
- Props/State inspection
- Re-render highlighting

### 9.3 Supabase Studio

**URL:** https://supabase.com/dashboard/project/YOUR_PROJECT/editor

**Fonctionnalités:**
- Table Editor: Voir et éditer les données
- SQL Editor: Exécuter des queries custom
- API Docs: Documentation auto-générée
- Logs: Voir les logs Postgres
- Database Performance: Voir les slow queries

**Queries utiles pour debugging:**

```sql
-- Voir les dernières applications
SELECT * FROM loan_applications
ORDER BY created_at DESC
LIMIT 10;

-- Voir les webhooks reçus
SELECT * FROM webhook_logs
WHERE source = 'vopay'
ORDER BY created_at DESC
LIMIT 20;

-- Voir les métriques récentes
SELECT * FROM metrics_log
WHERE recorded_at > NOW() - INTERVAL '1 hour'
ORDER BY recorded_at DESC;

-- Voir les logs de performance API
SELECT * FROM api_performance_logs
WHERE duration_ms > 500
ORDER BY timestamp DESC
LIMIT 50;

-- Voir les slow queries
SELECT * FROM api_performance_logs
WHERE route LIKE '%admin%'
ORDER BY duration_ms DESC
LIMIT 20;
```

### 9.4 Vercel Logs

**URL:** https://vercel.com/your-team/sar/logs

**Types de logs:**
- **Build Logs**: Logs du build Next.js
- **Function Logs**: Logs des serverless functions (API routes)
- **Edge Logs**: Logs du Edge runtime (middleware)

**Filtrer les logs:**
```
# Par status code
status:500

# Par route
path:/api/applications/submit

# Par durée
duration:>1000

# Par date
time:last-1h

# Combinaison
status:500 path:/api/webhooks time:last-24h
```

**Exporter les logs:**
```bash
# Via Vercel CLI
vercel logs --app=sar --since=1h > logs.txt
```

### 9.5 Postman / Newman

**Pour tester les API endpoints:**

**Collection Postman - Endpoints SAR:**

```json
{
  "info": {
    "name": "SAR API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Submit Loan Application",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"origin\": \"argentrapide\",\n  \"prenom\": \"John\",\n  \"nom\": \"Doe\",\n  \"courriel\": \"john.doe@example.com\",\n  \"telephone\": \"5141234567\",\n  \"montant_demande\": 100000\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/applications/submit",
          "host": ["{{base_url}}"],
          "path": ["api", "applications", "submit"]
        }
      }
    },
    {
      "name": "VoPay Stats",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/admin/vopay",
          "host": ["{{base_url}}"],
          "path": ["api", "admin", "vopay"]
        }
      }
    },
    {
      "name": "VoPay Webhook (Test)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"Success\": true,\n  \"TransactionType\": \"eft\",\n  \"TransactionID\": \"TEST123\",\n  \"TransactionAmount\": \"500.00\",\n  \"Status\": \"successful\",\n  \"UpdatedAt\": \"2026-01-22T10:00:00Z\",\n  \"ValidationKey\": \"abc123\",\n  \"Environment\": \"Sandbox\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/webhooks/vopay",
          "host": ["{{base_url}}"],
          "path": ["api", "webhooks", "vopay"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    }
  ]
}
```

**Tester avec Newman (CLI):**

```bash
# Installer Newman
npm install -g newman

# Exécuter la collection
newman run sar-api-collection.json \
  --environment sar-local.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

### 9.6 Custom Debug Endpoints

**Créer des endpoints de debug (dev only):**

```typescript
// src/app/api/debug/logs/route.ts
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const fs = require('fs')
  const path = require('path')

  const logFile = path.join(process.cwd(), 'logs', 'perf.ndjson')

  if (!fs.existsSync(logFile)) {
    return NextResponse.json({ error: 'No logs found' }, { status: 404 })
  }

  const logs = fs.readFileSync(logFile, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
    .slice(-100) // Last 100 logs

  return NextResponse.json({ logs })
}
```

```typescript
// src/app/api/debug/metrics/route.ts
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { getAPIStats } = require('@/lib/external-api-tracker')
  const stats = getAPIStats()

  return NextResponse.json({ stats })
}
```

---

## 10. Alerting Strategy

### 10.1 Critical Errors (Immediate Alert)

**Scénarios nécessitant une alerte immédiate:**

1. **Payment Processing Failures**
   - VoPay webhook signature invalide
   - Payment marked as NSF
   - Payment processing error

2. **Database Errors**
   - Connection lost
   - Critical query failure (loan creation, payment recording)
   - Data integrity violation

3. **External API Failures**
   - Margill API down (> 3 failures consécutives)
   - VoPay API down
   - QuickBooks sync failure

4. **Security Incidents**
   - Rate limit breach massif (> 100 requests from same IP)
   - Authentication failure spike
   - Webhook signature validation failures

**Implémentation des alertes:**

```typescript
// src/lib/alerts.ts

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface Alert {
  level: 'critical' | 'error' | 'warning'
  title: string
  message: string
  context?: Record<string, any>
}

export async function sendAlert(alert: Alert) {
  console.error(JSON.stringify({
    type: 'alert',
    level: alert.level,
    title: alert.title,
    message: alert.message,
    context: alert.context,
    timestamp: new Date().toISOString()
  }))

  // Envoyer email d'alerte
  if (alert.level === 'critical') {
    try {
      await resend.emails.send({
        from: 'Alerts <alerts@solutionargentrapide.ca>',
        to: [process.env.ALERT_EMAIL || 'dev@solutionargentrapide.ca'],
        subject: `🚨 [CRITICAL] ${alert.title}`,
        html: `
          <h2>🚨 Critical Alert</h2>
          <h3>${alert.title}</h3>
          <p>${alert.message}</p>
          ${alert.context ? `<pre>${JSON.stringify(alert.context, null, 2)}</pre>` : ''}
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        `
      })
    } catch (error) {
      console.error('Failed to send alert email:', error)
    }
  }

  // TODO: Intégrer avec Slack/Discord/PagerDuty
}

// Exemples d'utilisation
export async function alertPaymentFailure(transactionId: string, reason: string) {
  await sendAlert({
    level: 'critical',
    title: 'VoPay Payment Failure',
    message: `Payment transaction failed: ${transactionId}`,
    context: {
      transaction_id: transactionId,
      failure_reason: reason
    }
  })
}

export async function alertDatabaseError(error: Error, query?: string) {
  await sendAlert({
    level: 'critical',
    title: 'Database Error',
    message: error.message,
    context: {
      error: error.stack,
      query
    }
  })
}

export async function alertExternalAPIDown(service: string, consecutiveFailures: number) {
  await sendAlert({
    level: 'critical',
    title: `${service} API Down`,
    message: `${service} API has failed ${consecutiveFailures} times consecutively`,
    context: {
      service,
      consecutive_failures: consecutiveFailures
    }
  })
}

export async function alertSecurityIncident(type: string, details: Record<string, any>) {
  await sendAlert({
    level: 'critical',
    title: `Security Incident: ${type}`,
    message: `Security incident detected`,
    context: details
  })
}
```

**Usage dans le code:**

```typescript
// src/app/api/webhooks/vopay/route.ts
if (!isValid) {
  await alertSecurityIncident('invalid_webhook_signature', {
    source: 'vopay',
    transaction_id: payload.TransactionID,
    ip: request.headers.get('x-forwarded-for')
  })
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}

// Lors d'un NSF
if (payload.Status.toLowerCase() === 'failed') {
  await alertPaymentFailure(payload.TransactionID, payload.FailureReason)
}

// Lors d'une erreur Margill
catch (error) {
  if (error instanceof ExternalAPIError && error.metadata?.service === 'margill') {
    consecutiveFailures++
    if (consecutiveFailures >= 3) {
      await alertExternalAPIDown('Margill', consecutiveFailures)
    }
  }
}
```

### 10.2 Performance Degradation

**Métriques à surveiller:**

```typescript
// src/lib/performance-monitor.ts

interface PerformanceThresholds {
  api_response_time_p95: number // ms
  db_query_time_p95: number // ms
  external_api_time_p95: number // ms
  error_rate: number // percentage
}

const THRESHOLDS: PerformanceThresholds = {
  api_response_time_p95: 300, // 300ms
  db_query_time_p95: 100, // 100ms
  external_api_time_p95: 1000, // 1s
  error_rate: 5 // 5%
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private successCounts: Map<string, number> = new Map()

  track(metric: string, value: number, isError: boolean = false) {
    // Track value
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, [])
    }
    this.metrics.get(metric)!.push(value)

    // Track error rate
    if (isError) {
      this.errorCounts.set(metric, (this.errorCounts.get(metric) || 0) + 1)
    } else {
      this.successCounts.set(metric, (this.successCounts.get(metric) || 0) + 1)
    }

    // Keep only last 1000 values
    const values = this.metrics.get(metric)!
    if (values.length > 1000) {
      values.shift()
    }
  }

  checkThresholds(): Alert[] {
    const alerts: Alert[] = []

    // Check API response time
    const apiMetrics = this.metrics.get('api_response_time') || []
    if (apiMetrics.length > 0) {
      const p95 = this.percentile(apiMetrics, 95)
      if (p95 > THRESHOLDS.api_response_time_p95) {
        alerts.push({
          level: 'warning',
          title: 'API Response Time Degradation',
          message: `P95 response time is ${p95}ms (threshold: ${THRESHOLDS.api_response_time_p95}ms)`,
          context: { p95, threshold: THRESHOLDS.api_response_time_p95 }
        })
      }
    }

    // Check DB query time
    const dbMetrics = this.metrics.get('db_query_time') || []
    if (dbMetrics.length > 0) {
      const p95 = this.percentile(dbMetrics, 95)
      if (p95 > THRESHOLDS.db_query_time_p95) {
        alerts.push({
          level: 'warning',
          title: 'Database Query Performance Degradation',
          message: `P95 query time is ${p95}ms (threshold: ${THRESHOLDS.db_query_time_p95}ms)`,
          context: { p95, threshold: THRESHOLDS.db_query_time_p95 }
        })
      }
    }

    // Check error rate
    for (const [metric, errorCount] of this.errorCounts.entries()) {
      const successCount = this.successCounts.get(metric) || 0
      const totalCount = errorCount + successCount
      const errorRate = (errorCount / totalCount) * 100

      if (errorRate > THRESHOLDS.error_rate) {
        alerts.push({
          level: 'error',
          title: `High Error Rate: ${metric}`,
          message: `Error rate is ${errorRate.toFixed(1)}% (threshold: ${THRESHOLDS.error_rate}%)`,
          context: {
            metric,
            error_count: errorCount,
            total_count: totalCount,
            error_rate: errorRate
          }
        })
      }
    }

    return alerts
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((sorted.length * p) / 100) - 1
    return sorted[Math.max(0, index)]
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Check thresholds every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    const alerts = performanceMonitor.checkThresholds()
    alerts.forEach(alert => sendAlert(alert))
  }, 5 * 60 * 1000)
}
```

### 10.3 Rate Limit Breaches

**Détecter les abus:**

```typescript
// src/lib/rate-limit-monitor.ts

const RATE_LIMIT_ALERT_THRESHOLD = 50 // alerts si > 50 requêtes en 1 heure

export class RateLimitMonitor {
  private breaches: Map<string, number[]> = new Map()

  recordBreach(ip: string, endpoint: string) {
    const key = `${ip}:${endpoint}`
    if (!this.breaches.has(key)) {
      this.breaches.set(key, [])
    }

    const now = Date.now()
    this.breaches.get(key)!.push(now)

    // Nettoyer les breaches > 1h
    const oneHourAgo = now - 60 * 60 * 1000
    this.breaches.set(
      key,
      this.breaches.get(key)!.filter(t => t > oneHourAgo)
    )

    // Check threshold
    const recentBreaches = this.breaches.get(key)!.length
    if (recentBreaches >= RATE_LIMIT_ALERT_THRESHOLD) {
      this.alertAbuse(ip, endpoint, recentBreaches)
    }
  }

  private async alertAbuse(ip: string, endpoint: string, breachCount: number) {
    await sendAlert({
      level: 'critical',
      title: 'Rate Limit Abuse Detected',
      message: `IP ${ip} has breached rate limit ${breachCount} times in the last hour`,
      context: {
        ip,
        endpoint,
        breach_count: breachCount,
        action_taken: 'Temporary IP ban recommended'
      }
    })

    // TODO: Bloquer automatiquement l'IP
  }
}

export const rateLimitMonitor = new RateLimitMonitor()
```

**Usage:**

```typescript
// Dans rate-limiter.ts
if (!rateLimit.allowed) {
  rateLimitMonitor.recordBreach(identifier, endpoint)
  await logRateLimitHit(identifier, endpoint)
  // ...
}
```

### 10.4 Canaux d'Alertes

**Slack Integration:**

```typescript
// src/lib/alerts/slack.ts

export async function sendSlackAlert(alert: Alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const color = alert.level === 'critical' ? 'danger' :
                alert.level === 'error' ? 'warning' : 'good'

  const emoji = alert.level === 'critical' ? '🚨' :
                 alert.level === 'error' ? '⚠️' : 'ℹ️'

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *${alert.title}*`,
        attachments: [{
          color: color,
          fields: [
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            ...(alert.context ? [{
              title: 'Context',
              value: `\`\`\`${JSON.stringify(alert.context, null, 2)}\`\`\``,
              short: false
            }] : [])
          ],
          footer: 'SAR Monitoring',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    })
  } catch (error) {
    console.error('Failed to send Slack alert:', error)
  }
}
```

**Discord Integration:**

```typescript
// src/lib/alerts/discord.ts

export async function sendDiscordAlert(alert: Alert) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const color = alert.level === 'critical' ? 0xFF0000 : // Red
                alert.level === 'error' ? 0xFFA500 : // Orange
                0x00FF00 // Green

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: alert.title,
          description: alert.message,
          color: color,
          fields: alert.context ? Object.entries(alert.context).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true
          })) : [],
          timestamp: new Date().toISOString()
        }]
      })
    })
  } catch (error) {
    console.error('Failed to send Discord alert:', error)
  }
}
```

**PagerDuty Integration (pour alertes critiques):**

```typescript
// src/lib/alerts/pagerduty.ts

export async function sendPagerDutyAlert(alert: Alert) {
  if (alert.level !== 'critical') return

  const apiKey = process.env.PAGERDUTY_API_KEY
  if (!apiKey) return

  try {
    await fetch('https://api.pagerduty.com/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${apiKey}`,
        'Accept': 'application/vnd.pagerduty+json;version=2'
      },
      body: JSON.stringify({
        incident: {
          type: 'incident',
          title: alert.title,
          service: {
            id: process.env.PAGERDUTY_SERVICE_ID,
            type: 'service_reference'
          },
          body: {
            type: 'incident_body',
            details: `${alert.message}\n\n${JSON.stringify(alert.context, null, 2)}`
          },
          urgency: 'high'
        }
      })
    })
  } catch (error) {
    console.error('Failed to send PagerDuty alert:', error)
  }
}
```

### 10.5 Alert Configuration

**Fichier de configuration centralisé:**

```typescript
// src/config/alerts.ts

export interface AlertConfig {
  enabled: boolean
  channels: {
    email: boolean
    slack: boolean
    discord: boolean
    pagerduty: boolean
  }
  thresholds: {
    critical: boolean // Envoyer les alertes critiques
    error: boolean // Envoyer les alertes error
    warning: boolean // Envoyer les alertes warning
  }
}

export const ALERT_CONFIG: AlertConfig = {
  enabled: process.env.NODE_ENV === 'production',
  channels: {
    email: true,
    slack: !!process.env.SLACK_WEBHOOK_URL,
    discord: !!process.env.DISCORD_WEBHOOK_URL,
    pagerduty: !!process.env.PAGERDUTY_API_KEY
  },
  thresholds: {
    critical: true,
    error: true,
    warning: process.env.NODE_ENV === 'production'
  }
}

// Fonction centralisée
export async function sendAlert(alert: Alert) {
  if (!ALERT_CONFIG.enabled) return
  if (!ALERT_CONFIG.thresholds[alert.level]) return

  // Log toujours
  console.error(JSON.stringify({
    type: 'alert',
    ...alert,
    timestamp: new Date().toISOString()
  }))

  // Email
  if (ALERT_CONFIG.channels.email) {
    await sendEmailAlert(alert)
  }

  // Slack
  if (ALERT_CONFIG.channels.slack) {
    await sendSlackAlert(alert)
  }

  // Discord
  if (ALERT_CONFIG.channels.discord) {
    await sendDiscordAlert(alert)
  }

  // PagerDuty (critical only)
  if (ALERT_CONFIG.channels.pagerduty && alert.level === 'critical') {
    await sendPagerDutyAlert(alert)
  }
}
```

---

## Conclusion

Ce guide fournit une structure complète pour le tracing, le debugging et le monitoring de l'application SAR.

### Points clés à retenir:

1. **Logs structurés en JSON** pour faciliter le parsing et l'analyse
2. **Request ID unique** pour tracer un flow complet
3. **Performance tracking automatique** avec `withPerf` et `supabase-server.ts`
4. **Alertes intelligentes** pour les erreurs critiques
5. **Métriques dans Supabase** pour analyse historique

### Prochaines étapes recommandées:

1. Ajouter Error Boundary React pour les erreurs frontend
2. Implémenter l'intégration Slack/Discord pour les alertes
3. Créer un dashboard de monitoring custom (admin/monitoring)
4. Mettre en place Sentry ou DataDog pour le tracking d'erreurs avancé
5. Automatiser les alertes de performance avec des seuils configurables

### Ressources utiles:

- [Next.js Debugging](https://nextjs.org/docs/advanced-features/debugging)
- [Supabase Logging](https://supabase.com/docs/guides/platform/logs)
- [Vercel Logs](https://vercel.com/docs/observability/runtime-logs)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
