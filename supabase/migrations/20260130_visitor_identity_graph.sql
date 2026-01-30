-- Migration: Create visitor_identity_graph view
-- Date: 2026-01-30
-- Purpose: Aggregate all data by visitor_id for complete identity graph

-- ========================================================================
-- 1. DROP EXISTING VIEW (if any)
-- ========================================================================

DROP VIEW IF EXISTS visitor_identity_graph CASCADE;

-- ========================================================================
-- 2. CREATE visitor_identity_graph VIEW
-- ========================================================================

CREATE OR REPLACE VIEW visitor_identity_graph AS
SELECT
  tr.visitor_id,

  -- ===== IDENTITY =====
  -- All IPs used by this visitor
  ARRAY_AGG(DISTINCT tr.ip ORDER BY tr.ip) FILTER (WHERE tr.ip IS NOT NULL) as ips,
  COUNT(DISTINCT tr.ip) FILTER (WHERE tr.ip IS NOT NULL) as unique_ips,

  -- All sessions
  ARRAY_AGG(DISTINCT tr.session_id ORDER BY tr.session_id) FILTER (WHERE tr.session_id IS NOT NULL) as session_ids,
  COUNT(DISTINCT tr.session_id) FILTER (WHERE tr.session_id IS NOT NULL) as unique_sessions,

  -- All visits
  ARRAY_AGG(DISTINCT tr.visit_id ORDER BY tr.visit_id) FILTER (WHERE tr.visit_id IS NOT NULL) as visit_ids,
  COUNT(DISTINCT tr.visit_id) FILTER (WHERE tr.visit_id IS NOT NULL) as unique_visits,

  -- User (if authenticated)
  MAX(tr.user_id) as user_id,

  -- ===== CONVERSION =====
  -- Application (if submitted)
  MAX(app.id) as application_id,
  MAX(app.status) as application_status,
  MAX(app.created_at) as application_submitted_at,

  -- Client (if converted)
  MAX(ca.id) as client_id,
  MAX(ca.email) as client_email,
  MAX(ca.phone) as client_phone,
  MAX(ca.created_at) as client_created_at,

  -- ===== METRICS =====
  COUNT(tr.id) as total_requests,
  COUNT(DISTINCT tr.path) as unique_pages,
  COUNT(DISTINCT DATE(tr.created_at)) as active_days,
  MIN(tr.created_at) as first_seen,
  MAX(tr.created_at) as last_seen,

  -- HTTP stats
  COUNT(*) FILTER (WHERE tr.status BETWEEN 200 AND 299) as status_2xx_count,
  COUNT(*) FILTER (WHERE tr.status BETWEEN 400 AND 499) as status_4xx_count,
  COUNT(*) FILTER (WHERE tr.status >= 500) as status_5xx_count,

  -- Performance
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY tr.duration_ms) as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms) as p95_duration_ms,
  AVG(tr.duration_ms)::int as avg_duration_ms,

  -- Top pages
  (
    SELECT path FROM telemetry_requests
    WHERE visitor_id = tr.visitor_id
    GROUP BY path
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as most_visited_page,

  (
    SELECT path FROM telemetry_requests
    WHERE visitor_id = tr.visitor_id
    ORDER BY created_at ASC
    LIMIT 1
  ) as landing_page,

  -- Device info (from most recent request)
  (
    SELECT meta_redacted FROM telemetry_requests
    WHERE visitor_id = tr.visitor_id
      AND meta_redacted IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) as latest_device_info,

  -- ===== EVIDENCE =====
  -- First & last request evidence
  (
    SELECT jsonb_build_object(
      'trace_id', trace_id,
      'ip', ip,
      'path', path,
      'timestamp', created_at,
      'status', status
    )
    FROM telemetry_requests
    WHERE visitor_id = tr.visitor_id
    ORDER BY created_at ASC
    LIMIT 1
  ) as evidence_first_request,

  (
    SELECT jsonb_build_object(
      'trace_id', trace_id,
      'ip', ip,
      'path', path,
      'timestamp', created_at,
      'status', status
    )
    FROM telemetry_requests
    WHERE visitor_id = tr.visitor_id
    ORDER BY created_at DESC
    LIMIT 1
  ) as evidence_last_request

FROM telemetry_requests tr
LEFT JOIN applications app ON tr.visitor_id = app.visitor_id
LEFT JOIN client_accounts ca ON ca.id = app.client_id

WHERE tr.visitor_id IS NOT NULL

GROUP BY tr.visitor_id;

-- ========================================================================
-- 3. ADD HELPFUL COMMENTS
-- ========================================================================

COMMENT ON VIEW visitor_identity_graph IS
'Complete identity graph aggregated by visitor_id. Links IPs → sessions → users → clients with evidence.';

-- ========================================================================
-- 4. CREATE HELPER FUNCTION: get_visitor_timeline
-- ========================================================================

CREATE OR REPLACE FUNCTION get_visitor_timeline(p_visitor_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (
  trace_id TEXT,
  created_at TIMESTAMPTZ,
  ip TEXT,
  method TEXT,
  path TEXT,
  status INT,
  duration_ms INT,
  region TEXT,
  event_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.trace_id::TEXT,
    tr.created_at,
    tr.ip,
    tr.method,
    tr.path,
    tr.status,
    tr.duration_ms,
    tr.region,
    'request'::TEXT as event_type
  FROM telemetry_requests tr
  WHERE tr.visitor_id = p_visitor_id
  ORDER BY tr.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_visitor_timeline IS
'Get chronological timeline of all requests for a visitor (most recent first)';

-- ========================================================================
-- 5. CREATE HELPER FUNCTION: get_visitor_ips_with_metrics
-- ========================================================================

CREATE OR REPLACE FUNCTION get_visitor_ips_with_metrics(p_visitor_id UUID)
RETURNS TABLE (
  ip TEXT,
  request_count BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  unique_pages BIGINT,
  avg_duration_ms INT,
  evidence_first_request_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.ip,
    COUNT(*) as request_count,
    MIN(tr.created_at) as first_seen,
    MAX(tr.created_at) as last_seen,
    COUNT(DISTINCT tr.path) as unique_pages,
    AVG(tr.duration_ms)::INT as avg_duration_ms,
    MIN(tr.trace_id) as evidence_first_request_id
  FROM telemetry_requests tr
  WHERE tr.visitor_id = p_visitor_id
    AND tr.ip IS NOT NULL
  GROUP BY tr.ip
  ORDER BY request_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_visitor_ips_with_metrics IS
'Get all IPs used by a visitor with metrics for each IP';

-- ========================================================================
-- 6. CREATE HELPER FUNCTION: find_visitor_by_ip
-- ========================================================================

CREATE OR REPLACE FUNCTION find_visitor_by_ip(p_ip TEXT)
RETURNS TABLE (
  visitor_id UUID,
  request_count BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  has_application BOOLEAN,
  has_client BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.visitor_id,
    COUNT(*) as request_count,
    MIN(tr.created_at) as first_seen,
    MAX(tr.created_at) as last_seen,
    EXISTS(SELECT 1 FROM applications WHERE visitor_id = tr.visitor_id) as has_application,
    EXISTS(
      SELECT 1 FROM applications app
      JOIN client_accounts ca ON app.client_id = ca.id
      WHERE app.visitor_id = tr.visitor_id
    ) as has_client
  FROM telemetry_requests tr
  WHERE tr.ip = p_ip
    AND tr.visitor_id IS NOT NULL
  GROUP BY tr.visitor_id
  ORDER BY request_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_visitor_by_ip IS
'Find all visitors who used a specific IP (for multi-visitor detection)';

-- ========================================================================
-- 7. VALIDATION
-- ========================================================================

DO $$
BEGIN
  -- Check if view exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'visitor_identity_graph'
  ) THEN
    RAISE EXCEPTION 'visitor_identity_graph view was not created';
  END IF;

  -- Check if functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_visitor_timeline'
  ) THEN
    RAISE EXCEPTION 'get_visitor_timeline function was not created';
  END IF;

  RAISE NOTICE 'Migration successful: visitor_identity_graph view and helper functions created';
END $$;
