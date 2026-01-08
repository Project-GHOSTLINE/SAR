-- ============================================
-- TABLE: client_analyses
-- Description: Analyses bancaires clients depuis Inverite/Flinks
-- Date: 2026-01-07
-- ============================================

CREATE TABLE IF NOT EXISTS client_analyses (
  -- Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Informations Client
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phones TEXT[], -- Array de téléphones
  client_address TEXT,

  -- Métadonnées Inverite/Flinks
  inverite_guid TEXT, -- GUID depuis Inverite
  source TEXT NOT NULL CHECK (source IN ('inverite', 'flinks')), -- Provenance
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Données JSON Complètes
  raw_data JSONB NOT NULL, -- Toutes les données brutes (accounts, transactions, etc.)
  client_info JSONB, -- {email, phones, address} séparé pour accès rapide
  accounts JSONB, -- Array des comptes bancaires

  -- Métriques calculées (pour recherche rapide)
  total_accounts INTEGER DEFAULT 0,
  total_balance DECIMAL(12, 2) DEFAULT 0.00,
  total_transactions INTEGER DEFAULT 0,

  -- Statut et Notes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  reviewed_by TEXT, -- Nom de l'admin qui a revu
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT, -- Notes internes

  -- Tags pour classification
  tags TEXT[], -- Ex: ['high_risk', 'vip', 'new_client']

  -- Assignation
  assigned_to TEXT, -- Assigné à quel admin (Sandra, Michel, etc.)
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INDEXES pour performance
-- ============================================

-- Index sur client_name pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_client_analyses_name ON client_analyses(client_name);

-- Index sur client_email pour recherche par email
CREATE INDEX IF NOT EXISTS idx_client_analyses_email ON client_analyses(client_email);

-- Index sur analysis_date pour tri chronologique
CREATE INDEX IF NOT EXISTS idx_client_analyses_date ON client_analyses(analysis_date DESC);

-- Index sur status pour filtrage
CREATE INDEX IF NOT EXISTS idx_client_analyses_status ON client_analyses(status);

-- Index sur assigned_to pour filtrage par assigné
CREATE INDEX IF NOT EXISTS idx_client_analyses_assigned ON client_analyses(assigned_to);

-- Index sur created_at pour tri
CREATE INDEX IF NOT EXISTS idx_client_analyses_created ON client_analyses(created_at DESC);

-- Index GIN sur raw_data pour recherche JSON
CREATE INDEX IF NOT EXISTS idx_client_analyses_raw_data ON client_analyses USING GIN (raw_data);

-- Index GIN sur tags
CREATE INDEX IF NOT EXISTS idx_client_analyses_tags ON client_analyses USING GIN (tags);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_client_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_analyses_updated_at
  BEFORE UPDATE ON client_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_client_analyses_updated_at();

-- ============================================
-- RLS (Row Level Security) - OPTIONNEL
-- ============================================

-- Activer RLS
ALTER TABLE client_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Admins peuvent tout voir
CREATE POLICY "Admins can view all analyses"
  ON client_analyses
  FOR SELECT
  USING (true); -- Accès via service key uniquement

-- Policy: Admins peuvent insérer
CREATE POLICY "Admins can insert analyses"
  ON client_analyses
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins peuvent mettre à jour
CREATE POLICY "Admins can update analyses"
  ON client_analyses
  FOR UPDATE
  USING (true);

-- ============================================
-- FONCTION: Calculer métriques automatiquement
-- ============================================

CREATE OR REPLACE FUNCTION calculate_analysis_metrics()
RETURNS TRIGGER AS $$
DECLARE
  accounts_array JSONB;
  account JSONB;
  balance_sum DECIMAL;
  tx_count INTEGER;
BEGIN
  -- Extraire les comptes depuis raw_data
  accounts_array := NEW.raw_data -> 'accounts';

  IF accounts_array IS NOT NULL THEN
    -- Calculer nombre de comptes
    NEW.total_accounts := jsonb_array_length(accounts_array);

    -- Calculer balance totale
    balance_sum := 0;
    tx_count := 0;

    FOR account IN SELECT * FROM jsonb_array_elements(accounts_array)
    LOOP
      -- Ajouter balance
      IF account ? 'balance' THEN
        balance_sum := balance_sum + (account ->> 'balance')::DECIMAL;
      END IF;

      -- Compter transactions
      IF account ? 'transactions' THEN
        tx_count := tx_count + jsonb_array_length(account -> 'transactions');
      END IF;
    END LOOP;

    NEW.total_balance := balance_sum;
    NEW.total_transactions := tx_count;
  END IF;

  -- Extraire client_info si présent
  IF NEW.raw_data ? 'client_info' THEN
    NEW.client_info := NEW.raw_data -> 'client_info';

    -- Extraire email
    IF NEW.client_info ? 'email' THEN
      NEW.client_email := NEW.client_info ->> 'email';
    END IF;

    -- Extraire address
    IF NEW.client_info ? 'address' THEN
      NEW.client_address := NEW.client_info ->> 'address';
    END IF;

    -- Extraire phones (array)
    IF NEW.client_info ? 'phones' THEN
      NEW.client_phones := ARRAY(SELECT jsonb_array_elements_text(NEW.client_info -> 'phones'));
    END IF;
  END IF;

  -- Extraire accounts séparé
  NEW.accounts := accounts_array;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer métriques à l'insertion
CREATE TRIGGER calculate_metrics_on_insert
  BEFORE INSERT ON client_analyses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_analysis_metrics();

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue: Analyses récentes (30 derniers jours)
CREATE OR REPLACE VIEW recent_client_analyses AS
SELECT
  id,
  client_name,
  client_email,
  client_phones,
  analysis_date,
  source,
  total_accounts,
  total_balance,
  total_transactions,
  status,
  assigned_to,
  created_at
FROM client_analyses
WHERE deleted_at IS NULL
  AND analysis_date >= NOW() - INTERVAL '30 days'
ORDER BY analysis_date DESC;

-- Vue: Analyses en attente
CREATE OR REPLACE VIEW pending_analyses AS
SELECT
  id,
  client_name,
  client_email,
  analysis_date,
  total_balance,
  created_at
FROM client_analyses
WHERE status = 'pending'
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- Vue: Stats par assigné
CREATE OR REPLACE VIEW analyses_by_assignee AS
SELECT
  assigned_to,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM client_analyses
WHERE deleted_at IS NULL
GROUP BY assigned_to;

-- ============================================
-- DONNÉES DE TEST (OPTIONNEL)
-- ============================================

/*
-- Exemple d'insertion
INSERT INTO client_analyses (
  client_name,
  source,
  inverite_guid,
  raw_data
) VALUES (
  'Jade Decontie',
  'inverite',
  '6FE5DC98-1234-5678-ABCD-1234567890AB',
  '{
    "name": "Jade Decontie",
    "client_info": {
      "email": "jadedecontie2882@gmail.com",
      "phones": ["819 462-0634"],
      "address": "297 107 Rte, Déléage, Quebec, J9E 3A8, Canada"
    },
    "accounts": [
      {
        "accountNumber": "****1234",
        "balance": 1250.50,
        "type": "checking",
        "transactions": [...]
      }
    ]
  }'::JSONB
);
*/

-- ============================================
-- GRANTS (ajuster selon vos besoins)
-- ============================================

-- Donner accès au service role
GRANT ALL ON client_analyses TO service_role;
GRANT ALL ON recent_client_analyses TO service_role;
GRANT ALL ON pending_analyses TO service_role;
GRANT ALL ON analyses_by_assignee TO service_role;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE client_analyses IS 'Analyses bancaires clients depuis Inverite/Flinks';
COMMENT ON COLUMN client_analyses.raw_data IS 'Données JSON complètes depuis Inverite/Flinks (accounts, transactions, client_info)';
COMMENT ON COLUMN client_analyses.client_info IS 'Informations client extraites (email, phones, address)';
COMMENT ON COLUMN client_analyses.total_balance IS 'Balance totale calculée de tous les comptes';
COMMENT ON COLUMN client_analyses.status IS 'pending, reviewed, approved, rejected';
COMMENT ON COLUMN client_analyses.tags IS 'Tags de classification (high_risk, vip, new_client, etc.)';

-- ============================================
-- FIN DU SCRIPT
-- ============================================

-- Pour exécuter:
-- 1. Se connecter à Supabase Dashboard
-- 2. Aller dans SQL Editor
-- 3. Coller ce script
-- 4. Exécuter

-- ✅ Table créée avec succès!
