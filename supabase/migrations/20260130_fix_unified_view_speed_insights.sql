-- ============================================================================
-- Fix seo_unified_daily_plus to include dates with ONLY Speed Insights data
-- Date: 2026-01-30
-- Issue: View didn't show rows for dates where only Speed Insights had data
-- Solution: Use FULL OUTER JOIN instead of LEFT JOIN
-- ============================================================================

CREATE OR REPLACE VIEW seo_unified_daily_plus AS
SELECT
  -- Use date from either sud OR speed (whichever exists)
  COALESCE(sud.date, speed.date) as date,

  -- All GA4 Metrics (may be null if only Speed Insights data exists)
  sud.ga4_users,
  sud.ga4_new_users,
  sud.ga4_sessions,
  sud.ga4_engaged_sessions,
  sud.ga4_engagement_rate,
  sud.ga4_bounce_rate,
  sud.ga4_avg_duration,
  sud.ga4_pages_per_session,
  sud.ga4_conversions,
  sud.ga4_conversion_rate,

  -- GA4 Traffic Sources
  sud.ga4_organic,
  sud.ga4_direct,
  sud.ga4_referral,
  sud.ga4_social,
  sud.ga4_paid,

  -- GA4 Devices
  sud.ga4_mobile,
  sud.ga4_desktop,
  sud.ga4_tablet,

  -- GA4 Top Pages (JSONB)
  sud.ga4_top_pages,

  -- GSC Metrics
  sud.gsc_clicks,
  sud.gsc_impressions,
  sud.gsc_ctr,
  sud.gsc_position,

  -- GSC Top Queries/Pages (JSONB)
  sud.gsc_top_queries,
  sud.gsc_top_pages,

  -- Semrush Metrics
  sud.semrush_keywords,
  sud.semrush_traffic,
  sud.semrush_traffic_value_cents,
  sud.semrush_rank,
  sud.semrush_authority,
  sud.semrush_backlinks,
  sud.semrush_referring_domains,
  sud.semrush_top_keywords,

  -- Speed Insights Aggregations (across all pages)
  ROUND(AVG(speed.lcp_p75), 1) as avg_lcp_p75,
  ROUND(AVG(speed.inp_p75), 1) as avg_inp_p75,
  ROUND(AVG(speed.cls_p75), 3) as avg_cls_p75,
  ROUND(AVG(speed.ttfb_p75), 1) as avg_ttfb_p75,
  ROUND(AVG(speed.fcp_p75), 1) as avg_fcp_p75,

  -- Total samples
  COALESCE(SUM(speed.sample_count), 0) as speed_samples,

  -- Worst performance status (priority: CRIT > WARN > GOOD)
  CASE
    WHEN COUNT(*) FILTER (WHERE speed.perf_status = 'CRIT') > 0 THEN 'CRIT'
    WHEN COUNT(*) FILTER (WHERE speed.perf_status = 'WARN') > 0 THEN 'WARN'
    WHEN COUNT(*) FILTER (WHERE speed.perf_status IS NOT NULL) > 0 THEN 'GOOD'
    ELSE NULL
  END as perf_status,

  -- Mobile vs Desktop performance gap
  MAX(CASE WHEN speed.device = 'mobile' THEN speed.lcp_p75 END) as mobile_lcp_p75,
  MAX(CASE WHEN speed.device = 'desktop' THEN speed.lcp_p75 END) as desktop_lcp_p75,

  -- Performance by device count
  COUNT(*) FILTER (WHERE speed.device = 'mobile') as mobile_samples,
  COUNT(*) FILTER (WHERE speed.device = 'desktop') as desktop_samples

FROM seo_unified_daily sud
FULL OUTER JOIN vercel_speed_insights_daily speed
  ON sud.date = speed.date
GROUP BY
  COALESCE(sud.date, speed.date),
  sud.ga4_users, sud.ga4_new_users, sud.ga4_sessions,
  sud.ga4_engaged_sessions, sud.ga4_engagement_rate, sud.ga4_bounce_rate,
  sud.ga4_avg_duration, sud.ga4_pages_per_session,
  sud.ga4_conversions, sud.ga4_conversion_rate,
  sud.ga4_organic, sud.ga4_direct, sud.ga4_referral, sud.ga4_social, sud.ga4_paid,
  sud.ga4_mobile, sud.ga4_desktop, sud.ga4_tablet,
  sud.ga4_top_pages,
  sud.gsc_clicks, sud.gsc_impressions, sud.gsc_ctr, sud.gsc_position,
  sud.gsc_top_queries, sud.gsc_top_pages,
  sud.semrush_keywords, sud.semrush_traffic, sud.semrush_traffic_value_cents,
  sud.semrush_rank, sud.semrush_authority, sud.semrush_backlinks,
  sud.semrush_referring_domains, sud.semrush_top_keywords
ORDER BY COALESCE(sud.date, speed.date) DESC;

-- ============================================================================
-- Validation query (should now return today's row with Speed Insights data)
-- SELECT * FROM seo_unified_daily_plus WHERE date = CURRENT_DATE;
-- ============================================================================
