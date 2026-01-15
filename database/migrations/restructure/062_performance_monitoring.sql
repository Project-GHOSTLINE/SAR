-- 062_performance_monitoring.sql
-- Phase 6C: Performance Monitoring & Optimization
-- Date: 2026-01-15
-- Objectif: Surveiller performance et optimiser requêtes

-- ==============================================================================
-- VUE 1: TAILLE DES TABLES
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_table_sizes AS
SELECT
  schemaname AS schema,
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size,
  pg_total_relation_size(schemaname||'.'||tablename) AS total_size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW vw_table_sizes IS 'Taille de toutes les tables (data + indexes + TOAST)';

-- ==============================================================================
-- VUE 2: NOMBRE DE ROWS PAR TABLE
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_table_row_counts AS
SELECT
  schemaname AS schema,
  relname AS table_name,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

COMMENT ON VIEW vw_table_row_counts IS 'Nombre de rows par table + statistiques vacuum/analyze';

-- ==============================================================================
-- VUE 3: USAGE DES INDEX
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_index_usage AS
SELECT
  schemaname AS schema,
  tablename AS table_name,
  indexname AS index_name,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  CASE
    WHEN idx_scan = 0 THEN '❌ UNUSED'
    WHEN idx_scan < 100 THEN '⚠️ LOW USAGE'
    ELSE '✅ ACTIVE'
  END AS usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW vw_index_usage IS 'Usage des index (identifier index inutilisés)';

-- ==============================================================================
-- VUE 4: INDEX MANQUANTS (Tables sans index)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_missing_indexes AS
SELECT
  schemaname AS schema,
  tablename AS table_name,
  seq_scan AS sequential_scans,
  seq_tup_read AS rows_read_sequentially,
  idx_scan AS index_scans,
  n_live_tup AS live_rows,
  CASE
    WHEN idx_scan IS NULL OR idx_scan = 0 THEN '🔴 NO INDEX SCANS'
    WHEN seq_scan > idx_scan * 10 THEN '🟠 SEQ SCANS >> INDEX SCANS'
    ELSE '🟢 OK'
  END AS status,
  CASE
    WHEN seq_scan > 10000 AND n_live_tup > 1000 THEN 'Consider adding indexes'
    ELSE 'OK'
  END AS recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (idx_scan IS NULL OR seq_scan > COALESCE(idx_scan, 0) * 5)
  AND n_live_tup > 100
ORDER BY seq_scan DESC;

COMMENT ON VIEW vw_missing_indexes IS 'Tables avec beaucoup de sequential scans (besoin d''index)';

-- ==============================================================================
-- VUE 5: STATISTIQUES GLOBALES BASE DE DONNÉES
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_database_stats AS
SELECT
  (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_tables,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public') AS total_indexes,
  (SELECT SUM(n_live_tup) FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_rows,
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) AS unused_indexes,
  NOW() AS snapshot_time;

COMMENT ON VIEW vw_database_stats IS 'Statistiques globales de la base de données';

-- ==============================================================================
-- VUE 6: QUERIES LENTES (Si pg_stat_statements disponible)
-- ==============================================================================

-- Vérifier si pg_stat_statements est disponible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN

    CREATE OR REPLACE VIEW public.vw_slow_queries AS
    SELECT
      LEFT(query, 200) AS query_preview,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time,
      stddev_exec_time,
      rows,
      100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
    FROM pg_stat_statements
    WHERE query NOT LIKE '%pg_stat_statements%'
      AND mean_exec_time > 100 -- Queries > 100ms en moyenne
    ORDER BY mean_exec_time DESC
    LIMIT 50;

    RAISE NOTICE '✅ pg_stat_statements détecté: vue vw_slow_queries créée';

  ELSE
    RAISE NOTICE '⚠️ pg_stat_statements non installé: vue vw_slow_queries non créée';
    RAISE NOTICE '   Pour activer: CREATE EXTENSION pg_stat_statements;';
  END IF;
END $$;

-- ==============================================================================
-- VUE 7: CACHE HIT RATIO (Performance mémoire)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_cache_hit_ratio AS
SELECT
  'Cache Hit Ratio' AS metric,
  ROUND(
    100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0),
    2
  ) AS percentage,
  CASE
    WHEN ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2) > 99 THEN '🟢 EXCELLENT'
    WHEN ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2) > 95 THEN '🟡 GOOD'
    ELSE '🔴 NEEDS TUNING'
  END AS status
FROM pg_statio_user_tables;

COMMENT ON VIEW vw_cache_hit_ratio IS 'Ratio cache (>99% = excellent, <95% = besoin plus de RAM)';

-- ==============================================================================
-- VUE 8: BLOAT ESTIMATION (Tables/Index gonflés)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_table_bloat AS
SELECT
  schemaname AS schema,
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_dead_tup AS dead_rows,
  n_live_tup AS live_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio_pct,
  CASE
    WHEN n_dead_tup > n_live_tup * 0.2 THEN '🔴 HIGH BLOAT - Run VACUUM'
    WHEN n_dead_tup > n_live_tup * 0.1 THEN '🟡 MODERATE BLOAT'
    ELSE '🟢 OK'
  END AS status,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100
ORDER BY n_dead_tup DESC;

COMMENT ON VIEW vw_table_bloat IS 'Bloat des tables (dead tuples). >20% = VACUUM recommandé';

-- ==============================================================================
-- FONCTION: RAPPORT PERFORMANCE COMPLET
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.generate_performance_report()
RETURNS TABLE (
  section text,
  metric text,
  value text,
  status text,
  recommendation text
) AS $$
BEGIN
  -- Section 1: Database Size
  RETURN QUERY
  SELECT
    'DATABASE SIZE'::text,
    'Total Size'::text,
    pg_size_pretty(pg_database_size(current_database())),
    '📊'::text,
    'Monitor growth trends'::text;

  RETURN QUERY
  SELECT
    'DATABASE SIZE'::text,
    'Total Tables'::text,
    (SELECT COUNT(*)::text FROM pg_tables WHERE schemaname = 'public'),
    '📊'::text,
    ''::text;

  RETURN QUERY
  SELECT
    'DATABASE SIZE'::text,
    'Total Rows'::text,
    (SELECT SUM(n_live_tup)::text FROM pg_stat_user_tables WHERE schemaname = 'public'),
    '📊'::text,
    ''::text;

  -- Section 2: Largest Tables
  RETURN QUERY
  SELECT
    'LARGEST TABLES'::text,
    table_name::text,
    total_size::text,
    '📦'::text,
    CASE
      WHEN total_size_bytes > 1073741824 THEN 'Consider partitioning if > 1GB'
      ELSE ''
    END
  FROM vw_table_sizes
  LIMIT 5;

  -- Section 3: Cache Hit Ratio
  RETURN QUERY
  SELECT
    'CACHE PERFORMANCE'::text,
    metric::text,
    percentage::text || '%',
    status::text,
    CASE
      WHEN percentage < 95 THEN 'Increase shared_buffers or work_mem'
      ELSE 'Excellent cache performance'
    END
  FROM vw_cache_hit_ratio;

  -- Section 4: Unused Indexes
  RETURN QUERY
  SELECT
    'INDEX HEALTH'::text,
    index_name::text,
    'UNUSED (0 scans)'::text,
    '❌'::text,
    'Consider dropping: DROP INDEX ' || index_name || ';'
  FROM vw_index_usage
  WHERE usage_status = '❌ UNUSED'
  LIMIT 5;

  -- Section 5: Tables with High Bloat
  RETURN QUERY
  SELECT
    'BLOAT ANALYSIS'::text,
    table_name::text,
    dead_ratio_pct::text || '% dead rows',
    status::text,
    'Run: VACUUM ANALYZE ' || table_name || ';'
  FROM vw_table_bloat
  WHERE dead_ratio_pct > 10
  LIMIT 5;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_performance_report IS 'Génère rapport performance complet avec recommandations';

-- ==============================================================================
-- MAINTENANCE AUTOMATIQUE (Recommandations)
-- ==============================================================================

-- Créer une fonction pour optimisation automatique
CREATE OR REPLACE FUNCTION public.auto_optimize_database()
RETURNS TEXT AS $$
DECLARE
  result_text TEXT := '';
BEGIN
  result_text := result_text || '=== AUTO OPTIMIZATION ===' || E'\n';

  -- 1. Vacuum tables avec >20% bloat
  DECLARE
    table_rec RECORD;
  BEGIN
    FOR table_rec IN
      SELECT table_name
      FROM vw_table_bloat
      WHERE dead_ratio_pct > 20
    LOOP
      EXECUTE 'VACUUM ANALYZE ' || table_rec.table_name;
      result_text := result_text || '✅ VACUUM ' || table_rec.table_name || E'\n';
    END LOOP;
  END;

  -- 2. Analyze tables non analysées depuis 7 jours
  DECLARE
    table_rec RECORD;
  BEGIN
    FOR table_rec IN
      SELECT tablename
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days')
    LOOP
      EXECUTE 'ANALYZE ' || table_rec.tablename;
      result_text := result_text || '✅ ANALYZE ' || table_rec.tablename || E'\n';
    END LOOP;
  END;

  result_text := result_text || E'\n✅ Optimization complete!';
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_optimize_database IS 'Exécute maintenance automatique (VACUUM + ANALYZE)';

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  views_count INTEGER;
  functions_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDATION PERFORMANCE MONITORING ===';

  -- Compter vues créées
  SELECT COUNT(*)
  INTO views_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname LIKE 'vw_%';

  RAISE NOTICE '✅ Vues monitoring créées: %', views_count;

  -- Compter fonctions créées
  SELECT COUNT(*)
  INTO functions_count
  FROM pg_proc
  WHERE proname IN ('generate_performance_report', 'auto_optimize_database');

  RAISE NOTICE '✅ Fonctions créées: %', functions_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Phase 6C Complete: Performance monitoring ready!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 UTILISATION:';
  RAISE NOTICE '   SELECT * FROM vw_table_sizes;';
  RAISE NOTICE '   SELECT * FROM vw_index_usage;';
  RAISE NOTICE '   SELECT * FROM vw_cache_hit_ratio;';
  RAISE NOTICE '   SELECT * FROM generate_performance_report();';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 MAINTENANCE:';
  RAISE NOTICE '   SELECT auto_optimize_database();';

END $$;

-- ==============================================================================
-- INDEXES DE PERFORMANCE SUPPLÉMENTAIRES
-- ==============================================================================

-- Ces indexes sont optionnels mais recommandés pour performance

-- 1. Index composite pour timeline queries (si pas déjà créé)
CREATE INDEX IF NOT EXISTS communications_client_occurred_idx
  ON public.communications(client_id, occurred_at DESC)
  WHERE client_id IS NOT NULL;

-- 2. Index pour recherche full-text si besoin (optionnel)
-- CREATE INDEX IF NOT EXISTS communications_body_text_idx
--   ON public.communications USING GIN (to_tsvector('french', body_text));

-- 3. Index partiel sur loans actifs
CREATE INDEX IF NOT EXISTS loans_active_idx
  ON public.loans(client_id, created_at DESC)
  WHERE status = 'active';

-- 4. Index sur payment_events par type
CREATE INDEX IF NOT EXISTS payment_events_type_loan_idx
  ON public.payment_events(event_type, loan_id, created_at DESC);

RAISE NOTICE '';
RAISE NOTICE '✅ Performance indexes créés!';
RAISE NOTICE '';
RAISE NOTICE '📌 NOTE: Phase 6 (RLS + Audit + Performance) est maintenant COMPLÈTE!';
RAISE NOTICE '📌 Toutes les phases de restructuration (0-6) sont prêtes à exécuter.';
