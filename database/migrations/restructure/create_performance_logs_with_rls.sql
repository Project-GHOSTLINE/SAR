-- ================================================
-- SAR Performance Monitoring System
-- Table + Views + RLS Policies
-- Créé: 2026-01-15
-- ================================================

-- Table principale
CREATE TABLE IF NOT EXISTS public.api_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  method text NOT NULL,
  status integer NOT NULL,
  duration_ms integer NOT NULL,
  phase text NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_agent text NULL,
  ip_address text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS perf_logs_route_idx ON public.api_performance_logs(route);
CREATE INDEX IF NOT EXISTS perf_logs_timestamp_idx ON public.api_performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS perf_logs_phase_idx ON public.api_performance_logs(phase) WHERE phase IS NOT NULL;
CREATE INDEX IF NOT EXISTS perf_logs_duration_idx ON public.api_performance_logs(duration_ms);

-- View: Performance moyenne par route (24h)
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

-- ================================================
-- RLS (Row Level Security)
-- ================================================

-- Activer RLS sur la table
ALTER TABLE public.api_performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Permettre lecture publique (anon key)
CREATE POLICY "Allow public read access to performance logs"
ON public.api_performance_logs
FOR SELECT
TO anon
USING (true);

-- Policy 2: Permettre lecture authentifiée
CREATE POLICY "Allow authenticated read access to performance logs"
ON public.api_performance_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Permettre écriture avec service_role seulement
CREATE POLICY "Allow service_role to insert performance logs"
ON public.api_performance_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- ================================================
-- Fonction de cleanup automatique
-- ================================================

CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.api_performance_logs
  WHERE timestamp < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Données de test (optionnel)
-- ================================================

-- Insérer quelques données de test pour visualisation
INSERT INTO public.api_performance_logs (route, method, status, duration_ms, timestamp)
VALUES
  ('/api/admin/messages', 'GET', 200, 23, now() - interval '1 hour'),
  ('/api/admin/messages', 'GET', 200, 28, now() - interval '2 hours'),
  ('/api/admin/messages', 'GET', 200, 19, now() - interval '3 hours'),
  ('/api/admin/support/tickets', 'GET', 200, 45, now() - interval '1 hour'),
  ('/api/admin/support/tickets', 'GET', 200, 52, now() - interval '2 hours'),
  ('/api/admin/analytics', 'GET', 200, 234, now() - interval '1 hour'),
  ('/api/admin/analytics', 'GET', 200, 187, now() - interval '2 hours'),
  ('/api/admin/analytics', 'GET', 401, 156, now() - interval '3 hours'),
  ('/api/admin/vopay/transactions', 'GET', 200, 89, now() - interval '1 hour'),
  ('/api/admin/vopay/transactions', 'GET', 200, 76, now() - interval '2 hours'),
  ('/api/admin/clients', 'GET', 404, 67, now() - interval '1 hour'),
  ('/api/admin/loans', 'GET', 404, 143, now() - interval '1 hour'),
  ('/api/performance-diagnostic', 'GET', 200, 85, now() - interval '1 hour'),
  ('/api/performance-diagnostic', 'GET', 200, 91, now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- ================================================
-- Commentaires
-- ================================================

COMMENT ON TABLE public.api_performance_logs IS 'Logs de performance de toutes les routes API avec millisecondes';
COMMENT ON VIEW public.vw_route_performance IS 'Performance moyenne par route (24h) - Accessible publiquement';
COMMENT ON VIEW public.vw_phase_performance IS 'Performance par phase de restructuration';
COMMENT ON VIEW public.vw_slow_routes IS 'Top 10 routes les plus lentes (1h)';
COMMENT ON FUNCTION cleanup_old_performance_logs() IS 'Nettoie les logs de performance de plus de 7 jours';

-- ================================================
-- Fin de la migration
-- ================================================

SELECT 'Performance monitoring system créé avec succès!' as message;
SELECT COUNT(*) as test_data_count FROM public.api_performance_logs;
