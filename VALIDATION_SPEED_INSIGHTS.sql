-- ============================================================================
-- VALIDATION SPEED INSIGHTS - Queries de test
-- ============================================================================
-- À exécuter dans Supabase SQL Editor après configuration du Drain
-- ============================================================================

-- Query 1: Counts (vérifier que les données arrivent)
-- Résultat attendu: raw > 0 et daily > 0 après agrégation
SELECT
  (SELECT COUNT(*) FROM vercel_speed_insights_raw) as raw,
  (SELECT COUNT(*) FROM vercel_speed_insights_daily) as daily;

-- ============================================================================

-- Query 2: Derniers events reçus (vérifier extraction)
-- Résultat attendu: 5 rows avec URL, device, et métriques LCP/INP
SELECT
  extracted_url,
  extracted_device,
  extracted_lcp,
  extracted_inp,
  received_at
FROM vercel_speed_insights_raw
ORDER BY received_at DESC
LIMIT 5;

-- ============================================================================

-- Query 3: View unifiée (vérifier intégration complète)
-- Résultat attendu: avg_lcp_p75 non null, speed_samples > 0, perf_status présent
SELECT
  date,
  ga4_users,
  avg_lcp_p75,
  speed_samples,
  perf_status
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 3;

-- ============================================================================

-- BONUS Query 4: Détail des agrégations daily
-- Voir les métriques par page et device
SELECT
  date,
  path,
  device,
  lcp_p75,
  inp_p75,
  cls_p75,
  ttfb_p75,
  sample_count,
  perf_status
FROM vercel_speed_insights_daily
ORDER BY date DESC, sample_count DESC
LIMIT 20;

-- ============================================================================

-- BONUS Query 5: Performance par page (top 10 worst LCP)
SELECT
  path,
  device,
  AVG(lcp_p75) as avg_lcp,
  AVG(inp_p75) as avg_inp,
  SUM(sample_count) as total_samples,
  MODE() WITHIN GROUP (ORDER BY perf_status) as most_common_status
FROM vercel_speed_insights_daily
GROUP BY path, device
ORDER BY avg_lcp DESC NULLS LAST
LIMIT 10;

-- ============================================================================

-- BONUS Query 6: Évolution temporelle (7 derniers jours)
SELECT
  date,
  COUNT(*) as page_combinations,
  SUM(sample_count) as total_samples,
  ROUND(AVG(lcp_p75)::numeric, 0) as avg_lcp,
  ROUND(AVG(inp_p75)::numeric, 0) as avg_inp,
  ROUND(AVG(cls_p75)::numeric, 3) as avg_cls,
  COUNT(*) FILTER (WHERE perf_status = 'GOOD') as good_pages,
  COUNT(*) FILTER (WHERE perf_status = 'WARN') as warn_pages,
  COUNT(*) FILTER (WHERE perf_status = 'CRIT') as crit_pages
FROM vercel_speed_insights_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- ============================================================================
-- FIN DES QUERIES DE VALIDATION
-- ============================================================================
