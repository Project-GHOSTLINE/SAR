-- Migration: Add visitor_id to telemetry and applications tables
-- Date: 2026-01-30
-- Purpose: Enable visitor tracking across sessions and IPs

-- ========================================================================
-- 1. ADD visitor_id COLUMN TO TELEMETRY TABLES
-- ========================================================================

-- Add to telemetry_requests
ALTER TABLE telemetry_requests
ADD COLUMN IF NOT EXISTS visitor_id UUID;

COMMENT ON COLUMN telemetry_requests.visitor_id IS
'First-party visitor ID from sar_visitor_id cookie (30 day persistence)';

-- Add to telemetry_events
ALTER TABLE telemetry_events
ADD COLUMN IF NOT EXISTS visitor_id UUID;

COMMENT ON COLUMN telemetry_events.visitor_id IS
'First-party visitor ID from sar_visitor_id cookie (30 day persistence)';

-- ========================================================================
-- 2. ADD visitor_id TO APPLICATIONS (Conversion Tracking)
-- ========================================================================

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS visitor_id UUID;

COMMENT ON COLUMN applications.visitor_id IS
'Visitor ID captured at application submission for attribution';

-- Add to client_accounts (optional, for full graph)
ALTER TABLE client_accounts
ADD COLUMN IF NOT EXISTS visitor_id UUID;

COMMENT ON COLUMN client_accounts.visitor_id IS
'Visitor ID captured at account creation for attribution';

-- ========================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ========================================================================

-- Index on telemetry_requests.visitor_id (main query path)
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_visitor_id
ON telemetry_requests(visitor_id)
WHERE visitor_id IS NOT NULL;

-- Index on telemetry_events.visitor_id
CREATE INDEX IF NOT EXISTS idx_telemetry_events_visitor_id
ON telemetry_events(visitor_id)
WHERE visitor_id IS NOT NULL;

-- Index on applications.visitor_id
CREATE INDEX IF NOT EXISTS idx_applications_visitor_id
ON applications(visitor_id)
WHERE visitor_id IS NOT NULL;

-- Index on client_accounts.visitor_id
CREATE INDEX IF NOT EXISTS idx_client_accounts_visitor_id
ON client_accounts(visitor_id)
WHERE visitor_id IS NOT NULL;

-- Composite index for visitor journey queries
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_visitor_created
ON telemetry_requests(visitor_id, created_at DESC)
WHERE visitor_id IS NOT NULL;

-- ========================================================================
-- 4. UPDATE EXISTING DATA (OPTIONAL - Backfill)
-- ========================================================================

-- Note: Existing rows will have visitor_id = NULL
-- This is expected - we only track new visitors going forward
-- If you want to backfill based on session_id or IP, you can do it here
-- But it's not necessary for the system to work

-- Example backfill (commented out - only if needed):
-- UPDATE telemetry_requests
-- SET visitor_id = gen_random_uuid()
-- WHERE visitor_id IS NULL
--   AND session_id IS NOT NULL
--   AND created_at > NOW() - INTERVAL '7 days';

-- ========================================================================
-- 5. VALIDATION QUERIES
-- ========================================================================

-- Check if columns exist
DO $$
BEGIN
  -- Verify telemetry_requests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_requests'
    AND column_name = 'visitor_id'
  ) THEN
    RAISE EXCEPTION 'visitor_id column not added to telemetry_requests';
  END IF;

  -- Verify telemetry_events
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_events'
    AND column_name = 'visitor_id'
  ) THEN
    RAISE EXCEPTION 'visitor_id column not added to telemetry_events';
  END IF;

  -- Verify applications
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications'
    AND column_name = 'visitor_id'
  ) THEN
    RAISE EXCEPTION 'visitor_id column not added to applications';
  END IF;

  RAISE NOTICE 'Migration successful: visitor_id columns added to all tables';
END $$;
