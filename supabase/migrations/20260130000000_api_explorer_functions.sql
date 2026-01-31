-- Function: get_api_summary
-- Returns aggregated stats per route from telemetry_requests

CREATE OR REPLACE FUNCTION get_api_summary(days_back integer DEFAULT 30)
RETURNS TABLE (
  method text,
  path text,
  hits bigint,
  avg_ms numeric,
  p95_ms numeric,
  errors bigint,
  error_rate_pct numeric,
  avg_db_calls numeric,
  p95_db_ms numeric,
  last_seen timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.method,
    tr.path,
    COUNT(*) as hits,
    ROUND(AVG(tr.duration_ms)) as avg_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms) as p95_ms,
    SUM(CASE WHEN tr.status >= 400 THEN 1 ELSE 0 END) as errors,
    ROUND(
      100.0 * SUM(CASE WHEN tr.status >= 400 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
      2
    ) as error_rate_pct,
    ROUND(AVG(tr.db_call_count)) as avg_db_calls,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.db_total_ms) as p95_db_ms,
    MAX(tr.created_at) as last_seen
  FROM telemetry_requests tr
  WHERE tr.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY tr.method, tr.path
  ORDER BY hits DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql;

-- Index pour améliorer les performances des queries API Explorer
CREATE INDEX IF NOT EXISTS idx_telemetry_requests_method_path
ON telemetry_requests(method, path);

CREATE INDEX IF NOT EXISTS idx_telemetry_requests_trace_id
ON telemetry_requests(trace_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_trace_id_time
ON telemetry_spans(trace_id, start_time);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_visitor_session
ON webhook_logs(visitor_id, session_id);

COMMENT ON FUNCTION get_api_summary IS
'Returns aggregated API stats from telemetry_requests for API Explorer dashboard';
