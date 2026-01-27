-- =====================================================
-- MIGRATION: UptimeRobot Monitoring
-- Date: 2026-01-27
-- Site Uptime & Availability Monitoring
-- =====================================================

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS seo_uptime_checks CASCADE;

-- Créer la table
CREATE TABLE seo_uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id TEXT NOT NULL, -- UptimeRobot monitor ID
  monitor_name TEXT NOT NULL,
  url TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  status INTEGER NOT NULL, -- 0=Paused, 1=Not checked, 2=Up, 8=Down, 9=Down (seems)
  status_label TEXT, -- 'up', 'down', 'paused'

  -- Response
  response_time_ms INTEGER, -- Response time in milliseconds
  response_code INTEGER, -- HTTP status code

  -- Uptime Ratios
  uptime_ratio_1d NUMERIC(5,2), -- Last 24 hours
  uptime_ratio_7d NUMERIC(5,2), -- Last 7 days
  uptime_ratio_30d NUMERIC(5,2), -- Last 30 days
  uptime_ratio_90d NUMERIC(5,2), -- Last 90 days

  -- SSL
  ssl_expiry_date DATE,
  ssl_days_remaining INTEGER,

  -- Downtime
  is_down BOOLEAN DEFAULT false,
  down_reason TEXT,
  last_down_at TIMESTAMPTZ,
  last_up_at TIMESTAMPTZ,

  -- Full monitor data
  monitor_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_uptime_timestamp ON seo_uptime_checks(timestamp DESC);
CREATE INDEX idx_uptime_monitor_id ON seo_uptime_checks(monitor_id);
CREATE INDEX idx_uptime_url ON seo_uptime_checks(url);
CREATE INDEX idx_uptime_status ON seo_uptime_checks(status);
CREATE INDEX idx_uptime_is_down ON seo_uptime_checks(is_down);

-- RLS (Row Level Security)
ALTER TABLE seo_uptime_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Service role accès complet
CREATE POLICY "Service role full access" ON seo_uptime_checks
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Lecture authentifiée
CREATE POLICY "Authenticated read access" ON seo_uptime_checks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE seo_uptime_checks IS 'Checks de monitoring uptime (UptimeRobot)';
COMMENT ON COLUMN seo_uptime_checks.monitor_id IS 'ID du monitor UptimeRobot';
COMMENT ON COLUMN seo_uptime_checks.status IS 'Status: 0=Paused, 1=Not checked, 2=Up, 8=Down, 9=Seems down';
COMMENT ON COLUMN seo_uptime_checks.response_time_ms IS 'Temps de réponse en millisecondes';
COMMENT ON COLUMN seo_uptime_checks.uptime_ratio_30d IS 'Ratio d''uptime sur les 30 derniers jours (%)';
COMMENT ON COLUMN seo_uptime_checks.ssl_expiry_date IS 'Date d''expiration du certificat SSL';
