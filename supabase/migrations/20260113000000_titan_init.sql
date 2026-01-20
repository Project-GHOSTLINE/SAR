-- ============================================
-- TITAN - Version Ultra Simple (Sans Vérifications)
-- ============================================

-- Extensions (peut échouer si déjà existe, c'est OK)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Cleanup safe (drop tables d'abord; triggers partent avec CASCADE)
DROP TABLE IF EXISTS cortex_execution_logs CASCADE;
DROP TABLE IF EXISTS cortex_rules CASCADE;
DROP TABLE IF EXISTS loan_objectives CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;
DROP FUNCTION IF EXISTS generate_loan_reference() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- TABLE 1: loan_applications
CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
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

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON loan_applications FOR ALL USING (true) WITH CHECK (true);

-- TABLE 2: loan_objectives
CREATE TABLE loan_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE POLICY "Allow all" ON loan_objectives FOR ALL USING (true) WITH CHECK (true);

-- TABLE 3: cortex_rules
CREATE TABLE cortex_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE cortex_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON cortex_rules FOR ALL USING (true) WITH CHECK (true);

-- TABLE 4: cortex_execution_logs
CREATE TABLE cortex_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES cortex_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  condition_met BOOLEAN NOT NULL,
  action_taken JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cortex_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON cortex_execution_logs FOR ALL USING (true) WITH CHECK (true);

-- FONCTION: generate_loan_reference
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

-- FONCTION: update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS
CREATE TRIGGER update_loan_applications_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_objectives_updated_at
  BEFORE UPDATE ON loan_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cortex_rules_updated_at
  BEFORE UPDATE ON cortex_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
INSERT INTO loan_objectives (name, description, metric_type, target_value, period) VALUES
  ('Conversion Rate', 'Taux de conversion formulaire', 'conversion_rate', 60, 'monthly'),
  ('Approval Rate', 'Taux d''approbation Margill', 'approval_rate', 75, 'monthly'),
  ('Average Loan Amount', 'Montant moyen demandé', 'avg_amount', 400000, 'monthly');

INSERT INTO cortex_rules (name, description, rule_type, condition, action, priority) VALUES
  ('High Income Bonus', 'Bonus pour revenu élevé', 'scoring',
   '{">=": [{"var": "revenu_annuel"}, 5000000]}'::jsonb,
   '{"score": 20}'::jsonb, 100),
  ('Low Debt Bonus', 'Bonus pour faibles dettes', 'scoring',
   '{"<": [{"var": "autres_dettes"}, 50000]}'::jsonb,
   '{"score": 15}'::jsonb, 90);

-- REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- Message de succès simple
SELECT '✅ MIGRATION COMPLETE - 4 tables, 2 functions, 3 triggers, 5 seed records' as status;
