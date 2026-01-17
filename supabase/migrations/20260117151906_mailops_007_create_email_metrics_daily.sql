-- Mail Ops - Migration 007: Email Metrics Daily
-- Description: Métriques KPI emails par jour (agrégées via cron)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS email_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,

  -- Volumes
  emails_received INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_pending INT DEFAULT 0,

  -- Par catégorie
  category_counts JSONB DEFAULT '{}'::jsonb,

  -- Par priorité
  priority_counts JSONB DEFAULT '{}'::jsonb,

  -- Temps de réponse (seconds)
  avg_first_response_time INT,
  median_first_response_time INT,
  p95_first_response_time INT,

  -- Résolution
  resolved_count INT DEFAULT 0,
  avg_resolution_time INT,

  -- SLA
  sla_met_count INT DEFAULT 0,
  sla_missed_count INT DEFAULT 0,
  sla_compliance_rate DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_metric_date UNIQUE(metric_date)
);

-- Index
CREATE INDEX idx_email_metrics_date ON email_metrics_daily(metric_date DESC);

-- Commentaires
COMMENT ON TABLE email_metrics_daily IS 'Métriques KPI emails par jour (agrégées via cron)';
COMMENT ON COLUMN email_metrics_daily.metric_date IS 'Date métrique (1 row par jour)';
COMMENT ON COLUMN email_metrics_daily.category_counts IS 'JSON: {QUESTION_GENERALE: 10, PLAINTE: 2, ...}';
COMMENT ON COLUMN email_metrics_daily.priority_counts IS 'JSON: {low: 5, medium: 3, high: 2, urgent: 0}';
COMMENT ON COLUMN email_metrics_daily.avg_first_response_time IS 'Temps moyen première réponse (secondes)';
COMMENT ON COLUMN email_metrics_daily.sla_compliance_rate IS 'Taux conformité SLA (0.00 à 100.00)';
