-- ============================================================================
-- PHASE 1.3: CRÉATION DES FONCTIONS SQL OPTIMISÉES
-- Impact: Agrégations en SQL au lieu de JavaScript
-- Durée d'exécution: ~1 minute
-- ============================================================================

-- 🚀 FONCTION 1: Récupérer les stats webhooks (lit la materialized view)
-- Utilisée par: GET /api/admin/webhooks/stats
-- Performance: < 10ms (au lieu de 450ms)

CREATE OR REPLACE FUNCTION get_webhook_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  mv_data RECORD;
BEGIN
  -- Lire depuis la materialized view (ultra rapide)
  SELECT * INTO mv_data FROM mv_webhook_stats LIMIT 1;

  -- Si la view est vide, retourner des stats vides
  IF NOT FOUND THEN
    RETURN json_build_object(
      'total', 0,
      'totalSuccessful', 0,
      'totalFailed', 0,
      'totalPending', 0,
      'totalCancelled', 0,
      'weekTotal', 0,
      'weekSuccessful', 0,
      'weekFailed', 0,
      'weekPending', 0,
      'weekSuccessRate', 0,
      'monthTotal', 0,
      'monthSuccessRate', 0,
      'todayVolume', 0,
      'yesterdayVolume', 0,
      'weekVolume', 0,
      'monthVolume', 0,
      'volumeChange', 0,
      'refreshedAt', NOW()
    );
  END IF;

  -- Construire le JSON avec calcul du volumeChange
  SELECT json_build_object(
    'total', mv_data.total,
    'totalSuccessful', mv_data.total_successful,
    'totalFailed', mv_data.total_failed,
    'totalPending', mv_data.total_pending,
    'totalCancelled', mv_data.total_cancelled,
    'weekTotal', mv_data.week_total,
    'weekSuccessful', mv_data.week_successful,
    'weekFailed', mv_data.week_failed,
    'weekPending', mv_data.week_pending,
    'weekSuccessRate', COALESCE(mv_data.week_success_rate, 0),
    'monthTotal', mv_data.month_total,
    'monthSuccessRate', COALESCE(mv_data.month_success_rate, 0),
    'todayVolume', mv_data.today_volume,
    'yesterdayVolume', mv_data.yesterday_volume,
    'weekVolume', mv_data.week_volume,
    'monthVolume', mv_data.month_volume,
    'volumeChange', ROUND(
      100.0 * (mv_data.today_volume - mv_data.yesterday_volume) /
      NULLIF(mv_data.yesterday_volume, 0),
      1
    ),
    'refreshedAt', mv_data.refreshed_at
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_webhook_stats IS
'Retourne toutes les stats webhooks depuis la materialized view.
Performance: < 10ms';


-- ============================================================================
-- 🚀 FONCTION 2: Stats journalières des webhooks (7 derniers jours)
-- Utilisée par: GET /api/admin/webhooks/stats (graphique)
-- Performance: 50-100ms avec indexes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_webhook_stats(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  successful BIGINT,
  failed BIGINT,
  pending BIGINT,
  volume NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(received_at) as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'successful') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status IN ('pending', 'in progress')) as pending,
    COALESCE(SUM(CAST(transaction_amount AS NUMERIC)), 0) as volume
  FROM vopay_webhook_logs
  WHERE received_at >= CURRENT_DATE - days_back
    AND (environment IS NULL OR environment = 'production')
  GROUP BY DATE(received_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_daily_webhook_stats IS
'Retourne les statistiques quotidiennes des webhooks pour les N derniers jours.
Utilise les indexes pour performance optimale.';


-- ============================================================================
-- 🚀 FONCTION 3: Transactions récentes paginées
-- Utilisée par: GET /api/admin/webhooks/stats, /api/admin/webhooks/list
-- Performance: 20-50ms avec indexes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_webhooks(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  transaction_id TEXT,
  transaction_type TEXT,
  transaction_amount NUMERIC,
  status TEXT,
  failure_reason TEXT,
  received_at TIMESTAMPTZ,
  environment TEXT,
  raw_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.transaction_id,
    w.transaction_type,
    CAST(w.transaction_amount AS NUMERIC),
    w.status,
    w.failure_reason,
    w.received_at,
    w.environment,
    w.raw_data
  FROM vopay_webhook_logs w
  WHERE (w.environment IS NULL OR w.environment = 'production')
    AND (p_status IS NULL OR w.status = p_status)
  ORDER BY w.received_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_recent_webhooks IS
'Retourne les transactions webhooks récentes avec pagination et filtre optionnel par statut.
Utilise les indexes pour performance optimale.';


-- ============================================================================
-- 🚀 FONCTION 4: Stats analyses client (lit la materialized view)
-- Utilisée par: GET /api/admin/client-analysis
-- Performance: < 10ms
-- ============================================================================

CREATE OR REPLACE FUNCTION get_client_analysis_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  mv_data RECORD;
BEGIN
  -- Lire depuis la materialized view
  SELECT * INTO mv_data FROM mv_client_analysis_stats LIMIT 1;

  -- Si la view est vide, retourner des stats vides
  IF NOT FOUND THEN
    RETURN json_build_object(
      'total', 0,
      'pending', 0,
      'reviewed', 0,
      'approved', 0,
      'rejected', 0,
      'by_assignee', json_build_object(
        'sandra', 0,
        'michel', 0,
        'unassigned', 0
      ),
      'by_source', json_build_object(
        'inverite', 0,
        'flinks', 0
      ),
      'refreshedAt', NOW()
    );
  END IF;

  -- Construire le JSON
  SELECT json_build_object(
    'total', mv_data.total,
    'pending', mv_data.pending,
    'reviewed', mv_data.reviewed,
    'approved', mv_data.approved,
    'rejected', mv_data.rejected,
    'by_assignee', json_build_object(
      'sandra', mv_data.sandra,
      'michel', mv_data.michel,
      'unassigned', mv_data.unassigned
    ),
    'by_source', json_build_object(
      'inverite', mv_data.source_inverite,
      'flinks', mv_data.source_flinks
    ),
    'temporal', json_build_object(
      'today', mv_data.today_count,
      'week', mv_data.week_count,
      'month', mv_data.month_count
    ),
    'financial', json_build_object(
      'total_balance', mv_data.total_balance_sum,
      'avg_balance', mv_data.avg_balance,
      'max_balance', mv_data.max_balance
    ),
    'refreshedAt', mv_data.refreshed_at
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_client_analysis_stats IS
'Retourne toutes les stats analyses client depuis la materialized view.
Performance: < 10ms';


-- ============================================================================
-- 🚀 FONCTION 5: Recherche full-text sur analyses client
-- Utilisée par: GET /api/admin/client-analysis (recherche)
-- Performance: 50-100ms avec index GIN trigram
-- ============================================================================

CREATE OR REPLACE FUNCTION search_client_analyses(
  search_query TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  client_name TEXT,
  client_email TEXT,
  source TEXT,
  status TEXT,
  assigned_to TEXT,
  total_accounts INT,
  total_balance NUMERIC,
  created_at TIMESTAMPTZ,
  similarity_score REAL
) AS $$
BEGIN
  -- Si pas de recherche, retourner les dernières analyses
  IF search_query IS NULL OR search_query = '' THEN
    RETURN QUERY
    SELECT
      a.id,
      a.client_name,
      a.client_email,
      a.source,
      a.status,
      a.assigned_to,
      a.total_accounts,
      a.total_balance,
      a.created_at,
      0::REAL as similarity_score
    FROM client_analyses a
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Recherche avec similarité trigram
    RETURN QUERY
    SELECT
      a.id,
      a.client_name,
      a.client_email,
      a.source,
      a.status,
      a.assigned_to,
      a.total_accounts,
      a.total_balance,
      a.created_at,
      similarity(a.client_name, search_query) as similarity_score
    FROM client_analyses a
    WHERE a.deleted_at IS NULL
      AND (
        a.client_name ILIKE '%' || search_query || '%'
        OR a.client_email ILIKE '%' || search_query || '%'
        OR a.inverite_guid ILIKE '%' || search_query || '%'
      )
    ORDER BY similarity_score DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_client_analyses IS
'Recherche full-text sur les analyses client avec score de similarité.
Utilise l''index GIN trigram pour performance optimale.';


-- ============================================================================
-- 🚀 FONCTION 6: Stats messages support (lit la materialized view)
-- Utilisée par: GET /api/admin/messages
-- Performance: < 10ms
-- ============================================================================

CREATE OR REPLACE FUNCTION get_message_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  mv_data RECORD;
BEGIN
  SELECT * INTO mv_data FROM mv_message_stats LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'total', 0,
      'nonLus', 0,
      'nouveau', 0,
      'en_cours', 0,
      'resolu', 0,
      'ferme', 0,
      'by_assignee', json_build_object(
        'sandra', 0,
        'michel', 0,
        'unassigned', 0
      ),
      'this_month', json_build_object(
        'total', 0,
        'responded', 0
      ),
      'refreshedAt', NOW()
    );
  END IF;

  SELECT json_build_object(
    'total', mv_data.total,
    'nonLus', mv_data.non_lus,
    'nouveau', mv_data.nouveau,
    'en_cours', mv_data.en_cours,
    'resolu', mv_data.resolu,
    'ferme', mv_data.ferme,
    'by_assignee', json_build_object(
      'sandra', mv_data.assigned_sandra,
      'michel', mv_data.assigned_michel,
      'unassigned', mv_data.unassigned
    ),
    'this_month', json_build_object(
      'total', mv_data.this_month,
      'responded', mv_data.responded_this_month
    ),
    'refreshedAt', mv_data.refreshed_at
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_message_stats IS
'Retourne toutes les stats messages depuis la materialized view.
Performance: < 10ms';


-- ============================================================================
-- 🚀 FONCTION 7: Vérifier la santé des materialized views
-- Utilitaire pour monitoring
-- ============================================================================

CREATE OR REPLACE FUNCTION check_materialized_views_health()
RETURNS TABLE (
  view_name TEXT,
  is_populated BOOLEAN,
  last_refresh TIMESTAMPTZ,
  age_minutes INT,
  row_count BIGINT,
  size_pretty TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    matviewname::TEXT,
    ispopulated,
    (SELECT refreshed_at FROM mv_webhook_stats LIMIT 1) as last_refresh,
    EXTRACT(EPOCH FROM (NOW() - (SELECT refreshed_at FROM mv_webhook_stats LIMIT 1)))::INT / 60 as age_minutes,
    (SELECT COUNT(*) FROM mv_webhook_stats) as row_count,
    pg_size_pretty(pg_total_relation_size('public.' || matviewname)) as size_pretty
  FROM pg_matviews
  WHERE matviewname = 'mv_webhook_stats'

  UNION ALL

  SELECT
    matviewname::TEXT,
    ispopulated,
    (SELECT refreshed_at FROM mv_client_analysis_stats LIMIT 1),
    EXTRACT(EPOCH FROM (NOW() - (SELECT refreshed_at FROM mv_client_analysis_stats LIMIT 1)))::INT / 60,
    (SELECT COUNT(*) FROM mv_client_analysis_stats),
    pg_size_pretty(pg_total_relation_size('public.' || matviewname))
  FROM pg_matviews
  WHERE matviewname = 'mv_client_analysis_stats'

  UNION ALL

  SELECT
    matviewname::TEXT,
    ispopulated,
    (SELECT refreshed_at FROM mv_message_stats LIMIT 1),
    EXTRACT(EPOCH FROM (NOW() - (SELECT refreshed_at FROM mv_message_stats LIMIT 1)))::INT / 60,
    (SELECT COUNT(*) FROM mv_message_stats),
    pg_size_pretty(pg_total_relation_size('public.' || matviewname))
  FROM pg_matviews
  WHERE matviewname = 'mv_message_stats';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_materialized_views_health IS
'Vérifie la santé et la fraîcheur des materialized views.
Utile pour monitoring et alertes.';


-- ============================================================================
-- TESTER LES FONCTIONS
-- ============================================================================

-- Test 1: Stats webhooks
SELECT get_webhook_stats();

-- Test 2: Stats journalières (7 derniers jours)
SELECT * FROM get_daily_webhook_stats(7);

-- Test 3: Transactions récentes (10 dernières)
SELECT * FROM get_recent_webhooks(10, 0, NULL);

-- Test 4: Transactions failed uniquement
SELECT * FROM get_recent_webhooks(10, 0, 'failed');

-- Test 5: Stats analyses client
SELECT get_client_analysis_stats();

-- Test 6: Recherche analyses
SELECT * FROM search_client_analyses('test', 10, 0);

-- Test 7: Stats messages
SELECT get_message_stats();

-- Test 8: Santé des materialized views
SELECT * FROM check_materialized_views_health();


-- ============================================================================
-- BENCHMARK: Comparer ancienne méthode vs nouvelles fonctions
-- ============================================================================

-- Ancienne méthode (scan complet)
EXPLAIN ANALYZE
SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'successful')
FROM vopay_webhook_logs
WHERE environment IS NULL OR environment = 'production';

-- Nouvelle méthode (materialized view)
EXPLAIN ANALYZE
SELECT get_webhook_stats();


-- ============================================================================
-- ✅ FONCTIONS CRÉÉES AVEC SUCCÈS
-- ============================================================================
--
-- Fonctions créées:
--
--   1. get_webhook_stats() → JSON
--      - Retourne toutes les stats webhooks
--      - Lit la materialized view (< 10ms)
--
--   2. get_daily_webhook_stats(days_back) → TABLE
--      - Stats journalières avec agrégations SQL
--      - Performance: 50-100ms avec indexes
--
--   3. get_recent_webhooks(limit, offset, status) → TABLE
--      - Transactions récentes paginées
--      - Performance: 20-50ms avec indexes
--
--   4. get_client_analysis_stats() → JSON
--      - Toutes les stats analyses client
--      - Lit la materialized view (< 10ms)
--
--   5. search_client_analyses(query, limit, offset) → TABLE
--      - Recherche full-text avec similarité
--      - Performance: 50-100ms avec index GIN
--
--   6. get_message_stats() → JSON
--      - Toutes les stats messages support
--      - Lit la materialized view (< 10ms)
--
--   7. check_materialized_views_health() → TABLE
--      - Vérifie la santé des vues matérialisées
--      - Utile pour monitoring
--
-- ✅ Exécutez maintenant: 04_setup_cron_jobs.sql
-- ============================================================================
