-- Migration: Fix session_id Type - Handle View Dependencies
-- Problem: session_id is UUID but middleware sends TEXT (SHA-256 hash)
-- Blocker: visit_timeline view depends on session_id column

-- 1. Drop dependent views
DROP VIEW IF EXISTS visit_timeline CASCADE;

-- 2. Alter session_id type from UUID to TEXT
ALTER TABLE telemetry_events
  ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

COMMENT ON COLUMN telemetry_events.session_id IS 'Session ID (SHA-256 hash from sar_session_id cookie)';

-- 3. Recreate visit_timeline view
CREATE OR REPLACE VIEW visit_timeline AS
SELECT
  tr.visit_id,
  tr.ip,
  tr.client_id,
  tr.session_id,
  tr.user_id,

  -- Request info
  tr.path,
  tr.method,
  tr.status,
  tr.duration_ms,
  tr.created_at as timestamp,
  'http_request' as event_type,

  -- Additional context
  tr.meta_redacted->>'device' as device,
  tr.meta_redacted->>'browser' as browser,
  NULL as event_name,
  NULL as properties

FROM telemetry_requests tr
WHERE tr.visit_id IS NOT NULL
  AND tr.env = 'production'

UNION ALL

SELECT
  te.visit_id,
  NULL as ip,
  NULL as client_id,
  te.session_id,
  NULL as user_id,

  -- Event info
  te.page_path as path,
  NULL as method,
  NULL as status,
  NULL as duration_ms,
  te.created_at as timestamp,
  'client_event' as event_type,

  -- Additional context
  te.device->'screen'->>'width' as device,
  NULL as browser,
  te.event_name,
  te.properties

FROM telemetry_events te
WHERE te.visit_id IS NOT NULL

ORDER BY visit_id, timestamp ASC;

COMMENT ON VIEW visit_timeline IS 'Historique chronologique complet par visite (requests + events mélangés)';

-- 4. Verify
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'telemetry_events' AND column_name = 'session_id') = 'text' THEN
    RAISE NOTICE '✓ session_id successfully changed to TEXT';
  ELSE
    RAISE EXCEPTION '✗ Failed to change session_id type';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'visit_timeline') THEN
    RAISE NOTICE '✓ visit_timeline view recreated successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to recreate visit_timeline view';
  END IF;
END $$;
