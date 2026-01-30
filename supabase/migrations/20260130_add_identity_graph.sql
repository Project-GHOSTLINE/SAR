-- Migration: Add Identity Graph columns to telemetry_requests
-- This enables linking IP → visit_id → session_id → user_id → client_id

-- 1. Add identity columns to telemetry_requests
ALTER TABLE telemetry_requests
ADD COLUMN IF NOT EXISTS ip TEXT,
ADD COLUMN IF NOT EXISTS visit_id UUID,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS ga4_client_id TEXT,
ADD COLUMN IF NOT EXISTS ga4_session_id TEXT;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_ip ON telemetry_requests(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_visit_id ON telemetry_requests(visit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON telemetry_requests(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_id ON telemetry_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_client_id ON telemetry_requests(client_id, created_at DESC);

-- 3. Create telemetry_events table (client-side events tracking)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID, -- Lié au cookie client
  session_id UUID,
  event_name TEXT, -- page_view, click, form_start, form_submit, etc.
  page_path TEXT,
  referrer TEXT,
  utm JSONB, -- {source, medium, campaign, term, content}
  device JSONB, -- {viewport, screen, devicePixelRatio}
  properties JSONB, -- Custom event properties
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for telemetry_events
CREATE INDEX IF NOT EXISTS idx_telemetry_events_visit_id ON telemetry_events(visit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_name ON telemetry_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_page_path ON telemetry_events(page_path, created_at DESC);

-- 5. Add foreign key for user_id (if auth.users exists)
-- Note: Uncomment if you have auth.users table
-- ALTER TABLE telemetry_requests
-- ADD CONSTRAINT fk_telemetry_user_id
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Backfill IP from ip_hash (if possible - this depends on your setup)
-- Note: Since ip_hash is anonymized, we can't reverse it
-- New requests will populate ip directly from middleware

-- 7. Add comments for documentation
COMMENT ON TABLE telemetry_events IS 'Client-side events tracking (page views, clicks, form interactions)';
COMMENT ON COLUMN telemetry_events.visit_id IS 'Links to telemetry_requests.visit_id for correlation';
COMMENT ON COLUMN telemetry_events.utm IS 'UTM parameters: {source, medium, campaign, term, content}';
COMMENT ON COLUMN telemetry_events.device IS 'Device info: {viewport, screen, devicePixelRatio}';
COMMENT ON COLUMN telemetry_events.properties IS 'Custom event properties (flexible JSONB)';

-- 8. Add comment for telemetry_requests columns
COMMENT ON COLUMN telemetry_requests.ip IS 'IP address in clear text (sensitive - admin only access)';
COMMENT ON COLUMN telemetry_requests.visit_id IS 'UUID generated client-side, persisted in cookie for 30 days';
COMMENT ON COLUMN telemetry_requests.session_id IS 'SAR session ID (optional)';
COMMENT ON COLUMN telemetry_requests.user_id IS 'Authenticated user ID (if logged in)';
COMMENT ON COLUMN telemetry_requests.client_id IS 'Client dossier ID (if application submitted)';
COMMENT ON COLUMN telemetry_requests.ga4_client_id IS 'GA4 client ID from _ga cookie (if available)';
COMMENT ON COLUMN telemetry_requests.ga4_session_id IS 'GA4 session ID (if available)';

-- 9. Create view: visit_dossier
-- One row per visit_id with aggregated stats
CREATE OR REPLACE VIEW visit_dossier AS
SELECT
  visit_id,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  -- IP (take most common)
  MODE() WITHIN GROUP (ORDER BY ip) as ip,
  -- Landing page (first path)
  (ARRAY_AGG(path ORDER BY created_at ASC))[1] as landing_page,
  -- Stats
  COUNT(*) as total_requests,
  COUNT(DISTINCT path) as unique_pages,
  COUNT(DISTINCT date_trunc('day', created_at)) as active_days,
  -- Latency
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::int as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  -- Errors
  COUNT(*) FILTER (WHERE status >= 200 AND status < 400) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  -- Identity links
  MODE() WITHIN GROUP (ORDER BY session_id) as session_id,
  MODE() WITHIN GROUP (ORDER BY user_id) as user_id,
  MODE() WITHIN GROUP (ORDER BY client_id) as client_id,
  MODE() WITHIN GROUP (ORDER BY ga4_client_id) as ga4_client_id,
  -- Meta (take most recent)
  (ARRAY_AGG(meta_redacted ORDER BY created_at DESC))[1] as meta
FROM telemetry_requests
WHERE visit_id IS NOT NULL
  AND env = 'production'
GROUP BY visit_id;

-- 10. Create enhanced view: ip_dossier_v2
-- One row per IP with visit-level insights
CREATE OR REPLACE VIEW ip_dossier_v2 AS
SELECT
  ip,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(*) as total_requests,
  COUNT(DISTINCT visit_id) as distinct_visits,
  COUNT(DISTINCT session_id) as distinct_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as distinct_users,
  COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) as distinct_clients,
  COUNT(DISTINCT path) as unique_pages,
  COUNT(DISTINCT date_trunc('day', created_at)) as active_days,
  -- Latency
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  -- Errors
  COUNT(*) FILTER (WHERE status >= 200 AND status < 400) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  -- Landing pages (top 3)
  (
    SELECT jsonb_agg(jsonb_build_object('path', path, 'count', count))
    FROM (
      SELECT path, COUNT(*) as count
      FROM telemetry_requests t2
      WHERE t2.ip = t1.ip
        AND t2.env = 'production'
      GROUP BY path
      ORDER BY count DESC
      LIMIT 3
    ) top_paths
  ) as top_landing_pages
FROM telemetry_requests t1
WHERE ip IS NOT NULL
  AND env = 'production'
GROUP BY ip;

COMMENT ON VIEW visit_dossier IS 'Aggregated stats per visit_id (one visit = one user session)';
COMMENT ON VIEW ip_dossier_v2 IS 'Enhanced IP dossier with visit-level insights';
