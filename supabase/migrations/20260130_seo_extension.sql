-- ============================================================================
-- SEO MODULE EXTENSION - Phase 1
-- Date: 2026-01-30
-- Purpose: Speed Insights + Unified Views + Performance Indexes
-- Mode: EXTENSION (no breaking changes)
-- ============================================================================

-- ============================================================================
-- PART 1: SPEED INSIGHTS TABLES
-- ============================================================================

-- Table 1: Raw data from Vercel Drain
-- Stores unprocessed payloads from Vercel Speed Insights webhook
CREATE TABLE IF NOT EXISTS vercel_speed_insights_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Raw payload from Vercel (JSONB for flexibility)
  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  -- Extraction (for quick queries without parsing JSONB)
  extracted_url TEXT,
  extracted_device TEXT,  -- mobile/desktop/tablet
  extracted_lcp NUMERIC,
  extracted_inp NUMERIC,
  extracted_cls NUMERIC,
  extracted_ttfb NUMERIC,
  extracted_fcp NUMERIC,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for raw data
CREATE INDEX IF NOT EXISTS idx_speed_raw_received
  ON vercel_speed_insights_raw(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_speed_raw_processed
  ON vercel_speed_insights_raw(processed)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_speed_raw_url
  ON vercel_speed_insights_raw(extracted_url)
  WHERE extracted_url IS NOT NULL;

-- ============================================================================

-- Table 2: Aggregated daily metrics
-- Stores daily aggregations (p50/p75/p95) per page/device
CREATE TABLE IF NOT EXISTS vercel_speed_insights_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dimensions
  date DATE NOT NULL,
  path TEXT NOT NULL,
  device TEXT NOT NULL,  -- mobile/desktop/tablet

  -- Core Web Vitals (p75 = Google recommendation)
  lcp_p75 NUMERIC,  -- Largest Contentful Paint (ms)
  inp_p75 NUMERIC,  -- Interaction to Next Paint (ms)
  cls_p75 NUMERIC,  -- Cumulative Layout Shift (0-1)
  ttfb_p75 NUMERIC, -- Time to First Byte (ms)
  fcp_p75 NUMERIC,  -- First Contentful Paint (ms)

  -- Additional percentiles (if available)
  lcp_p50 NUMERIC,
  lcp_p95 NUMERIC,
  inp_p50 NUMERIC,
  inp_p95 NUMERIC,
  cls_p50 NUMERIC,
  cls_p95 NUMERIC,
  ttfb_p50 NUMERIC,
  ttfb_p95 NUMERIC,

  -- Samples
  sample_count INTEGER NOT NULL DEFAULT 0,

  -- Performance status (computed)
  -- GOOD: all metrics pass
  -- WARN: some metrics borderline
  -- CRIT: some metrics fail
  perf_status TEXT CHECK (perf_status IN ('GOOD', 'WARN', 'CRIT')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(date, path, device)
);

-- Indexes for daily aggregations
CREATE INDEX IF NOT EXISTS idx_speed_daily_date
  ON vercel_speed_insights_daily(date DESC);

CREATE INDEX IF NOT EXISTS idx_speed_daily_date_path
  ON vercel_speed_insights_daily(date DESC, path);

CREATE INDEX IF NOT EXISTS idx_speed_daily_date_device
  ON vercel_speed_insights_daily(date DESC, device);

CREATE INDEX IF NOT EXISTS idx_speed_daily_status
  ON vercel_speed_insights_daily(perf_status)
  WHERE perf_status IN ('WARN', 'CRIT');

CREATE INDEX IF NOT EXISTS idx_speed_daily_lcp
  ON vercel_speed_insights_daily(lcp_p75 DESC NULLS LAST);

-- ============================================================================
-- PART 2: UNIFIED VIEWS
-- ============================================================================

-- View 1: seo_unified_daily
-- Combines GA4 + GSC + Semrush by date
CREATE OR REPLACE VIEW seo_unified_daily AS
SELECT
  COALESCE(ga4.date, gsc.date, sem.date) as date,

  -- GA4 Metrics
  ga4.users as ga4_users,
  ga4.new_users as ga4_new_users,
  ga4.sessions as ga4_sessions,
  ga4.engaged_sessions as ga4_engaged_sessions,
  ga4.engagement_rate as ga4_engagement_rate,
  ga4.bounce_rate as ga4_bounce_rate,
  ga4.average_session_duration as ga4_avg_duration,
  ga4.pages_per_session as ga4_pages_per_session,
  ga4.conversions as ga4_conversions,
  ga4.conversion_rate as ga4_conversion_rate,

  -- GA4 Traffic Sources
  ga4.organic_traffic as ga4_organic,
  ga4.direct_traffic as ga4_direct,
  ga4.referral_traffic as ga4_referral,
  ga4.social_traffic as ga4_social,
  ga4.paid_traffic as ga4_paid,

  -- GA4 Devices
  ga4.mobile_users as ga4_mobile,
  ga4.desktop_users as ga4_desktop,
  ga4.tablet_users as ga4_tablet,

  -- GA4 Top Pages (JSONB)
  ga4.top_pages as ga4_top_pages,

  -- GSC Metrics
  gsc.total_clicks as gsc_clicks,
  gsc.total_impressions as gsc_impressions,
  gsc.avg_ctr as gsc_ctr,
  gsc.avg_position as gsc_position,

  -- GSC Top Queries (JSONB)
  gsc.top_queries as gsc_top_queries,
  gsc.top_pages as gsc_top_pages,

  -- Semrush Metrics
  sem.organic_keywords as semrush_keywords,
  sem.organic_traffic as semrush_traffic,
  sem.organic_traffic_cost as semrush_traffic_value_cents,
  sem.domain_rank as semrush_rank,
  sem.authority_score as semrush_authority,
  sem.total_backlinks as semrush_backlinks,
  sem.referring_domains as semrush_referring_domains,

  -- Semrush Top Keywords (JSONB)
  sem.top_organic_keywords as semrush_top_keywords

FROM seo_ga4_metrics_daily ga4
FULL OUTER JOIN seo_gsc_metrics_daily gsc
  ON ga4.date = gsc.date
FULL OUTER JOIN seo_semrush_domain_daily sem
  ON COALESCE(ga4.date, gsc.date) = sem.date
ORDER BY date DESC;

-- ============================================================================

-- View 2: seo_unified_daily_plus
-- Adds Speed Insights to seo_unified_daily
CREATE OR REPLACE VIEW seo_unified_daily_plus AS
SELECT
  sud.*,

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
LEFT JOIN vercel_speed_insights_daily speed
  ON sud.date = speed.date
GROUP BY
  sud.date,
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
ORDER BY sud.date DESC;

-- ============================================================================

-- View 3: ip_to_seo_segment
-- Maps IP hash to activity/attribution (INVESTIGATION view)
-- Based on telemetry_requests (78k+ rows)
CREATE OR REPLACE VIEW ip_to_seo_segment AS
SELECT
  tr.ip_hash as ip,

  -- Time range
  MIN(tr.created_at) as first_seen,
  MAX(tr.created_at) as last_seen,

  -- Landing page (first path visited)
  (ARRAY_AGG(tr.path ORDER BY tr.created_at ASC) FILTER (WHERE tr.path IS NOT NULL))[1] as landing_page,

  -- Most common path
  MODE() WITHIN GROUP (ORDER BY tr.path) as most_visited_page,

  -- Activity metrics
  COUNT(*) as total_requests,
  COUNT(DISTINCT DATE(tr.created_at)) as active_days,
  COUNT(DISTINCT tr.path) as unique_pages,

  -- Performance metrics
  ROUND(AVG(tr.duration_ms)::numeric, 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tr.duration_ms)::numeric, 0) as p50_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms)::numeric, 0) as p95_duration_ms,

  -- Status distribution
  COUNT(*) FILTER (WHERE tr.status >= 200 AND tr.status < 300) as success_count,
  COUNT(*) FILTER (WHERE tr.status >= 400 AND tr.status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE tr.status >= 500) as server_error_count,

  -- Device info (from meta_redacted if available)
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'device') as device,

  -- UTM info (from meta_redacted if available)
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_source') as utm_source,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_medium') as utm_medium,
  MODE() WITHIN GROUP (ORDER BY tr.meta_redacted->>'utm_campaign') as utm_campaign,

  -- Vercel region
  MODE() WITHIN GROUP (ORDER BY tr.vercel_region) as vercel_region,

  -- Environment
  MODE() WITHIN GROUP (ORDER BY tr.env) as env

FROM telemetry_requests tr
WHERE tr.ip_hash IS NOT NULL
  AND tr.env = 'production'
  AND tr.created_at >= NOW() - INTERVAL '90 days'  -- Last 90 days only
GROUP BY tr.ip_hash
HAVING COUNT(*) >= 2  -- Minimum 2 requests to be included
ORDER BY last_seen DESC;

-- ============================================================================
-- PART 3: PERFORMANCE INDEXES
-- ============================================================================

-- GA4 Indexes
CREATE INDEX IF NOT EXISTS idx_ga4_date
  ON seo_ga4_metrics_daily(date DESC);

CREATE INDEX IF NOT EXISTS idx_ga4_date_measurement
  ON seo_ga4_metrics_daily(date DESC, measurement_id);

CREATE INDEX IF NOT EXISTS idx_ga4_users
  ON seo_ga4_metrics_daily(users DESC);

CREATE INDEX IF NOT EXISTS idx_ga4_conversions
  ON seo_ga4_metrics_daily(conversions DESC);

-- GSC Indexes
CREATE INDEX IF NOT EXISTS idx_gsc_date
  ON seo_gsc_metrics_daily(date DESC);

CREATE INDEX IF NOT EXISTS idx_gsc_date_domain
  ON seo_gsc_metrics_daily(date DESC, domain);

CREATE INDEX IF NOT EXISTS idx_gsc_clicks
  ON seo_gsc_metrics_daily(total_clicks DESC);

-- Semrush Indexes
CREATE INDEX IF NOT EXISTS idx_semrush_date
  ON seo_semrush_domain_daily(date DESC);

CREATE INDEX IF NOT EXISTS idx_semrush_keywords
  ON seo_semrush_domain_daily(organic_keywords DESC);

CREATE INDEX IF NOT EXISTS idx_semrush_traffic
  ON seo_semrush_domain_daily(organic_traffic DESC);

-- Telemetry Indexes (for ip_to_seo_segment performance)
CREATE INDEX IF NOT EXISTS idx_telemetry_ip_created
  ON telemetry_requests(ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL AND env = 'production';

CREATE INDEX IF NOT EXISTS idx_telemetry_ip_path
  ON telemetry_requests(ip_hash, path)
  WHERE ip_hash IS NOT NULL AND env = 'production';

CREATE INDEX IF NOT EXISTS idx_telemetry_created_90d
  ON telemetry_requests(created_at DESC)
  WHERE env = 'production';

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to determine perf_status based on Core Web Vitals
CREATE OR REPLACE FUNCTION calculate_perf_status(
  lcp NUMERIC,
  inp NUMERIC,
  cls NUMERIC,
  ttfb NUMERIC
) RETURNS TEXT AS $$
BEGIN
  -- Google thresholds:
  -- LCP: < 2500ms = GOOD, < 4000ms = WARN, >= 4000ms = CRIT
  -- INP: < 200ms = GOOD, < 500ms = WARN, >= 500ms = CRIT
  -- CLS: < 0.1 = GOOD, < 0.25 = WARN, >= 0.25 = CRIT
  -- TTFB: < 800ms = GOOD, < 1800ms = WARN, >= 1800ms = CRIT

  IF (lcp >= 4000 OR inp >= 500 OR cls >= 0.25 OR ttfb >= 1800) THEN
    RETURN 'CRIT';
  ELSIF (lcp >= 2500 OR inp >= 200 OR cls >= 0.1 OR ttfb >= 800) THEN
    RETURN 'WARN';
  ELSE
    RETURN 'GOOD';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 5: VALIDATION QUERIES (COMMENT BEFORE RUNNING IN PROD)
-- ============================================================================

-- Test View 1: seo_unified_daily
-- SELECT * FROM seo_unified_daily ORDER BY date DESC LIMIT 7;

-- Test View 2: seo_unified_daily_plus
-- SELECT * FROM seo_unified_daily_plus ORDER BY date DESC LIMIT 7;

-- Test View 3: ip_to_seo_segment
-- SELECT * FROM ip_to_seo_segment ORDER BY last_seen DESC LIMIT 10;

-- Test Speed Insights tables exist
-- SELECT COUNT(*) FROM vercel_speed_insights_raw;
-- SELECT COUNT(*) FROM vercel_speed_insights_daily;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ 2 tables created (vercel_speed_insights_raw, vercel_speed_insights_daily)
-- ✅ 3 views created (seo_unified_daily, seo_unified_daily_plus, ip_to_seo_segment)
-- ✅ 16 indexes created (performance optimization)
-- ✅ 1 helper function created (calculate_perf_status)
--
-- Next steps:
-- 1. Run this migration: psql -f 20260130_seo_extension.sql
-- 2. Verify views return data: SELECT * FROM seo_unified_daily LIMIT 1;
-- 3. Install Speed Insights SDK
-- 4. Configure Vercel Drain
-- 5. Create aggregation job
-- 6. Build API wrappers
-- 7. Build UI

-- ============================================================================
