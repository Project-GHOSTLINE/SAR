-- Migration: Fix session_id Type in BOTH Tables
-- Problem: session_id is UUID but middleware sends TEXT (SHA-256 hash)
-- Affected: telemetry_requests AND telemetry_events

-- 1. Drop all dependent views
DROP VIEW IF EXISTS visit_timeline CASCADE;
DROP VIEW IF EXISTS visit_dossier CASCADE;
DROP VIEW IF EXISTS network_correlation CASCADE;
DROP VIEW IF EXISTS fraud_detection_live CASCADE;
DROP VIEW IF EXISTS device_profiles CASCADE;
DROP VIEW IF EXISTS ip_risk_profile CASCADE;
DROP VIEW IF EXISTS suspicious_patterns CASCADE;

-- 2. Alter session_id in BOTH tables
ALTER TABLE telemetry_requests
  ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

ALTER TABLE telemetry_events
  ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- 3. Add comments
COMMENT ON COLUMN telemetry_requests.session_id IS 'Session ID (SHA-256 hash from sar_session_id cookie)';
COMMENT ON COLUMN telemetry_events.session_id IS 'Session ID (SHA-256 hash from sar_session_id cookie)';

-- 4. Recreate visit_timeline view (requests + events merged)
CREATE OR REPLACE VIEW visit_timeline AS
SELECT
  tr.visit_id, tr.ip, tr.client_id, tr.session_id, tr.user_id,
  tr.path, tr.method, tr.status, tr.duration_ms,
  tr.created_at as timestamp, 'http_request' as event_type,
  tr.meta_redacted->>'device' as device,
  tr.meta_redacted->>'browser' as browser,
  NULL as event_name, NULL as properties
FROM telemetry_requests tr
WHERE tr.visit_id IS NOT NULL AND tr.env = 'production'
UNION ALL
SELECT
  te.visit_id, NULL as ip, NULL as client_id, te.session_id, NULL as user_id,
  te.page_path as path, NULL as method, NULL as status, NULL as duration_ms,
  te.created_at as timestamp, 'client_event' as event_type,
  te.device->'screen'->>'width' as device, NULL as browser,
  te.event_name, te.properties
FROM telemetry_events te
WHERE te.visit_id IS NOT NULL
ORDER BY visit_id, timestamp ASC;

-- 5. Recreate visit_dossier view (aggregated per visit)
CREATE OR REPLACE VIEW visit_dossier AS
SELECT
  ip, visit_id,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(*) as total_requests,
  COUNT(DISTINCT path) as unique_pages,
  (ARRAY_AGG(path ORDER BY created_at ASC))[1] as landing_page,
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  COUNT(*) FILTER (WHERE status >= 200 AND status < 300) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  MODE() WITHIN GROUP (ORDER BY session_id) as session_id,
  MODE() WITHIN GROUP (ORDER BY user_id) as user_id,
  MODE() WITHIN GROUP (ORDER BY client_id) as client_id
FROM telemetry_requests
WHERE visit_id IS NOT NULL AND env = 'production'
GROUP BY ip, visit_id;

-- 6. Note: Other views will be recreated by their respective migrations
-- network_correlation, fraud_detection_live, device_profiles, etc.
-- Run: supabase/migrations/20260130_add_device_profiles.sql after this

RAISE NOTICE '✓ session_id changed to TEXT in both tables';
RAISE NOTICE '✓ visit_timeline and visit_dossier recreated';
RAISE NOTICE '⚠ Run device_profiles migration to recreate fraud views';
