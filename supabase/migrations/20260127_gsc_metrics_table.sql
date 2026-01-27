-- =====================================================
-- MIGRATION: Google Search Console Metrics Table
-- Date: 2026-01-27
-- =====================================================

-- Table pour stocker les métriques Google Search Console quotidiennes
CREATE TABLE IF NOT EXISTS seo_gsc_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  date DATE NOT NULL,

  -- Métriques globales
  total_clicks INT NOT NULL DEFAULT 0,
  total_impressions INT NOT NULL DEFAULT 0,
  avg_ctr NUMERIC(10, 4) NOT NULL DEFAULT 0,
  avg_position NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Top queries (JSON array)
  top_queries JSONB,

  -- Top pages (JSON array)
  top_pages JSONB,

  -- Breakdown par device (JSON object)
  device_breakdown JSONB,

  -- Breakdown par country (JSON object)
  country_breakdown JSONB,

  -- Metadata
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique
  UNIQUE(date, domain)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gsc_metrics_date ON seo_gsc_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_metrics_domain ON seo_gsc_metrics_daily(domain);
CREATE INDEX IF NOT EXISTS idx_gsc_metrics_domain_date ON seo_gsc_metrics_daily(domain, date DESC);

-- RLS (Row Level Security)
ALTER TABLE seo_gsc_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Service role accès complet
DROP POLICY IF EXISTS "Service role full access" ON seo_gsc_metrics_daily;
CREATE POLICY "Service role full access" ON seo_gsc_metrics_daily
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Lecture authentifiée
DROP POLICY IF EXISTS "Authenticated read access" ON seo_gsc_metrics_daily;
CREATE POLICY "Authenticated read access" ON seo_gsc_metrics_daily
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE seo_gsc_metrics_daily IS 'Métriques quotidiennes Google Search Console';
COMMENT ON COLUMN seo_gsc_metrics_daily.total_clicks IS 'Nombre total de clics depuis la recherche Google';
COMMENT ON COLUMN seo_gsc_metrics_daily.total_impressions IS 'Nombre total d''impressions dans les résultats de recherche';
COMMENT ON COLUMN seo_gsc_metrics_daily.avg_ctr IS 'Taux de clics moyen (CTR)';
COMMENT ON COLUMN seo_gsc_metrics_daily.avg_position IS 'Position moyenne dans les résultats de recherche';
COMMENT ON COLUMN seo_gsc_metrics_daily.top_queries IS 'Top 20 des requêtes de recherche avec métriques';
COMMENT ON COLUMN seo_gsc_metrics_daily.top_pages IS 'Top 20 des pages avec métriques';
COMMENT ON COLUMN seo_gsc_metrics_daily.device_breakdown IS 'Répartition par type d''appareil (desktop, mobile, tablet)';
COMMENT ON COLUMN seo_gsc_metrics_daily.country_breakdown IS 'Répartition par pays';
