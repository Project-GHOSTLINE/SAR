# API ORCHESTRATION SPECIFICATION
**SAR Project - Unified Client Dossier API**
**Date:** 2026-01-23

## 🎯 Objectif

Concevoir une API optimisée qui agrège toutes les données client en un seul appel, éliminant les requêtes N+1 et offrant une vue 360° performante pour le dashboard admin.

---

## 🏗️ Architecture Principles

### 1. Single Aggregated Endpoint
- **Instead of:** 15+ separate API calls per client profile page
- **Use:** 1 call to `/api/admin/client/:id/dossier` returns everything
- **Benefit:** Reduce latency from ~3-5s to <500ms

### 2. Smart Data Layering
```
┌─────────────────────────────────────┐
│   LAYER 1: Core Identity (Required) │  Always included
├─────────────────────────────────────┤
│   LAYER 2: Summary Metrics (Light)  │  Always included
├─────────────────────────────────────┤
│   LAYER 3: Detailed Data (Heavy)    │  Optional via ?include=
└─────────────────────────────────────┘
```

### 3. Database-Side Aggregation
- Use PostgreSQL RPC functions for heavy lifting
- Return pre-aggregated JSON from DB → API → Frontend
- Leverage materialized views for expensive computations

### 4. Caching Strategy
```
┌──────────────┐
│ Redis Cache  │ ← 5 min TTL for client summary
├──────────────┤
│ DB Matview   │ ← Refresh every 5 min for analytics
├──────────────┤
│ Raw Tables   │ ← Always fresh for critical data
└──────────────┘
```

---

## 📡 API Endpoints

### Primary Endpoint: Unified Client Dossier

#### `GET /api/admin/client/:id/dossier`

**Description:** Retourne le dossier complet d'un client en une seule requête optimisée.

**Path Parameters:**
- `id` (string, required): Client ID (email, application ID, or external ID)

**Query Parameters:**
```typescript
interface DossierQueryParams {
  // Data layering
  include?: string[];  // Optional layers: 'timeline', 'documents', 'analytics', 'relations'

  // Pagination for heavy sections
  timeline_limit?: number;      // Default: 50, Max: 200
  timeline_offset?: number;     // Default: 0
  documents_limit?: number;     // Default: 20, Max: 50

  // Date filtering
  date_from?: string;  // ISO date: '2025-01-01'
  date_to?: string;    // ISO date: '2026-01-31'

  // Performance hints
  include_raw_data?: boolean;  // Include raw JSONB payloads (default: false)
  use_cache?: boolean;         // Use Redis cache if available (default: true)
}
```

**Response Schema:**
```typescript
interface ClientDossierResponse {
  // LAYER 1: Core Identity (always included)
  identity: {
    client_id: string;
    full_name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      province: string;
      postal_code: string;
    };
    external_ids: {
      inverite_guid?: string;
      vopay_client_id?: string;
      quickbooks_customer_id?: string;
    };
    created_at: string;  // ISO timestamp
    last_activity_at: string;
  };

  // LAYER 2: Summary Metrics (always included)
  summary: {
    applications: {
      total_count: number;
      approved_count: number;
      declined_count: number;
      pending_count: number;
      last_application_date: string | null;
    };
    financial: {
      total_borrowed_cad: number;
      total_paid_cad: number;
      total_interest_paid_cad: number;
      current_balance_cad: number;
      next_payment_date: string | null;
      next_payment_amount_cad: number | null;
    };
    banking: {
      has_ibv_analysis: boolean;
      latest_analysis_date: string | null;
      sar_score: number | null;          // 300-850 scale
      sar_recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE' | null;
      monthly_income_cad: number | null;
      dti_ratio: number | null;          // 0.0-1.0 scale
    };
    engagement: {
      total_logins: number;
      last_login: string | null;
      email_open_rate: number;           // 0.0-1.0 scale
      sms_response_rate: number;         // 0.0-1.0 scale
      support_tickets: number;
      document_downloads: number;
    };
    risk: {
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
      red_flags_count: number;
      fraud_score: number | null;        // 0-100 scale
      payment_history_score: number;     // 0-100 scale (% on-time)
      churn_risk_score: number;          // 0-100 scale
    };
  };

  // LAYER 3: Detailed Data (optional, via ?include=)
  timeline?: ClientTimelineEvent[];     // include=timeline
  applications?: LoanApplicationDetail[];  // include=applications
  analyses?: BankingAnalysisDetail[];   // include=analyses
  transactions?: FinancialTransaction[];  // include=transactions
  documents?: DocumentDetail[];         // include=documents
  communications?: CommunicationLog[];  // include=communications
  relations?: ClientRelation[];         // include=relations
  analytics?: WebAnalytics;             // include=analytics

  // Metadata
  _meta: {
    generated_at: string;       // ISO timestamp
    data_freshness_seconds: number;  // Age of cached data
    query_duration_ms: number;
    cache_hit: boolean;
  };
}
```

**Example Request:**
```bash
# Minimal request (only core + summary)
GET /api/admin/client/eric.tremblay@email.com/dossier

# Full dossier with timeline and documents
GET /api/admin/client/eric.tremblay@email.com/dossier?include=timeline,documents&timeline_limit=100

# Filtered by date range
GET /api/admin/client/eric.tremblay@email.com/dossier?date_from=2025-12-01&date_to=2026-01-31
```

**Example Response:**
```json
{
  "identity": {
    "client_id": "fe027667-e1f5-4072-95ac-c4ee0f355df4",
    "full_name": "Eric Tremblay",
    "email": "eric.tremblay@email.com",
    "phone": "+1-514-555-0123",
    "address": {
      "street": "123 Rue Principale",
      "city": "Montréal",
      "province": "QC",
      "postal_code": "H1A 1A1"
    },
    "external_ids": {
      "inverite_guid": "ABC-123",
      "vopay_client_id": "VP-456",
      "quickbooks_customer_id": "QB-789"
    },
    "created_at": "2025-12-15T10:30:00Z",
    "last_activity_at": "2026-01-20T09:30:00Z"
  },
  "summary": {
    "applications": {
      "total_count": 2,
      "approved_count": 1,
      "declined_count": 0,
      "pending_count": 1,
      "last_application_date": "2026-01-10T17:00:00Z"
    },
    "financial": {
      "total_borrowed_cad": 3500.00,
      "total_paid_cad": 400.00,
      "total_interest_paid_cad": 50.00,
      "current_balance_cad": 3100.00,
      "next_payment_date": "2026-02-05",
      "next_payment_amount_cad": 400.00
    },
    "banking": {
      "has_ibv_analysis": true,
      "latest_analysis_date": "2026-01-10T16:20:00Z",
      "sar_score": 625,
      "sar_recommendation": "REVIEW",
      "monthly_income_cad": 3500.00,
      "dti_ratio": 0.42
    },
    "engagement": {
      "total_logins": 5,
      "last_login": "2026-01-19T14:30:00Z",
      "email_open_rate": 0.80,
      "sms_response_rate": 1.00,
      "support_tickets": 2,
      "document_downloads": 12
    },
    "risk": {
      "risk_level": "MEDIUM",
      "red_flags_count": 1,
      "fraud_score": 15,
      "payment_history_score": 100,
      "churn_risk_score": 5
    }
  },
  "_meta": {
    "generated_at": "2026-01-23T10:00:00Z",
    "data_freshness_seconds": 120,
    "query_duration_ms": 245,
    "cache_hit": false
  }
}
```

**Performance Targets:**
- P50: < 200ms
- P95: < 500ms
- P99: < 1000ms

**Error Responses:**
```typescript
// 404 - Client not found
{
  "error": "CLIENT_NOT_FOUND",
  "message": "No client found with identifier: eric.tremblay@email.com",
  "identifier": "eric.tremblay@email.com"
}

// 400 - Invalid parameters
{
  "error": "INVALID_PARAMETERS",
  "message": "Invalid include value: invalid_section",
  "valid_values": ["timeline", "documents", "analytics", "relations", "applications", "analyses", "transactions", "communications"]
}

// 500 - Server error
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "Failed to generate client dossier",
  "request_id": "req_abc123"
}
```

---

### Supporting Endpoints

#### `GET /api/admin/client/:id/timeline`

**Description:** Paginated timeline of all client events (lightweight).

**Query Parameters:**
```typescript
interface TimelineQueryParams {
  limit?: number;         // Default: 50, Max: 200
  offset?: number;        // Default: 0
  event_types?: string[]; // Filter: ['application', 'payment', 'analysis', 'communication']
  date_from?: string;
  date_to?: string;
}
```

**Response:**
```typescript
interface TimelineResponse {
  events: ClientTimelineEvent[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface ClientTimelineEvent {
  id: string;
  timestamp: string;
  event_type: 'application_submitted' | 'payment_received' | 'analysis_completed' | 'email_sent' | ...;
  event_category: 'APPLICATION' | 'FINANCIAL' | 'BANKING' | 'COMMUNICATION' | 'DOCUMENT' | 'SYSTEM';
  summary: string;  // Human-readable summary
  details: Record<string, any>;  // Structured event data
  source: 'system' | 'admin' | 'api' | 'webhook' | 'cron';
  metadata?: Record<string, any>;
}
```

**Performance Target:** < 100ms (p95)

---

#### `GET /api/admin/client/:id/metrics`

**Description:** Pre-computed metrics and KPIs (very fast, uses materialized view).

**Response:**
```typescript
interface ClientMetricsResponse {
  client_id: string;
  computed_at: string;

  // Financial KPIs
  lifetime_value_cad: number;
  projected_revenue_cad: number;
  average_loan_amount_cad: number;
  payment_consistency_score: number;  // 0-100

  // Behavioral KPIs
  engagement_score: number;           // 0-100
  response_time_hours: number;        // Avg time to respond to communications
  portal_usage_frequency: number;     // Logins per month

  // Risk KPIs
  overall_risk_score: number;         // 0-100 (lower = safer)
  default_probability: number;        // 0.0-1.0
  fraud_probability: number;          // 0.0-1.0

  // Segmentation
  customer_segment: 'PRIME' | 'STANDARD' | 'SUBPRIME' | 'HIGH_RISK';
  ltv_segment: 'HIGH' | 'MEDIUM' | 'LOW';
  engagement_segment: 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'CHURNED';
}
```

**Performance Target:** < 50ms (p95) - reads from materialized view

---

#### `GET /api/admin/client/:id/relations`

**Description:** Client relations, concordances, and duplicate detection.

**Response:**
```typescript
interface ClientRelationsResponse {
  client_id: string;

  // Co-borrowers
  co_borrowers: {
    name: string;
    email: string;
    phone: string;
    relationship: 'spouse' | 'partner' | 'family' | 'business';
    application_ids: string[];
  }[];

  // References
  references: {
    name: string;
    phone: string;
    relationship: 'friend' | 'colleague' | 'family' | 'employer';
    verified: boolean;
  }[];

  // Potential duplicates
  potential_duplicates: {
    client_id: string;
    match_type: 'same_email' | 'same_phone' | 'same_address' | 'similar_name';
    confidence_score: number;  // 0.0-1.0
    details: Record<string, any>;
  }[];

  // Linked accounts
  linked_accounts: {
    source: 'vopay' | 'quickbooks' | 'inverite';
    external_id: string;
    linked_at: string;
    status: 'active' | 'inactive';
  }[];
}
```

**Performance Target:** < 200ms (p95)

---

#### `POST /api/admin/client/search`

**Description:** Advanced client search with filters and full-text search.

**Request Body:**
```typescript
interface ClientSearchRequest {
  // Text search
  query?: string;  // Fuzzy search across name, email, phone

  // Filters
  filters?: {
    application_status?: ('approved' | 'declined' | 'pending')[];
    risk_level?: ('LOW' | 'MEDIUM' | 'HIGH')[];
    sar_score_min?: number;
    sar_score_max?: number;
    total_borrowed_min?: number;
    total_borrowed_max?: number;
    created_after?: string;
    created_before?: string;
    has_ibv_analysis?: boolean;
  };

  // Sorting
  sort_by?: 'created_at' | 'last_activity' | 'total_borrowed' | 'sar_score' | 'risk_level';
  sort_order?: 'asc' | 'desc';

  // Pagination
  limit?: number;   // Default: 25, Max: 100
  offset?: number;  // Default: 0
}
```

**Response:**
```typescript
interface ClientSearchResponse {
  clients: ClientSearchResult[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  facets?: {
    risk_level_counts: Record<'LOW' | 'MEDIUM' | 'HIGH', number>;
    application_status_counts: Record<string, number>;
  };
}

interface ClientSearchResult {
  client_id: string;
  full_name: string;
  email: string;
  phone: string;
  last_activity_at: string;
  summary: {
    applications_count: number;
    total_borrowed_cad: number;
    sar_score: number | null;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  highlights?: Record<string, string[]>;  // Search term highlights
}
```

**Performance Target:** < 300ms (p95)

---

#### `GET /api/admin/client/:id/export`

**Description:** Export client dossier as PDF or CSV.

**Query Parameters:**
- `format`: 'pdf' | 'csv' | 'json' (default: 'pdf')
- `sections`: Comma-separated list of sections to include

**Response:**
- Content-Type: application/pdf | text/csv | application/json
- Content-Disposition: attachment; filename="client-dossier-{id}-{date}.{ext}"

**Performance Target:** < 2000ms (p95)

---

## 🗄️ Database Optimization Plan

### 1. RPC Functions (Server-Side Logic)

#### `get_client_dossier_unified(client_identifier TEXT, include_sections TEXT[])`

**Purpose:** Single DB function that returns complete client dossier as JSONB.

**Benefits:**
- 1 round-trip to DB instead of 15+
- Executes aggregations server-side (faster)
- Returns optimized JSON structure

**Pseudocode:**
```sql
CREATE OR REPLACE FUNCTION get_client_dossier_unified(
  client_identifier TEXT,
  include_sections TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
BEGIN
  -- Step 1: Resolve client identifier
  SELECT resolve_client_id(client_identifier) INTO v_client_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND: %', client_identifier;
  END IF;

  -- Step 2: Build identity layer (always)
  SELECT jsonb_build_object(
    'identity', get_client_identity(v_client_id),
    'summary', get_client_summary(v_client_id)
  ) INTO v_result;

  -- Step 3: Add optional layers
  IF 'timeline' = ANY(include_sections) THEN
    v_result = v_result || jsonb_build_object(
      'timeline', get_client_timeline(v_client_id, 50, 0)
    );
  END IF;

  IF 'applications' = ANY(include_sections) THEN
    v_result = v_result || jsonb_build_object(
      'applications', get_client_applications(v_client_id)
    );
  END IF;

  -- Add metadata
  v_result = v_result || jsonb_build_object(
    '_meta', jsonb_build_object(
      'generated_at', NOW(),
      'query_duration_ms', 0  -- Computed by API layer
    )
  );

  RETURN v_result;
END;
$$;
```

#### `get_client_summary(client_id UUID)`

**Purpose:** Pre-compute all summary metrics (Layer 2).

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION get_client_summary(client_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'applications', (
      SELECT jsonb_build_object(
        'total_count', COUNT(*),
        'approved_count', COUNT(*) FILTER (WHERE status = 'approved'),
        'declined_count', COUNT(*) FILTER (WHERE status = 'declined'),
        'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
        'last_application_date', MAX(created_at)
      )
      FROM loan_applications
      WHERE client_id = $1
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_borrowed_cad', COALESCE(SUM(amount_requested), 0),
        'total_paid_cad', COALESCE(SUM(amount_paid), 0),
        'current_balance_cad', COALESCE(SUM(balance_remaining), 0)
      )
      FROM loan_applications
      WHERE client_id = $1 AND status = 'approved'
    ),
    'banking', (
      SELECT jsonb_build_object(
        'has_ibv_analysis', COUNT(*) > 0,
        'latest_analysis_date', MAX(created_at),
        'sar_score', (
          SELECT score
          FROM analysis_scores
          WHERE analysis_id = ca.id
          ORDER BY created_at DESC
          LIMIT 1
        ),
        'sar_recommendation', (
          SELECT recommendation
          FROM analysis_scores
          WHERE analysis_id = ca.id
          ORDER BY created_at DESC
          LIMIT 1
        )
      )
      FROM client_analyses ca
      WHERE ca.client_email = (SELECT email FROM loan_applications WHERE id = $1 LIMIT 1)
    )
  );
$$;
```

### 2. Materialized Views

#### `mv_client_metrics_summary`

**Purpose:** Pre-aggregate expensive computations (refreshed every 5 min).

**Schema:**
```sql
CREATE MATERIALIZED VIEW mv_client_metrics_summary AS
SELECT
  la.id as client_id,
  la.email,
  la.first_name || ' ' || la.last_name as full_name,

  -- Application metrics
  COUNT(DISTINCT la.id) as applications_count,
  COUNT(*) FILTER (WHERE la.status = 'approved') as approved_count,
  MAX(la.created_at) as last_application_date,

  -- Financial metrics
  COALESCE(SUM(la.amount_requested) FILTER (WHERE la.status = 'approved'), 0) as total_borrowed_cad,
  COALESCE(SUM(qbi.total_paid), 0) as total_paid_cad,

  -- Banking metrics
  MAX(ca.created_at) as latest_analysis_date,
  (
    SELECT score
    FROM analysis_scores ascr
    JOIN client_analyses ca2 ON ascr.analysis_id = ca2.id
    WHERE ca2.client_email = la.email
    ORDER BY ascr.created_at DESC
    LIMIT 1
  ) as sar_score,

  -- Engagement metrics
  COUNT(DISTINCT dl.id) as document_downloads,
  COUNT(DISTINCT em.id) as emails_sent,

  -- Last activity
  GREATEST(
    MAX(la.created_at),
    MAX(ca.created_at),
    MAX(dl.created_at)
  ) as last_activity_at,

  -- Computed at timestamp
  NOW() as computed_at

FROM loan_applications la
LEFT JOIN client_analyses ca ON ca.client_email = la.email
LEFT JOIN quickbooks_invoices qbi ON qbi.customer_email = la.email
LEFT JOIN download_logs dl ON dl.user_email = la.email
LEFT JOIN email_messages em ON em.to_email = la.email

GROUP BY la.id, la.email, la.first_name, la.last_name;

-- Indexes
CREATE UNIQUE INDEX idx_mv_client_metrics_client_id ON mv_client_metrics_summary(client_id);
CREATE INDEX idx_mv_client_metrics_email ON mv_client_metrics_summary(email);
CREATE INDEX idx_mv_client_metrics_last_activity ON mv_client_metrics_summary(last_activity_at DESC);
```

**Refresh Strategy:**
```sql
-- Cron job every 5 minutes
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_metrics_summary;
```

### 3. Indexes (Performance Critical)

```sql
-- Client identifier lookup
CREATE INDEX IF NOT EXISTS idx_loan_applications_email_lower ON loan_applications(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_loan_applications_phone ON loan_applications(phone);

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_client_events_client_id_timestamp ON client_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_events_event_type ON client_events(event_type);

-- Relations queries
CREATE INDEX IF NOT EXISTS idx_client_analyses_email ON client_analyses(client_email);
CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_email ON quickbooks_invoices(customer_email);

-- Search queries (GIN for full-text)
CREATE INDEX IF NOT EXISTS idx_loan_applications_search
ON loan_applications
USING GIN(to_tsvector('french', first_name || ' ' || last_name || ' ' || email));
```

---

## 🚀 Implementation Roadmap

### Phase 1: Database Foundation (Week 1)
- [ ] Create all RPC functions
- [ ] Create materialized views
- [ ] Add missing indexes
- [ ] Test query performance

### Phase 2: API Implementation (Week 2)
- [ ] Implement `/api/admin/client/:id/dossier` endpoint
- [ ] Implement supporting endpoints
- [ ] Add Redis caching layer
- [ ] Write integration tests

### Phase 3: Frontend Integration (Week 3)
- [ ] Update admin dashboard to use new API
- [ ] Remove old N+1 query patterns
- [ ] Add loading states and error handling
- [ ] Performance testing

### Phase 4: Monitoring & Optimization (Week 4)
- [ ] Add performance metrics to telemetry
- [ ] Set up alerts for slow queries
- [ ] Load testing with production data volumes
- [ ] Fine-tune cache TTLs

---

## 📈 Expected Performance Improvements

| Metric | Before (N+1 Queries) | After (Unified API) | Improvement |
|--------|---------------------|---------------------|-------------|
| API calls per page load | 15-20 | 1-2 | 90% reduction |
| Total latency (p95) | 3000-5000ms | 300-500ms | 85% reduction |
| Database queries | 50+ | 1-5 | 90% reduction |
| Bandwidth usage | ~500KB | ~50KB | 90% reduction |
| Cache hit rate | N/A | 60-80% | New capability |

---

## 📚 Related Documents

- `DATAFLOW_CLIENT_DOSSIER.mmd` - Visual representation of data sources
- `DB_VIEWS_AND_FUNCTIONS_PLAN.md` - Detailed DB implementation
- `DB_SCHEMA_INVENTORY.md` - Current database schema
- `API_ROUTE_INVENTORY.md` - Existing API routes

---

**Status:** ✅ Ready for implementation
**Owner:** Technical Lead + Backend Team
**Review Date:** 2026-02-01
