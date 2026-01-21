-- ============================================
-- SEO METRICS SYSTEM
-- ============================================
-- Description: Système complet pour enregistrer et analyser les métriques SEO
-- Date: 2026-01-21
-- Services: Google Analytics 4, Google Search Console, Semrush
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: Google Analytics 4 Metrics (Daily)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_ga4_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  measurement_id TEXT NOT NULL DEFAULT 'G-F130RBTZDC',
  property_id TEXT NOT NULL DEFAULT '340237010',
  date DATE NOT NULL,

  -- Traffic Metrics
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  engaged_sessions INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,

  -- Behavior Metrics
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  average_session_duration NUMERIC(10,2) DEFAULT 0, -- en secondes
  pages_per_session NUMERIC(5,2) DEFAULT 0,

  -- Conversion Metrics
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,

  -- Traffic Sources
  organic_traffic INTEGER DEFAULT 0,
  direct_traffic INTEGER DEFAULT 0,
  referral_traffic INTEGER DEFAULT 0,
  social_traffic INTEGER DEFAULT 0,
  paid_traffic INTEGER DEFAULT 0,
  email_traffic INTEGER DEFAULT 0,

  -- Device Breakdown
  desktop_users INTEGER DEFAULT 0,
  mobile_users INTEGER DEFAULT 0,
  tablet_users INTEGER DEFAULT 0,

  -- Top Pages (JSON array of objects)
  top_pages JSONB DEFAULT '[]',
  -- Format: [{"page": "/", "views": 1234, "users": 456}, ...]

  -- Top Sources (JSON array of objects)
  top_sources JSONB DEFAULT '[]',
  -- Format: [{"source": "google", "medium": "organic", "users": 789}, ...]

  -- Events
  total_events INTEGER DEFAULT 0,
  top_events JSONB DEFAULT '[]',
  -- Format: [{"event_name": "page_view", "count": 5000}, ...]

  -- E-commerce (si applicable)
  transactions INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  average_order_value_cents INTEGER DEFAULT 0,

  -- Raw Data (pour debug)
  raw_data JSONB,

  -- Metadata
  collected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Contrainte unique par jour
  UNIQUE(date, measurement_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_ga4_date ON seo_ga4_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_date_measurement ON seo_ga4_metrics_daily(date, measurement_id);

-- RLS
ALTER TABLE seo_ga4_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read ga4" ON seo_ga4_metrics_daily FOR SELECT USING (true);
CREATE POLICY "Allow service role all ga4" ON seo_ga4_metrics_daily FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLE 2: Google Search Console Metrics (Daily)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_gsc_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  site_url TEXT NOT NULL DEFAULT 'https://solutionargentrapide.ca',
  date DATE NOT NULL,

  -- Core Metrics
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0, -- Click-through rate %
  average_position NUMERIC(5,2) DEFAULT 0,

  -- Top Queries
  top_queries JSONB DEFAULT '[]',
  -- Format: [{"query": "prêt rapide", "clicks": 50, "impressions": 1000, "ctr": 5.0, "position": 3.5}, ...]

  -- Top Pages
  top_pages JSONB DEFAULT '[]',
  -- Format: [{"page": "/demande", "clicks": 200, "impressions": 5000, "ctr": 4.0}, ...]

  -- Device Breakdown
  desktop_clicks INTEGER DEFAULT 0,
  mobile_clicks INTEGER DEFAULT 0,
  tablet_clicks INTEGER DEFAULT 0,

  -- Country Breakdown
  top_countries JSONB DEFAULT '[]',
  -- Format: [{"country": "CAN", "clicks": 300, "impressions": 8000}, ...]

  -- Search Appearance
  desktop_impressions INTEGER DEFAULT 0,
  mobile_impressions INTEGER DEFAULT 0,
  rich_results_impressions INTEGER DEFAULT 0,

  -- Indexing Status (snapshot du jour)
  total_indexed_pages INTEGER DEFAULT 0,
  total_submitted_pages INTEGER DEFAULT 0,
  coverage_issues INTEGER DEFAULT 0,

  -- Raw Data
  raw_data JSONB,

  -- Metadata
  collected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Contrainte unique par jour
  UNIQUE(date, site_url)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_gsc_date ON seo_gsc_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_date_site ON seo_gsc_metrics_daily(date, site_url);

-- RLS
ALTER TABLE seo_gsc_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read gsc" ON seo_gsc_metrics_daily FOR SELECT USING (true);
CREATE POLICY "Allow service role all gsc" ON seo_gsc_metrics_daily FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLE 3: Semrush Domain Overview (Daily)
-- ============================================
CREATE TABLE IF NOT EXISTS seo_semrush_domain_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  domain TEXT NOT NULL DEFAULT 'solutionargentrapide.ca',
  date DATE NOT NULL,

  -- Domain Rank
  domain_rank INTEGER DEFAULT 0,
  domain_rank_change INTEGER DEFAULT 0,

  -- Organic Search
  organic_keywords INTEGER DEFAULT 0,
  organic_traffic INTEGER DEFAULT 0,
  organic_traffic_cost INTEGER DEFAULT 0, -- Valeur en cents
  organic_positions_distribution JSONB DEFAULT '{}',
  -- Format: {"top3": 5, "4-10": 20, "11-20": 50, "21-50": 100, "51+": 200}

  -- Paid Search
  paid_keywords INTEGER DEFAULT 0,
  paid_traffic INTEGER DEFAULT 0,
  paid_traffic_cost INTEGER DEFAULT 0,

  -- Backlinks
  total_backlinks INTEGER DEFAULT 0,
  referring_domains INTEGER DEFAULT 0,
  referring_ips INTEGER DEFAULT 0,
  follow_backlinks INTEGER DEFAULT 0,
  nofollow_backlinks INTEGER DEFAULT 0,

  -- Authority Score
  authority_score INTEGER DEFAULT 0,

  -- Top Keywords
  top_organic_keywords JSONB DEFAULT '[]',
  -- Format: [{"keyword": "prêt rapide", "position": 3, "volume": 1000, "difficulty": 45}, ...]

  -- Competitors
  top_competitors JSONB DEFAULT '[]',
  -- Format: [{"domain": "competitor.ca", "common_keywords": 50, "organic_traffic": 5000}, ...]

  -- Raw Data
  raw_data JSONB,

  -- Metadata
  collected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Contrainte unique par jour
  UNIQUE(date, domain)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_semrush_date ON seo_semrush_domain_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_semrush_date_domain ON seo_semrush_domain_daily(date, domain);

-- RLS
ALTER TABLE seo_semrush_domain_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read semrush" ON seo_semrush_domain_daily FOR SELECT USING (true);
CREATE POLICY "Allow service role all semrush" ON seo_semrush_domain_daily FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLE 4: SEO Keywords Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS seo_keywords_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Keyword Info
  keyword TEXT NOT NULL,
  target_url TEXT,
  category TEXT, -- Ex: "prêt", "crédit", "financement"
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical

  -- Current Stats
  current_position INTEGER,
  previous_position INTEGER,
  position_change INTEGER DEFAULT 0,

  -- Search Volume
  search_volume INTEGER DEFAULT 0,
  keyword_difficulty INTEGER DEFAULT 0,

  -- Traffic Potential
  estimated_traffic INTEGER DEFAULT 0,
  estimated_value_cents INTEGER DEFAULT 0,

  -- Tracking Status
  active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,

  -- History (JSON array)
  position_history JSONB DEFAULT '[]',
  -- Format: [{"date": "2026-01-21", "position": 5}, ...]

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Contrainte unique par keyword
  UNIQUE(keyword)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_keywords_active ON seo_keywords_tracking(active, keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_priority ON seo_keywords_tracking(priority, active);

-- RLS
ALTER TABLE seo_keywords_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all keywords" ON seo_keywords_tracking FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLE 5: SEO Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS seo_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit Info
  audit_type TEXT NOT NULL, -- 'technical', 'content', 'backlinks', 'competitors'
  severity TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'

  -- Issue Details
  category TEXT NOT NULL, -- Ex: 'broken_links', 'missing_meta', 'slow_page'
  title TEXT NOT NULL,
  description TEXT,
  affected_url TEXT,

  -- Resolution
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'ignored'
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  -- Impact
  impact_score INTEGER DEFAULT 0, -- 0-100
  priority INTEGER DEFAULT 0, -- 0-10

  -- Technical Details
  technical_details JSONB,
  screenshot_url TEXT,

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_audit_status ON seo_audit_log(status, severity);
CREATE INDEX IF NOT EXISTS idx_audit_detected ON seo_audit_log(detected_at DESC);

-- RLS
ALTER TABLE seo_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all audit" ON seo_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TABLE 6: SEO Data Collection Jobs
-- ============================================
CREATE TABLE IF NOT EXISTS seo_collection_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job Info
  job_type TEXT NOT NULL, -- 'ga4_daily', 'gsc_daily', 'semrush_daily', 'keyword_check'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed'

  -- Execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Error Handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Schedule Info
  scheduled_for TIMESTAMPTZ,
  triggered_by TEXT, -- 'cron', 'manual', 'webhook'

  -- Raw Response (pour debug)
  raw_response JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_jobs_status ON seo_collection_jobs(status, job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON seo_collection_jobs(scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON seo_collection_jobs(created_at DESC);

-- RLS
ALTER TABLE seo_collection_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all jobs" ON seo_collection_jobs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_seo_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_ga4_metrics_updated_at
  BEFORE UPDATE ON seo_ga4_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

CREATE TRIGGER update_gsc_metrics_updated_at
  BEFORE UPDATE ON seo_gsc_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

CREATE TRIGGER update_semrush_domain_updated_at
  BEFORE UPDATE ON seo_semrush_domain_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

CREATE TRIGGER update_keywords_tracking_updated_at
  BEFORE UPDATE ON seo_keywords_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

CREATE TRIGGER update_audit_log_updated_at
  BEFORE UPDATE ON seo_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

CREATE TRIGGER update_collection_jobs_updated_at
  BEFORE UPDATE ON seo_collection_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_seo_updated_at_column();

-- Function: Calculer les changements de position pour les keywords
CREATE OR REPLACE FUNCTION calculate_keyword_position_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_position IS NOT NULL AND NEW.previous_position IS NOT NULL THEN
    NEW.position_change = NEW.previous_position - NEW.current_position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_keyword_position_change_trigger
  BEFORE INSERT OR UPDATE ON seo_keywords_tracking
  FOR EACH ROW
  EXECUTE FUNCTION calculate_keyword_position_change();

-- ============================================
-- VIEWS
-- ============================================

-- Vue: Résumé SEO (dernières 30 jours)
CREATE OR REPLACE VIEW seo_summary_30d AS
SELECT
  -- Google Analytics
  COALESCE(SUM(ga.users), 0) as total_users_30d,
  COALESCE(SUM(ga.sessions), 0) as total_sessions_30d,
  COALESCE(AVG(ga.engagement_rate), 0) as avg_engagement_rate_30d,
  COALESCE(AVG(ga.bounce_rate), 0) as avg_bounce_rate_30d,
  COALESCE(SUM(ga.organic_traffic), 0) as total_organic_traffic_30d,

  -- Google Search Console
  COALESCE(SUM(gsc.clicks), 0) as total_clicks_30d,
  COALESCE(SUM(gsc.impressions), 0) as total_impressions_30d,
  COALESCE(AVG(gsc.ctr), 0) as avg_ctr_30d,
  COALESCE(AVG(gsc.average_position), 0) as avg_position_30d,

  -- Semrush
  MAX(sr.organic_keywords) as current_organic_keywords,
  MAX(sr.total_backlinks) as current_total_backlinks,
  MAX(sr.authority_score) as current_authority_score,

  -- Keywords Tracking
  (SELECT COUNT(*) FROM seo_keywords_tracking WHERE active = true AND current_position <= 10) as keywords_top_10,
  (SELECT COUNT(*) FROM seo_keywords_tracking WHERE active = true AND position_change > 0) as keywords_improved,
  (SELECT COUNT(*) FROM seo_keywords_tracking WHERE active = true AND position_change < 0) as keywords_declined

FROM seo_ga4_metrics_daily ga
LEFT JOIN seo_gsc_metrics_daily gsc ON ga.date = gsc.date
LEFT JOIN seo_semrush_domain_daily sr ON ga.date = sr.date
WHERE ga.date >= CURRENT_DATE - INTERVAL '30 days';

-- Vue: Top Keywords Performance
CREATE OR REPLACE VIEW seo_top_keywords AS
SELECT
  keyword,
  current_position,
  previous_position,
  position_change,
  search_volume,
  estimated_traffic,
  priority,
  last_checked_at
FROM seo_keywords_tracking
WHERE active = true
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END,
  current_position ASC NULLS LAST
LIMIT 50;

-- Vue: Audit Issues à Résoudre
CREATE OR REPLACE VIEW seo_pending_issues AS
SELECT
  id,
  audit_type,
  severity,
  category,
  title,
  affected_url,
  impact_score,
  priority,
  detected_at,
  EXTRACT(DAY FROM (now() - detected_at)) as days_open
FROM seo_audit_log
WHERE status IN ('open', 'in_progress')
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    WHEN 'info' THEN 4
    ELSE 5
  END,
  priority DESC,
  detected_at ASC;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE seo_ga4_metrics_daily IS 'Métriques quotidiennes de Google Analytics 4';
COMMENT ON TABLE seo_gsc_metrics_daily IS 'Métriques quotidiennes de Google Search Console';
COMMENT ON TABLE seo_semrush_domain_daily IS 'Métriques quotidiennes du domaine depuis Semrush';
COMMENT ON TABLE seo_keywords_tracking IS 'Suivi des mots-clés stratégiques et leurs positions';
COMMENT ON TABLE seo_audit_log IS 'Journal des audits SEO et problèmes détectés';
COMMENT ON TABLE seo_collection_jobs IS 'Historique des jobs de collecte de données SEO';

-- ============================================
-- DONNÉES INITIALES (Exemples)
-- ============================================

-- Ajouter quelques keywords stratégiques à suivre
INSERT INTO seo_keywords_tracking (keyword, category, priority, search_volume, target_url) VALUES
  ('prêt rapide', 'prêt', 'critical', 2400, 'https://solutionargentrapide.ca'),
  ('prêt argent rapide', 'prêt', 'critical', 1900, 'https://solutionargentrapide.ca'),
  ('prêt personnel rapide', 'prêt', 'high', 1200, 'https://solutionargentrapide.ca'),
  ('prêt en ligne rapide', 'prêt', 'high', 880, 'https://solutionargentrapide.ca'),
  ('crédit rapide canada', 'crédit', 'high', 720, 'https://solutionargentrapide.ca'),
  ('prêt urgent', 'prêt', 'medium', 590, 'https://solutionargentrapide.ca'),
  ('prêt 24h', 'prêt', 'medium', 480, 'https://solutionargentrapide.ca'),
  ('financement rapide', 'financement', 'medium', 390, 'https://solutionargentrapide.ca')
ON CONFLICT (keyword) DO NOTHING;

-- ============================================
-- VALIDATION
-- ============================================

-- Vérifier que toutes les tables sont créées
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'seo_ga4_metrics_daily',
    'seo_gsc_metrics_daily',
    'seo_semrush_domain_daily',
    'seo_keywords_tracking',
    'seo_audit_log',
    'seo_collection_jobs'
  );

  IF table_count = 6 THEN
    RAISE NOTICE '✅ SEO Metrics System: Toutes les tables créées avec succès (6/6)';
  ELSE
    RAISE WARNING '⚠️  SEO Metrics System: Seulement % tables créées sur 6', table_count;
  END IF;
END $$;
