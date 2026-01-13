-- ============================================================================
-- METRIC ENGINE - SCHEMA COMPLET
-- ============================================================================
-- Architecture modulaire pour le système de métriques SAR
-- Tables: admin_sections, metric_registry, metric_values, fraud_cases
-- ============================================================================

-- ============================================================================
-- TABLE 1: admin_sections
-- ============================================================================
-- Registre central de toutes les sections admin avec leurs métadonnées
-- Chaque section représente une page ou widget du dashboard admin

CREATE TABLE IF NOT EXISTS admin_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,           -- Identifiant unique (ex: 'analyses', 'fraud', 'global')
  label TEXT NOT NULL,                        -- Nom affiché (ex: 'Analyses Client')
  description TEXT,                           -- Description de la section
  icon_name TEXT,                             -- Nom de l'icône Lucide React
  route_path TEXT,                            -- Chemin de la route (ex: '/admin/analyses')
  sort_order INTEGER DEFAULT 0,               -- Ordre d'affichage
  is_active BOOLEAN DEFAULT true,             -- Section activée ou non
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_admin_sections_active ON admin_sections(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_sections_key ON admin_sections(section_key);

COMMENT ON TABLE admin_sections IS 'Registre des sections admin du dashboard';
COMMENT ON COLUMN admin_sections.section_key IS 'Clé unique pour identifier la section (shortcode)';
COMMENT ON COLUMN admin_sections.route_path IS 'Chemin de la route Next.js';

-- ============================================================================
-- TABLE 2: metric_registry
-- ============================================================================
-- Registre central de toutes les métriques disponibles
-- Définit les métadonnées de chaque métrique calculable

CREATE TABLE IF NOT EXISTS metric_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT UNIQUE NOT NULL,            -- Identifiant unique (ex: 'nsf_count_90d')
  label TEXT NOT NULL,                        -- Label affiché (ex: 'NSF Count (90 days)')
  description TEXT,                           -- Description détaillée
  section_key TEXT NOT NULL,                  -- Référence à admin_sections.section_key

  -- Type et format
  value_type TEXT NOT NULL DEFAULT 'numeric', -- 'numeric', 'text', 'boolean', 'json'
  unit TEXT,                                  -- Unité (ex: '$', '%', 'count', 'days')
  format TEXT,                                -- Format d'affichage (ex: 'currency_cad', 'percentage', 'integer')

  -- Configuration
  entity_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- Types d'entités supportés ['global', 'analysis', 'fraud_case']
  supports_periods BOOLEAN DEFAULT false,      -- Si la métrique supporte des périodes (30d, 60d, 90d)
  available_periods TEXT[] DEFAULT ARRAY[]::TEXT[], -- Périodes disponibles ['30d', '60d', '90d']

  -- Calcul
  calculation_function TEXT,                  -- Nom de la fonction SQL de calcul (ex: 'compute_nsf_count')
  depends_on TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Dépendances sur d'autres métriques

  -- UI
  color_scheme TEXT DEFAULT 'blue',           -- 'red', 'green', 'blue', 'yellow'
  icon_name TEXT,                             -- Icône Lucide React
  display_order INTEGER DEFAULT 0,            -- Ordre d'affichage dans la section
  is_visible BOOLEAN DEFAULT true,            -- Visible dans l'UI ou non

  -- Tags et classification
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],        -- Tags de classification ['financial', 'risk', 'nsf']

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT fk_metric_section FOREIGN KEY (section_key)
    REFERENCES admin_sections(section_key)
    ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_metric_registry_section ON metric_registry(section_key, display_order);
CREATE INDEX IF NOT EXISTS idx_metric_registry_key ON metric_registry(metric_key);
CREATE INDEX IF NOT EXISTS idx_metric_registry_visible ON metric_registry(is_visible);
CREATE INDEX IF NOT EXISTS idx_metric_registry_tags ON metric_registry USING GIN(tags);

COMMENT ON TABLE metric_registry IS 'Registre central de toutes les métriques calculables';
COMMENT ON COLUMN metric_registry.metric_key IS 'Clé unique pour identifier la métrique (shortcode)';
COMMENT ON COLUMN metric_registry.entity_types IS 'Types d''entités pour lesquels cette métrique peut être calculée';
COMMENT ON COLUMN metric_registry.calculation_function IS 'Fonction SQL utilisée pour calculer cette métrique';

-- ============================================================================
-- TABLE 3: metric_values
-- ============================================================================
-- Stockage des valeurs calculées de métriques
-- Une ligne = une valeur de métrique pour une entité à un moment donné

CREATE TABLE IF NOT EXISTS metric_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence métrique
  metric_key TEXT NOT NULL,                   -- Référence à metric_registry.metric_key

  -- Référence entité
  entity_type TEXT NOT NULL,                  -- 'global', 'analysis', 'fraud_case'
  entity_id UUID,                             -- ID de l'entité (NULL pour global)

  -- Période (optionnel)
  period_label TEXT,                          -- '30d', '60d', '90d', NULL si pas de période

  -- Valeur
  value_numeric DECIMAL(20, 4),               -- Valeur numérique
  value_text TEXT,                            -- Valeur texte
  value_boolean BOOLEAN,                      -- Valeur booléenne
  value_json JSONB,                           -- Valeur JSON

  -- Métadonnées
  computed_at TIMESTAMP DEFAULT NOW(),        -- Quand la métrique a été calculée
  is_current BOOLEAN DEFAULT true,            -- Si c'est la valeur actuelle (pour historique)

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT fk_metric_value_key FOREIGN KEY (metric_key)
    REFERENCES metric_registry(metric_key)
    ON DELETE CASCADE,

  -- Contrainte d'unicité: une métrique par entité par période
  CONSTRAINT unique_metric_entity_period UNIQUE (metric_key, entity_type, entity_id, period_label, is_current)
);

-- Index pour performance (CRITIQUES)
CREATE INDEX IF NOT EXISTS idx_metric_values_key ON metric_values(metric_key);
CREATE INDEX IF NOT EXISTS idx_metric_values_entity ON metric_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_metric_values_composite ON metric_values(metric_key, entity_type, entity_id, is_current);
CREATE INDEX IF NOT EXISTS idx_metric_values_computed ON metric_values(computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_values_current ON metric_values(is_current) WHERE is_current = true;

COMMENT ON TABLE metric_values IS 'Stockage des valeurs calculées de métriques';
COMMENT ON COLUMN metric_values.entity_type IS 'Type d''entité: global (dashboard global), analysis (analyse client), fraud_case (cas de fraude)';
COMMENT ON COLUMN metric_values.is_current IS 'Si true, c''est la valeur la plus récente (pour historique)';

-- ============================================================================
-- TABLE 4: fraud_cases
-- ============================================================================
-- Cas de fraude identifiés et investigués
-- Utilisé pour les métriques de type entity_type = 'fraud_case'

CREATE TABLE IF NOT EXISTS fraud_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,           -- Numéro de cas (ex: 'FRD-2025-001')

  -- Informations client
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  analysis_id UUID,                           -- Référence à l'analyse client source

  -- Détails de la fraude
  fraud_type TEXT NOT NULL,                   -- Type de fraude détectée
  severity TEXT DEFAULT 'medium',             -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'open',                 -- 'open', 'investigating', 'confirmed', 'closed', 'false_positive'

  -- Montants
  amount_involved DECIMAL(12, 2),             -- Montant impliqué dans la fraude
  amount_recovered DECIMAL(12, 2) DEFAULT 0,  -- Montant récupéré

  -- Dates
  detected_at TIMESTAMP DEFAULT NOW(),        -- Date de détection
  reported_at TIMESTAMP,                      -- Date de rapport aux autorités
  closed_at TIMESTAMP,                        -- Date de clôture du cas

  -- Investigation
  assigned_to TEXT,                           -- Agent assigné
  notes TEXT,                                 -- Notes d'investigation
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[], -- URLs des preuves

  -- Flags
  reported_to_authorities BOOLEAN DEFAULT false,
  insurance_claim_filed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status ON fraud_cases(status);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_severity ON fraud_cases(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_detected ON fraud_cases(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_analysis ON fraud_cases(analysis_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_assigned ON fraud_cases(assigned_to);

COMMENT ON TABLE fraud_cases IS 'Cas de fraude identifiés et investigués';
COMMENT ON COLUMN fraud_cases.case_number IS 'Numéro unique du cas de fraude';
COMMENT ON COLUMN fraud_cases.severity IS 'Niveau de sévérité: low, medium, high, critical';

-- ============================================================================
-- SEED DATA: admin_sections
-- ============================================================================
-- Insertion des 8 sections principales du dashboard admin

INSERT INTO admin_sections (section_key, label, description, icon_name, route_path, sort_order, is_active)
VALUES
  ('global', 'Dashboard Global', 'Vue d''ensemble globale de tous les KPIs', 'LayoutDashboard', '/admin/dashboard', 10, true),
  ('analyses', 'Analyses Client', 'Métriques par analyse client (IBV/Flinks)', 'BarChart3', '/admin/analyses', 20, true),
  ('fraud', 'Fraude & Risque', 'Détection et investigation de fraude', 'Shield', '/admin/fraud', 30, true),
  ('financial', 'Métriques Financières', 'Revenus, transactions, NSF, volumes', 'DollarSign', '/admin/financial', 40, true),
  ('vopay', 'VoPay', 'Intégration VoPay et webhooks', 'Webhook', '/admin/vopay', 50, true),
  ('support', 'Support', 'Tickets et demandes clients', 'Wrench', '/admin/support', 60, true),
  ('performance', 'Performance', 'Métriques de performance système', 'TrendingUp', '/admin/performance', 70, true),
  ('compliance', 'Conformité', 'GDPR, AML, audit logs', 'FileCheck', '/admin/compliance', 80, true)
ON CONFLICT (section_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  route_path = EXCLUDED.route_path,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- SEED DATA: metric_registry (SAMPLE METRICS)
-- ============================================================================
-- Insertion de métriques d'exemple pour chaque section

-- Section: global (Dashboard Global)
INSERT INTO metric_registry (
  metric_key, label, description, section_key, value_type, unit, format,
  entity_types, supports_periods, color_scheme, display_order, tags
)
VALUES
  ('total_clients', 'Total Clients', 'Nombre total de clients actifs', 'global', 'numeric', 'count', 'integer',
   ARRAY['global']::TEXT[], false, 'blue', 10, ARRAY['clients', 'kpi']::TEXT[]),

  ('total_revenue_mtd', 'Revenue MTD', 'Revenu total du mois en cours', 'global', 'numeric', '$', 'currency_cad',
   ARRAY['global']::TEXT[], false, 'green', 20, ARRAY['financial', 'revenue', 'kpi']::TEXT[]),

  ('active_loans', 'Active Loans', 'Nombre de prêts actifs', 'global', 'numeric', 'count', 'integer',
   ARRAY['global']::TEXT[], false, 'blue', 30, ARRAY['loans', 'kpi']::TEXT[]),

  ('fraud_cases_open', 'Open Fraud Cases', 'Cas de fraude ouverts', 'global', 'numeric', 'count', 'integer',
   ARRAY['global']::TEXT[], false, 'red', 40, ARRAY['fraud', 'risk', 'kpi']::TEXT[])
ON CONFLICT (metric_key) DO NOTHING;

-- Section: analyses (Analyses Client)
INSERT INTO metric_registry (
  metric_key, label, description, section_key, value_type, unit, format,
  entity_types, supports_periods, available_periods, color_scheme, display_order, tags
)
VALUES
  ('nsf_count_30d', 'NSF Count (30d)', 'Nombre de NSF dans les 30 derniers jours', 'analyses', 'numeric', 'count', 'integer',
   ARRAY['analysis']::TEXT[], true, ARRAY['30d']::TEXT[], 'red', 10, ARRAY['financial', 'risk', 'nsf']::TEXT[]),

  ('nsf_count_60d', 'NSF Count (60d)', 'Nombre de NSF dans les 60 derniers jours', 'analyses', 'numeric', 'count', 'integer',
   ARRAY['analysis']::TEXT[], true, ARRAY['60d']::TEXT[], 'red', 20, ARRAY['financial', 'risk', 'nsf']::TEXT[]),

  ('nsf_count_90d', 'NSF Count (90d)', 'Nombre de NSF dans les 90 derniers jours', 'analyses', 'numeric', 'count', 'integer',
   ARRAY['analysis']::TEXT[], true, ARRAY['90d']::TEXT[], 'red', 30, ARRAY['financial', 'risk', 'nsf']::TEXT[]),

  ('avg_balance', 'Average Balance', 'Solde moyen sur la période', 'analyses', 'numeric', '$', 'currency_cad',
   ARRAY['analysis']::TEXT[], false, ARRAY[]::TEXT[], 'green', 40, ARRAY['financial', 'balance']::TEXT[]),

  ('total_income_90d', 'Total Income (90d)', 'Revenu total sur 90 jours', 'analyses', 'numeric', '$', 'currency_cad',
   ARRAY['analysis']::TEXT[], true, ARRAY['90d']::TEXT[], 'green', 50, ARRAY['financial', 'income']::TEXT[]),

  ('risk_score', 'Risk Score', 'Score de risque calculé (0-100)', 'analyses', 'numeric', 'score', 'integer',
   ARRAY['analysis']::TEXT[], false, ARRAY[]::TEXT[], 'yellow', 60, ARRAY['risk', 'scoring']::TEXT[])
ON CONFLICT (metric_key) DO NOTHING;

-- Section: fraud (Fraude & Risque)
INSERT INTO metric_registry (
  metric_key, label, description, section_key, value_type, unit, format,
  entity_types, supports_periods, color_scheme, display_order, tags
)
VALUES
  ('fraud_amount', 'Fraud Amount', 'Montant total impliqué dans la fraude', 'fraud', 'numeric', '$', 'currency_cad',
   ARRAY['fraud_case']::TEXT[], false, 'red', 10, ARRAY['fraud', 'financial']::TEXT[]),

  ('fraud_recovered', 'Amount Recovered', 'Montant récupéré', 'fraud', 'numeric', '$', 'currency_cad',
   ARRAY['fraud_case']::TEXT[], false, 'green', 20, ARRAY['fraud', 'financial', 'recovery']::TEXT[]),

  ('investigation_days', 'Investigation Days', 'Nombre de jours depuis la détection', 'fraud', 'numeric', 'days', 'integer',
   ARRAY['fraud_case']::TEXT[], false, 'yellow', 30, ARRAY['fraud', 'time']::TEXT[]),

  ('fraud_severity', 'Severity', 'Niveau de sévérité du cas', 'fraud', 'text', '', 'text',
   ARRAY['fraud_case']::TEXT[], false, 'red', 40, ARRAY['fraud', 'classification']::TEXT[])
ON CONFLICT (metric_key) DO NOTHING;

-- Section: financial (Métriques Financières)
INSERT INTO metric_registry (
  metric_key, label, description, section_key, value_type, unit, format,
  entity_types, supports_periods, available_periods, color_scheme, display_order, tags
)
VALUES
  ('total_deposits', 'Total Deposits', 'Total des dépôts', 'financial', 'numeric', '$', 'currency_cad',
   ARRAY['global', 'analysis']::TEXT[], true, ARRAY['30d', '60d', '90d']::TEXT[], 'green', 10, ARRAY['financial', 'deposits']::TEXT[]),

  ('total_withdrawals', 'Total Withdrawals', 'Total des retraits', 'financial', 'numeric', '$', 'currency_cad',
   ARRAY['global', 'analysis']::TEXT[], true, ARRAY['30d', '60d', '90d']::TEXT[], 'blue', 20, ARRAY['financial', 'withdrawals']::TEXT[]),

  ('transaction_volume', 'Transaction Volume', 'Nombre de transactions', 'financial', 'numeric', 'count', 'integer',
   ARRAY['global', 'analysis']::TEXT[], true, ARRAY['30d', '60d', '90d']::TEXT[], 'blue', 30, ARRAY['financial', 'volume']::TEXT[])
ON CONFLICT (metric_key) DO NOTHING;

-- Section: vopay (VoPay)
INSERT INTO metric_registry (
  metric_key, label, description, section_key, value_type, unit, format,
  entity_types, supports_periods, color_scheme, display_order, tags
)
VALUES
  ('vopay_success_rate', 'Success Rate', 'Taux de succès des transactions VoPay', 'vopay', 'numeric', '%', 'percentage',
   ARRAY['global']::TEXT[], false, 'green', 10, ARRAY['vopay', 'performance']::TEXT[]),

  ('vopay_pending', 'Pending Transactions', 'Transactions en attente', 'vopay', 'numeric', 'count', 'integer',
   ARRAY['global']::TEXT[], false, 'yellow', 20, ARRAY['vopay', 'status']::TEXT[]),

  ('vopay_failed', 'Failed Transactions', 'Transactions échouées', 'vopay', 'numeric', 'count', 'integer',
   ARRAY['global']::TEXT[], false, 'red', 30, ARRAY['vopay', 'errors']::TEXT[])
ON CONFLICT (metric_key) DO NOTHING;

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour upsert une valeur de métrique
CREATE OR REPLACE FUNCTION upsert_metric_value(
  p_metric_key TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_period_label TEXT DEFAULT NULL,
  p_value_numeric DECIMAL DEFAULT NULL,
  p_value_text TEXT DEFAULT NULL,
  p_value_boolean BOOLEAN DEFAULT NULL,
  p_value_json JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Marquer l'ancienne valeur comme non-courante
  UPDATE metric_values
  SET is_current = false
  WHERE metric_key = p_metric_key
    AND entity_type = p_entity_type
    AND (entity_id = p_entity_id OR (entity_id IS NULL AND p_entity_id IS NULL))
    AND (period_label = p_period_label OR (period_label IS NULL AND p_period_label IS NULL))
    AND is_current = true;

  -- Insérer la nouvelle valeur
  INSERT INTO metric_values (
    metric_key, entity_type, entity_id, period_label,
    value_numeric, value_text, value_boolean, value_json,
    computed_at, is_current
  )
  VALUES (
    p_metric_key, p_entity_type, p_entity_id, p_period_label,
    p_value_numeric, p_value_text, p_value_boolean, p_value_json,
    NOW(), true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_metric_value IS 'Insère ou met à jour une valeur de métrique';

-- ============================================================================
-- FONCTION RPC: get_metrics_by_section
-- ============================================================================
-- Récupère toutes les métriques d'une section avec leurs valeurs pour une entité

CREATE OR REPLACE FUNCTION get_metrics_by_section(
  p_section_key TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  metric_key TEXT,
  label TEXT,
  description TEXT,
  value_type TEXT,
  unit TEXT,
  format TEXT,
  color_scheme TEXT,
  value_numeric DECIMAL,
  value_text TEXT,
  value_boolean BOOLEAN,
  value_json JSONB,
  period_label TEXT,
  computed_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.metric_key,
    mr.label,
    mr.description,
    mr.value_type,
    mr.unit,
    mr.format,
    mr.color_scheme,
    mv.value_numeric,
    mv.value_text,
    mv.value_boolean,
    mv.value_json,
    mv.period_label,
    mv.computed_at
  FROM metric_registry mr
  LEFT JOIN metric_values mv ON mv.metric_key = mr.metric_key
    AND mv.entity_type = p_entity_type
    AND (mv.entity_id = p_entity_id OR (mv.entity_id IS NULL AND p_entity_id IS NULL))
    AND mv.is_current = true
  WHERE mr.section_key = p_section_key
    AND mr.is_visible = true
    AND p_entity_type = ANY(mr.entity_types)
  ORDER BY mr.display_order ASC;
END;
$$;

COMMENT ON FUNCTION get_metrics_by_section IS 'Récupère les métriques d''une section avec leurs valeurs pour une entité';

-- ============================================================================
-- FONCTION RPC: get_dashboard_pack
-- ============================================================================
-- Récupère section + métriques + valeurs en un seul appel (optimisé)

CREATE OR REPLACE FUNCTION get_dashboard_pack(
  p_section_key TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'section', (
      SELECT row_to_json(s)
      FROM admin_sections s
      WHERE s.section_key = p_section_key
    ),
    'metrics', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'metric_key', mr.metric_key,
          'label', mr.label,
          'description', mr.description,
          'value_type', mr.value_type,
          'unit', mr.unit,
          'format', mr.format,
          'color_scheme', mr.color_scheme,
          'value_numeric', mv.value_numeric,
          'value_text', mv.value_text,
          'value_boolean', mv.value_boolean,
          'value_json', mv.value_json,
          'period_label', mv.period_label,
          'computed_at', mv.computed_at
        )
        ORDER BY mr.display_order ASC
      )
      FROM metric_registry mr
      LEFT JOIN metric_values mv ON mv.metric_key = mr.metric_key
        AND mv.entity_type = p_entity_type
        AND (mv.entity_id = p_entity_id OR (mv.entity_id IS NULL AND p_entity_id IS NULL))
        AND mv.is_current = true
      WHERE mr.section_key = p_section_key
        AND mr.is_visible = true
        AND p_entity_type = ANY(mr.entity_types)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_pack IS 'Récupère section + métriques + valeurs en un seul appel RPC';

-- ============================================================================
-- TRIGGERS: updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_sections_updated_at
  BEFORE UPDATE ON admin_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metric_registry_updated_at
  BEFORE UPDATE ON metric_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metric_values_updated_at
  BEFORE UPDATE ON metric_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fraud_cases_updated_at
  BEFORE UPDATE ON fraud_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISSIONS (RLS)
-- ============================================================================
-- À configurer selon vos besoins de sécurité

-- Pour l'instant, désactiver RLS sur ces tables (admin only)
ALTER TABLE admin_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE metric_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE metric_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_cases DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIN DU SCHEMA
-- ============================================================================

-- Vérification des tables créées
SELECT
  'admin_sections' as table_name,
  COUNT(*) as row_count
FROM admin_sections
UNION ALL
SELECT
  'metric_registry' as table_name,
  COUNT(*) as row_count
FROM metric_registry
UNION ALL
SELECT
  'metric_values' as table_name,
  COUNT(*) as row_count
FROM metric_values
UNION ALL
SELECT
  'fraud_cases' as table_name,
  COUNT(*) as row_count
FROM fraud_cases;
