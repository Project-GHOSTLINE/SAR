-- ============================================================================
-- PHASE 1.5: TESTS DE PERFORMANCE
-- Comparer les performances avant/après optimisation
-- Durée d'exécution: ~2-5 minutes
-- ============================================================================

-- Activer le timing pour voir les durées d'exécution
\timing on

-- ============================================================================
-- 📊 TEST 1: Stats Webhooks - AVANT vs APRÈS
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE AVANT: Scan complet de la table + filtrage en JS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'successful') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM vopay_webhook_logs
WHERE environment IS NULL OR environment = 'production';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE APRÈS: Lecture materialized view
SELECT get_webhook_stats();


-- ============================================================================
-- 📊 TEST 2: Stats Analyses Client - AVANT vs APRÈS
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE AVANT: Scan complet + comptage en JavaScript
SELECT status, assigned_to
FROM client_analyses
WHERE deleted_at IS NULL;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE APRÈS: Lecture materialized view
SELECT get_client_analysis_stats();


-- ============================================================================
-- 📊 TEST 3: Transactions Récentes - AVANT vs APRÈS
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE AVANT: Scan complet puis filtre en JavaScript
SELECT *
FROM vopay_webhook_logs
WHERE environment IS NULL OR environment = 'production'
ORDER BY received_at DESC;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE APRÈS: Utilisation des indexes
SELECT * FROM get_recent_webhooks(100, 0, NULL);


-- ============================================================================
-- 📊 TEST 4: Stats Journalières - AVANT vs APRÈS
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE AVANT: Scan + GROUP BY sans index
SELECT
  DATE(received_at),
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'successful')
FROM vopay_webhook_logs
WHERE received_at >= CURRENT_DATE - 7
  AND (environment IS NULL OR environment = 'production')
GROUP BY DATE(received_at);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE APRÈS: Utilisation index date + agrégations optimisées
SELECT * FROM get_daily_webhook_stats(7);


-- ============================================================================
-- 📊 TEST 5: Recherche Full-Text - AVANT vs APRÈS
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE AVANT: ILIKE sans index (très lent)
SELECT *
FROM client_analyses
WHERE deleted_at IS NULL
  AND client_name ILIKE '%test%';

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
-- MÉTHODE APRÈS: Index GIN trigram
SELECT * FROM search_client_analyses('test', 10, 0);


-- ============================================================================
-- 📊 BENCHMARK COMPLET: Mesurer les temps réels
-- ============================================================================

DO $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_before INTERVAL;
  duration_after INTERVAL;
  improvement_pct NUMERIC;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BENCHMARK COMPLET DES OPTIMISATIONS';
  RAISE NOTICE '========================================';

  -- Test 1: Stats Webhooks
  RAISE NOTICE '';
  RAISE NOTICE '1. STATS WEBHOOKS';
  RAISE NOTICE '   Méthode AVANT (scan complet):';

  start_time := clock_timestamp();
  PERFORM COUNT(*), COUNT(*) FILTER (WHERE status = 'successful')
  FROM vopay_webhook_logs
  WHERE environment IS NULL OR environment = 'production';
  end_time := clock_timestamp();
  duration_before := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_before;

  RAISE NOTICE '   Méthode APRÈS (materialized view):';

  start_time := clock_timestamp();
  PERFORM get_webhook_stats();
  end_time := clock_timestamp();
  duration_after := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_after;

  improvement_pct := ROUND(
    100.0 * (1 - EXTRACT(EPOCH FROM duration_after) / EXTRACT(EPOCH FROM duration_before)),
    1
  );

  RAISE NOTICE '   ✅ Amélioration: %% (% plus rapide)', improvement_pct, improvement_pct;

  -- Test 2: Stats Analyses
  RAISE NOTICE '';
  RAISE NOTICE '2. STATS ANALYSES CLIENT';
  RAISE NOTICE '   Méthode AVANT (scan + filtre JS):';

  start_time := clock_timestamp();
  PERFORM status, assigned_to
  FROM client_analyses
  WHERE deleted_at IS NULL;
  end_time := clock_timestamp();
  duration_before := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_before;

  RAISE NOTICE '   Méthode APRÈS (materialized view):';

  start_time := clock_timestamp();
  PERFORM get_client_analysis_stats();
  end_time := clock_timestamp();
  duration_after := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_after;

  improvement_pct := ROUND(
    100.0 * (1 - EXTRACT(EPOCH FROM duration_after) / EXTRACT(EPOCH FROM duration_before)),
    1
  );

  RAISE NOTICE '   ✅ Amélioration: %% (% plus rapide)', improvement_pct, improvement_pct;

  -- Test 3: Transactions Récentes
  RAISE NOTICE '';
  RAISE NOTICE '3. TRANSACTIONS RÉCENTES (100 dernières)';
  RAISE NOTICE '   Méthode AVANT (scan complet):';

  start_time := clock_timestamp();
  PERFORM *
  FROM vopay_webhook_logs
  WHERE environment IS NULL OR environment = 'production'
  ORDER BY received_at DESC
  LIMIT 100;
  end_time := clock_timestamp();
  duration_before := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_before;

  RAISE NOTICE '   Méthode APRÈS (index optimisé):';

  start_time := clock_timestamp();
  PERFORM * FROM get_recent_webhooks(100, 0, NULL);
  end_time := clock_timestamp();
  duration_after := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_after;

  improvement_pct := ROUND(
    100.0 * (1 - EXTRACT(EPOCH FROM duration_after) / EXTRACT(EPOCH FROM duration_before)),
    1
  );

  RAISE NOTICE '   ✅ Amélioration: %% (% plus rapide)', improvement_pct, improvement_pct;

  -- Test 4: Recherche Full-Text
  RAISE NOTICE '';
  RAISE NOTICE '4. RECHERCHE FULL-TEXT';
  RAISE NOTICE '   Méthode AVANT (ILIKE sans index):';

  start_time := clock_timestamp();
  PERFORM *
  FROM client_analyses
  WHERE deleted_at IS NULL
    AND client_name ILIKE '%test%'
  LIMIT 10;
  end_time := clock_timestamp();
  duration_before := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_before;

  RAISE NOTICE '   Méthode APRÈS (index GIN trigram):';

  start_time := clock_timestamp();
  PERFORM * FROM search_client_analyses('test', 10, 0);
  end_time := clock_timestamp();
  duration_after := end_time - start_time;

  RAISE NOTICE '   Durée: %', duration_after;

  improvement_pct := ROUND(
    100.0 * (1 - EXTRACT(EPOCH FROM duration_after) / EXTRACT(EPOCH FROM duration_before)),
    1
  );

  RAISE NOTICE '   ✅ Amélioration: %% (% plus rapide)', improvement_pct, improvement_pct;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ BENCHMARK TERMINÉ';
  RAISE NOTICE '========================================';
END $$;


-- ============================================================================
-- 📊 VÉRIFIER L'UTILISATION DES INDEXES
-- ============================================================================

-- Voir quels indexes sont utilisés (et leur taux d'utilisation)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
ORDER BY idx_scan DESC;


-- Trouver les indexes non utilisés (candidats à suppression)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- 📊 STATISTIQUES DES TABLES
-- ============================================================================

SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
ORDER BY tablename;


-- ============================================================================
-- 📊 CACHE HIT RATIO (doit être > 99%)
-- ============================================================================

SELECT
  'Cache Hit Ratio' as metric,
  ROUND(
    100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0),
    2
  ) as percentage
FROM pg_statio_user_tables
WHERE schemaname = 'public';


-- ============================================================================
-- 📊 TAILLE DES TABLES ET INDEXES
-- ============================================================================

SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- ============================================================================
-- 📊 REQUÊTES LENTES (Activer pg_stat_statements si disponible)
-- ============================================================================

-- Vérifier si l'extension est disponible
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- Si disponible, activer et voir les requêtes lentes
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
--
-- SELECT
--   query,
--   calls,
--   total_exec_time,
--   mean_exec_time,
--   max_exec_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%vopay_webhook_logs%'
--    OR query LIKE '%client_analyses%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 20;


-- ============================================================================
-- 📊 RAPPORT DE SANTÉ COMPLET
-- ============================================================================

DO $$
DECLARE
  webhook_count BIGINT;
  analysis_count BIGINT;
  message_count BIGINT;
  mv_age_minutes INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RAPPORT DE SANTÉ - BASE DE DONNÉES';
  RAISE NOTICE '========================================';

  -- Compter les enregistrements
  SELECT COUNT(*) INTO webhook_count FROM vopay_webhook_logs;
  SELECT COUNT(*) INTO analysis_count FROM client_analyses WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO message_count FROM messages WHERE deleted_at IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE 'TABLES:';
  RAISE NOTICE '  - vopay_webhook_logs: % enregistrements', webhook_count;
  RAISE NOTICE '  - client_analyses: % enregistrements', analysis_count;
  RAISE NOTICE '  - messages: % enregistrements', message_count;

  -- Vérifier les materialized views
  SELECT
    EXTRACT(EPOCH FROM (NOW() - refreshed_at))::INT / 60
  INTO mv_age_minutes
  FROM mv_webhook_stats;

  RAISE NOTICE '';
  RAISE NOTICE 'MATERIALIZED VIEWS:';
  RAISE NOTICE '  - Dernière mise à jour: il y a % minutes', mv_age_minutes;

  IF mv_age_minutes > 10 THEN
    RAISE WARNING '  ⚠️  Views pas à jour! Vérifier les CRON jobs.';
  ELSE
    RAISE NOTICE '  ✅ Views à jour';
  END IF;

  -- Vérifier les indexes
  RAISE NOTICE '';
  RAISE NOTICE 'INDEXES:';
  RAISE NOTICE '  - Total: %',
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages'));
  RAISE NOTICE '  - Utilisés: %',
    (SELECT COUNT(*) FROM pg_stat_user_indexes
     WHERE schemaname = 'public'
       AND tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
       AND idx_scan > 0);

  RAISE NOTICE '';
  RAISE NOTICE '✅ RAPPORT TERMINÉ';
  RAISE NOTICE '========================================';
END $$;


-- ============================================================================
-- ✅ TESTS DE PERFORMANCE TERMINÉS
-- ============================================================================
--
-- Résultats attendus:
--
--   Stats Webhooks:
--     AVANT: 300-450ms
--     APRÈS: < 10ms
--     Amélioration: ~97%
--
--   Stats Analyses:
--     AVANT: 200-300ms
--     APRÈS: < 10ms
--     Amélioration: ~96%
--
--   Transactions Récentes:
--     AVANT: 100-200ms
--     APRÈS: 20-50ms
--     Amélioration: ~80%
--
--   Recherche Full-Text:
--     AVANT: 500-1000ms
--     APRÈS: 50-100ms
--     Amélioration: ~90%
--
-- 📋 Actions si les performances ne sont pas optimales:
--
--   1. Vérifier que tous les indexes sont créés
--   2. Vérifier que les materialized views sont rafraîchies
--   3. Exécuter ANALYZE sur les tables
--   4. Vérifier les CRON jobs
--   5. Augmenter shared_buffers si nécessaire (config Supabase)
--
-- ============================================================================
