-- Migration: NSA-Level Fraud Detection System
-- Collecte TOUT pour détecter fraude, bots, patterns suspects

-- 1. Table: fraud_signals (Signaux de fraude en temps réel)
CREATE TABLE IF NOT EXISTS fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT,
  visit_id UUID,
  signal_type TEXT, -- bot_pattern, velocity_abuse, geo_mismatch, etc.
  severity TEXT, -- low, medium, high, critical
  score INTEGER, -- 0-100
  evidence JSONB, -- Preuves
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX idx_fraud_signals_ip ON fraud_signals(ip, detected_at DESC);
CREATE INDEX idx_fraud_signals_visit_id ON fraud_signals(visit_id, detected_at DESC);
CREATE INDEX idx_fraud_signals_severity ON fraud_signals(severity, detected_at DESC);
CREATE INDEX idx_fraud_signals_unresolved ON fraud_signals(resolved, detected_at DESC) WHERE resolved = false;

-- 2. View: network_correlation (Corrélation complète IP → Requests → Events → SEO)
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

CREATE INDEX idx_network_correlation_ip ON telemetry_requests(ip) WHERE visit_id IS NOT NULL;

-- 3. View: fraud_detection_live (Détection en temps réel)
CREATE OR REPLACE VIEW fraud_detection_live AS
SELECT
  nc.*,

  -- Risk Scores
  CASE
    -- Bot Pattern: Requests sans events
    WHEN nc.total_events = 0 AND nc.total_requests > 5 THEN 90
    -- Velocity Abuse: Trop de requêtes par minute
    WHEN nc.requests_per_minute > 30 THEN 80
    -- Low Correlation: Ratio events/requests anormal
    WHEN nc.correlation_score < 30 AND nc.total_requests > 10 THEN 70
    -- Suspicious: Pas de form_submit malgré form_start
    WHEN nc.form_starts > 0 AND nc.form_submits = 0 AND nc.session_duration_seconds > 60 THEN 60
    -- Multiple errors
    WHEN nc.server_errors + nc.client_errors > 10 THEN 50
    ELSE 10
  END as fraud_score,

  -- Flags
  nc.total_events = 0 AND nc.total_requests > 5 as is_likely_bot,
  nc.requests_per_minute > 30 as is_velocity_abuse,
  nc.correlation_score < 30 as is_low_correlation,
  nc.server_errors > 5 as has_many_errors,

  -- Classification
  CASE
    WHEN nc.total_events = 0 AND nc.total_requests > 5 THEN 'BOT'
    WHEN nc.requests_per_minute > 30 THEN 'SCRAPER'
    WHEN nc.correlation_score < 30 THEN 'SUSPICIOUS'
    WHEN nc.form_submits > 0 THEN 'CONVERTER'
    WHEN nc.page_views > 3 THEN 'ENGAGED'
    ELSE 'VISITOR'
  END as classification

FROM network_correlation nc;

-- 4. View: ip_risk_profile (Profil de risque par IP)
CREATE OR REPLACE VIEW ip_risk_profile AS
SELECT
  ip,
  COUNT(DISTINCT visit_id) as total_visits,
  AVG(fraud_score)::int as avg_fraud_score,
  MAX(fraud_score) as max_fraud_score,
  COUNT(*) FILTER (WHERE is_likely_bot) as bot_visits,
  COUNT(*) FILTER (WHERE is_velocity_abuse) as velocity_abuse_visits,
  COUNT(*) FILTER (WHERE classification = 'BOT') as bot_count,
  COUNT(*) FILTER (WHERE classification = 'SCRAPER') as scraper_count,
  COUNT(*) FILTER (WHERE classification = 'SUSPICIOUS') as suspicious_count,
  COUNT(*) FILTER (WHERE classification = 'CONVERTER') as converter_count,
  MIN(first_seen) as first_seen,
  MAX(last_seen) as last_seen,

  -- Risk Level
  CASE
    WHEN AVG(fraud_score) > 70 THEN 'CRITICAL'
    WHEN AVG(fraud_score) > 50 THEN 'HIGH'
    WHEN AVG(fraud_score) > 30 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_level

FROM fraud_detection_live
GROUP BY ip;

-- 5. View: suspicious_patterns (Patterns suspects en temps réel)
CREATE OR REPLACE VIEW suspicious_patterns AS
SELECT
  'No Events Generated' as pattern,
  COUNT(*) as occurrences,
  ARRAY(SELECT DISTINCT ip FROM fraud_detection_live WHERE is_likely_bot LIMIT 10) as sample_ips
FROM fraud_detection_live
WHERE is_likely_bot
HAVING COUNT(*) > 0

UNION ALL

SELECT
  'Velocity Abuse' as pattern,
  COUNT(*) as occurrences,
  ARRAY(SELECT DISTINCT ip FROM fraud_detection_live WHERE is_velocity_abuse LIMIT 10) as sample_ips
FROM fraud_detection_live
WHERE is_velocity_abuse
HAVING COUNT(*) > 0

UNION ALL

SELECT
  'Low Correlation' as pattern,
  COUNT(*) as occurrences,
  ARRAY(SELECT DISTINCT ip FROM fraud_detection_live WHERE is_low_correlation LIMIT 10) as sample_ips
FROM fraud_detection_live
WHERE is_low_correlation
HAVING COUNT(*) > 0

UNION ALL

SELECT
  'Multiple Errors' as pattern,
  COUNT(*) as occurrences,
  ARRAY(SELECT DISTINCT ip FROM fraud_detection_live WHERE has_many_errors LIMIT 10) as sample_ips
FROM fraud_detection_live
WHERE has_many_errors
HAVING COUNT(*) > 0;

-- 6. Function: detect_fraud_signals (Trigger pour détecter fraude automatiquement)
CREATE OR REPLACE FUNCTION detect_fraud_signals()
RETURNS TRIGGER AS $$
BEGIN
  -- Si nouvelle requête, vérifier si patterns suspects
  IF NEW.visit_id IS NOT NULL THEN
    -- Vérifier velocity abuse (>30 req/min)
    INSERT INTO fraud_signals (ip, visit_id, signal_type, severity, score, evidence)
    SELECT
      NEW.ip,
      NEW.visit_id,
      'velocity_abuse',
      'high',
      80,
      jsonb_build_object(
        'requests_per_minute', COUNT(*) / NULLIF(COUNT(DISTINCT DATE_TRUNC('minute', created_at)), 0),
        'total_requests', COUNT(*),
        'time_window', '1 minute'
      )
    FROM telemetry_requests
    WHERE visit_id = NEW.visit_id
    GROUP BY visit_id
    HAVING COUNT(*) / NULLIF(COUNT(DISTINCT DATE_TRUNC('minute', created_at)), 0) > 30
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur telemetry_requests
DROP TRIGGER IF EXISTS trigger_detect_fraud ON telemetry_requests;
CREATE TRIGGER trigger_detect_fraud
  AFTER INSERT ON telemetry_requests
  FOR EACH ROW
  EXECUTE FUNCTION detect_fraud_signals();

-- 7. Commentaires
COMMENT ON TABLE fraud_signals IS 'Signaux de fraude détectés automatiquement en temps réel';
COMMENT ON VIEW network_correlation IS 'Corrélation complète IP → HTTP Requests → Client Events → SEO';
COMMENT ON VIEW fraud_detection_live IS 'Détection de fraude en temps réel avec scores et classifications';
COMMENT ON VIEW ip_risk_profile IS 'Profil de risque agrégé par IP';
COMMENT ON VIEW suspicious_patterns IS 'Patterns suspects détectés (bots, scrapers, velocity abuse)';
