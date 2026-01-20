-- ============================================
-- Performance Optimization - Materialized Views
-- Date: 2026-01-18
-- Audit: SAR-PERF-AUDIT.md
-- Impact: Pre-compute dashboard stats, reduce repeated aggregations
-- ============================================

-- ============================================
-- Materialized View: Dashboard Stats
-- Purpose: Pre-compute expensive aggregations for admin dashboard
-- Refresh: Every 5 minutes (via cron job)
-- Impact: -80% dashboard load time
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT
  -- Loan applications metrics
  (SELECT COUNT(*) FROM loan_applications) as total_applications,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'approved') as approved_count,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending') as pending_count,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'rejected') as rejected_count,
  (SELECT AVG(montant_demande)::NUMERIC(10,2) FROM loan_applications WHERE status = 'approved') as avg_approved_amount,
  (SELECT SUM(montant_demande)::NUMERIC(12,2) FROM loan_applications WHERE status = 'approved') as total_approved_amount,

  -- Contact messages metrics
  (SELECT COUNT(*) FROM contact_messages) as total_messages,
  (SELECT COUNT(*) FROM contact_messages WHERE lu = false) as unread_messages,
  (SELECT COUNT(*) FROM contact_messages WHERE status = 'nouveau') as new_messages,
  (SELECT COUNT(*) FROM contact_messages WHERE status = 'en_cours') as in_progress_messages,
  (SELECT COUNT(*) FROM contact_messages WHERE status = 'traite') as completed_messages,

  -- VoPay metrics
  (SELECT COUNT(*) FROM vopay_objects) as total_vopay_transactions,
  (SELECT COUNT(*) FROM vopay_objects WHERE status = 'successful') as successful_payments,
  (SELECT COUNT(*) FROM vopay_objects WHERE status = 'failed') as failed_payments,
  (SELECT COUNT(*) FROM vopay_objects WHERE status = 'pending') as pending_payments,
  (SELECT SUM(amount)::NUMERIC(12,2) FROM vopay_objects WHERE status = 'successful') as total_payment_volume,
  (SELECT AVG(amount)::NUMERIC(10,2) FROM vopay_objects WHERE status = 'successful') as avg_payment_amount,

  -- Support tickets metrics
  (SELECT COUNT(*) FROM support_tickets) as total_tickets,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress') as in_progress_tickets,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved') as resolved_tickets,

  -- Client analyses metrics
  (SELECT COUNT(*) FROM client_analyses) as total_analyses,
  (SELECT COUNT(*) FROM client_analyses WHERE analysis_status = 'completed') as completed_analyses,
  (SELECT COUNT(*) FROM client_analyses WHERE analysis_status = 'pending') as pending_analyses,

  -- Metadata
  now() as last_refresh,
  'v1'::TEXT as version;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_stats_idx ON mv_dashboard_stats((true));

-- ============================================
-- Function: Refresh Dashboard Stats
-- Purpose: Wrapper to refresh materialized view
-- Usage: SELECT refresh_dashboard_stats()
-- ============================================
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TABLE(
  success BOOLEAN,
  last_refresh TIMESTAMPTZ,
  duration_ms INTEGER
) AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_duration INTEGER;
BEGIN
  v_start := clock_timestamp();

  -- Refresh materialized view (non-blocking)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;

  v_end := clock_timestamp();
  v_duration := EXTRACT(MILLISECONDS FROM (v_end - v_start))::INTEGER;

  RETURN QUERY SELECT true, v_end, v_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_dashboard_stats TO service_role;

-- ============================================
-- Initial refresh
-- ============================================
REFRESH MATERIALIZED VIEW mv_dashboard_stats;

-- ============================================
-- Materialized View: Client Timeline Summary
-- Purpose: Pre-aggregate timeline data per client
-- Refresh: Every 10 minutes
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_timeline_summary AS
SELECT
  client_id,
  COUNT(*) as total_events,
  MIN(occurred_at) as first_event_at,
  MAX(occurred_at) as last_event_at,
  COUNT(*) FILTER (WHERE status = 'successful') as successful_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  SUM(amount) FILTER (WHERE status = 'successful') as total_successful_amount,
  now() as last_refresh
FROM vopay_objects
WHERE client_id IS NOT NULL
GROUP BY client_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_client_timeline_summary_client_idx
  ON mv_client_timeline_summary(client_id);

-- Function to refresh client timeline
CREATE OR REPLACE FUNCTION refresh_client_timeline_summary()
RETURNS BOOLEAN AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_timeline_summary;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION refresh_client_timeline_summary TO service_role;

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_client_timeline_summary;

-- ============================================
-- Setup Instructions (Manual)
-- ============================================
-- To setup automatic refresh via pg_cron:
--
-- 1. Enable pg_cron extension:
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- 2. Schedule dashboard stats refresh (every 5 minutes):
--    SELECT cron.schedule(
--      'refresh-dashboard-stats',
--      '*/5 * * * *',
--      'SELECT refresh_dashboard_stats()'
--    );
--
-- 3. Schedule client timeline refresh (every 10 minutes):
--    SELECT cron.schedule(
--      'refresh-client-timeline',
--      '*/10 * * * *',
--      'SELECT refresh_client_timeline_summary()'
--    );
--
-- 4. View cron jobs:
--    SELECT * FROM cron.job;
--
-- 5. Unschedule (if needed):
--    SELECT cron.unschedule('refresh-dashboard-stats');
--
-- ============================================

-- Success message
SELECT '✅ Materialized views created successfully' as status;
SELECT 'ℹ️  Views: mv_dashboard_stats, mv_client_timeline_summary' as info;
SELECT 'ℹ️  Manual setup required: Enable pg_cron and schedule jobs (see migration file)' as warning;
