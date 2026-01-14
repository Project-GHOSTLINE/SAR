-- ============================================
-- 🚀 TITAN SYSTEM - Migration Supabase
-- Système complet de gestion prêts avec Intelligence
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour recherche full-text

-- ============================================
-- 1. TABLE PRINCIPALE: loan_applications
-- ============================================

CREATE TABLE loan_applications (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL, -- SAR-LP-000001 (auto-généré)

  -- Origine & Status
  origin TEXT NOT NULL CHECK (origin IN ('argentrapide', 'creditsecours')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'failed')),

  -- === 38 CHAMPS MARGILL ===

  -- Informations personnelles (5)
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  courriel TEXT NOT NULL,
  telephone TEXT NOT NULL,
  date_naissance DATE,

  -- Adresse (6)
  adresse_rue TEXT,
  adresse_ville TEXT,
  adresse_province TEXT,
  adresse_code_postal TEXT,
  duree_residence_mois INTEGER,
  type_logement TEXT, -- 'proprietaire', 'locataire', 'autre'

  -- Montant et prêt (3)
  montant_demande INTEGER NOT NULL, -- en cents
  raison_pret TEXT,
  duree_pret_mois INTEGER,

  -- Emploi (7)
  statut_emploi TEXT, -- 'salarie', 'autonome', 'retraite', 'sans_emploi'
  employeur TEXT,
  poste TEXT,
  revenu_annuel INTEGER, -- en cents
  anciennete_emploi_mois INTEGER,
  frequence_paie TEXT, -- 'hebdomadaire', 'bi_hebdomadaire', 'mensuel'
  prochaine_paie DATE,

  -- Informations bancaires (4)
  institution_financiere TEXT,
  transit TEXT,
  numero_compte TEXT,
  type_compte TEXT, -- 'cheque', 'epargne'

  -- Autres revenus (2)
  autres_revenus INTEGER, -- en cents
  source_autres_revenus TEXT,

  -- Dettes (4)
  paiement_loyer_hypotheque INTEGER, -- en cents par mois
  autres_prets INTEGER, -- en cents par mois
  cartes_credit INTEGER, -- en cents par mois
  autres_dettes INTEGER, -- en cents par mois

  -- Co-emprunteur optionnel (4)
  coemprunteur_prenom TEXT,
  coemprunteur_nom TEXT,
  coemprunteur_telephone TEXT,
  coemprunteur_revenu INTEGER,

  -- Références (6)
  reference_1_nom TEXT,
  reference_1_telephone TEXT,
  reference_1_relation TEXT,
  reference_2_nom TEXT,
  reference_2_telephone TEXT,
  reference_2_relation TEXT,

  -- === MÉTADONNÉES SYSTÈME ===

  -- Score & Intelligence
  cortex_score INTEGER DEFAULT 0 CHECK (cortex_score >= 0 AND cortex_score <= 100),
  cortex_rules_applied JSONB DEFAULT '[]',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),

  -- Margill
  margill_response JSONB,
  margill_submitted_at TIMESTAMPTZ,
  margill_error TEXT,

  -- Tracking progression
  form_started_at TIMESTAMPTZ DEFAULT now(),
  form_completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  last_step_completed INTEGER DEFAULT 0,

  -- A/B Testing
  ab_test_variant TEXT,

  -- Métadonnées tracking
  ip_address INET,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_loan_applications_reference ON loan_applications(reference);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_applications_origin ON loan_applications(origin);
CREATE INDEX idx_loan_applications_created_at ON loan_applications(created_at DESC);
CREATE INDEX idx_loan_applications_cortex_score ON loan_applications(cortex_score DESC);
CREATE INDEX idx_loan_applications_courriel ON loan_applications(courriel);
CREATE INDEX idx_loan_applications_telephone ON loan_applications(telephone);

-- Index full-text search sur nom/prenom
CREATE INDEX idx_loan_applications_fulltext ON loan_applications
  USING gin((prenom || ' ' || nom) gin_trgm_ops);

-- Fonction auto-génération référence
CREATE OR REPLACE FUNCTION generate_loan_reference()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'SAR-LP-(\d+)') AS INTEGER)), 0) + 1
  INTO next_id FROM loan_applications WHERE reference LIKE 'SAR-LP-%';
  RETURN 'SAR-LP-' || LPAD(next_id::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-génération référence
CREATE OR REPLACE FUNCTION set_loan_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    NEW.reference := generate_loan_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_loan_reference
  BEFORE INSERT ON loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_loan_reference();

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loan_applications_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. CORTEX INTELLIGENCE
-- ============================================

-- Table: Objectifs Business
CREATE TABLE loan_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('conversion_rate', 'approval_rate', 'avg_amount', 'response_time', 'custom')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  active BOOLEAN DEFAULT true,
  alert_threshold NUMERIC, -- Seuil pour alertes (ex: 50% de l'objectif)
  alert_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loan_objectives_active ON loan_objectives(active) WHERE active = true;
CREATE INDEX idx_loan_objectives_metric_type ON loan_objectives(metric_type);

CREATE TRIGGER update_loan_objectives_updated_at
  BEFORE UPDATE ON loan_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: Règles Cortex (Intelligence)
CREATE TABLE cortex_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('validation', 'scoring', 'routing', 'automation')),

  -- Condition (JSON Logic)
  condition JSONB NOT NULL,
  -- Exemple: {"and": [{">=": [{"var": "revenu_annuel"}, 2500000]}, {"<": [{"var": "autres_dettes"}, 5000000]}]}

  -- Action
  action JSONB NOT NULL,
  -- Exemple: {"score": 20, "flag": "high_income"}
  -- Exemple: {"reject": true, "reason": "Revenu insuffisant"}
  -- Exemple: {"route_to": "manual_review"}

  -- Priorité (ordre d'exécution, plus petit = plus prioritaire)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Statistiques
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_rules_priority ON cortex_rules(priority ASC) WHERE active = true;
CREATE INDEX idx_cortex_rules_type ON cortex_rules(rule_type);
CREATE INDEX idx_cortex_rules_active ON cortex_rules(active);

CREATE TRIGGER update_cortex_rules_updated_at
  BEFORE UPDATE ON cortex_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: Logs d'exécution Cortex
CREATE TABLE cortex_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES cortex_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  condition_met BOOLEAN NOT NULL,
  action_taken JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_logs_application ON cortex_execution_logs(application_id);
CREATE INDEX idx_cortex_logs_rule ON cortex_execution_logs(rule_id);
CREATE INDEX idx_cortex_logs_created_at ON cortex_execution_logs(created_at DESC);
CREATE INDEX idx_cortex_logs_condition_met ON cortex_execution_logs(condition_met);

-- ============================================
-- 3. MÉTRIQUES & ANALYTICS
-- ============================================

-- Table: Logs métriques
CREATE TABLE metrics_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  dimension_1 TEXT, -- Ex: 'argentrapide' ou 'creditsecours'
  dimension_2 TEXT, -- Ex: 'desktop' ou 'mobile'
  dimension_3 TEXT, -- Ex: 'chrome' ou 'safari'
  metadata JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_metrics_name_date ON metrics_log(metric_name, recorded_at DESC);
CREATE INDEX idx_metrics_dimension_1 ON metrics_log(dimension_1);
CREATE INDEX idx_metrics_recorded_at ON metrics_log(recorded_at DESC);

-- Matérialized view pour dashboard performance
CREATE MATERIALIZED VIEW metrics_daily_summary AS
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

CREATE UNIQUE INDEX idx_metrics_daily_summary ON metrics_daily_summary(date, metric_name, COALESCE(dimension_1, ''));

-- Fonction pour rafraîchir les métriques (à appeler via cron)
CREATE OR REPLACE FUNCTION refresh_metrics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY metrics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. A/B TESTING
-- ============================================

-- Table: Tests A/B
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  test_type TEXT NOT NULL CHECK (test_type IN ('form_steps', 'field_order', 'validation_rules', 'ui_design', 'messaging', 'other')),

  -- Variants
  variant_a JSONB NOT NULL, -- Configuration variant A
  variant_b JSONB NOT NULL, -- Configuration variant B

  -- Distribution
  traffic_split INTEGER DEFAULT 50 CHECK (traffic_split >= 0 AND traffic_split <= 100),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Résultats
  results JSONB, -- Stats calculées
  winner TEXT CHECK (winner IN ('A', 'B', 'no_winner')),
  confidence_level NUMERIC, -- 0-1 (ex: 0.95 pour 95% confidence)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_started_at ON ab_tests(started_at DESC);

CREATE TRIGGER update_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: Assignations A/B
CREATE TABLE ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  assigned_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(test_id, application_id)
);

CREATE INDEX idx_ab_assignments_test ON ab_test_assignments(test_id);
CREATE INDEX idx_ab_assignments_application ON ab_test_assignments(application_id);
CREATE INDEX idx_ab_assignments_variant ON ab_test_assignments(variant);

-- ============================================
-- 5. WORKFLOWS & AUTOMATION
-- ============================================

-- Table: Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('application_submitted', 'status_changed', 'score_threshold', 'schedule', 'manual')),
  trigger_condition JSONB, -- Condition pour déclencher (JsonLogic)

  -- Actions à exécuter (array d'actions)
  actions JSONB NOT NULL,
  -- Exemple: [
  --   {"type": "email", "to": "{{courriel}}", "template": "welcome"},
  --   {"type": "webhook", "url": "https://...", "method": "POST"},
  --   {"type": "update_field", "field": "status", "value": "reviewed"}
  -- ]

  -- Statistiques
  times_executed INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX idx_workflows_active ON workflows(active) WHERE active = true;

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: Logs exécution workflows
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  trigger_data JSONB, -- Données qui ont déclenché le workflow
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  actions_executed JSONB, -- Détails des actions exécutées
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_application ON workflow_executions(application_id);
CREATE INDEX idx_workflow_executions_date ON workflow_executions(executed_at DESC);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================

-- Table: Templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  subject TEXT, -- Pour emails uniquement
  body TEXT NOT NULL, -- Support variables {{prenom}}, {{reference}}, etc.
  variables TEXT[], -- Liste des variables disponibles
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(active) WHERE active = true;

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table: Logs notifications
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  template_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued', 'bounced')),
  provider TEXT, -- 'resend', 'twilio'
  provider_id TEXT, -- ID du provider (pour tracking)
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_logs_application ON notification_logs(application_id);
CREATE INDEX idx_notification_logs_date ON notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient);

-- ============================================
-- 7. ML/AI
-- ============================================

-- Table: Modèles ML
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('approval_prediction', 'fraud_detection', 'amount_recommendation', 'churn_prediction', 'custom')),
  version TEXT NOT NULL,
  algorithm TEXT, -- 'random_forest', 'xgboost', 'neural_network', 'logistic_regression'

  -- Performance metrics
  accuracy NUMERIC,
  precision_score NUMERIC,
  recall NUMERIC,
  f1_score NUMERIC,
  auc_roc NUMERIC,

  -- Configuration
  config JSONB, -- Hyperparamètres, features utilisées
  training_data_size INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'active', 'deprecated', 'failed')),
  trained_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(name, version)
);

CREATE INDEX idx_ml_models_type ON ml_models(model_type);
CREATE INDEX idx_ml_models_status ON ml_models(status);
CREATE INDEX idx_ml_models_trained_at ON ml_models(trained_at DESC);

-- Table: Prédictions ML
CREATE TABLE ml_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
  prediction_type TEXT NOT NULL,
  prediction_value JSONB NOT NULL,
  -- Ex: {"approval_probability": 0.87, "recommended_amount": 500000}
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  features_used JSONB, -- Features utilisées pour la prédiction
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ml_predictions_application ON ml_predictions(application_id);
CREATE INDEX idx_ml_predictions_model ON ml_predictions(model_id);
CREATE INDEX idx_ml_predictions_type ON ml_predictions(prediction_type);
CREATE INDEX idx_ml_predictions_created_at ON ml_predictions(created_at DESC);

-- ============================================
-- 8. SÉCURITÉ & AUDIT
-- ============================================

-- Table: API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Hash bcrypt de la clé
  prefix TEXT NOT NULL, -- Ex: 'sk_live_abc' pour identifier

  -- Permissions (array de scopes)
  scopes TEXT[] DEFAULT '{}',
  -- Ex: ['read:applications', 'write:applications', 'admin:*']

  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 1000,
  requests_today INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,

  -- Status
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_api_keys_active ON api_keys(active) WHERE active = true;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Table: Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT, -- ID utilisateur (JWT sub)
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'application.create', 'rule.update', 'model.train'
  resource_type TEXT, -- 'application', 'rule', 'workflow', 'model'
  resource_id UUID,
  changes JSONB, -- {"before": {...}, "after": {...}}
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_date ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_api_key ON audit_logs(api_key_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS sur toutes les tables
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortex_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role a accès complet
CREATE POLICY "Service role has full access" ON loan_applications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON loan_objectives FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON cortex_rules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON cortex_execution_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON metrics_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON ab_tests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON ab_test_assignments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON workflows FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON workflow_executions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON notification_templates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON notification_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON ml_models FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON ml_predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DONNÉES DE TEST (SEEDS)
-- ============================================

-- Objectif: Taux de conversion 65%
INSERT INTO loan_objectives (name, description, metric_type, target_value, current_value, period, active, alert_threshold)
VALUES
  ('Taux de conversion', 'Pourcentage de demandes complétées vs démarrées', 'conversion_rate', 65.0, 0, 'monthly', true, 50.0),
  ('Taux d''approbation', 'Pourcentage de demandes acceptées par Margill', 'approval_rate', 70.0, 0, 'monthly', true, 60.0),
  ('Montant moyen', 'Montant moyen demandé en dollars', 'avg_amount', 5000.0, 0, 'monthly', true, 4000.0);

-- Règles Cortex de base
INSERT INTO cortex_rules (name, description, rule_type, condition, action, priority, active)
VALUES
  (
    'Revenu minimum requis',
    'Rejeter si revenu annuel < 25 000$',
    'validation',
    '{"<": [{"var": "revenu_annuel"}, 2500000]}',
    '{"reject": true, "reason": "Revenu annuel insuffisant (minimum 25 000$)"}',
    10,
    true
  ),
  (
    'Score élevé - Revenu élevé',
    'Bonus de score pour revenu > 50 000$',
    'scoring',
    '{">=": [{"var": "revenu_annuel"}, 5000000]}',
    '{"score": 20, "flag": "high_income"}',
    100,
    true
  ),
  (
    'Score élevé - Propriétaire',
    'Bonus de score pour propriétaires',
    'scoring',
    '{"==": [{"var": "type_logement"}, "proprietaire"]}',
    '{"score": 15, "flag": "homeowner"}',
    110,
    true
  ),
  (
    'Ratio dettes/revenus élevé',
    'Pénalité de score si dettes > 50% revenus',
    'scoring',
    '{">": [{"var": "autres_dettes"}, {"/": [{"var": "revenu_annuel"}, 2]}]}',
    '{"score": -25, "flag": "high_debt_ratio"}',
    120,
    true
  );

-- Templates de notifications
INSERT INTO notification_templates (name, type, subject, body, variables, active)
VALUES
  (
    'loan_confirmation',
    'email',
    'Demande de prêt reçue - {{reference}}',
    E'Bonjour {{prenom}},\n\nNous avons bien reçu votre demande de prêt (référence: {{reference}}) pour un montant de {{montant_demande}}$.\n\nNotre équipe va analyser votre dossier dans les plus brefs délais. Vous recevrez une réponse sous 24-48 heures.\n\nCordialement,\nÉquipe Solution Argent Rapide',
    ARRAY['prenom', 'nom', 'reference', 'montant_demande'],
    true
  ),
  (
    'loan_approved',
    'email',
    'Félicitations! Votre prêt est approuvé - {{reference}}',
    E'Bonjour {{prenom}},\n\nExcellente nouvelle! Votre demande de prêt ({{reference}}) a été approuvée.\n\nMontant approuvé: {{montant_demande}}$\n\nProchaines étapes:\n1. Signature électronique du contrat\n2. Vérification bancaire\n3. Transfert des fonds\n\nConnectez-vous à votre espace client pour finaliser le processus.\n\nFélicitations!\nÉquipe Solution Argent Rapide',
    ARRAY['prenom', 'nom', 'reference', 'montant_demande'],
    true
  );

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue: Applications avec métriques Cortex
CREATE OR REPLACE VIEW v_applications_enriched AS
SELECT
  la.*,
  COUNT(cel.id) as cortex_rules_executed,
  COUNT(CASE WHEN cel.condition_met THEN 1 END) as cortex_rules_matched,
  COUNT(CASE WHEN wfe.status = 'success' THEN 1 END) as workflows_executed,
  COUNT(nl.id) as notifications_sent
FROM loan_applications la
LEFT JOIN cortex_execution_logs cel ON cel.application_id = la.id
LEFT JOIN workflow_executions wfe ON wfe.application_id = la.id
LEFT JOIN notification_logs nl ON nl.application_id = la.id
GROUP BY la.id;

-- Vue: Statistiques journalières
CREATE OR REPLACE VIEW v_daily_stats AS
SELECT
  DATE(created_at) as date,
  origin,
  COUNT(*) as total_applications,
  COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
  AVG(montant_demande) / 100.0 as avg_amount_dollars,
  AVG(cortex_score) as avg_cortex_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY montant_demande) / 100.0 as median_amount_dollars
FROM loan_applications
GROUP BY DATE(created_at), origin
ORDER BY date DESC;

-- Vue: Performance règles Cortex
CREATE OR REPLACE VIEW v_cortex_rules_performance AS
SELECT
  cr.id,
  cr.name,
  cr.rule_type,
  cr.active,
  cr.priority,
  cr.times_triggered,
  COUNT(cel.id) as total_executions,
  COUNT(CASE WHEN cel.condition_met THEN 1 END) as conditions_met,
  ROUND(100.0 * COUNT(CASE WHEN cel.condition_met THEN 1 END) / NULLIF(COUNT(cel.id), 0), 2) as match_rate_percent,
  AVG(cel.execution_time_ms) as avg_execution_time_ms
FROM cortex_rules cr
LEFT JOIN cortex_execution_logs cel ON cel.rule_id = cr.id
GROUP BY cr.id, cr.name, cr.rule_type, cr.active, cr.priority, cr.times_triggered
ORDER BY cr.priority ASC;

-- ============================================
-- FONCTIONS UTILES
-- ============================================

-- Fonction: Calculer score Cortex pour une application
CREATE OR REPLACE FUNCTION calculate_cortex_score(app_id UUID)
RETURNS INTEGER AS $$
DECLARE
  base_score INTEGER := 50;
  bonus INTEGER := 0;
  penalty INTEGER := 0;
  final_score INTEGER;
BEGIN
  -- Cette fonction sera implémentée dans le code TypeScript
  -- mais on la définit ici pour référence
  RETURN base_score + bonus - penalty;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Nettoyer les anciennes métriques (> 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM metrics_log
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Nettoyer les anciens logs (> 180 jours)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cortex_execution_logs
  WHERE created_at < NOW() - INTERVAL '180 days';

  DELETE FROM workflow_executions
  WHERE executed_at < NOW() - INTERVAL '180 days';

  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '180 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTAIRES & DOCUMENTATION
-- ============================================

COMMENT ON TABLE loan_applications IS 'Table principale des demandes de prêt avec 38 champs Margill + métadonnées système';
COMMENT ON TABLE cortex_rules IS 'Règles d''intelligence pour validation, scoring et routing automatiques';
COMMENT ON TABLE loan_objectives IS 'Objectifs business avec suivi automatique de progression';
COMMENT ON TABLE metrics_log IS 'Logs de toutes les métriques système pour analytics';
COMMENT ON TABLE ab_tests IS 'Tests A/B pour optimisation continue du formulaire';
COMMENT ON TABLE workflows IS 'Workflows automatisés déclenchés par événements';
COMMENT ON TABLE ml_models IS 'Modèles ML pour prédictions (approbation, fraude, montant)';
COMMENT ON TABLE api_keys IS 'Clés API pour intégrations externes avec rate limiting';
COMMENT ON TABLE audit_logs IS 'Logs d''audit complets de toutes les actions système';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================

-- Afficher les statistiques
SELECT
  'TITAN System Migration Complete!' as status,
  COUNT(*) FILTER (WHERE tablename LIKE 'loan_%' OR tablename LIKE 'cortex_%' OR tablename LIKE 'ml_%' OR tablename LIKE 'ab_%' OR tablename LIKE 'workflow%' OR tablename LIKE 'notification_%' OR tablename LIKE 'metrics_%' OR tablename LIKE 'api_%' OR tablename LIKE 'audit_%') as tables_created
FROM pg_tables
WHERE schemaname = 'public';
