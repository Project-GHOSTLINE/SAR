-- ============================================================================
-- TELEMETRY SYSTEM - DATAFLOW HEALTH MONITORING
-- Date: 2026-01-22
-- Purpose: Full observability stack for SAR application
-- ============================================================================

-- ============================================================================
-- TABLE 1: telemetry_requests
-- Purpose: Track all incoming requests (API, webhooks, cron)
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tracing (core)
  trace_id UUID NOT NULL UNIQUE,
  parent_trace_id UUID,  -- For nested/child requests

  -- Request metadata
  method TEXT NOT NULL,  -- GET, POST, PUT, DELETE, PATCH
  path TEXT NOT NULL,    -- /api/admin/messages, /api/webhooks/vopay
  status INTEGER,        -- HTTP status code (200, 404, 500, etc.)
  duration_ms INTEGER,   -- Total request duration in milliseconds

  -- Source context
  source TEXT NOT NULL,  -- 'web', 'webhook', 'cron', 'internal'
  env TEXT NOT NULL,     -- 'production', 'development', 'preview'

  -- Client context (anonymized for privacy)
  ip_hash TEXT,          -- SHA256(IP + salt) - 16 chars
  ua_hash TEXT,          -- SHA256(User-Agent + salt) - 16 chars
  region TEXT,           -- Vercel region (iad1, sfo1, cdg1, etc.)

  -- Auth context (if authenticated)
  user_id UUID,          -- User ID if authenticated
  role TEXT,             -- 'admin', 'user', 'anonymous'

  -- Error tracking
  error_code TEXT,       -- 'APP_ERROR_001', 'DB_TIMEOUT', 'VALIDATION_FAILED'
  error_message_redacted TEXT,  -- Error message with PII removed

  -- Performance metadata
  bytes_in INTEGER,      -- Request body size
  bytes_out INTEGER,     -- Response body size
  db_call_count INTEGER DEFAULT 0,  -- Number of DB queries
  db_total_ms INTEGER DEFAULT 0,     -- Total DB time

  -- Vercel integration
  vercel_id TEXT,        -- Vercel request ID (if available)
  vercel_region TEXT,    -- Vercel edge region

  -- Metadata (extensible, privacy-safe)
  meta_redacted JSONB    -- Additional context (no PII/secrets)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_trace_id
  ON telemetry_requests(trace_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_created_at
  ON telemetry_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_path
  ON telemetry_requests(path);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_status
  ON telemetry_requests(status);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_source
  ON telemetry_requests(source);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_env
  ON telemetry_requests(env);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_duration
  ON telemetry_requests(duration_ms DESC)
  WHERE duration_ms IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_error
  ON telemetry_requests(error_code)
  WHERE error_code IS NOT NULL;

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_env_created_status
  ON telemetry_requests(env, created_at DESC, status);

-- ============================================================================
-- TABLE 2: telemetry_spans
-- Purpose: Track sub-operations within a request (DB queries, external APIs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to parent request
  trace_id UUID NOT NULL,
  parent_span_id UUID,  -- For nested spans (span-within-span)

  -- Span identification
  span_name TEXT NOT NULL,     -- 'db_query', 'external_api', 'webhook_process'
  span_type TEXT NOT NULL,     -- 'db', 'external', 'webhook', 'internal', 'cache'
  target TEXT NOT NULL,        -- Table name / Provider / Route / Cache key

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,        -- 'success', 'error', 'timeout', 'cached'

  -- Operation context
  operation TEXT,              -- 'SELECT', 'INSERT', 'UPDATE', 'GET', 'POST'
  row_count INTEGER,           -- For DB: rows affected/returned
  bytes_in INTEGER,            -- Request payload size
  bytes_out INTEGER,           -- Response payload size

  -- Retry logic tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER,
  retry_reason TEXT,           -- 'timeout', 'rate_limit', 'server_error'

  -- Error tracking
  error_type TEXT,             -- 'NetworkError', 'TimeoutError', 'ValidationError'
  error_message_redacted TEXT, -- Error message (PII removed)
  error_stack_trace TEXT,      -- Stack trace (optional, dev only)

  -- Performance metrics (for external APIs)
  dns_ms INTEGER,              -- DNS resolution time
  tls_ms INTEGER,              -- TLS handshake time
  ttfb_ms INTEGER,             -- Time to first byte
  download_ms INTEGER,         -- Download time

  -- Metadata
  meta_redacted JSONB,         -- Additional context (provider-specific data)

  -- Foreign key
  FOREIGN KEY (trace_id) REFERENCES telemetry_requests(trace_id) ON DELETE CASCADE
);

-- Indexes for span queries
CREATE INDEX IF NOT EXISTS idx_telemetry_spans_trace_id
  ON telemetry_spans(trace_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_created_at
  ON telemetry_spans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_span_type
  ON telemetry_spans(span_type);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_target
  ON telemetry_spans(target);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_duration
  ON telemetry_spans(duration_ms DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_status
  ON telemetry_spans(status);

-- Composite index for slow operation detection
CREATE INDEX IF NOT EXISTS idx_telemetry_spans_type_duration
  ON telemetry_spans(span_type, duration_ms DESC, created_at DESC);

-- ============================================================================
-- TABLE 3: telemetry_security
-- Purpose: Track security checks and validation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to request
  trace_id UUID NOT NULL,

  -- Security check identification
  check_name TEXT NOT NULL,    -- 'webhook_signature', 'replay_protection', 'rate_limit'
  result TEXT NOT NULL,        -- 'pass', 'fail', 'error', 'skip'
  severity TEXT NOT NULL,      -- 'low', 'medium', 'high', 'critical'

  -- Check details (PRIVACY-SAFE - no secrets/PII)
  details_redacted JSONB,      -- Check-specific metadata

  -- Action taken
  action_taken TEXT,           -- 'blocked', 'allowed', 'logged', 'alerted'
  blocked_reason TEXT,         -- If blocked: reason

  -- Context
  source TEXT,                 -- 'webhook', 'api', 'middleware'
  provider TEXT,               -- 'vopay', 'quickbooks', 'internal'

  -- Foreign key
  FOREIGN KEY (trace_id) REFERENCES telemetry_requests(trace_id) ON DELETE CASCADE
);

-- Indexes for security dashboard
CREATE INDEX IF NOT EXISTS idx_telemetry_security_trace_id
  ON telemetry_security(trace_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_security_created_at
  ON telemetry_security(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_security_check_name
  ON telemetry_security(check_name);

CREATE INDEX IF NOT EXISTS idx_telemetry_security_result
  ON telemetry_security(result);

CREATE INDEX IF NOT EXISTS idx_telemetry_security_severity
  ON telemetry_security(severity);

-- Failed checks index (critical for security monitoring)
CREATE INDEX IF NOT EXISTS idx_telemetry_security_failures
  ON telemetry_security(created_at DESC, severity)
  WHERE result = 'fail';

-- ============================================================================
-- TABLE 4: telemetry_alerts
-- Purpose: Aggregate and track threshold-based alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Alert identification
  alert_key TEXT NOT NULL,     -- 'high_error_rate_api_vopay', 'slow_db_queries'
  severity TEXT NOT NULL,      -- 'low', 'medium', 'high', 'critical'
  state TEXT NOT NULL,         -- 'open', 'acknowledged', 'closed'

  -- Timing
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,        -- User who acknowledged
  closed_at TIMESTAMPTZ,
  closed_by TEXT,              -- User who closed

  -- Context for investigation
  sample_trace_id UUID,        -- Example trace to investigate
  summary TEXT NOT NULL,       -- Human-readable summary
  occurrence_count INTEGER DEFAULT 1,

  -- Threshold information
  threshold_value NUMERIC,     -- Configured threshold
  current_value NUMERIC,       -- Current measured value
  threshold_type TEXT,         -- 'error_rate', 'latency_p95', 'count'

  -- Notification tracking
  notified_at TIMESTAMPTZ,
  notification_channels JSONB, -- ['email', 'slack']

  -- Metadata
  meta_redacted JSONB,         -- Alert-specific context

  -- Unique constraint per alert key (prevent duplicates)
  UNIQUE(alert_key, state) WHERE state = 'open'
);

-- Indexes for alert dashboard
CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_alert_key
  ON telemetry_alerts(alert_key);

CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_state
  ON telemetry_alerts(state);

CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_severity
  ON telemetry_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_last_seen
  ON telemetry_alerts(last_seen_at DESC);

-- Open alerts index (most important for dashboard)
CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_open
  ON telemetry_alerts(created_at DESC, severity)
  WHERE state = 'open';

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Real-time request rate (last 5 minutes)
CREATE OR REPLACE VIEW vw_telemetry_request_rate AS
SELECT
  COUNT(*) / 5.0 AS requests_per_minute,
  COUNT(*) FILTER (WHERE status >= 400) AS errors_total,
  (COUNT(*) FILTER (WHERE status >= 400)::float / NULLIF(COUNT(*), 0) * 100) AS error_rate_pct,
  AVG(duration_ms) AS avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_duration_ms
FROM telemetry_requests
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Top slow operations (last hour)
CREATE OR REPLACE VIEW vw_telemetry_slow_operations AS
SELECT
  span_type,
  target,
  operation,
  COUNT(*) AS occurrence_count,
  AVG(duration_ms) AS avg_duration_ms,
  MAX(duration_ms) AS max_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_duration_ms
FROM telemetry_spans
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND duration_ms > 100  -- Only slow operations
GROUP BY span_type, target, operation
ORDER BY p95_duration_ms DESC
LIMIT 20;

-- Security check failures (last 24h)
CREATE OR REPLACE VIEW vw_telemetry_security_failures AS
SELECT
  check_name,
  severity,
  COUNT(*) AS failure_count,
  MAX(created_at) AS last_failure_at,
  array_agg(DISTINCT provider) AS affected_providers
FROM telemetry_security
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND result = 'fail'
GROUP BY check_name, severity
ORDER BY failure_count DESC;

-- Active alerts summary
CREATE OR REPLACE VIEW vw_telemetry_active_alerts AS
SELECT
  alert_key,
  severity,
  summary,
  occurrence_count,
  first_seen_at,
  last_seen_at,
  EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 3600 AS hours_open
FROM telemetry_alerts
WHERE state = 'open'
ORDER BY severity DESC, last_seen_at DESC;

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE telemetry_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (for API writes)
CREATE POLICY "Service role full access" ON telemetry_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON telemetry_spans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON telemetry_security
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON telemetry_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Authenticated users (admin) can read (for dashboard)
CREATE POLICY "Authenticated read access" ON telemetry_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON telemetry_spans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON telemetry_security
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read access" ON telemetry_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- ============================================================================

-- Function: Cleanup old telemetry data (retention policy)
CREATE OR REPLACE FUNCTION cleanup_telemetry_data(retention_days INTEGER DEFAULT 30)
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT
) AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  deleted_requests BIGINT;
  deleted_spans BIGINT;
  deleted_security BIGINT;
  deleted_alerts BIGINT;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Delete old requests (cascade deletes spans and security checks)
  DELETE FROM telemetry_requests WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_requests = ROW_COUNT;

  -- Delete closed alerts older than 90 days
  DELETE FROM telemetry_alerts
  WHERE state = 'closed'
    AND closed_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_alerts = ROW_COUNT;

  -- Return results
  RETURN QUERY
  SELECT 'telemetry_requests'::TEXT, deleted_requests
  UNION ALL
  SELECT 'telemetry_alerts'::TEXT, deleted_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get trace timeline (all spans for a trace)
CREATE OR REPLACE FUNCTION get_trace_timeline(p_trace_id UUID)
RETURNS TABLE(
  type TEXT,
  id UUID,
  name TEXT,
  start_time TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Request (root)
  SELECT
    'request'::TEXT,
    r.id,
    r.method || ' ' || r.path AS name,
    r.created_at,
    r.duration_ms,
    r.status::TEXT,
    jsonb_build_object(
      'source', r.source,
      'role', r.role,
      'error', r.error_message_redacted,
      'bytes_out', r.bytes_out
    )
  FROM telemetry_requests r
  WHERE r.trace_id = p_trace_id

  UNION ALL

  -- Spans
  SELECT
    'span'::TEXT,
    s.id,
    s.span_name || ' → ' || s.target AS name,
    s.start_time,
    s.duration_ms,
    s.status,
    jsonb_build_object(
      'span_type', s.span_type,
      'operation', s.operation,
      'attempt', s.attempt_number,
      'error', s.error_message_redacted
    )
  FROM telemetry_spans s
  WHERE s.trace_id = p_trace_id

  ORDER BY start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE telemetry_requests IS 'Tracks all incoming HTTP requests with tracing context';
COMMENT ON TABLE telemetry_spans IS 'Tracks sub-operations within requests (DB, external APIs, etc.)';
COMMENT ON TABLE telemetry_security IS 'Security check results (webhook validation, rate limiting, etc.)';
COMMENT ON TABLE telemetry_alerts IS 'Aggregated threshold-based alerts';

COMMENT ON FUNCTION cleanup_telemetry_data IS 'Cleanup old telemetry data based on retention policy';
COMMENT ON FUNCTION get_trace_timeline IS 'Get complete timeline for a trace_id (request + all spans)';

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- No seed data needed for telemetry tables

-- ============================================================================
-- VERIFY INSTALLATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Telemetry system installed successfully!';
  RAISE NOTICE 'Tables: telemetry_requests, telemetry_spans, telemetry_security, telemetry_alerts';
  RAISE NOTICE 'Views: vw_telemetry_request_rate, vw_telemetry_slow_operations, vw_telemetry_security_failures, vw_telemetry_active_alerts';
  RAISE NOTICE 'Functions: cleanup_telemetry_data(), get_trace_timeline()';
END $$;
