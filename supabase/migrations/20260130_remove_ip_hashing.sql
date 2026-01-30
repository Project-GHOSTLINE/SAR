-- Migration: Remove IP Hashing - Track Clear IPs Only
-- User requirement: "non esti je veux rien savoir des hash , tu track all fuckin ip no rules"

-- 1. Recreate ip_to_seo_segment view using clear IP instead of ip_hash
DROP VIEW IF EXISTS ip_to_seo_segment CASCADE;

CREATE OR REPLACE VIEW ip_to_seo_segment AS
SELECT
  tr.ip as ip,  -- Use clear IP, not ip_hash

  -- Time range
  MIN(tr.created_at) as first_seen,
  MAX(tr.created_at) as last_seen,

  -- Landing page (first path visited)
  (ARRAY_AGG(tr.path ORDER BY tr.created_at ASC) FILTER (WHERE tr.path IS NOT NULL))[1] as landing_page,

  -- Most visited page
  MODE() WITHIN GROUP (ORDER BY tr.path) as most_visited_page,

  -- Activity metrics
  COUNT(*) as total_requests,
  COUNT(DISTINCT DATE_TRUNC('day', tr.created_at)) as active_days,
  COUNT(DISTINCT tr.path) as unique_pages,

  -- Device info (most common)
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'device') as device,

  -- UTM Attribution (most common)
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_source') as utm_source,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_medium') as utm_medium,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_campaign') as utm_campaign,

  -- Performance metrics
  AVG(tr.duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p95_duration_ms,

  -- Status code counts
  COUNT(*) FILTER (WHERE tr.status >= 200 AND tr.status < 300) as success_count,
  COUNT(*) FILTER (WHERE tr.status >= 400 AND tr.status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE tr.status >= 500) as server_error_count

FROM telemetry_requests tr
WHERE tr.ip IS NOT NULL
  AND tr.env = 'production'
  AND tr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY tr.ip;

-- 2. Update indexes to use clear IP instead of ip_hash
DROP INDEX IF EXISTS idx_telemetry_ip_created;
DROP INDEX IF EXISTS idx_telemetry_ip_path;

CREATE INDEX IF NOT EXISTS idx_telemetry_ip_created
  ON telemetry_requests(ip, created_at DESC)
  WHERE ip IS NOT NULL AND env = 'production';

CREATE INDEX IF NOT EXISTS idx_telemetry_ip_path
  ON telemetry_requests(ip, path)
  WHERE ip IS NOT NULL AND env = 'production';

COMMENT ON VIEW ip_to_seo_segment IS 'IP activity aggregation using CLEAR IPs (no hashing) per user requirement';
COMMENT ON INDEX idx_telemetry_ip_created IS 'Index on clear IP for timeline queries';
COMMENT ON INDEX idx_telemetry_ip_path IS 'Index on clear IP for path analysis';
