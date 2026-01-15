-- ================================================
-- Table: api_performance_logs
-- Description: Stocke les temps de réponse de toutes les routes API
-- Créé: 2026-01-15
-- ================================================

CREATE TABLE IF NOT EXISTS public.api_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Route info
  route text NOT NULL,
  method text NOT NULL,
  status integer NOT NULL,
  
  -- Performance
  duration_ms integer NOT NULL,
  
  -- Contexte
  phase text NULL,  -- Phase de restructuration (P0, P1, etc.)
  timestamp timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata
  user_agent text NULL,
  ip_address text NULL,
  
  -- Indexes pour queries rapides
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour queries fréquentes
CREATE INDEX IF NOT EXISTS perf_logs_route_idx ON public.api_performance_logs(route);
CREATE INDEX IF NOT EXISTS perf_logs_timestamp_idx ON public.api_performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS perf_logs_phase_idx ON public.api_performance_logs(phase) WHERE phase IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_logs_duration_idx ON public.api_performance_logs(duration_ms);

-- View: Performance moyenne par route
CREATE OR REPLACE VIEW public.vw_route_performance AS
SELECT
  route,
  method,
  COUNT(*) as total_requests,
  AVG(duration_ms)::integer as avg_ms,
  MIN(duration_ms) as min_ms,
  MAX(duration_ms) as max_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::integer as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::integer as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::integer as p99_ms,
  COUNT(*) FILTER (WHERE status >= 400) as error_count,
  MAX(timestamp) as last_request_at
FROM public.api_performance_logs
WHERE timestamp > now() - interval '24 hours'
GROUP BY route, method
ORDER BY avg_ms DESC;

-- View: Performance par phase
CREATE OR REPLACE VIEW public.vw_phase_performance AS
SELECT
  phase,
  COUNT(*) as total_requests,
  AVG(duration_ms)::integer as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::integer as p95_ms,
  COUNT(*) FILTER (WHERE status >= 400) as error_count,
  MIN(timestamp) as phase_start,
  MAX(timestamp) as phase_end
FROM public.api_performance_logs
WHERE phase IS NOT NULL
GROUP BY phase
ORDER BY phase;

-- View: Routes lentes (top 10)
CREATE OR REPLACE VIEW public.vw_slow_routes AS
SELECT
  route,
  method,
  AVG(duration_ms)::integer as avg_ms,
  COUNT(*) as request_count,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::integer as p95_ms
FROM public.api_performance_logs
WHERE timestamp > now() - interval '1 hour'
GROUP BY route, method
HAVING AVG(duration_ms) > 200
ORDER BY avg_ms DESC
LIMIT 10;

-- Cleanup automatique (garder 7 jours)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_performance_logs
  WHERE timestamp < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.api_performance_logs IS 'Logs de performance de toutes les routes API avec millisecondes';
COMMENT ON VIEW public.vw_route_performance IS 'Performance moyenne par route (24h)';
COMMENT ON VIEW public.vw_phase_performance IS 'Performance par phase de restructuration';
COMMENT ON VIEW public.vw_slow_routes IS 'Top 10 routes les plus lentes (1h)';
