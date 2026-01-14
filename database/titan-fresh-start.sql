-- ============================================
-- 🚀 TITAN SYSTEM - Fresh Start Migration
-- Complete clean installation with API exposure
-- ============================================

-- Drop everything cleanly first
DROP TRIGGER IF EXISTS update_loan_applications_updated_at ON loan_applications CASCADE;
DROP TRIGGER IF EXISTS update_loan_objectives_updated_at ON loan_objectives CASCADE;
DROP TRIGGER IF EXISTS update_cortex_rules_updated_at ON cortex_rules CASCADE;
DROP TABLE IF EXISTS cortex_execution_logs CASCADE;
DROP TABLE IF EXISTS cortex_rules CASCADE;
DROP TABLE IF EXISTS loan_objectives CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;
DROP FUNCTION IF EXISTS generate_loan_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- TABLE 1: loan_applications
-- ============================================

CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('argentrapide', 'creditsecours')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'failed')),

  -- 38 Margill fields
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  courriel TEXT NOT NULL,
  telephone TEXT NOT NULL,
  date_naissance DATE,
  adresse_rue TEXT,
  adresse_ville TEXT,
  adresse_province TEXT,
  adresse_code_postal TEXT,
  duree_residence_mois INTEGER,
  type_logement TEXT,
  montant_demande INTEGER NOT NULL,
  raison_pret TEXT,
  duree_pret_mois INTEGER,
  statut_emploi TEXT,
  employeur TEXT,
  poste TEXT,
  revenu_annuel INTEGER,
  anciennete_emploi_mois INTEGER,
  frequence_paie TEXT,
  prochaine_paie DATE,
  institution_financiere TEXT,
  transit TEXT,
  numero_compte TEXT,
  type_compte TEXT,
  autres_revenus INTEGER,
  source_autres_revenus TEXT,
  paiement_loyer_hypotheque INTEGER,
  autres_prets INTEGER,
  cartes_credit INTEGER,
  autres_dettes INTEGER,
  coemprunteur_prenom TEXT,
  coemprunteur_nom TEXT,
  coemprunteur_telephone TEXT,
  coemprunteur_revenu INTEGER,
  reference_1_nom TEXT,
  reference_1_telephone TEXT,
  reference_1_relation TEXT,
  reference_2_nom TEXT,
  reference_2_telephone TEXT,
  reference_2_relation TEXT,

  -- System metadata
  cortex_score INTEGER DEFAULT 0,
  cortex_rules_applied JSONB DEFAULT '[]',
  risk_level TEXT,
  margill_response JSONB,
  margill_submitted_at TIMESTAMPTZ,
  margill_error TEXT,
  form_started_at TIMESTAMPTZ DEFAULT now(),
  form_completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  last_step_completed INTEGER DEFAULT 0,
  ab_test_variant TEXT,
  ip_address INET,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loan_applications_reference ON loan_applications(reference);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_applications_created_at ON loan_applications(created_at DESC);
CREATE INDEX idx_loan_applications_cortex_score ON loan_applications(cortex_score DESC);
CREATE INDEX idx_loan_applications_courriel ON loan_applications(courriel);

-- Enable RLS
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY "Enable all access" ON loan_applications
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE 2: loan_objectives
-- ============================================

CREATE TABLE loan_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  period TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  alert_threshold NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loan_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON loan_objectives
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE 3: cortex_rules
-- ============================================

CREATE TABLE cortex_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_rules_priority ON cortex_rules(priority ASC) WHERE active = true;
CREATE INDEX idx_cortex_rules_type ON cortex_rules(rule_type);

ALTER TABLE cortex_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON cortex_rules
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE 4: cortex_execution_logs
-- ============================================

CREATE TABLE cortex_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES cortex_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  condition_met BOOLEAN NOT NULL,
  action_taken JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cortex_logs_application ON cortex_execution_logs(application_id);
CREATE INDEX idx_cortex_logs_created_at ON cortex_execution_logs(created_at DESC);

ALTER TABLE cortex_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON cortex_execution_logs
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION generate_loan_reference()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 'SAR-LP-(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM loan_applications
  WHERE reference LIKE 'SAR-LP-%';

  RETURN 'SAR-LP-' || LPAD(next_id::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_loan_applications_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_objectives_updated_at
  BEFORE UPDATE ON loan_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cortex_rules_updated_at
  BEFORE UPDATE ON cortex_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO loan_objectives (name, description, metric_type, target_value, period)
VALUES
  ('Conversion Rate', 'Taux de conversion formulaire', 'conversion_rate', 60, 'monthly'),
  ('Approval Rate', 'Taux d''approbation Margill', 'approval_rate', 75, 'monthly'),
  ('Average Loan Amount', 'Montant moyen demandé', 'avg_amount', 400000, 'monthly');

INSERT INTO cortex_rules (name, description, rule_type, condition, action, priority)
VALUES
  ('High Income Bonus', 'Bonus pour revenu élevé', 'scoring',
   '{">=": [{"var": "revenu_annuel"}, 5000000]}'::jsonb,
   '{"score": 20}'::jsonb, 100),
  ('Low Debt Bonus', 'Bonus pour faibles dettes', 'scoring',
   '{"<": [{"var": "autres_dettes"}, 50000]}'::jsonb,
   '{"score": 15}'::jsonb, 90);

-- ============================================
-- NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION
-- ============================================

-- Show created tables
SELECT
  'Tables créées' as status,
  COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('loan_applications', 'loan_objectives', 'cortex_rules', 'cortex_execution_logs');

-- Show row counts
SELECT 'loan_applications' as table_name, COUNT(*) as rows FROM loan_applications
UNION ALL
SELECT 'loan_objectives', COUNT(*) FROM loan_objectives
UNION ALL
SELECT 'cortex_rules', COUNT(*) FROM cortex_rules
UNION ALL
SELECT 'cortex_execution_logs', COUNT(*) FROM cortex_execution_logs;

-- Test function
SELECT generate_loan_reference() as test_reference;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ✅ ✅ TITAN MIGRATION COMPLETE! ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE '  4 tables created with RLS enabled';
  RAISE NOTICE '  2 functions created';
  RAISE NOTICE '  3 triggers configured';
  RAISE NOTICE '  5 seed records inserted';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Run: node scripts/test-titan-system.mjs';
  RAISE NOTICE '';
END $$;
