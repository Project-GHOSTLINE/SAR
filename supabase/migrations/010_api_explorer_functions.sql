/**
 * API Explorer Functions
 *
 * Fonctions SQL pour alimenter le dashboard API Explorer
 */

-- Fonction: get_api_summary
-- Retourne un résumé des stats par route depuis telemetry_requests
CREATE OR REPLACE FUNCTION get_api_summary(days_back INT DEFAULT 30)
RETURNS TABLE (
  method TEXT,
  path TEXT,
  hits BIGINT,
  avg_ms NUMERIC,
  p95_ms NUMERIC,
  errors BIGINT,
  error_rate_pct NUMERIC,
  avg_db_calls NUMERIC,
  p95_db_ms NUMERIC,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.method::TEXT,
    tr.path::TEXT,
    COUNT(*) AS hits,
    ROUND(AVG(tr.duration_ms)) AS avg_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms) AS p95_ms,
    SUM(CASE WHEN tr.status >= 400 THEN 1 ELSE 0 END) AS errors,
    ROUND(100.0 * SUM(CASE WHEN tr.status >= 400 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS error_rate_pct,
    ROUND(AVG(tr.db_call_count)) AS avg_db_calls,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.db_total_ms) AS p95_db_ms,
    MAX(tr.created_at) AS last_seen
  FROM telemetry_requests tr
  WHERE tr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY tr.method, tr.path
  ORDER BY hits DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: get_route_errors
-- Top erreurs par route
CREATE OR REPLACE FUNCTION get_route_errors(
  p_method TEXT,
  p_path_pattern TEXT,
  days_back INT DEFAULT 30
)
RETURNS TABLE (
  error_code TEXT,
  error_message_redacted TEXT,
  occurrences BIGINT,
  last_seen TIMESTAMPTZ,
  sample_trace_ids TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(tr.error_code, 'unknown')::TEXT,
    tr.error_message_redacted::TEXT,
    COUNT(*) AS occurrences,
    MAX(tr.created_at) AS last_seen,
    ARRAY_AGG(tr.trace_id ORDER BY tr.created_at DESC)::TEXT[] AS sample_trace_ids
  FROM telemetry_requests tr
  WHERE tr.method = p_method
    AND tr.path LIKE p_path_pattern
    AND tr.status >= 400
    AND tr.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY tr.error_code, tr.error_message_redacted
  ORDER BY occurrences DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: get_live_requests
-- Dernières requêtes (feed live)
CREATE OR REPLACE FUNCTION get_live_requests(limit_count INT DEFAULT 200)
RETURNS TABLE (
  trace_id TEXT,
  created_at TIMESTAMPTZ,
  method TEXT,
  path TEXT,
  status INT,
  duration_ms INT,
  db_call_count INT,
  db_total_ms INT,
  error_code TEXT,
  error_message_redacted TEXT,
  visitor_id TEXT,
  session_id TEXT,
  client_id TEXT,
  vercel_region TEXT,
  ip_hash TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.trace_id::TEXT,
    tr.created_at,
    tr.method::TEXT,
    tr.path::TEXT,
    tr.status,
    tr.duration_ms,
    tr.db_call_count,
    tr.db_total_ms,
    tr.error_code::TEXT,
    tr.error_message_redacted::TEXT,
    tr.visitor_id::TEXT,
    tr.session_id::TEXT,
    tr.client_id::TEXT,
    tr.vercel_region::TEXT,
    tr.ip_hash::TEXT
  FROM telemetry_requests tr
  ORDER BY tr.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: get_route_timeline
-- Timeline d'une route (dernières 24h, groupé par heure)
CREATE OR REPLACE FUNCTION get_route_timeline(
  p_method TEXT,
  p_path_pattern TEXT,
  hours_back INT DEFAULT 24
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  hits BIGINT,
  avg_duration_ms NUMERIC,
  errors BIGINT,
  p95_duration_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('hour', tr.created_at) AS hour,
    COUNT(*) AS hits,
    ROUND(AVG(tr.duration_ms)) AS avg_duration_ms,
    SUM(CASE WHEN tr.status >= 400 THEN 1 ELSE 0 END) AS errors,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms) AS p95_duration_ms
  FROM telemetry_requests tr
  WHERE tr.method = p_method
    AND tr.path LIKE p_path_pattern
    AND tr.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
  GROUP BY DATE_TRUNC('hour', tr.created_at)
  ORDER BY hour ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour performance (si pas déjà existants)
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_method_path
  ON telemetry_requests(method, path);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_created_status
  ON telemetry_requests(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_trace_id
  ON telemetry_requests(trace_id)
  WHERE trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_trace_id
  ON telemetry_spans(trace_id, start_time);

-- Commentaires
COMMENT ON FUNCTION get_api_summary IS
  'Retourne les stats agrégées par route (hits, latency, erreurs, DB calls) pour les N derniers jours';

COMMENT ON FUNCTION get_route_errors IS
  'Retourne les erreurs les plus fréquentes pour une route donnée';

COMMENT ON FUNCTION get_live_requests IS
  'Retourne le feed live des dernières requêtes API';

COMMENT ON FUNCTION get_route_timeline IS
  'Retourne la timeline (par heure) d''une route sur les N dernières heures';
