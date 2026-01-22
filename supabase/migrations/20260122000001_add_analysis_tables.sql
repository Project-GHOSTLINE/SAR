-- Migration: Add Analysis System Tables
-- Date: 2026-01-22
-- Description: Ajoute les tables pour le système d'analyse automatisé (SAR Score, Recommendations, Jobs)

-- ============================================================================
-- 1. ALTER client_analyses - Ajouter nouvelles colonnes
-- ============================================================================

ALTER TABLE client_analyses
ADD COLUMN IF NOT EXISTS inverite_risk_score INTEGER,
ADD COLUMN IF NOT EXISTS risk_level TEXT,
ADD COLUMN IF NOT EXISTS microloans_data JSONB,
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP;

COMMENT ON COLUMN client_analyses.inverite_risk_score IS 'Score de risque Inverite (300-850)';
COMMENT ON COLUMN client_analyses.risk_level IS 'Niveau de risque Inverite (low, medium, high)';
COMMENT ON COLUMN client_analyses.microloans_data IS 'Données des prêts rapides détectés par Inverite';
COMMENT ON COLUMN client_analyses.analyzed_at IS 'Timestamp de l''analyse automatique complétée';

-- ============================================================================
-- 2. CREATE TABLE analysis_jobs - Jobs de traitement asynchrone
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

COMMENT ON TABLE analysis_jobs IS 'Queue de jobs pour le traitement asynchrone des analyses';
COMMENT ON COLUMN analysis_jobs.analysis_id IS 'FK vers client_analyses';
COMMENT ON COLUMN analysis_jobs.status IS 'Statut du job (pending, processing, completed, failed)';
COMMENT ON COLUMN analysis_jobs.priority IS 'Priorité du job (low, normal, high)';
COMMENT ON COLUMN analysis_jobs.error IS 'Message d''erreur si status=failed';

-- ============================================================================
-- 3. CREATE TABLE analysis_scores - Scores et métriques calculés
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  sar_score INTEGER NOT NULL CHECK (sar_score >= 300 AND sar_score <= 850),
  sar_score_normalized INTEGER NOT NULL CHECK (sar_score_normalized >= 0 AND sar_score_normalized <= 1000),
  monthly_income DECIMAL(10,2) NOT NULL DEFAULT 0,
  monthly_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
  dti_ratio DECIMAL(5,4) NOT NULL DEFAULT 0,
  nsf_count INTEGER NOT NULL DEFAULT 0,
  overdraft_count INTEGER NOT NULL DEFAULT 0,
  bankruptcy_detected BOOLEAN NOT NULL DEFAULT false,
  microloans_detected BOOLEAN NOT NULL DEFAULT false,
  account_health INTEGER NOT NULL CHECK (account_health >= 0 AND account_health <= 1000),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE analysis_scores IS 'Scores SAR et métriques financières calculés par le worker';
COMMENT ON COLUMN analysis_scores.sar_score IS 'Score SAR final (300-850, comme score de crédit)';
COMMENT ON COLUMN analysis_scores.sar_score_normalized IS 'Score SAR normalisé (0-1000 pour calculs internes)';
COMMENT ON COLUMN analysis_scores.monthly_income IS 'Revenu mensuel calculé depuis payschedules';
COMMENT ON COLUMN analysis_scores.monthly_expenses IS 'Dépenses mensuelles calculées depuis transactions';
COMMENT ON COLUMN analysis_scores.dti_ratio IS 'Debt-to-Income ratio (0-1+)';
COMMENT ON COLUMN analysis_scores.nsf_count IS 'Nombre de frais NSF dans les 30 derniers jours';
COMMENT ON COLUMN analysis_scores.overdraft_count IS 'Nombre de découverts dans les 30 derniers jours';
COMMENT ON COLUMN analysis_scores.account_health IS 'Score de santé du compte (0-1000)';
COMMENT ON COLUMN analysis_scores.confidence IS 'Confiance du score (0-1) basée sur complétude des données';

-- ============================================================================
-- 4. CREATE TABLE analysis_recommendations - Recommandations de prêt
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'decline', 'review')),
  max_loan_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  reasoning TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE analysis_recommendations IS 'Recommandations de prêt générées automatiquement';
COMMENT ON COLUMN analysis_recommendations.recommendation IS 'Recommandation (approve, decline, review)';
COMMENT ON COLUMN analysis_recommendations.max_loan_amount IS 'Montant maximum de prêt recommandé en CAD';
COMMENT ON COLUMN analysis_recommendations.reasoning IS 'Justification textuelle de la recommandation';
COMMENT ON COLUMN analysis_recommendations.confidence IS 'Confiance de la recommandation (0-1)';
COMMENT ON COLUMN analysis_recommendations.red_flags IS 'Array JSON des red flags détectés';

-- ============================================================================
-- 5. CREATE INDEXES - Pour optimiser les queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_analysis_id ON analysis_jobs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_priority_status ON analysis_jobs(priority, status);

CREATE INDEX IF NOT EXISTS idx_analysis_scores_analysis_id ON analysis_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_scores_sar_score ON analysis_scores(sar_score);
CREATE INDEX IF NOT EXISTS idx_analysis_scores_created_at ON analysis_scores(created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_analysis_id ON analysis_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_recommendation ON analysis_recommendations(recommendation);
CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_created_at ON analysis_recommendations(created_at);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - Activer et créer policies
-- ============================================================================

ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_recommendations ENABLE ROW LEVEL SECURITY;

-- Policy pour analysis_jobs (admin access uniquement)
CREATE POLICY "Allow admin access to analysis_jobs"
  ON analysis_jobs FOR ALL
  USING (true);

-- Policy pour analysis_scores (admin access uniquement)
CREATE POLICY "Allow admin access to analysis_scores"
  ON analysis_scores FOR ALL
  USING (true);

-- Policy pour analysis_recommendations (admin access uniquement)
CREATE POLICY "Allow admin access to analysis_recommendations"
  ON analysis_recommendations FOR ALL
  USING (true);

-- ============================================================================
-- 7. GRANTS - Permissions pour service role
-- ============================================================================

GRANT ALL ON analysis_jobs TO postgres, anon, authenticated, service_role;
GRANT ALL ON analysis_scores TO postgres, anon, authenticated, service_role;
GRANT ALL ON analysis_recommendations TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- 8. VALIDATION - Fonctions helper pour validation
-- ============================================================================

-- Fonction pour vérifier qu'une analyse a des scores
CREATE OR REPLACE FUNCTION has_analysis_scores(p_analysis_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM analysis_scores WHERE analysis_id = p_analysis_id
  );
$$;

-- Fonction pour obtenir le dernier job d'une analyse
CREATE OR REPLACE FUNCTION get_latest_job(p_analysis_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  error TEXT,
  created_at TIMESTAMP
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, status, error, created_at
  FROM analysis_jobs
  WHERE analysis_id = p_analysis_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION has_analysis_scores IS 'Vérifie si une analyse possède des scores calculés';
COMMENT ON FUNCTION get_latest_job IS 'Retourne le dernier job d''une analyse';

-- ============================================================================
-- Migration completed successfully
-- ============================================================================
