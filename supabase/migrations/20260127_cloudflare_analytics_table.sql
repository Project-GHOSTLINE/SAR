-- =====================================================
-- MIGRATION: Cloudflare Analytics
-- Date: 2026-01-27
-- Traffic & Security Monitoring
-- =====================================================

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS seo_cloudflare_analytics_daily CASCADE;

-- Créer la table
CREATE TABLE seo_cloudflare_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- Traffic Metrics
  total_requests BIGINT DEFAULT 0,
  cached_requests BIGINT DEFAULT 0,
  uncached_requests BIGINT DEFAULT 0,
  cache_hit_ratio NUMERIC(5,2), -- Percentage

  -- Bandwidth
  bandwidth_bytes BIGINT DEFAULT 0,
  bandwidth_cached_bytes BIGINT DEFAULT 0,
  bandwidth_uncached_bytes BIGINT DEFAULT 0,

  -- Security
  threats_blocked INTEGER DEFAULT 0,
  challenges_issued INTEGER DEFAULT 0,

  -- Bots
  bot_requests INTEGER DEFAULT 0,
  human_requests INTEGER DEFAULT 0,
  bot_percentage NUMERIC(5,2),

  -- HTTP Status Codes
  status_2xx INTEGER DEFAULT 0,
  status_3xx INTEGER DEFAULT 0,
  status_4xx INTEGER DEFAULT 0,
  status_5xx INTEGER DEFAULT 0,

  -- Geographic Distribution (top 10 countries)
  top_countries JSONB,

  -- Top Paths (top 20 URLs)
  top_paths JSONB,

  -- Device Types
  desktop_requests INTEGER DEFAULT 0,
  mobile_requests INTEGER DEFAULT 0,
  other_requests INTEGER DEFAULT 0,

  -- Full analytics data
  analytics_data JSONB,

  -- Metadata
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique
  CONSTRAINT seo_cloudflare_daily_unique UNIQUE(date)
);

-- Index pour améliorer les performances
CREATE INDEX idx_cloudflare_date ON seo_cloudflare_analytics_daily(date DESC);
CREATE INDEX idx_cloudflare_requests ON seo_cloudflare_analytics_daily(total_requests DESC);
CREATE INDEX idx_cloudflare_threats ON seo_cloudflare_analytics_daily(threats_blocked DESC);

-- RLS (Row Level Security)
ALTER TABLE seo_cloudflare_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Service role accès complet
CREATE POLICY "Service role full access" ON seo_cloudflare_analytics_daily
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Lecture authentifiée
CREATE POLICY "Authenticated read access" ON seo_cloudflare_analytics_daily
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE seo_cloudflare_analytics_daily IS 'Métriques quotidiennes Cloudflare Analytics (traffic, sécurité, performance)';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.total_requests IS 'Nombre total de requêtes HTTP';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.cached_requests IS 'Requêtes servies depuis le cache Cloudflare';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.threats_blocked IS 'Nombre de menaces bloquées par Cloudflare';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.bot_requests IS 'Requêtes identifiées comme provenant de bots';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.top_countries IS 'Top 10 pays par nombre de requêtes';
COMMENT ON COLUMN seo_cloudflare_analytics_daily.top_paths IS 'Top 20 URLs visitées';
