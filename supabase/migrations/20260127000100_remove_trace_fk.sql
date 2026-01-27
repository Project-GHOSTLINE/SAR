-- ============================================================================
-- MIGRATION: Remove trace_id FK constraint (optional correlation)
-- DATE: 2026-01-27
-- REASON: trace_id is optional for client-side events (not all events have
--         corresponding telemetry_requests). The FK constraint was causing
--         insert failures when trace_id was passed but didn't exist in
--         telemetry_requests table.
-- IMPACT: trace_id remains as a correlation field but no longer enforces FK
-- ============================================================================

-- Drop the FK constraint on trace_id
ALTER TABLE public.client_telemetry_events
DROP CONSTRAINT IF EXISTS fk_trace;

-- Add comment to document the optional nature
COMMENT ON COLUMN public.client_telemetry_events.trace_id IS
'Optional UUID for correlation with telemetry_requests table (server-side traces).
This field is NULL for client-side events that have no corresponding server trace.
No FK constraint - used for best-effort correlation only.';
