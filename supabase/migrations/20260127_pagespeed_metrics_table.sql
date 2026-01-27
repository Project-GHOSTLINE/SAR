-- =====================================================
-- MIGRATION: PageSpeed Insights & Core Web Vitals
-- Date: 2026-01-27
-- Performance Monitoring
-- =====================================================

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS seo_pagespeed_metrics_daily CASCADE;

-- Créer la table
CREATE TABLE seo_pagespeed_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  date DATE NOT NULL,

  -- Performance Scores (0-100)
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  seo_score INTEGER,
  pwa_score INTEGER,

  -- Core Web Vitals (milliseconds or score)
  fcp_ms INTEGER, -- First Contentful Paint
  lcp_ms INTEGER, -- Largest Contentful Paint
  cls_score NUMERIC(5,3), -- Cumulative Layout Shift
  fid_ms INTEGER, -- First Input Delay
  tti_ms INTEGER, -- Time to Interactive
  tbt_ms INTEGER, -- Total Blocking Time
  speed_index INTEGER,

  -- Categories
  fcp_category TEXT, -- 'FAST', 'AVERAGE', 'SLOW'
  lcp_category TEXT,
  cls_category TEXT,
  fid_category TEXT,

  -- Full Lighthouse data
  lighthouse_data JSONB,

  -- Device type
  device_type TEXT DEFAULT 'mobile', -- 'mobile' or 'desktop'

  -- Metadata
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unique
  CONSTRAINT seo_pagespeed_daily_unique UNIQUE(url, date, device_type)
);

-- Index pour améliorer les performances
CREATE INDEX idx_pagespeed_date ON seo_pagespeed_metrics_daily(date DESC);
CREATE INDEX idx_pagespeed_url ON seo_pagespeed_metrics_daily(url);
CREATE INDEX idx_pagespeed_url_date ON seo_pagespeed_metrics_daily(url, date DESC);
CREATE INDEX idx_pagespeed_performance ON seo_pagespeed_metrics_daily(performance_score DESC);

-- RLS (Row Level Security)
ALTER TABLE seo_pagespeed_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: Service role accès complet
CREATE POLICY "Service role full access" ON seo_pagespeed_metrics_daily
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Lecture authentifiée
CREATE POLICY "Authenticated read access" ON seo_pagespeed_metrics_daily
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE seo_pagespeed_metrics_daily IS 'Métriques quotidiennes Google PageSpeed Insights et Core Web Vitals';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.url IS 'URL de la page testée';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.performance_score IS 'Score de performance Lighthouse (0-100)';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.fcp_ms IS 'First Contentful Paint en millisecondes';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.lcp_ms IS 'Largest Contentful Paint en millisecondes';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.cls_score IS 'Cumulative Layout Shift score';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.fid_ms IS 'First Input Delay en millisecondes';
COMMENT ON COLUMN seo_pagespeed_metrics_daily.lighthouse_data IS 'Données complètes du rapport Lighthouse';
