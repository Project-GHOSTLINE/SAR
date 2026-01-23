# 🔍 DATAFLOW HEALTH - ARCHITECTURE OBSERVABILITÉ

**Date:** 2026-01-22
**Version:** 1.0
**Projet:** Solution Argent Rapide (SAR)

---

## 📊 Vue d'Ensemble

Système d'observabilité end-to-end pour tracer, monitorer et diagnostiquer tous les flux de données dans SAR, du frontend aux webhooks externes.

### Objectifs

1. **Visibilité complète** du dataflow (request → API → DB → webhooks → providers)
2. **Traçabilité** via `trace_id` unique corrélé partout
3. **Performance monitoring** (latences, erreurs, bottlenecks)
4. **Security auditing** (webhook signatures, rate limiting, RBAC)
5. **Alerting proactif** (seuils, anomalies)

### Principes

- ✅ **Zero regression** - Aucun impact sur flows production
- 🔒 **Privacy-first** - Redaction automatique PII/secrets
- ⚡ **Minimal overhead** - <5ms par requête, batch writes
- 🎯 **Actionable** - Drill-down par trace_id pour debug
- 💰 **Cost-effective** - Supabase + Vercel only, no vendor lock-in

---

## 🏗️ Architecture Système

### Flux de Données Complet

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ HTTP Request
       │ x-client-id (optional)
       ▼
┌─────────────────────────────────────────────┐
│         VERCEL EDGE (Middleware)            │
│  • Generate trace_id (UUID v4)              │
│  • Extract: IP, UA, method, path            │
│  • Store in AsyncLocalStorage               │
│  • Forward trace_id → x-trace-id header     │
└──────────────┬──────────────────────────────┘
               ▼
┌──────────────────────────────────────────────┐
│      NEXT.JS API ROUTES (App Router)         │
│  • withPerf() wrapper (existing)             │
│  • withTelemetry() wrapper (NEW)             │
│  • Auto-capture: duration, status, errors    │
│  • Admin context: verifyAuth() → role/user   │
└────┬──────────────────────────────┬──────────┘
     │                              │
     ▼                              ▼
┌────────────────┐         ┌────────────────────┐
│   SUPABASE     │         │  EXTERNAL APIs     │
│   (Database)   │         │  • VoPay           │
│                │         │  • QuickBooks      │
│  • DB Queries  │         │  • Resend (Email)  │
│  • RPC Calls   │         │  • Margill         │
│  • Webhooks    │         │                    │
│                │         │  fetchWithTelemetry│
│  Measure:      │         │  • Retry logic     │
│  - Query time  │         │  • Timeout tracking│
│  - Row count   │         │  - DNS/TLS (best-  │
│  - Error       │         │    effort metrics) │
└────┬───────────┘         └─────────┬──────────┘
     │                               │
     │ Write telemetry               │ Write telemetry
     │ (batched)                     │ (batched)
     ▼                               ▼
┌─────────────────────────────────────────────────┐
│       TELEMETRY TABLES (Supabase)               │
│  • telemetry_requests                           │
│  • telemetry_spans                              │
│  • telemetry_security                           │
│  • telemetry_alerts                             │
└──────────────┬──────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│      ADMIN UI - /admin/dataflow-health           │
│  • Real-time KPIs (req/min, errors, latencies)  │
│  • Trace timeline viewer (drill-down)           │
│  • Security checks dashboard                    │
│  • Alerts & anomalies                           │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Composants Techniques

### 1. Middleware Global (Entry Point)

**Fichier:** `src/middleware.ts`

**Responsabilités:**
- Générer `trace_id` unique (UUID v4)
- Extraire metadata request: method, path, IP, User-Agent
- Stocker context en AsyncLocalStorage
- Propager `x-trace-id` dans response headers
- Intégration avec auth JWT existant

**Context Structure:**
```typescript
interface TraceContext {
  traceId: string               // UUID v4
  requestId: string             // Pour compat avec perf.ts existant
  startTime: number             // performance.now()
  method: string                // GET, POST, etc.
  path: string                  // /api/admin/messages
  source: 'web' | 'webhook' | 'cron' | 'internal'
  ipHash: string                // SHA256(IP + salt)
  uaHash: string                // SHA256(UA + salt)
  adminContext?: {              // Si route /admin/*
    isAdmin: boolean
    role: string
  }
  env: 'production' | 'development' | 'preview'
}
```

**Existing Integration:**
- ✅ PerfContext déjà en place via AsyncLocalStorage
- ✅ JWT verification existant (`verifyAuth()`)
- 🆕 Extension pour trace_id propagation

---

### 2. Telemetry Wrapper (withTelemetry)

**Fichier:** `src/lib/telemetry.ts` (NEW)

**Wrapper API Routes:**
```typescript
export function withTelemetry<T>(
  handler: (req: Request) => Promise<Response>,
  options?: {
    spanName?: string
    captureBody?: boolean  // Default: false (privacy)
    redactKeys?: string[]  // Auto-redact ces keys
  }
): (req: Request) => Promise<Response>
```

**Fonctionnalités:**
- Auto-capture: duration, status, error
- Correlation avec trace_id du middleware
- Write telemetry_requests + telemetry_spans
- Error tracking avec stacktrace redacted
- Integration avec withPerf() existant

---

### 3. External API Wrapper

**Fichier:** `src/lib/fetch-with-telemetry.ts` (NEW)

**Wrapper fetch universel:**
```typescript
export async function fetchWithTelemetry(
  url: string,
  options: RequestInit & {
    provider: 'vopay' | 'quickbooks' | 'resend' | 'margill' | 'other'
    retryConfig?: RetryConfig
    timeoutMs?: number
  }
): Promise<Response>
```

**Metrics capturées:**
- DNS resolution time (via performance.timing si dispo)
- TLS handshake time
- Time to first byte (TTFB)
- Total duration
- Retry attempts
- Timeout occurrences
- Status code + error details

**Existing Integrations:**
- VoPay: `src/lib/vopay.ts` → wrapper `createVoPayClient()`
- QuickBooks: `src/lib/quickbooks/client.ts`
- Resend: API calls dans `/api/*/route.ts`

---

### 4. Webhook Instrumentation

**Fichiers:**
- `src/app/api/webhooks/vopay/route.ts`
- `src/app/api/webhooks/quickbooks/route.ts`

**Flow webhook:**
```
1. Receive POST → Generate trace_id
2. Validate signature → Write telemetry_security
3. Check replay (timestamp) → Write telemetry_security
4. Process payload → Write telemetry_spans (DB operations)
5. Return 200 OK → Write telemetry_requests
```

**Security Checks:**
- ✅ HMAC signature validation (VoPay SHA1, QB HMAC-SHA256)
- ✅ Replay protection (timestamp window)
- 🆕 Rate limiting (per provider, per time window)
- 🆕 Payload size checks
- 🆕 Anomaly detection (burst patterns)

---

## 📦 Database Schema

### Tables Telemetry

#### 1. telemetry_requests

```sql
CREATE TABLE telemetry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Tracing
  trace_id UUID NOT NULL UNIQUE,
  parent_trace_id UUID,  -- Pour nested requests

  -- Request metadata
  method TEXT NOT NULL,  -- GET, POST, etc.
  path TEXT NOT NULL,    -- /api/admin/messages
  status INTEGER,        -- HTTP status code
  duration_ms INTEGER,   -- Total duration

  -- Source
  source TEXT NOT NULL,  -- web, webhook, cron, internal
  env TEXT NOT NULL,     -- production, development, preview

  -- Client context (anonymized)
  ip_hash TEXT,          -- SHA256(IP + salt)
  ua_hash TEXT,          -- SHA256(User-Agent + salt)
  region TEXT,           -- Vercel region (iad1, sfo1, etc.)

  -- Auth context (if admin)
  user_id UUID,          -- Si authentifié
  role TEXT,             -- admin, user, anonymous

  -- Error tracking
  error_code TEXT,       -- APP_ERROR_001, DB_TIMEOUT, etc.
  error_message_redacted TEXT,  -- Message sans PII

  -- Metadata
  meta_redacted JSONB,   -- Extra data (redacted)

  -- Indexes
  INDEX idx_telemetry_requests_trace_id (trace_id),
  INDEX idx_telemetry_requests_created_at (created_at DESC),
  INDEX idx_telemetry_requests_path (path),
  INDEX idx_telemetry_requests_status (status),
  INDEX idx_telemetry_requests_source (source)
);
```

#### 2. telemetry_spans

```sql
CREATE TABLE telemetry_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to parent request
  trace_id UUID NOT NULL REFERENCES telemetry_requests(trace_id),
  parent_span_id UUID,  -- Pour nested spans

  -- Span metadata
  span_name TEXT NOT NULL,     -- "db_query", "external_api", "webhook_process"
  span_type TEXT NOT NULL,     -- db, external, webhook, internal
  target TEXT NOT NULL,        -- Table name / Provider / Route

  -- Performance
  start_time TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,        -- success, error, timeout

  -- Context
  operation TEXT,              -- SELECT, INSERT, GET, POST
  row_count INTEGER,           -- Pour DB queries
  bytes_in INTEGER,            -- Request size
  bytes_out INTEGER,           -- Response size

  -- Retry logic
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER,
  retry_reason TEXT,

  -- Error tracking
  error_type TEXT,
  error_message_redacted TEXT,

  -- Metadata
  meta_redacted JSONB,

  -- Indexes
  INDEX idx_telemetry_spans_trace_id (trace_id),
  INDEX idx_telemetry_spans_created_at (created_at DESC),
  INDEX idx_telemetry_spans_span_type (span_type),
  INDEX idx_telemetry_spans_target (target),
  INDEX idx_telemetry_spans_duration (duration_ms DESC)
);
```

#### 3. telemetry_security

```sql
CREATE TABLE telemetry_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Link to request
  trace_id UUID NOT NULL REFERENCES telemetry_requests(trace_id),

  -- Security check
  check_name TEXT NOT NULL,    -- "webhook_signature", "replay_protection", etc.
  result TEXT NOT NULL,        -- pass, fail, error
  severity TEXT NOT NULL,      -- low, medium, high, critical

  -- Details (REDACTED - no PII/secrets)
  details_redacted JSONB,

  -- Actions taken
  action_taken TEXT,           -- blocked, allowed, logged

  -- Indexes
  INDEX idx_telemetry_security_trace_id (trace_id),
  INDEX idx_telemetry_security_created_at (created_at DESC),
  INDEX idx_telemetry_security_check_name (check_name),
  INDEX idx_telemetry_security_result (result),
  INDEX idx_telemetry_security_severity (severity)
);
```

#### 4. telemetry_alerts

```sql
CREATE TABLE telemetry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Alert identification
  alert_key TEXT NOT NULL,     -- "high_error_rate_api_vopay"
  severity TEXT NOT NULL,      -- low, medium, high, critical
  state TEXT NOT NULL,         -- open, acknowledged, closed

  -- Timing
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Context
  sample_trace_id UUID,        -- Example trace for investigation
  summary TEXT NOT NULL,       -- Human-readable summary
  occurrence_count INTEGER DEFAULT 1,

  -- Threshold info
  threshold_value NUMERIC,
  current_value NUMERIC,

  -- Metadata
  meta_redacted JSONB,

  -- Indexes
  INDEX idx_telemetry_alerts_alert_key (alert_key),
  INDEX idx_telemetry_alerts_state (state),
  INDEX idx_telemetry_alerts_severity (severity),
  INDEX idx_telemetry_alerts_last_seen (last_seen_at DESC)
);
```

---

## 🎨 Admin UI - Dataflow Health

### Page: `/admin/dataflow-health`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  🔍 Santé du Dataflow          [Refresh] [Last 24h ▼]  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Req/min   │ │Error Rate│ │P95 Latency│ │Webhooks │  │
│  │  125     │ │  2.3%   ⚠│ │  145ms   │ │  98%  ✅│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │DB Latency│ │VoPay Err │ │QB Errors │ │Resend OK│  │
│  │  35ms   ✅│ │  0%    ✅│ │  1%    ⚠│ │ 100%  ✅│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  📊 Timeline (Derniers Traces)                         │
│                                                         │
│  [Filtres: Source ▼ | Status ▼ | Provider ▼ ]         │
│                                                         │
│  🔵 12:34:56 | GET /api/admin/messages | 145ms | 200  │
│     └─ db_query: clients → 25ms                        │
│     └─ db_query: contact_messages → 85ms               │
│     └─ response_marshal → 10ms                         │
│                                                         │
│  🔴 12:34:52 | POST /api/webhooks/vopay | 2340ms | 500│
│     └─ webhook_signature_validate → 5ms ✅             │
│     └─ db_rpc: process_vopay_webhook → 2200ms ⚠       │
│     └─ ERROR: Timeout waiting for DB response          │
│                                                         │
│  🟡 12:34:48 | GET /api/admin/vopay/balance | 890ms|200│
│     └─ external_api: vopay → 850ms ⚠                   │
│        ├─ DNS: 10ms                                    │
│        ├─ TLS: 120ms                                   │
│        ├─ TTFB: 700ms                                  │
│        └─ Retry #1 (timeout) → Success                 │
│                                                         │
│  [Load more...]                                        │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Top Problèmes (Dernières 24h)                      │
│                                                         │
│  1. 🔴 HIGH: DB Timeouts on process_vopay_webhook      │
│     • 12 occurrences                                   │
│     • Avg duration: 2.4s (threshold: 1s)               │
│     • [View traces] [Acknowledge]                      │
│                                                         │
│  2. 🟡 MEDIUM: QuickBooks API Rate Limit Hit           │
│     • 3 occurrences                                    │
│     • Last seen: 5 min ago                             │
│     • [View traces] [Acknowledge]                      │
│                                                         │
│  3. 🟡 LOW: High latency on VoPay /balance endpoint    │
│     • 45 occurrences                                   │
│     • P95: 890ms (threshold: 500ms)                    │
│     • [View traces] [Acknowledge]                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Privacy

### Redaction Strategy

**Automatic PII Redaction:**
```typescript
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
}

function redactPII(text: string): string {
  return text
    .replace(PII_PATTERNS.email, '[EMAIL]')
    .replace(PII_PATTERNS.phone, '[PHONE]')
    .replace(PII_PATTERNS.ssn, '[SSN]')
    .replace(PII_PATTERNS.creditCard, '[CARD]')
}
```

**Secret Keys Redaction:**
```typescript
const SECRET_KEYS = [
  'password', 'secret', 'token', 'key', 'api_key',
  'apiKey', 'apiSecret', 'privateKey', 'jwt',
  'sessionId', 'sessionToken', 'authToken'
]

function redactObject(obj: any): any {
  // Recursive redaction of sensitive keys
}
```

**IP/UA Hashing:**
```typescript
function hashWithSalt(value: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(value + salt)
    .digest('hex')
    .substring(0, 16) // 16 chars = 64 bits entropy
}
```

---

## ⚡ Performance Considerations

### Write Batching

**Strategy:** Batch telemetry writes to minimize DB load

```typescript
class TelemetryBatcher {
  private requestBatch: TelemetryRequest[] = []
  private spanBatch: TelemetrySpan[] = []
  private flushInterval = 5000 // 5 seconds

  async add(type: 'request' | 'span', data: any) {
    // Add to batch
    // Auto-flush if batch size > 100 OR timer expires
  }

  async flush() {
    // Bulk insert to Supabase
    await supabase.from('telemetry_requests').insert(this.requestBatch)
    await supabase.from('telemetry_spans').insert(this.spanBatch)
    this.requestBatch = []
    this.spanBatch = []
  }
}
```

**Overhead Target:** <5ms per request

### Data Retention

**Automatic Cleanup:**
```sql
-- Cron job: Daily cleanup (via Supabase scheduled functions)
DELETE FROM telemetry_requests
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM telemetry_spans
WHERE created_at < NOW() - INTERVAL '30 days';

DELETE FROM telemetry_security
WHERE created_at < NOW() - INTERVAL '90 days';  -- Keep security longer

DELETE FROM telemetry_alerts
WHERE state = 'closed' AND closed_at < NOW() - INTERVAL '90 days';
```

**Archive Strategy (future):**
- Export to S3/blob storage before deletion
- Compress as JSONL.gz
- Keep metadata index for search

---

## 🚨 Alerting Rules

### Threshold-Based Alerts

```typescript
interface AlertRule {
  key: string
  name: string
  query: () => Promise<number>
  threshold: number
  comparison: '>' | '<' | '='
  severity: 'low' | 'medium' | 'high' | 'critical'
  windowMinutes: number
}

const ALERT_RULES: AlertRule[] = [
  {
    key: 'high_error_rate',
    name: 'High Error Rate (5xx)',
    query: async () => {
      // SELECT count(*) WHERE status >= 500 AND created_at > NOW() - 5min
    },
    threshold: 10,  // >10 errors in 5min
    comparison: '>',
    severity: 'high',
    windowMinutes: 5
  },
  {
    key: 'webhook_failures_vopay',
    name: 'VoPay Webhook Failures',
    query: async () => {
      // SELECT count(*) WHERE path = '/webhooks/vopay' AND status != 200
    },
    threshold: 3,
    comparison: '>',
    severity: 'critical',
    windowMinutes: 15
  },
  {
    key: 'slow_db_queries',
    name: 'Slow DB Queries (>1s)',
    query: async () => {
      // SELECT count(*) FROM telemetry_spans WHERE span_type='db' AND duration_ms>1000
    },
    threshold: 5,
    comparison: '>',
    severity: 'medium',
    windowMinutes: 10
  },
  {
    key: 'provider_timeouts',
    name: 'External Provider Timeouts',
    query: async () => {
      // SELECT count(*) WHERE span_type='external' AND status='timeout'
    },
    threshold: 5,
    comparison: '>',
    severity: 'medium',
    windowMinutes: 5
  }
]
```

### Alert Actions

```typescript
async function checkAlerts() {
  for (const rule of ALERT_RULES) {
    const currentValue = await rule.query()

    if (shouldTriggerAlert(rule, currentValue)) {
      await createOrUpdateAlert({
        alert_key: rule.key,
        severity: rule.severity,
        state: 'open',
        current_value: currentValue,
        threshold_value: rule.threshold,
        summary: `${rule.name}: ${currentValue} (threshold: ${rule.threshold})`
      })

      // Future: Send email/Slack notification
    }
  }
}
```

---

## 📝 Implementation Phases

### Phase 1: Foundation (Week 1)

**Goals:**
- ✅ Trace ID generation & propagation
- ✅ Telemetry tables created
- ✅ Basic instrumentation (middleware, withTelemetry)
- ✅ Admin UI skeleton (KPIs + timeline)

**Deliverables:**
1. Migration SQL
2. `src/lib/telemetry.ts` - Core library
3. `src/middleware.ts` - Updated with trace_id
4. `src/app/admin/dataflow-health/page.tsx` - UI
5. Unit tests

### Phase 2: Enrichment (Week 2)

**Goals:**
- ✅ External API wrapper (fetchWithTelemetry)
- ✅ Webhook instrumentation (VoPay, QuickBooks)
- ✅ Security checks integration
- ✅ Enhanced UI (filters, drill-down)

**Deliverables:**
1. `src/lib/fetch-with-telemetry.ts`
2. Updated webhook routes
3. Security check library
4. UI components (TraceTimeline, SecurityDashboard)

### Phase 3: Alerting (Week 3)

**Goals:**
- ✅ Alert rules engine
- ✅ Automatic alert creation
- ✅ Alert dashboard in UI
- ✅ Email/Slack notifications (optional)

**Deliverables:**
1. `src/lib/alerting.ts` - Alert engine
2. Cron job for alert checking
3. Alert management UI
4. Notification integrations

---

## 🧪 Testing Strategy

### Load Testing

**Tool:** k6 or Artillery

**Scenarios:**
```javascript
// k6 script
export default function() {
  // Scenario 1: Normal admin traffic
  http.get('https://sar.vercel.app/api/admin/messages', {
    headers: { 'Cookie': 'admin-session=...' }
  })

  // Scenario 2: Webhook burst
  for (let i = 0; i < 50; i++) {
    http.post('https://sar.vercel.app/api/webhooks/vopay',
      JSON.stringify({...}),
      { headers: { 'x-vopay-signature': '...' } }
    )
  }

  // Verify: telemetry overhead < 5ms
  check(response, {
    'overhead_acceptable': (r) => r.timings.duration < baseline + 5
  })
}
```

### Integration Tests

**Critical Paths:**
1. ✅ Trace ID propagation (middleware → API → DB)
2. ✅ Admin context captured correctly
3. ✅ Webhook signature validation recorded
4. ✅ External API retry logic tracked
5. ✅ Alerts triggered on threshold breach

---

## 📊 Success Metrics

### Technical KPIs

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Trace ID propagation | 100% | - | 🟡 |
| Overhead per request | <5ms | - | 🟡 |
| Data retention | 30 days | - | 🟡 |
| Alert latency | <1 min | - | 🟡 |
| UI load time | <2s | - | 🟡 |

### Business KPIs

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| MTTR (Mean Time To Resolve) | -50% | - | 🟡 |
| False positive rate | <5% | - | 🟡 |
| Debug time saved | -60% | - | 🟡 |

---

## 🔗 References

### External Dependencies

- **UUID:** `crypto.randomUUID()` (Node 19+, no dep)
- **Hashing:** `crypto.createHash()` (Node built-in)
- **AsyncLocalStorage:** `async_hooks` (Node built-in)
- **Supabase JS:** `@supabase/supabase-js` (existing)

### Documentation Links

- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [AsyncLocalStorage](https://nodejs.org/api/async_context.html)
- [OpenTelemetry (inspiration)](https://opentelemetry.io/docs/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Version History:**
- v1.0 (2026-01-22): Initial architecture document

**Authors:** Claude Code (Autonomous Mode)
**Review:** Pending
