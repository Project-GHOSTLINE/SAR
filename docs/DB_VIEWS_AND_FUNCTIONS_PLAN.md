# DATABASE VIEWS & FUNCTIONS PLAN
**SAR Project - Database Optimization for Client Dossier API**
**Date:** 2026-01-23

## 🎯 Objectif

Implémenter des fonctions RPC PostgreSQL et des vues matérialisées pour optimiser les requêtes du dossier client unifié, réduisant la latence de 85% et éliminant les patterns N+1.

---

## 📋 Table of Contents

1. [Helper Functions](#helper-functions)
2. [Core Dossier Functions](#core-dossier-functions)
3. [Materialized Views](#materialized-views)
4. [Indexes](#indexes)
5. [Migration Plan](#migration-plan)
6. [Performance Testing](#performance-testing)

---

## 1. HELPER FUNCTIONS

### 1.1 `resolve_client_id(identifier TEXT)`

**Purpose:** Resolve any client identifier (email, phone, application ID, external ID) to canonical client_id.

```sql
CREATE OR REPLACE FUNCTION resolve_client_id(identifier TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Try as UUID first
  IF identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_client_id
    FROM loan_applications
    WHERE id = identifier::UUID
    LIMIT 1;

    IF FOUND THEN RETURN v_client_id; END IF;
  END IF;

  -- Try as email (case-insensitive)
  SELECT id INTO v_client_id
  FROM loan_applications
  WHERE LOWER(email) = LOWER(identifier)
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN RETURN v_client_id; END IF;

  -- Try as phone
  SELECT id INTO v_client_id
  FROM loan_applications
  WHERE phone = identifier
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN RETURN v_client_id; END IF;

  -- Try external IDs in metadata
  SELECT la.id INTO v_client_id
  FROM loan_applications la
  WHERE
    la.metadata->>'inverite_guid' = identifier
    OR la.metadata->>'vopay_client_id' = identifier
    OR la.metadata->>'quickbooks_customer_id' = identifier
  ORDER BY la.created_at DESC
  LIMIT 1;

  RETURN v_client_id;  -- NULL if not found
END;
$$;

-- Test cases
-- SELECT resolve_client_id('eric.tremblay@email.com');
-- SELECT resolve_client_id('+1-514-555-0123');
-- SELECT resolve_client_id('fe027667-e1f5-4072-95ac-c4ee0f355df4');
```

### 1.2 `get_external_ids(client_id UUID)`

**Purpose:** Extract all external IDs for a client.

```sql
CREATE OR REPLACE FUNCTION get_external_ids(client_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'inverite_guid', (
      SELECT ca.inverite_guid
      FROM client_analyses ca
      JOIN loan_applications la ON ca.client_email = la.email
      WHERE la.id = client_id
      ORDER BY ca.created_at DESC
      LIMIT 1
    ),
    'vopay_client_id', (
      SELECT metadata->>'vopay_client_id'
      FROM loan_applications
      WHERE id = client_id
      LIMIT 1
    ),
    'quickbooks_customer_id', (
      SELECT qbi.customer_id
      FROM quickbooks_invoices qbi
      JOIN loan_applications la ON qbi.customer_email = la.email
      WHERE la.id = client_id
      ORDER BY qbi.created_at DESC
      LIMIT 1
    )
  );
$$;
```

---

## 2. CORE DOSSIER FUNCTIONS

### 2.1 `get_client_identity(client_id UUID)`

**Purpose:** Return core identity layer (Layer 1).

```sql
CREATE OR REPLACE FUNCTION get_client_identity(client_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'client_id', la.id,
    'full_name', la.first_name || ' ' || la.last_name,
    'email', la.email,
    'phone', la.phone,
    'address', jsonb_build_object(
      'street', la.address_street,
      'city', la.address_city,
      'province', la.address_province,
      'postal_code', la.address_postal_code
    ),
    'external_ids', get_external_ids(la.id),
    'created_at', la.created_at,
    'last_activity_at', (
      SELECT MAX(activity_date) FROM (
        SELECT MAX(created_at) as activity_date FROM loan_applications WHERE id = client_id
        UNION ALL
        SELECT MAX(ca.created_at) FROM client_analyses ca
          JOIN loan_applications la2 ON ca.client_email = la2.email
          WHERE la2.id = client_id
        UNION ALL
        SELECT MAX(created_at) FROM client_events WHERE client_id = la.id
        UNION ALL
        SELECT MAX(created_at) FROM download_logs WHERE user_email = la.email
      ) activities
    )
  )
  FROM loan_applications la
  WHERE la.id = client_id
  LIMIT 1;
$$;
```

### 2.2 `get_client_summary(client_id UUID)`

**Purpose:** Return summary metrics layer (Layer 2).

```sql
CREATE OR REPLACE FUNCTION get_client_summary(client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_email TEXT;
  v_result JSONB;
BEGIN
  -- Get client email
  SELECT email INTO v_email FROM loan_applications WHERE id = client_id LIMIT 1;

  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build summary
  SELECT jsonb_build_object(
    'applications', (
      SELECT jsonb_build_object(
        'total_count', COUNT(*),
        'approved_count', COUNT(*) FILTER (WHERE status = 'approved'),
        'declined_count', COUNT(*) FILTER (WHERE status = 'declined'),
        'pending_count', COUNT(*) FILTER (WHERE status = 'pending' OR status = 'under_review'),
        'last_application_date', MAX(created_at)
      )
      FROM loan_applications
      WHERE LOWER(email) = LOWER(v_email)
    ),

    'financial', (
      SELECT jsonb_build_object(
        'total_borrowed_cad', COALESCE(SUM(la.amount_requested) FILTER (WHERE la.status = 'approved'), 0),
        'total_paid_cad', COALESCE(SUM(qbi.total_paid), 0),
        'total_interest_paid_cad', COALESCE(SUM(qbi.total_paid - la.amount_requested) FILTER (WHERE qbi.total_paid > la.amount_requested), 0),
        'current_balance_cad', COALESCE(SUM(qbi.balance_due), 0),
        'next_payment_date', MIN(qbi.due_date) FILTER (WHERE qbi.balance_due > 0 AND qbi.due_date >= CURRENT_DATE),
        'next_payment_amount_cad', (
          SELECT qbi2.balance_due
          FROM quickbooks_invoices qbi2
          WHERE qbi2.customer_email = v_email
            AND qbi2.balance_due > 0
            AND qbi2.due_date >= CURRENT_DATE
          ORDER BY qbi2.due_date ASC
          LIMIT 1
        )
      )
      FROM loan_applications la
      LEFT JOIN quickbooks_invoices qbi ON LOWER(qbi.customer_email) = LOWER(la.email)
      WHERE LOWER(la.email) = LOWER(v_email)
    ),

    'banking', (
      SELECT jsonb_build_object(
        'has_ibv_analysis', COUNT(ca.id) > 0,
        'latest_analysis_date', MAX(ca.created_at),
        'sar_score', (
          SELECT ascr.score
          FROM analysis_scores ascr
          JOIN client_analyses ca2 ON ascr.analysis_id = ca2.id
          WHERE LOWER(ca2.client_email) = LOWER(v_email)
          ORDER BY ascr.created_at DESC
          LIMIT 1
        ),
        'sar_recommendation', (
          SELECT ascr.recommendation
          FROM analysis_scores ascr
          JOIN client_analyses ca2 ON ascr.analysis_id = ca2.id
          WHERE LOWER(ca2.client_email) = LOWER(v_email)
          ORDER BY ascr.created_at DESC
          LIMIT 1
        ),
        'monthly_income_cad', (
          SELECT ascr.monthly_income
          FROM analysis_scores ascr
          JOIN client_analyses ca2 ON ascr.analysis_id = ca2.id
          WHERE LOWER(ca2.client_email) = LOWER(v_email)
          ORDER BY ascr.created_at DESC
          LIMIT 1
        ),
        'dti_ratio', (
          SELECT ascr.dti_ratio
          FROM analysis_scores ascr
          JOIN client_analyses ca2 ON ascr.analysis_id = ca2.id
          WHERE LOWER(ca2.client_email) = LOWER(v_email)
          ORDER BY ascr.created_at DESC
          LIMIT 1
        )
      )
      FROM client_analyses ca
      WHERE LOWER(ca.client_email) = LOWER(v_email)
    ),

    'engagement', (
      SELECT jsonb_build_object(
        'total_logins', COUNT(DISTINCT ce.id) FILTER (WHERE ce.event_type = 'login'),
        'last_login', MAX(ce.created_at) FILTER (WHERE ce.event_type = 'login'),
        'email_open_rate', CASE
          WHEN COUNT(em.id) > 0 THEN
            COUNT(*) FILTER (WHERE em.metadata->>'opened' = 'true')::float / COUNT(em.id)
          ELSE 0
        END,
        'sms_response_rate', CASE
          WHEN COUNT(sms.id) > 0 THEN
            COUNT(*) FILTER (WHERE sms.metadata->>'responded' = 'true')::float / COUNT(sms.id)
          ELSE 0
        END,
        'support_tickets', COUNT(DISTINCT ce.id) FILTER (WHERE ce.event_type = 'support_ticket'),
        'document_downloads', COUNT(dl.id)
      )
      FROM loan_applications la
      LEFT JOIN client_events ce ON ce.client_id = la.id
      LEFT JOIN email_messages em ON LOWER(em.to_email) = LOWER(la.email)
      LEFT JOIN email_messages sms ON LOWER(sms.to_email) = LOWER(la.email) AND sms.message_type = 'sms'
      LEFT JOIN download_logs dl ON LOWER(dl.user_email) = LOWER(la.email)
      WHERE LOWER(la.email) = LOWER(v_email)
    ),

    'risk', (
      WITH latest_score AS (
        SELECT
          ascr.score,
          ascr.recommendation,
          ascr.nsf_count,
          ascr.dti_ratio,
          ascr.created_at
        FROM analysis_scores ascr
        JOIN client_analyses ca ON ascr.analysis_id = ca.id
        WHERE LOWER(ca.client_email) = LOWER(v_email)
        ORDER BY ascr.created_at DESC
        LIMIT 1
      ),
      payment_history AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'paid_on_time') as on_time_payments,
          COUNT(*) FILTER (WHERE status = 'paid_late') as late_payments,
          COUNT(*) as total_payments
        FROM (
          SELECT
            CASE
              WHEN wl.event_type = 'payment_received'
                AND (wl.metadata->>'payment_date')::timestamp <= (wl.metadata->>'due_date')::timestamp
              THEN 'paid_on_time'
              WHEN wl.event_type = 'payment_received'
              THEN 'paid_late'
              ELSE 'unknown'
            END as status
          FROM webhook_logs wl
          WHERE wl.source = 'vopay'
            AND wl.event_type = 'payment_received'
            AND LOWER(wl.metadata->>'client_email') = LOWER(v_email)
        ) payments
      )
      SELECT jsonb_build_object(
        'risk_level',
          CASE
            WHEN ls.score >= 700 AND ls.dti_ratio < 0.35 AND ls.nsf_count = 0 THEN 'LOW'
            WHEN ls.score >= 600 AND ls.dti_ratio < 0.50 THEN 'MEDIUM'
            ELSE 'HIGH'
          END,
        'red_flags_count',
          (CASE WHEN ls.nsf_count > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN ls.dti_ratio > 0.50 THEN 1 ELSE 0 END) +
          (CASE WHEN ph.late_payments > 0 THEN 1 ELSE 0 END),
        'fraud_score', NULL,  -- TODO: Implement fraud detection
        'payment_history_score',
          CASE
            WHEN ph.total_payments > 0
            THEN ROUND((ph.on_time_payments::float / ph.total_payments) * 100)
            ELSE NULL
          END,
        'churn_risk_score', NULL  -- TODO: Implement churn prediction
      )
      FROM latest_score ls
      CROSS JOIN payment_history ph
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

### 2.3 `get_client_timeline(client_id UUID, limit_val INT, offset_val INT)`

**Purpose:** Return paginated client timeline (Layer 3).

```sql
CREATE OR REPLACE FUNCTION get_client_timeline(
  client_id UUID,
  limit_val INT DEFAULT 50,
  offset_val INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'timestamp', created_at,
      'event_type', event_type,
      'event_category', event_category,
      'summary', summary,
      'details', details,
      'source', source,
      'metadata', metadata
    )
    ORDER BY created_at DESC
  )
  FROM (
    SELECT
      id,
      created_at,
      event_type,
      event_category,
      summary,
      details,
      source,
      metadata
    FROM client_events
    WHERE client_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
  ) events;
$$;
```

### 2.4 `get_client_dossier_unified(identifier TEXT, include_sections TEXT[])`

**Purpose:** Main orchestration function - returns complete dossier.

```sql
CREATE OR REPLACE FUNCTION get_client_dossier_unified(
  identifier TEXT,
  include_sections TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_client_id UUID;
  v_result JSONB;
  v_start_time TIMESTAMP;
BEGIN
  v_start_time := clock_timestamp();

  -- Step 1: Resolve client identifier
  v_client_id := resolve_client_id(identifier);

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND' USING
      DETAIL = 'No client found with identifier: ' || identifier,
      HINT = 'Check that the email, phone, or ID is correct';
  END IF;

  -- Step 2: Build base result (always include identity + summary)
  SELECT jsonb_build_object(
    'identity', get_client_identity(v_client_id),
    'summary', get_client_summary(v_client_id)
  ) INTO v_result;

  -- Step 3: Add optional sections
  IF 'timeline' = ANY(include_sections) THEN
    v_result := v_result || jsonb_build_object(
      'timeline', get_client_timeline(v_client_id, 50, 0)
    );
  END IF;

  IF 'applications' = ANY(include_sections) THEN
    v_result := v_result || jsonb_build_object(
      'applications', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'application_number', application_number,
            'status', status,
            'amount_requested', amount_requested,
            'cortex_score', cortex_score,
            'created_at', created_at
          )
          ORDER BY created_at DESC
        )
        FROM loan_applications
        WHERE email = (SELECT email FROM loan_applications WHERE id = v_client_id LIMIT 1)
      )
    );
  END IF;

  IF 'analyses' = ANY(include_sections) THEN
    v_result := v_result || jsonb_build_object(
      'analyses', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ca.id,
            'inverite_guid', ca.inverite_guid,
            'created_at', ca.created_at,
            'accounts_count', jsonb_array_length(ca.raw_data->'accounts'),
            'sar_score', (
              SELECT score FROM analysis_scores
              WHERE analysis_id = ca.id
              ORDER BY created_at DESC
              LIMIT 1
            )
          )
          ORDER BY ca.created_at DESC
        )
        FROM client_analyses ca
        WHERE ca.client_email = (SELECT email FROM loan_applications WHERE id = v_client_id LIMIT 1)
      )
    );
  END IF;

  IF 'transactions' = ANY(include_sections) THEN
    v_result := v_result || jsonb_build_object(
      'transactions', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wl.id,
            'source', wl.source,
            'event_type', wl.event_type,
            'amount', wl.metadata->>'amount',
            'created_at', wl.created_at
          )
          ORDER BY wl.created_at DESC
        )
        FROM webhook_logs wl
        WHERE wl.source IN ('vopay', 'quickbooks')
          AND LOWER(wl.metadata->>'client_email') = LOWER((SELECT email FROM loan_applications WHERE id = v_client_id LIMIT 1))
        LIMIT 100
      )
    );
  END IF;

  IF 'documents' = ANY(include_sections) THEN
    v_result := v_result || jsonb_build_object(
      'documents', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dl.id,
            'file_name', dl.file_name,
            'file_type', dl.file_type,
            'downloaded_at', dl.created_at
          )
          ORDER BY dl.created_at DESC
        )
        FROM download_logs dl
        WHERE LOWER(dl.user_email) = LOWER((SELECT email FROM loan_applications WHERE id = v_client_id LIMIT 1))
        LIMIT 50
      )
    );
  END IF;

  -- Step 4: Add metadata
  v_result := v_result || jsonb_build_object(
    '_meta', jsonb_build_object(
      'generated_at', NOW(),
      'data_freshness_seconds', 0,
      'query_duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time)),
      'cache_hit', false
    )
  );

  RETURN v_result;
END;
$$;

-- Performance test
-- SELECT get_client_dossier_unified('eric.tremblay@email.com', ARRAY['timeline', 'applications']);
```

---

## 3. MATERIALIZED VIEWS

### 3.1 `mv_client_metrics_summary`

**Purpose:** Pre-compute expensive client metrics for fast dashboard queries.

```sql
CREATE MATERIALIZED VIEW mv_client_metrics_summary AS
SELECT
  la.id as client_id,
  la.email,
  la.first_name || ' ' || la.last_name as full_name,
  la.phone,
  la.created_at as client_since,

  -- Application metrics
  COUNT(DISTINCT la2.id) as applications_count,
  COUNT(DISTINCT la2.id) FILTER (WHERE la2.status = 'approved') as approved_count,
  COUNT(DISTINCT la2.id) FILTER (WHERE la2.status = 'declined') as declined_count,
  COUNT(DISTINCT la2.id) FILTER (WHERE la2.status = 'pending' OR la2.status = 'under_review') as pending_count,
  MAX(la2.created_at) as last_application_date,

  -- Financial metrics
  COALESCE(SUM(la2.amount_requested) FILTER (WHERE la2.status = 'approved'), 0) as total_borrowed_cad,
  COALESCE(SUM(qbi.total_paid), 0) as total_paid_cad,
  COALESCE(SUM(qbi.balance_due), 0) as current_balance_cad,

  -- Banking metrics
  (SELECT ca.created_at
   FROM client_analyses ca
   WHERE LOWER(ca.client_email) = LOWER(la.email)
   ORDER BY ca.created_at DESC
   LIMIT 1
  ) as latest_analysis_date,

  (SELECT ascr.score
   FROM analysis_scores ascr
   JOIN client_analyses ca ON ascr.analysis_id = ca.id
   WHERE LOWER(ca.client_email) = LOWER(la.email)
   ORDER BY ascr.created_at DESC
   LIMIT 1
  ) as sar_score,

  (SELECT ascr.recommendation
   FROM analysis_scores ascr
   JOIN client_analyses ca ON ascr.analysis_id = ca.id
   WHERE LOWER(ca.client_email) = LOWER(la.email)
   ORDER BY ascr.created_at DESC
   LIMIT 1
  ) as sar_recommendation,

  -- Engagement metrics
  COUNT(DISTINCT dl.id) as document_downloads,
  COUNT(DISTINCT em.id) as emails_sent,
  COUNT(DISTINCT ce.id) FILTER (WHERE ce.event_type = 'login') as total_logins,
  MAX(ce.created_at) FILTER (WHERE ce.event_type = 'login') as last_login,

  -- Last activity timestamp
  GREATEST(
    MAX(la2.created_at),
    MAX(ca.created_at),
    MAX(dl.created_at),
    MAX(ce.created_at)
  ) as last_activity_at,

  -- Risk indicator
  CASE
    WHEN (SELECT ascr.score
          FROM analysis_scores ascr
          JOIN client_analyses ca ON ascr.analysis_id = ca.id
          WHERE LOWER(ca.client_email) = LOWER(la.email)
          ORDER BY ascr.created_at DESC
          LIMIT 1) >= 700
    THEN 'LOW'
    WHEN (SELECT ascr.score
          FROM analysis_scores ascr
          JOIN client_analyses ca ON ascr.analysis_id = ca.id
          WHERE LOWER(ca.client_email) = LOWER(la.email)
          ORDER BY ascr.created_at DESC
          LIMIT 1) >= 600
    THEN 'MEDIUM'
    ELSE 'HIGH'
  END as risk_level,

  -- Metadata
  NOW() as computed_at

FROM loan_applications la
LEFT JOIN loan_applications la2 ON LOWER(la2.email) = LOWER(la.email)
LEFT JOIN client_analyses ca ON LOWER(ca.client_email) = LOWER(la.email)
LEFT JOIN quickbooks_invoices qbi ON LOWER(qbi.customer_email) = LOWER(la.email)
LEFT JOIN download_logs dl ON LOWER(dl.user_email) = LOWER(la.email)
LEFT JOIN email_messages em ON LOWER(em.to_email) = LOWER(la.email)
LEFT JOIN client_events ce ON ce.client_id = la.id

GROUP BY la.id, la.email, la.first_name, la.last_name, la.phone, la.created_at;

-- Indexes
CREATE UNIQUE INDEX idx_mv_client_metrics_client_id ON mv_client_metrics_summary(client_id);
CREATE INDEX idx_mv_client_metrics_email ON mv_client_metrics_summary(LOWER(email));
CREATE INDEX idx_mv_client_metrics_last_activity ON mv_client_metrics_summary(last_activity_at DESC);
CREATE INDEX idx_mv_client_metrics_sar_score ON mv_client_metrics_summary(sar_score DESC NULLS LAST);
CREATE INDEX idx_mv_client_metrics_risk_level ON mv_client_metrics_summary(risk_level);

-- Search index (full-text)
CREATE INDEX idx_mv_client_metrics_search
ON mv_client_metrics_summary
USING GIN(to_tsvector('french', full_name || ' ' || email || ' ' || COALESCE(phone, '')));

-- Grant permissions
GRANT SELECT ON mv_client_metrics_summary TO authenticated;
```

**Refresh Strategy:**

```sql
-- Manual refresh (takes ~5-10 seconds on 10K clients)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_metrics_summary;

-- Cron job (via Vercel API endpoint: /api/cron/refresh-metrics)
-- Runs every 5 minutes
CREATE OR REPLACE FUNCTION refresh_client_metrics_summary()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_metrics_summary;
END;
$$;
```

### 3.2 `mv_timeline_summary`

**Purpose:** Pre-aggregate timeline event counts for fast filtering.

```sql
CREATE MATERIALIZED VIEW mv_timeline_summary AS
SELECT
  client_id,
  event_category,
  COUNT(*) as event_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  NOW() as computed_at
FROM client_events
GROUP BY client_id, event_category;

-- Indexes
CREATE UNIQUE INDEX idx_mv_timeline_client_category ON mv_timeline_summary(client_id, event_category);

-- Grant permissions
GRANT SELECT ON mv_timeline_summary TO authenticated;
```

---

## 4. INDEXES

### 4.1 Core Table Indexes

```sql
-- ============================================
-- LOAN_APPLICATIONS
-- ============================================
-- Existing indexes (keep)
-- Primary key: loan_applications_pkey on (id)

-- New indexes
CREATE INDEX IF NOT EXISTS idx_loan_applications_email_lower
ON loan_applications(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_loan_applications_phone
ON loan_applications(phone)
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_applications_status
ON loan_applications(status);

CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at
ON loan_applications(created_at DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_loan_applications_fulltext
ON loan_applications
USING GIN(to_tsvector('french', first_name || ' ' || last_name || ' ' || email));

-- Composite index for admin list view
CREATE INDEX IF NOT EXISTS idx_loan_applications_list
ON loan_applications(created_at DESC, status);

-- ============================================
-- CLIENT_EVENTS
-- ============================================
-- Primary key: client_events_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_client_events_client_timestamp
ON client_events(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_events_event_type
ON client_events(event_type);

CREATE INDEX IF NOT EXISTS idx_client_events_category
ON client_events(event_category);

CREATE INDEX IF NOT EXISTS idx_client_events_created_at
ON client_events(created_at DESC);

-- ============================================
-- CLIENT_ANALYSES
-- ============================================
-- Primary key: client_analyses_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_client_analyses_email_lower
ON client_analyses(LOWER(client_email));

CREATE INDEX IF NOT EXISTS idx_client_analyses_guid
ON client_analyses(inverite_guid)
WHERE inverite_guid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_analyses_created_at
ON client_analyses(created_at DESC);

-- ============================================
-- ANALYSIS_SCORES
-- ============================================
-- Primary key: analysis_scores_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_analysis_scores_analysis_id
ON analysis_scores(analysis_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_scores_score
ON analysis_scores(score DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_scores_recommendation
ON analysis_scores(recommendation);

-- ============================================
-- WEBHOOK_LOGS
-- ============================================
-- Primary key: webhook_logs_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source_type
ON webhook_logs(source, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at
ON webhook_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_client_email
ON webhook_logs(LOWER(metadata->>'client_email'))
WHERE metadata->>'client_email' IS NOT NULL;

-- ============================================
-- QUICKBOOKS_INVOICES
-- ============================================
-- Primary key: quickbooks_invoices_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_email_lower
ON quickbooks_invoices(LOWER(customer_email));

CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_balance_due
ON quickbooks_invoices(balance_due)
WHERE balance_due > 0;

CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_due_date
ON quickbooks_invoices(due_date)
WHERE due_date >= CURRENT_DATE;

-- ============================================
-- DOWNLOAD_LOGS
-- ============================================
-- Primary key: download_logs_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_download_logs_email_lower
ON download_logs(LOWER(user_email));

CREATE INDEX IF NOT EXISTS idx_download_logs_created_at
ON download_logs(created_at DESC);

-- ============================================
-- EMAIL_MESSAGES
-- ============================================
-- Primary key: email_messages_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_email_messages_to_email_lower
ON email_messages(LOWER(to_email));

CREATE INDEX IF NOT EXISTS idx_email_messages_created_at
ON email_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_messages_message_type
ON email_messages(message_type);

-- ============================================
-- TELEMETRY_REQUESTS
-- ============================================
-- Primary key: telemetry_requests_pkey on (id)

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_path
ON telemetry_requests(path);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_created_at
ON telemetry_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_status_code
ON telemetry_requests(status_code);

-- Time-series partitioning (optional, for high-volume telemetry)
-- TODO: Consider partitioning telemetry_requests by month if volume exceeds 1M rows
```

### 4.2 Index Usage Analysis

**Query to check index usage:**

```sql
-- Check index hit rate
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- Identify unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 5. MIGRATION PLAN

### Phase 1: Create Helper Functions (Week 1, Day 1-2)

```sql
-- File: migrations/001_create_helper_functions.sql
BEGIN;

-- Create resolve_client_id function
CREATE OR REPLACE FUNCTION resolve_client_id(identifier TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$ ... $$;

-- Create get_external_ids function
CREATE OR REPLACE FUNCTION get_external_ids(client_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$ ... $$;

COMMIT;
```

**Testing:**
```sql
-- Test resolve_client_id
SELECT resolve_client_id('eric.tremblay@email.com');
SELECT resolve_client_id('+1-514-555-0123');
SELECT resolve_client_id('fe027667-e1f5-4072-95ac-c4ee0f355df4');
SELECT resolve_client_id('nonexistent@example.com');  -- Should return NULL

-- Test get_external_ids
SELECT get_external_ids('fe027667-e1f5-4072-95ac-c4ee0f355df4');
```

### Phase 2: Create Core Functions (Week 1, Day 3-4)

```sql
-- File: migrations/002_create_core_functions.sql
BEGIN;

CREATE OR REPLACE FUNCTION get_client_identity(client_id UUID) ...
CREATE OR REPLACE FUNCTION get_client_summary(client_id UUID) ...
CREATE OR REPLACE FUNCTION get_client_timeline(...) ...
CREATE OR REPLACE FUNCTION get_client_dossier_unified(...) ...

COMMIT;
```

**Testing:**
```sql
-- Test each function
SELECT get_client_identity('fe027667-e1f5-4072-95ac-c4ee0f355df4');
SELECT get_client_summary('fe027667-e1f5-4072-95ac-c4ee0f355df4');
SELECT get_client_timeline('fe027667-e1f5-4072-95ac-c4ee0f355df4', 10, 0);
SELECT get_client_dossier_unified('eric.tremblay@email.com', ARRAY['timeline']);
```

### Phase 3: Create Indexes (Week 1, Day 5)

```sql
-- File: migrations/003_create_indexes.sql
-- Run during low-traffic period (overnight)
BEGIN;

-- Create all indexes concurrently
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_applications_email_lower ...
-- ... (all indexes from section 4.1)

COMMIT;
```

**Verification:**
```sql
-- Check that all indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('loan_applications', 'client_events', 'client_analyses')
ORDER BY tablename, indexname;
```

### Phase 4: Create Materialized Views (Week 2, Day 1-2)

```sql
-- File: migrations/004_create_materialized_views.sql
BEGIN;

CREATE MATERIALIZED VIEW mv_client_metrics_summary AS ...
CREATE MATERIALIZED VIEW mv_timeline_summary AS ...

-- Create indexes on materialized views
CREATE UNIQUE INDEX idx_mv_client_metrics_client_id ...

COMMIT;
```

**Initial Population:**
```sql
-- Populate materialized views (takes ~10-30 seconds)
REFRESH MATERIALIZED VIEW mv_client_metrics_summary;
REFRESH MATERIALIZED VIEW mv_timeline_summary;
```

### Phase 5: Set Up Cron Job (Week 2, Day 3)

**Create Vercel cron endpoint:**

```typescript
// File: src/app/api/cron/refresh-metrics/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Refresh materialized views
  await supabase.rpc('refresh_client_metrics_summary');

  return Response.json({ success: true, refreshed_at: new Date().toISOString() });
}
```

**Configure in `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-metrics",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Phase 6: Rollback Plan

```sql
-- File: migrations/rollback_all.sql
-- Execute in reverse order if needed

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_timeline_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_client_metrics_summary;

-- Drop indexes (non-breaking, can leave if needed)
DROP INDEX IF EXISTS idx_loan_applications_email_lower;
-- ... (all custom indexes)

-- Drop functions
DROP FUNCTION IF EXISTS get_client_dossier_unified(TEXT, TEXT[]);
DROP FUNCTION IF EXISTS get_client_timeline(UUID, INT, INT);
DROP FUNCTION IF EXISTS get_client_summary(UUID);
DROP FUNCTION IF EXISTS get_client_identity(UUID);
DROP FUNCTION IF EXISTS get_external_ids(UUID);
DROP FUNCTION IF EXISTS resolve_client_id(TEXT);
```

---

## 6. PERFORMANCE TESTING

### 6.1 Benchmark Queries

**Before optimization (N+1 pattern):**

```sql
-- Measure query time
EXPLAIN ANALYZE
SELECT * FROM loan_applications WHERE email = 'eric.tremblay@email.com';

-- Expected: 15-20 separate queries, total ~500-1000ms
```

**After optimization (unified function):**

```sql
-- Measure query time
EXPLAIN ANALYZE
SELECT get_client_dossier_unified('eric.tremblay@email.com', ARRAY['timeline', 'applications']);

-- Target: < 200ms (p95)
```

### 6.2 Load Testing Script

```sql
-- Test with 100 random clients
DO $$
DECLARE
  v_email TEXT;
  v_start TIMESTAMP;
  v_end TIMESTAMP;
  v_duration_ms NUMERIC;
BEGIN
  FOR v_email IN (
    SELECT email FROM loan_applications ORDER BY RANDOM() LIMIT 100
  ) LOOP
    v_start := clock_timestamp();

    PERFORM get_client_dossier_unified(v_email, ARRAY['timeline']);

    v_end := clock_timestamp();
    v_duration_ms := EXTRACT(MILLISECONDS FROM (v_end - v_start));

    RAISE NOTICE 'Client: %, Duration: %ms', v_email, v_duration_ms;
  END LOOP;
END $$;
```

### 6.3 Performance Assertions

```sql
-- Assert: 95% of queries complete in < 500ms
WITH query_times AS (
  SELECT
    EXTRACT(MILLISECONDS FROM (v_end - v_start)) as duration_ms
  FROM ... -- Load test results
)
SELECT
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_ms,
  CASE
    WHEN PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) < 500 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as test_result
FROM query_times;
```

---

## 📚 Related Documents

- `ORCHESTRATION_API_SPEC.md` - API endpoint specifications
- `DATAFLOW_CLIENT_DOSSIER.mmd` - Visual data flow diagram
- `DB_SCHEMA_INVENTORY.md` - Current database schema
- `DATAFLOW_HEALTH_SIGNALS.md` - Query performance monitoring

---

**Status:** ✅ Ready for implementation
**Owner:** Backend Team + DBA
**Review Date:** 2026-02-01
**Estimated Effort:** 2 weeks (1 developer)
