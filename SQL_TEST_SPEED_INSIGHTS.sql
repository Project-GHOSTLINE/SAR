-- ============================================================================
-- SQL TESTS - SPEED INSIGHTS PHASE 2
-- ============================================================================
-- À exécuter dans Supabase SQL Editor pour vérifier que tout fonctionne
-- ============================================================================

-- TEST 1: Vérifier que les tables Speed Insights existent
-- Résultat attendu: 2 rows (vercel_speed_insights_raw, vercel_speed_insights_daily)
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE '%speed%'
ORDER BY table_name;

-- ============================================================================

-- TEST 2: Vérifier collecte Drain (après config Vercel)
-- Résultat attendu: total > 0 après quelques minutes de trafic
SELECT
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  MIN(received_at) as first_received,
  MAX(received_at) as last_received,
  COUNT(DISTINCT extracted_device) as unique_devices,
  COUNT(DISTINCT extracted_url) as unique_urls
FROM vercel_speed_insights_raw;

-- ============================================================================

-- TEST 3: Voir les derniers events reçus
-- Résultat attendu: liste des derniers payloads Speed Insights
SELECT
  id,
  received_at,
  processed,
  extracted_url as url,
  extracted_device as device,
  extracted_lcp as lcp,
  extracted_inp as inp,
  extracted_cls as cls,
  extracted_ttfb as ttfb
FROM vercel_speed_insights_raw
ORDER BY received_at DESC
LIMIT 20;

-- ============================================================================

-- TEST 4: Vérifier agrégations (après exécution du job)
-- Résultat attendu: rows avec p75 calculés et perf_status
SELECT
  date,
  path,
  device,
  sample_count,
  lcp_p75,
  inp_p75,
  cls_p75,
  ttfb_p75,
  perf_status,
  updated_at
FROM vercel_speed_insights_daily
ORDER BY date DESC, sample_count DESC
LIMIT 10;

-- ============================================================================

-- TEST 5: Vérifier distribution perf_status
-- Résultat attendu: count par status (GOOD/WARN/CRIT)
SELECT
  perf_status,
  COUNT(*) as count,
  AVG(sample_count) as avg_samples,
  AVG(lcp_p75) as avg_lcp,
  AVG(inp_p75) as avg_inp
FROM vercel_speed_insights_daily
GROUP BY perf_status
ORDER BY
  CASE perf_status
    WHEN 'CRIT' THEN 1
    WHEN 'WARN' THEN 2
    WHEN 'GOOD' THEN 3
  END;

-- ============================================================================

-- TEST 6: Vérifier view unifiée (avec Speed Insights)
-- Résultat attendu: colonnes Speed remplies
SELECT
  date,
  ga4_users,
  ga4_sessions,
  gsc_clicks,
  semrush_keywords,
  avg_lcp_p75,
  avg_inp_p75,
  avg_cls_p75,
  perf_status,
  speed_samples,
  mobile_lcp_p75,
  desktop_lcp_p75
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 7;

-- ============================================================================

-- TEST 7: Performance par page (top 10 pages les plus lentes)
-- Résultat attendu: pages triées par LCP décroissant
SELECT
  path,
  device,
  COUNT(*) as days_tracked,
  AVG(lcp_p75) as avg_lcp,
  MAX(lcp_p75) as worst_lcp,
  AVG(sample_count) as avg_samples,
  MODE() WITHIN GROUP (ORDER BY perf_status) as most_common_status
FROM vercel_speed_insights_daily
GROUP BY path, device
HAVING COUNT(*) >= 2
ORDER BY avg_lcp DESC NULLS LAST
LIMIT 10;

-- ============================================================================

-- TEST 8: Évolution temporelle (7 derniers jours)
-- Résultat attendu: trend LCP par jour
SELECT
  date,
  COUNT(*) as page_device_combinations,
  SUM(sample_count) as total_samples,
  ROUND(AVG(lcp_p75)::numeric, 0) as avg_lcp_p75,
  ROUND(AVG(inp_p75)::numeric, 0) as avg_inp_p75,
  ROUND(AVG(cls_p75)::numeric, 3) as avg_cls_p75,
  COUNT(*) FILTER (WHERE perf_status = 'GOOD') as good_count,
  COUNT(*) FILTER (WHERE perf_status = 'WARN') as warn_count,
  COUNT(*) FILTER (WHERE perf_status = 'CRIT') as crit_count
FROM vercel_speed_insights_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- ============================================================================

-- TEST 9: Mobile vs Desktop comparison
-- Résultat attendu: comparaison perf mobile/desktop
SELECT
  'mobile' as device,
  COUNT(*) as entries,
  ROUND(AVG(lcp_p75)::numeric, 0) as avg_lcp,
  ROUND(AVG(inp_p75)::numeric, 0) as avg_inp,
  ROUND(AVG(cls_p75)::numeric, 3) as avg_cls
FROM vercel_speed_insights_daily
WHERE device = 'mobile'
UNION ALL
SELECT
  'desktop',
  COUNT(*),
  ROUND(AVG(lcp_p75)::numeric, 0),
  ROUND(AVG(inp_p75)::numeric, 0),
  ROUND(AVG(cls_p75)::numeric, 3)
FROM vercel_speed_insights_daily
WHERE device = 'desktop';

-- ============================================================================

-- TEST 10: Vérifier function calculate_perf_status
-- Résultat attendu: GOOD, WARN, CRIT
SELECT
  calculate_perf_status(2000, 150, 0.08, 600) as scenario_good,
  calculate_perf_status(3000, 300, 0.15, 1000) as scenario_warn,
  calculate_perf_status(5000, 600, 0.30, 2000) as scenario_crit;

-- ============================================================================
-- FIN DES TESTS
-- ============================================================================

-- NOTES:
-- - TEST 1-3: Vérifier après configuration Drain (10-30 min)
-- - TEST 4-10: Vérifier après exécution du job d'agrégation (1h+ ou manuel)
-- - Si TEST 2 retourne 0, le Drain n'est pas configuré ou pas de trafic
-- - Si TEST 4 retourne 0, le job d'agrégation n'a pas tourné
