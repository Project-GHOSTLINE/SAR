-- Migration: Add Device Profiles to Fraud Detection
-- Enrichit les vues avec device/browser/OS info pour profiling complet

-- 1. Drop existing views (required to change column structure)
DROP VIEW IF EXISTS fraud_detection_live CASCADE;
DROP VIEW IF EXISTS network_correlation CASCADE;

-- 2. Recreate network_correlation with device info
CREATE OR REPLACE VIEW network_correlation AS
SELECT
  -- Identité
  tr.ip,
  tr.visit_id,
  tr.session_id,
  tr.user_id,
  tr.client_id,

  -- Network Layer (HTTP Requests)
  COUNT(DISTINCT tr.id) as total_requests,
  COUNT(DISTINCT tr.path) as unique_paths,
  AVG(tr.duration_ms)::int as avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p95_latency_ms,
  COUNT(*) FILTER (WHERE tr.status >= 500) as server_errors,
  COUNT(*) FILTER (WHERE tr.status >= 400 AND tr.status < 500) as client_errors,

  -- Client Layer (Events)
  COUNT(DISTINCT te.id) as total_events,
  COUNT(*) FILTER (WHERE te.event_name = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE te.event_name = 'click') as clicks,
  COUNT(*) FILTER (WHERE te.event_name = 'form_start') as form_starts,
  COUNT(*) FILTER (WHERE te.event_name = 'form_submit') as form_submits,

  -- Device Profile (from meta_redacted)
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'device') as device_type,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'browser') as browser,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'browser_version') as browser_version,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'os') as os,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'os_version') as os_version,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->'viewport'->>'width') as viewport_width,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->'viewport'->>'height') as viewport_height,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'user_agent') as user_agent,

  -- Device info from telemetry_events (if available)
  MODE() WITHIN GROUP (ORDER BY te.device->'screen'->>'width') as screen_width,
  MODE() WITHIN GROUP (ORDER BY te.device->'screen'->>'height') as screen_height,
  MODE() WITHIN GROUP (ORDER BY (te.device->>'devicePixelRatio')::text) as device_pixel_ratio,

  -- Attribution (SEO Context)
  MODE() WITHIN GROUP (ORDER BY te.utm->>'source') as utm_source,
  MODE() WITHIN GROUP (ORDER BY te.utm->>'medium') as utm_medium,
  MODE() WITHIN GROUP (ORDER BY te.referrer) as referrer,
  (ARRAY_AGG(tr.path ORDER BY tr.created_at ASC))[1] as landing_page,

  -- Temporal
  MIN(tr.created_at) as first_seen,
  MAX(tr.created_at) as last_seen,
  EXTRACT(EPOCH FROM (MAX(tr.created_at) - MIN(tr.created_at)))::int as session_duration_seconds,

  -- Behavioral Signals
  COUNT(DISTINCT DATE_TRUNC('minute', tr.created_at)) as active_minutes,
  COUNT(*) / NULLIF(COUNT(DISTINCT DATE_TRUNC('minute', tr.created_at)), 0) as requests_per_minute,

  -- Correlation Score (requests vs events ratio - should be ~1:1 for humans)
  CASE
    WHEN COUNT(DISTINCT te.id) = 0 THEN 0 -- No events = bot
    ELSE ROUND((COUNT(DISTINCT te.id)::numeric / NULLIF(COUNT(DISTINCT tr.id), 0)) * 100)
  END as correlation_score

FROM telemetry_requests tr
LEFT JOIN telemetry_events te ON te.visit_id = tr.visit_id
WHERE tr.env = 'production'
  AND tr.visit_id IS NOT NULL
GROUP BY tr.ip, tr.visit_id, tr.session_id, tr.user_id, tr.client_id;

-- 3. Recreate fraud_detection_live
CREATE OR REPLACE VIEW fraud_detection_live AS
SELECT
  nc.*,
  CASE
    WHEN nc.total_events = 0 AND nc.total_requests > 5 THEN 90
    WHEN nc.requests_per_minute > 30 THEN 80
    WHEN nc.correlation_score < 30 AND nc.total_requests > 10 THEN 70
    WHEN nc.form_starts > 0 AND nc.form_submits = 0 AND nc.session_duration_seconds > 60 THEN 60
    WHEN nc.server_errors + nc.client_errors > 10 THEN 50
    ELSE 10
  END as fraud_score,
  nc.total_events = 0 AND nc.total_requests > 5 as is_likely_bot,
  nc.requests_per_minute > 30 as is_velocity_abuse,
  nc.correlation_score < 30 as is_low_correlation,
  nc.server_errors > 5 as has_many_errors,
  CASE
    WHEN nc.total_events = 0 AND nc.total_requests > 5 THEN 'BOT'
    WHEN nc.requests_per_minute > 30 THEN 'SCRAPER'
    WHEN nc.correlation_score < 30 THEN 'SUSPICIOUS'
    WHEN nc.form_submits > 0 THEN 'CONVERTER'
    WHEN nc.page_views > 3 THEN 'ENGAGED'
    ELSE 'VISITOR'
  END as classification
FROM network_correlation nc;

-- 4. Create device_profiles view (One row per unique device)
CREATE OR REPLACE VIEW device_profiles AS
SELECT
  visit_id,
  ip,
  client_id,
  user_id,

  -- Device Identity
  device_type,
  browser,
  browser_version,
  os,
  os_version,

  -- Screen Info
  viewport_width,
  viewport_height,
  screen_width,
  screen_height,
  device_pixel_ratio,

  -- Device Label (human-readable)
  CASE
    WHEN device_type = 'mobile' AND os = 'iOS' THEN
      CONCAT('iPhone', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'mobile' AND os = 'Android' THEN
      CONCAT('Android Phone', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'tablet' AND os = 'iOS' THEN
      CONCAT('iPad', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'tablet' AND os = 'Android' THEN
      CONCAT('Android Tablet', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'desktop' AND os = 'macOS' THEN
      CONCAT('Mac', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'desktop' AND os = 'Windows' THEN
      CONCAT('Windows PC', COALESCE(' ' || os_version, ''))
    WHEN device_type = 'desktop' AND os = 'Linux' THEN
      'Linux Desktop'
    ELSE COALESCE(device_type, 'Unknown Device')
  END as device_label,

  -- Browser Label
  CONCAT(
    COALESCE(browser, 'Unknown Browser'),
    COALESCE(' ' || browser_version, '')
  ) as browser_label,

  -- Activity
  total_requests,
  total_events,
  page_views,
  form_starts,
  form_submits,
  unique_paths,

  -- Session Info
  first_seen,
  last_seen,
  session_duration_seconds,

  -- Fraud
  correlation_score,
  classification,
  fraud_score

FROM fraud_detection_live;

-- 5. Create visit_timeline view (Full browsing history per visit)
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

-- 6. Create client_device_history view (All devices used by a client)
CREATE OR REPLACE VIEW client_device_history AS
SELECT
  c.id as client_id,
  c.name as client_name,
  c.email as client_email,

  dp.visit_id,
  dp.ip,
  dp.device_label,
  dp.browser_label,
  dp.os,
  dp.screen_width,
  dp.screen_height,

  dp.first_seen,
  dp.last_seen,
  dp.total_requests,
  dp.page_views,
  dp.form_submits,

  dp.fraud_score,
  dp.classification

FROM device_profiles dp
INNER JOIN clients c ON c.id = dp.client_id
ORDER BY c.name, dp.first_seen DESC;

COMMENT ON VIEW device_profiles IS 'Profil complet par device: iPhone d''Anthony, MacBook de Marie, etc.';
COMMENT ON VIEW visit_timeline IS 'Historique chronologique complet par visite (requests + events)';
COMMENT ON VIEW client_device_history IS 'Tous les devices utilisés par chaque client nommé';
