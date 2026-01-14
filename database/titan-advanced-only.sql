-- ============================================
-- 🚀 TITAN - Tables Avancées Seulement
-- Ajoute les 11 tables manquantes sans toucher aux 4 existantes
-- ============================================

-- Extensions (si pas déjà activées)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. MÉTRIQUES & ANALYTICS
-- ============================================

-- Table: Logs métriques
CREATE TABLE IF NOT EXISTS metrics_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  dimension_1 TEXT, -- Ex: 'argentrapide' ou 'creditsecours'
  dimension_2 TEXT, -- Ex: 'desktop' ou 'mobile'
  dimension_3 TEXT, -- Ex: 'chrome' ou 'safari'
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_date ON metrics_log(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_dimension_1 ON metrics_log(dimension_1);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics_log(recorded_at DESC);

-- Matérialized view pour dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_daily_summary AS
SELECT
  DATE(recorded_at) as date,
  metric_name,
  dimension_1,
  COUNT(*) as count,
  SUM(value) as total_value,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  STDDEV(value) as stddev_value
FROM metrics_log
GROUP BY DATE(recorded_at), metric_name, dimension_1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_daily_summary ON metrics_daily_summary(date, metric_name, COALESCE(dimension_1, ''));

-- Fonction pour rafraîchir les métriques
CREATE OR REPLACE FUNCTION refresh_metrics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY metrics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- RLS pour metrics_log
ALTER TABLE metrics_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON metrics_log;
CREATE POLICY "Allow all" ON metrics_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. A/B TESTING
-- ============================================

-- Table: Tests A/B
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL CHECK (test_type IN ('form_steps', 'field_order', 'validation_rules', 'ui_design', 'messaging', 'other')),
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  results JSONB,
  winner TEXT CHECK (winner IN ('A', 'B', 'no_winner')),
  confidence_level NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_started_at ON ab_tests(started_at DESC);

-- RLS pour ab_tests
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON ab_tests;
CREATE POLICY "Allow all" ON ab_tests FOR ALL USING (true) WITH CHECK (true);

-- Table: Assignations A/B
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, application_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_assignments_test ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_application ON ab_test_assignments(application_id);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_variant ON ab_test_assignments(variant);

-- RLS pour ab_test_assignments
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON ab_test_assignments;
CREATE POLICY "Allow all" ON ab_test_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. WORKFLOWS & AUTOMATION
-- ============================================

-- Table: Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('application_submitted', 'status_changed', 'score_threshold', 'schedule', 'manual')),
  trigger_condition JSONB,
  actions JSONB NOT NULL,
  times_executed INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(active) WHERE active = true;

-- RLS pour workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON workflows;
CREATE POLICY "Allow all" ON workflows FOR ALL USING (true) WITH CHECK (true);

-- Table: Logs exécution workflows
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  trigger_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  actions_executed JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_application ON workflow_executions(application_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_date ON workflow_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- RLS pour workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON workflow_executions;
CREATE POLICY "Allow all" ON workflow_executions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. NOTIFICATIONS
-- ============================================

-- Table: Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(active) WHERE active = true;

-- RLS pour notification_templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON notification_templates;
CREATE POLICY "Allow all" ON notification_templates FOR ALL USING (true) WITH CHECK (true);

-- Table: Logs notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued', 'bounced')),
  provider TEXT,
  provider_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_application ON notification_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_date ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient);

-- RLS pour notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON notification_logs;
CREATE POLICY "Allow all" ON notification_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. ML/AI
-- ============================================

-- Table: Modèles ML
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('approval_prediction', 'fraud_detection', 'amount_recommendation', 'churn_prediction', 'custom')),
  version TEXT NOT NULL,
  algorithm TEXT,
  accuracy NUMERIC,
  precision_score NUMERIC,
  recall NUMERIC,
  f1_score NUMERIC,
  auc_roc NUMERIC,
  config JSONB,
  training_data_size INTEGER,
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'active', 'deprecated', 'failed')),
  trained_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_trained_at ON ml_models(trained_at DESC);

-- RLS pour ml_models
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON ml_models;
CREATE POLICY "Allow all" ON ml_models FOR ALL USING (true) WITH CHECK (true);

-- Table: Prédictions ML
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  prediction_type TEXT NOT NULL,
  prediction_value JSONB NOT NULL,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  features_used JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_application ON ml_predictions(application_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_created_at ON ml_predictions(created_at DESC);

-- RLS pour ml_predictions
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON ml_predictions;
CREATE POLICY "Allow all" ON ml_predictions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. SÉCURITÉ & AUDIT
-- ============================================

-- Table: API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit_per_hour INTEGER DEFAULT 1000,
  requests_today INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- RLS pour api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON api_keys;
CREATE POLICY "Allow all" ON api_keys FOR ALL USING (true) WITH CHECK (true);

-- Table: Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

-- RLS pour audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON audit_logs;
CREATE POLICY "Allow all" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Message de succès
SELECT '✅ MIGRATION AVANCÉE COMPLETE - 11 tables, 1 materialized view, 1 function' as status;
