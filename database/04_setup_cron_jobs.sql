-- ============================================================================
-- PHASE 1.4: CONFIGURATION DES CRON JOBS
-- Impact: Rafraîchissement automatique des materialized views
-- Durée d'exécution: < 1 minute
-- ============================================================================

-- Note: Les CRON jobs Supabase utilisent l'extension pg_cron
-- Vérifier que pg_cron est activée (elle devrait l'être par défaut sur Supabase)

-- Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ============================================================================
-- 🚀 CRON JOB 1: Rafraîchir mv_webhook_stats toutes les 5 minutes
-- ============================================================================

-- Supprimer le job existant s'il existe
SELECT cron.unschedule('refresh-webhook-stats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-webhook-stats'
);

-- Créer le job
SELECT cron.schedule(
  'refresh-webhook-stats',                          -- Nom du job
  '*/5 * * * *',                                    -- Toutes les 5 minutes
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_webhook_stats$$
);

-- Vérifier que le job est créé
SELECT * FROM cron.job WHERE jobname = 'refresh-webhook-stats';


-- ============================================================================
-- 🚀 CRON JOB 2: Rafraîchir mv_client_analysis_stats toutes les 5 minutes
-- ============================================================================

SELECT cron.unschedule('refresh-analysis-stats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-analysis-stats'
);

SELECT cron.schedule(
  'refresh-analysis-stats',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_analysis_stats$$
);

SELECT * FROM cron.job WHERE jobname = 'refresh-analysis-stats';


-- ============================================================================
-- 🚀 CRON JOB 3: Rafraîchir mv_message_stats toutes les 5 minutes
-- ============================================================================

SELECT cron.unschedule('refresh-message-stats')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-message-stats'
);

SELECT cron.schedule(
  'refresh-message-stats',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_message_stats$$
);

SELECT * FROM cron.job WHERE jobname = 'refresh-message-stats';


-- ============================================================================
-- 🚀 CRON JOB 4: Nettoyage des anciennes données (optionnel)
-- Supprimer les webhooks de test/sandbox plus vieux que 30 jours
-- Exécuté tous les jours à 3h du matin
-- ============================================================================

SELECT cron.unschedule('cleanup-old-sandbox-webhooks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-sandbox-webhooks'
);

SELECT cron.schedule(
  'cleanup-old-sandbox-webhooks',
  '0 3 * * *',                                      -- Tous les jours à 3h AM
  $$
    DELETE FROM vopay_webhook_logs
    WHERE environment IN ('sandbox', 'test')
      AND received_at < NOW() - INTERVAL '30 days'
  $$
);

SELECT * FROM cron.job WHERE jobname = 'cleanup-old-sandbox-webhooks';


-- ============================================================================
-- 🚀 CRON JOB 5: VACUUM ANALYZE quotidien (maintenance)
-- Nettoie et met à jour les statistiques des tables principales
-- Exécuté tous les jours à 2h du matin
-- ============================================================================

SELECT cron.unschedule('daily-vacuum-analyze')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-vacuum-analyze'
);

SELECT cron.schedule(
  'daily-vacuum-analyze',
  '0 2 * * *',                                      -- Tous les jours à 2h AM
  $$
    VACUUM ANALYZE vopay_webhook_logs;
    VACUUM ANALYZE client_analyses;
    VACUUM ANALYZE messages;
  $$
);

SELECT * FROM cron.job WHERE jobname = 'daily-vacuum-analyze';


-- ============================================================================
-- FONCTION: Voir l'historique d'exécution des CRON jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_job_history(job_name_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  jobid BIGINT,
  jobname TEXT,
  runid BIGINT,
  job_pid INTEGER,
  database TEXT,
  username TEXT,
  command TEXT,
  status TEXT,
  return_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.jobname,
    jd.runid,
    jd.job_pid,
    jd.database,
    jd.username,
    jd.command,
    jd.status,
    jd.return_message,
    jd.start_time,
    jd.end_time,
    (jd.end_time - jd.start_time) as duration
  FROM cron.job j
  LEFT JOIN cron.job_run_details jd ON j.jobid = jd.jobid
  WHERE job_name_filter IS NULL OR j.jobname ILIKE '%' || job_name_filter || '%'
  ORDER BY jd.start_time DESC NULLS LAST
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cron_job_history IS
'Retourne l''historique des exécutions des CRON jobs avec durée.
Utile pour monitoring et debugging.';


-- ============================================================================
-- FONCTION: Statistiques des CRON jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_job_stats()
RETURNS TABLE (
  jobname TEXT,
  schedule TEXT,
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  success_rate NUMERIC,
  avg_duration INTERVAL,
  last_run TIMESTAMPTZ,
  last_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname,
    j.schedule,
    COUNT(jd.runid) as total_runs,
    COUNT(*) FILTER (WHERE jd.status = 'succeeded') as successful_runs,
    COUNT(*) FILTER (WHERE jd.status = 'failed') as failed_runs,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE jd.status = 'succeeded') /
      NULLIF(COUNT(jd.runid), 0),
      2
    ) as success_rate,
    AVG(jd.end_time - jd.start_time) as avg_duration,
    MAX(jd.start_time) as last_run,
    (
      SELECT jd2.status
      FROM cron.job_run_details jd2
      WHERE jd2.jobid = j.jobid
      ORDER BY jd2.start_time DESC
      LIMIT 1
    ) as last_status
  FROM cron.job j
  LEFT JOIN cron.job_run_details jd ON j.jobid = jd.jobid
  GROUP BY j.jobname, j.schedule
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_cron_job_stats IS
'Retourne les statistiques d''exécution de tous les CRON jobs.
Inclut taux de succès, durée moyenne, dernière exécution.';


-- ============================================================================
-- FONCTION: Forcer le rafraîchissement manuel de toutes les vues
-- ============================================================================

CREATE OR REPLACE FUNCTION force_refresh_all_views()
RETURNS TABLE(view_name TEXT, status TEXT, duration INTERVAL, error_message TEXT) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  -- Webhook stats
  view_name := 'mv_webhook_stats';
  start_time := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_webhook_stats;
    end_time := clock_timestamp();
    status := 'SUCCESS';
    duration := end_time - start_time;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    status := 'ERROR';
    duration := end_time - start_time;
    error_message := SQLERRM;
    RETURN NEXT;
  END;

  -- Analysis stats
  view_name := 'mv_client_analysis_stats';
  start_time := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_analysis_stats;
    end_time := clock_timestamp();
    status := 'SUCCESS';
    duration := end_time - start_time;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    status := 'ERROR';
    duration := end_time - start_time;
    error_message := SQLERRM;
    RETURN NEXT;
  END;

  -- Message stats
  view_name := 'mv_message_stats';
  start_time := clock_timestamp();
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_message_stats;
    end_time := clock_timestamp();
    status := 'SUCCESS';
    duration := end_time - start_time;
    error_message := NULL;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    status := 'ERROR';
    duration := end_time - start_time;
    error_message := SQLERRM;
    RETURN NEXT;
  END;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION force_refresh_all_views IS
'Force le rafraîchissement immédiat de toutes les materialized views.
À utiliser après des modifications importantes de données.';


-- ============================================================================
-- LISTER TOUS LES CRON JOBS
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
ORDER BY jobname;


-- ============================================================================
-- TESTER LES FONCTIONS DE MONITORING
-- ============================================================================

-- Voir l'historique des rafraîchissements
SELECT * FROM get_cron_job_history('refresh');

-- Voir les statistiques des jobs
SELECT * FROM get_cron_job_stats();

-- Vérifier la santé des materialized views
SELECT * FROM check_materialized_views_health();

-- Forcer un rafraîchissement manuel (test)
SELECT * FROM force_refresh_all_views();


-- ============================================================================
-- DÉSACTIVER/RÉACTIVER UN CRON JOB (si nécessaire)
-- ============================================================================

-- Désactiver un job
-- SELECT cron.unschedule('refresh-webhook-stats');

-- Réactiver un job
-- SELECT cron.schedule(...);


-- ============================================================================
-- ALERTES ET MONITORING
-- ============================================================================

-- Créer une fonction pour détecter les jobs en échec
CREATE OR REPLACE FUNCTION check_failed_cron_jobs(hours_back INT DEFAULT 24)
RETURNS TABLE (
  jobname TEXT,
  failed_count BIGINT,
  last_failure TIMESTAMPTZ,
  last_error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname,
    COUNT(*) as failed_count,
    MAX(jd.start_time) as last_failure,
    (
      SELECT jd2.return_message
      FROM cron.job_run_details jd2
      WHERE jd2.jobid = j.jobid
        AND jd2.status = 'failed'
      ORDER BY jd2.start_time DESC
      LIMIT 1
    ) as last_error
  FROM cron.job j
  JOIN cron.job_run_details jd ON j.jobid = jd.jobid
  WHERE jd.status = 'failed'
    AND jd.start_time >= NOW() - (hours_back || ' hours')::INTERVAL
  GROUP BY j.jobname
  ORDER BY failed_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_failed_cron_jobs IS
'Détecte les CRON jobs qui ont échoué dans les dernières N heures.
Utile pour alertes et monitoring.';

-- Tester
SELECT * FROM check_failed_cron_jobs(24);


-- ============================================================================
-- ✅ CRON JOBS CONFIGURÉS AVEC SUCCÈS
-- ============================================================================
--
-- Jobs créés:
--
--   1. refresh-webhook-stats
--      - Fréquence: Toutes les 5 minutes
--      - Action: Rafraîchit mv_webhook_stats
--
--   2. refresh-analysis-stats
--      - Fréquence: Toutes les 5 minutes
--      - Action: Rafraîchit mv_client_analysis_stats
--
--   3. refresh-message-stats
--      - Fréquence: Toutes les 5 minutes
--      - Action: Rafraîchit mv_message_stats
--
--   4. cleanup-old-sandbox-webhooks
--      - Fréquence: Tous les jours à 3h AM
--      - Action: Supprime webhooks sandbox > 30 jours
--
--   5. daily-vacuum-analyze
--      - Fréquence: Tous les jours à 2h AM
--      - Action: Maintenance des tables principales
--
-- Fonctions de monitoring:
--   - get_cron_job_history(job_name)
--   - get_cron_job_stats()
--   - force_refresh_all_views()
--   - check_failed_cron_jobs(hours)
--
-- ✅ PHASE 1 COMPLÈTE - BASE DE DONNÉES OPTIMISÉE
--
-- Prochaines étapes:
--   - Tester les performances (voir 05_test_performance.sql)
--   - Modifier les API routes pour utiliser les nouvelles fonctions
--   - Monitorer les temps de réponse
--
-- ============================================================================
