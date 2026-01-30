-- Migration: Fix session_id Type Mismatch
-- Problem: session_id is UUID but middleware sends SHA-256 hash (TEXT)
-- Error: invalid input syntax for type uuid

-- 1. Change session_id from UUID to TEXT to accept SHA-256 hashes
ALTER TABLE telemetry_events
  ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- 2. Update comment
COMMENT ON COLUMN telemetry_events.session_id IS 'Session ID (SHA-256 hash from sar_session_id cookie)';

-- 3. Verify change
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'telemetry_events'
      AND column_name = 'session_id') = 'text' THEN
    RAISE NOTICE '✓ session_id successfully changed to TEXT';
  ELSE
    RAISE EXCEPTION '✗ session_id type change failed';
  END IF;
END $$;
