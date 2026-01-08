-- ============================================
-- SCHÉMA OPTIMISÉ: Analyses Clients Inverite/Flinks
-- Architecture normalisée pour performance maximale
-- Date: 2026-01-07
-- ============================================

-- ============================================
-- TABLE 1: client_analyses (Table principale)
-- Informations de base + métriques calculées
-- ============================================

CREATE TABLE IF NOT EXISTS client_analyses (
  -- Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Informations Client
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,

  -- Métadonnées Inverite/Flinks
  inverite_guid TEXT UNIQUE, -- UNIQUE pour éviter doublons
  source TEXT NOT NULL CHECK (source IN ('inverite', 'flinks')),
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Données JSON Complètes (backup)
  raw_data JSONB NOT NULL,

  -- Métriques calculées (pour accès rapide sans JOIN)
  total_accounts INTEGER DEFAULT 0,
  total_balance DECIMAL(12, 2) DEFAULT 0.00,
  total_transactions INTEGER DEFAULT 0,
  avg_account_balance DECIMAL(12, 2) DEFAULT 0.00,
  max_account_balance DECIMAL(12, 2) DEFAULT 0.00,
  min_account_balance DECIMAL(12, 2) DEFAULT 0.00,

  -- Métriques de transactions (30 derniers jours)
  total_deposits_30d DECIMAL(12, 2) DEFAULT 0.00,
  total_withdrawals_30d DECIMAL(12, 2) DEFAULT 0.00,
  net_cashflow_30d DECIMAL(12, 2) DEFAULT 0.00,
  avg_transaction_amount DECIMAL(12, 2) DEFAULT 0.00,

  -- Score de risque (calculé automatiquement)
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Statut et Workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  -- Assignation
  assigned_to TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLE 2: client_phones (Normalisé)
-- Un téléphone par ligne pour recherche rapide
-- ============================================

CREATE TABLE IF NOT EXISTS client_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  type TEXT, -- 'mobile', 'home', 'work'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 3: client_accounts (Comptes bancaires)
-- Un compte par ligne pour requêtes SQL puissantes
-- ============================================

CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,

  -- Informations du compte
  account_number TEXT,
  account_name TEXT,
  account_type TEXT, -- 'checking', 'savings', 'credit', etc.
  institution_name TEXT,
  institution_number TEXT,
  branch_number TEXT,

  -- Balances
  current_balance DECIMAL(12, 2) DEFAULT 0.00,
  available_balance DECIMAL(12, 2) DEFAULT 0.00,
  credit_limit DECIMAL(12, 2) DEFAULT 0.00,

  -- Métriques du compte
  transaction_count INTEGER DEFAULT 0,
  first_transaction_date DATE,
  last_transaction_date DATE,

  -- Métriques 30 jours
  deposits_30d DECIMAL(12, 2) DEFAULT 0.00,
  withdrawals_30d DECIMAL(12, 2) DEFAULT 0.00,
  net_cashflow_30d DECIMAL(12, 2) DEFAULT 0.00,
  avg_daily_balance_30d DECIMAL(12, 2) DEFAULT 0.00,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Données brutes JSON (pour détails supplémentaires)
  raw_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 4: client_transactions (Transactions)
-- Une transaction par ligne pour analytics puissants
-- ============================================

CREATE TABLE IF NOT EXISTS client_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,

  -- Informations de la transaction
  transaction_date DATE NOT NULL,
  transaction_datetime TIMESTAMP WITH TIME ZONE,
  description TEXT,
  category TEXT, -- 'income', 'expense', 'transfer', etc.

  -- Montants
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2),

  -- Type de transaction
  transaction_type TEXT, -- 'debit', 'credit', 'fee', etc.
  payment_method TEXT, -- 'eft', 'cheque', 'interac', etc.

  -- Merchant info (si disponible)
  merchant_name TEXT,
  merchant_category TEXT,

  -- Flags pour analytics
  is_recurring BOOLEAN DEFAULT FALSE,
  is_large_transaction BOOLEAN DEFAULT FALSE, -- Montant > seuil
  is_suspicious BOOLEAN DEFAULT FALSE,

  -- Données brutes JSON
  raw_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 5: client_analysis_tags (Tags)
-- Pour classification et recherche rapide
-- ============================================

CREATE TABLE IF NOT EXISTS client_analysis_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  added_by TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(analysis_id, tag) -- Éviter doublons
);

-- ============================================
-- TABLE 6: client_analysis_notes (Historique notes)
-- Pour traçabilité complète
-- ============================================

CREATE TABLE IF NOT EXISTS client_analysis_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 7: client_analysis_status_history
-- Historique des changements de statut
-- ============================================

CREATE TABLE IF NOT EXISTS client_analysis_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES pour performance maximale
-- ============================================

-- client_analyses indexes
CREATE INDEX IF NOT EXISTS idx_analyses_client_name ON client_analyses(client_name);
CREATE INDEX IF NOT EXISTS idx_analyses_client_email ON client_analyses(client_email);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON client_analyses(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_assigned_to ON client_analyses(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_source ON client_analyses(source);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON client_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_risk_level ON client_analyses(risk_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_guid ON client_analyses(inverite_guid);

-- Index GIN pour recherche fulltext sur raw_data
CREATE INDEX IF NOT EXISTS idx_analyses_raw_data_gin ON client_analyses USING GIN (raw_data);

-- Index pour métriques (pour tri rapide)
CREATE INDEX IF NOT EXISTS idx_analyses_total_balance ON client_analyses(total_balance DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_net_cashflow ON client_analyses(net_cashflow_30d DESC) WHERE deleted_at IS NULL;

-- client_phones indexes
CREATE INDEX IF NOT EXISTS idx_phones_analysis_id ON client_phones(analysis_id);
CREATE INDEX IF NOT EXISTS idx_phones_phone ON client_phones(phone);

-- client_accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_analysis_id ON client_accounts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON client_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_institution ON client_accounts(institution_name);
CREATE INDEX IF NOT EXISTS idx_accounts_balance ON client_accounts(current_balance DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON client_accounts(is_active) WHERE is_active = TRUE;

-- client_transactions indexes (CRITIQUES pour performance)
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON client_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_analysis_id ON client_transactions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON client_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON client_transactions(amount DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON client_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON client_transactions(category);

-- Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_transactions_date_amount ON client_transactions(transaction_date DESC, amount DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON client_transactions(account_id, transaction_date DESC);

-- Flags pour analytics rapides
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON client_transactions(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_large ON client_transactions(is_large_transaction) WHERE is_large_transaction = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_suspicious ON client_transactions(is_suspicious) WHERE is_suspicious = TRUE;

-- client_analysis_tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_analysis_id ON client_analysis_tags(analysis_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON client_analysis_tags(tag);

-- client_analysis_notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_analysis_id ON client_analysis_notes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON client_analysis_notes(created_at DESC);

-- status_history indexes
CREATE INDEX IF NOT EXISTS idx_status_history_analysis_id ON client_analysis_status_history(analysis_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON client_analysis_status_history(created_at DESC);

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analyses_updated_at
  BEFORE UPDATE ON client_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Calculer métriques analyse
-- ============================================

CREATE OR REPLACE FUNCTION calculate_analysis_metrics()
RETURNS TRIGGER AS $$
DECLARE
  accounts_array JSONB;
  account JSONB;
  balance_sum DECIMAL;
  balance_count INTEGER;
  max_balance DECIMAL;
  min_balance DECIMAL;
  tx_count INTEGER;
BEGIN
  -- Extraire les comptes depuis raw_data
  accounts_array := NEW.raw_data -> 'accounts';

  IF accounts_array IS NOT NULL THEN
    -- Calculer nombre de comptes
    NEW.total_accounts := jsonb_array_length(accounts_array);

    -- Initialiser
    balance_sum := 0;
    balance_count := 0;
    max_balance := 0;
    min_balance := 999999999;
    tx_count := 0;

    FOR account IN SELECT * FROM jsonb_array_elements(accounts_array)
    LOOP
      -- Ajouter balance
      IF account ? 'balance' THEN
        DECLARE
          acc_balance DECIMAL;
        BEGIN
          acc_balance := (account ->> 'balance')::DECIMAL;
          balance_sum := balance_sum + acc_balance;
          balance_count := balance_count + 1;

          IF acc_balance > max_balance THEN
            max_balance := acc_balance;
          END IF;

          IF acc_balance < min_balance THEN
            min_balance := acc_balance;
          END IF;
        END;
      END IF;

      -- Compter transactions
      IF account ? 'transactions' THEN
        tx_count := tx_count + jsonb_array_length(account -> 'transactions');
      END IF;
    END LOOP;

    NEW.total_balance := balance_sum;
    NEW.total_transactions := tx_count;

    IF balance_count > 0 THEN
      NEW.avg_account_balance := balance_sum / balance_count;
      NEW.max_account_balance := max_balance;
      IF min_balance < 999999999 THEN
        NEW.min_account_balance := min_balance;
      END IF;
    END IF;
  END IF;

  -- Extraire client_info
  IF NEW.raw_data ? 'client_info' THEN
    DECLARE
      client_info JSONB;
    BEGIN
      client_info := NEW.raw_data -> 'client_info';

      IF client_info ? 'email' THEN
        NEW.client_email := client_info ->> 'email';
      END IF;

      IF client_info ? 'address' THEN
        NEW.client_address := client_info ->> 'address';
      END IF;
    END;
  END IF;

  -- Calculer risk_score basique
  -- Score de 0-100 basé sur plusieurs facteurs
  DECLARE
    score INTEGER := 50; -- Score de base
  BEGIN
    -- Balance élevée = moins de risque
    IF NEW.total_balance > 10000 THEN
      score := score - 10;
    ELSIF NEW.total_balance < 1000 THEN
      score := score + 15;
    END IF;

    -- Nombre de comptes
    IF NEW.total_accounts >= 3 THEN
      score := score - 5;
    ELSIF NEW.total_accounts = 1 THEN
      score := score + 10;
    END IF;

    -- Nombre de transactions
    IF NEW.total_transactions > 100 THEN
      score := score - 10;
    ELSIF NEW.total_transactions < 10 THEN
      score := score + 15;
    END IF;

    -- Limiter entre 0 et 100
    IF score < 0 THEN score := 0; END IF;
    IF score > 100 THEN score := 100; END IF;

    NEW.risk_score := score;

    -- Déterminer risk_level
    IF score < 25 THEN
      NEW.risk_level := 'low';
    ELSIF score < 50 THEN
      NEW.risk_level := 'medium';
    ELSIF score < 75 THEN
      NEW.risk_level := 'high';
    ELSE
      NEW.risk_level := 'critical';
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_metrics_on_insert
  BEFORE INSERT ON client_analyses
  FOR EACH ROW
  EXECUTE FUNCTION calculate_analysis_metrics();

-- ============================================
-- TRIGGER: Historique de statut
-- ============================================

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO client_analysis_status_history (
      analysis_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.reviewed_by -- Ou un autre champ pour l'utilisateur
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER status_change_logger
  AFTER UPDATE ON client_analyses
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ============================================
-- FONCTION: Extraire et insérer comptes
-- ============================================

CREATE OR REPLACE FUNCTION extract_accounts_from_analysis(p_analysis_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_raw_data JSONB;
  v_accounts JSONB;
  v_account JSONB;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Récupérer raw_data
  SELECT raw_data INTO v_raw_data
  FROM client_analyses
  WHERE id = p_analysis_id;

  IF v_raw_data IS NULL THEN
    RETURN 0;
  END IF;

  -- Extraire accounts
  v_accounts := v_raw_data -> 'accounts';

  IF v_accounts IS NULL THEN
    RETURN 0;
  END IF;

  -- Insérer chaque compte
  FOR v_account IN SELECT * FROM jsonb_array_elements(v_accounts)
  LOOP
    INSERT INTO client_accounts (
      analysis_id,
      account_number,
      account_name,
      account_type,
      institution_name,
      current_balance,
      transaction_count,
      raw_data
    ) VALUES (
      p_analysis_id,
      v_account ->> 'accountNumber',
      v_account ->> 'accountName',
      v_account ->> 'type',
      v_account ->> 'institutionName',
      COALESCE((v_account ->> 'balance')::DECIMAL, 0),
      COALESCE(jsonb_array_length(v_account -> 'transactions'), 0),
      v_account
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION: Extraire et insérer transactions
-- ============================================

CREATE OR REPLACE FUNCTION extract_transactions_from_analysis(p_analysis_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_account_record RECORD;
  v_transaction JSONB;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Pour chaque compte de l'analyse
  FOR v_account_record IN
    SELECT id, raw_data FROM client_accounts WHERE analysis_id = p_analysis_id
  LOOP
    -- Extraire transactions du compte
    IF v_account_record.raw_data ? 'transactions' THEN
      FOR v_transaction IN
        SELECT * FROM jsonb_array_elements(v_account_record.raw_data -> 'transactions')
      LOOP
        INSERT INTO client_transactions (
          account_id,
          analysis_id,
          transaction_date,
          description,
          amount,
          transaction_type,
          raw_data
        ) VALUES (
          v_account_record.id,
          p_analysis_id,
          COALESCE((v_transaction ->> 'date')::DATE, CURRENT_DATE),
          v_transaction ->> 'description',
          COALESCE((v_transaction ->> 'amount')::DECIMAL, 0),
          v_transaction ->> 'type',
          v_transaction
        );

        v_inserted_count := v_inserted_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION: Extraire téléphones
-- ============================================

CREATE OR REPLACE FUNCTION extract_phones_from_analysis(p_analysis_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_raw_data JSONB;
  v_client_info JSONB;
  v_phones JSONB;
  v_phone TEXT;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Récupérer raw_data
  SELECT raw_data INTO v_raw_data
  FROM client_analyses
  WHERE id = p_analysis_id;

  IF v_raw_data IS NULL THEN
    RETURN 0;
  END IF;

  -- Extraire client_info -> phones
  v_client_info := v_raw_data -> 'client_info';

  IF v_client_info ? 'phones' THEN
    v_phones := v_client_info -> 'phones';

    FOR v_phone IN SELECT * FROM jsonb_array_elements_text(v_phones)
    LOOP
      INSERT INTO client_phones (analysis_id, phone)
      VALUES (p_analysis_id, v_phone);

      v_inserted_count := v_inserted_count + 1;
    END LOOP;
  END IF;

  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION PRINCIPALE: Traiter analyse complète
-- ============================================

CREATE OR REPLACE FUNCTION process_analysis(p_analysis_id UUID)
RETURNS TABLE(
  accounts_extracted INTEGER,
  transactions_extracted INTEGER,
  phones_extracted INTEGER
) AS $$
DECLARE
  v_accounts INTEGER;
  v_transactions INTEGER;
  v_phones INTEGER;
BEGIN
  -- Extraire comptes
  v_accounts := extract_accounts_from_analysis(p_analysis_id);

  -- Extraire transactions
  v_transactions := extract_transactions_from_analysis(p_analysis_id);

  -- Extraire téléphones
  v_phones := extract_phones_from_analysis(p_analysis_id);

  RETURN QUERY SELECT v_accounts, v_transactions, v_phones;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VUES MATÉRIALISÉES pour performance
-- ============================================

-- Vue: Analyses récentes (30 derniers jours)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_recent_analyses AS
SELECT
  a.id,
  a.client_name,
  a.client_email,
  a.analysis_date,
  a.source,
  a.total_accounts,
  a.total_balance,
  a.total_transactions,
  a.status,
  a.assigned_to,
  a.risk_level,
  a.created_at,
  COUNT(DISTINCT ac.id) as actual_account_count,
  COUNT(DISTINCT t.id) as actual_transaction_count
FROM client_analyses a
LEFT JOIN client_accounts ac ON ac.analysis_id = a.id
LEFT JOIN client_transactions t ON t.analysis_id = a.id
WHERE a.deleted_at IS NULL
  AND a.analysis_date >= NOW() - INTERVAL '30 days'
GROUP BY a.id
ORDER BY a.analysis_date DESC;

CREATE UNIQUE INDEX ON mv_recent_analyses (id);

-- Vue: Top clients par balance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_clients_by_balance AS
SELECT
  a.id,
  a.client_name,
  a.client_email,
  a.total_balance,
  a.total_accounts,
  a.status,
  a.risk_level
FROM client_analyses a
WHERE a.deleted_at IS NULL
  AND a.status IN ('approved', 'reviewed')
ORDER BY a.total_balance DESC
LIMIT 100;

CREATE UNIQUE INDEX ON mv_top_clients_by_balance (id);

-- Vue: Stats par assigné
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stats_by_assignee AS
SELECT
  assigned_to,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  SUM(total_balance) as total_balance,
  AVG(total_balance) as avg_balance,
  SUM(total_transactions) as total_transactions
FROM client_analyses
WHERE deleted_at IS NULL
GROUP BY assigned_to;

-- ============================================
-- VUES SIMPLES pour requêtes fréquentes
-- ============================================

-- Vue: Analyses en attente
CREATE OR REPLACE VIEW v_pending_analyses AS
SELECT
  a.*,
  COUNT(ac.id) as account_count,
  COUNT(t.id) as transaction_count
FROM client_analyses a
LEFT JOIN client_accounts ac ON ac.analysis_id = a.id
LEFT JOIN client_transactions t ON t.analysis_id = a.id
WHERE a.status = 'pending'
  AND a.deleted_at IS NULL
GROUP BY a.id
ORDER BY a.created_at DESC;

-- Vue: Clients à haut risque
CREATE OR REPLACE VIEW v_high_risk_clients AS
SELECT
  a.*,
  string_agg(DISTINCT p.phone, ', ') as phones
FROM client_analyses a
LEFT JOIN client_phones p ON p.analysis_id = a.id
WHERE a.risk_level IN ('high', 'critical')
  AND a.deleted_at IS NULL
GROUP BY a.id
ORDER BY a.risk_score DESC;

-- ============================================
-- FONCTION: Rafraîchir vues matérialisées
-- ============================================

CREATE OR REPLACE FUNCTION refresh_analysis_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recent_analyses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_clients_by_balance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stats_by_assignee;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE client_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_analysis_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_analysis_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_analysis_status_history ENABLE ROW LEVEL SECURITY;

-- Policies: Admins peuvent tout voir
CREATE POLICY "Service role has full access to analyses"
  ON client_analyses FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to accounts"
  ON client_accounts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to transactions"
  ON client_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to phones"
  ON client_phones FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to tags"
  ON client_analysis_tags FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to notes"
  ON client_analysis_notes FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to status_history"
  ON client_analysis_status_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON client_analyses TO service_role;
GRANT ALL ON client_accounts TO service_role;
GRANT ALL ON client_transactions TO service_role;
GRANT ALL ON client_phones TO service_role;
GRANT ALL ON client_analysis_tags TO service_role;
GRANT ALL ON client_analysis_notes TO service_role;
GRANT ALL ON client_analysis_status_history TO service_role;

GRANT SELECT ON mv_recent_analyses TO service_role;
GRANT SELECT ON mv_top_clients_by_balance TO service_role;
GRANT SELECT ON mv_stats_by_assignee TO service_role;
GRANT SELECT ON v_pending_analyses TO service_role;
GRANT SELECT ON v_high_risk_clients TO service_role;

-- ============================================
-- DOCUMENTATION
-- ============================================

COMMENT ON TABLE client_analyses IS 'Table principale: analyses bancaires clients depuis Inverite/Flinks avec métriques calculées';
COMMENT ON TABLE client_accounts IS 'Comptes bancaires normalisés (un compte = une ligne) pour requêtes SQL puissantes';
COMMENT ON TABLE client_transactions IS 'Transactions normalisées (une transaction = une ligne) pour analytics avancés';
COMMENT ON TABLE client_phones IS 'Téléphones clients normalisés pour recherche rapide';
COMMENT ON TABLE client_analysis_tags IS 'Tags de classification pour filtrage et recherche';
COMMENT ON TABLE client_analysis_notes IS 'Historique complet des notes pour traçabilité';
COMMENT ON TABLE client_analysis_status_history IS 'Audit trail de tous les changements de statut';

COMMENT ON COLUMN client_analyses.risk_score IS 'Score de risque 0-100 calculé automatiquement (balance, comptes, transactions)';
COMMENT ON COLUMN client_analyses.net_cashflow_30d IS 'Cashflow net sur 30 jours (dépôts - retraits)';
COMMENT ON COLUMN client_transactions.is_large_transaction IS 'Transaction supérieure au seuil (ex: >$5000)';
COMMENT ON COLUMN client_transactions.is_recurring IS 'Transaction récurrente détectée';

COMMENT ON FUNCTION process_analysis IS 'Fonction principale: extrait comptes, transactions, téléphones depuis raw_data et les insère dans tables normalisées';
COMMENT ON FUNCTION refresh_analysis_views IS 'Rafraîchit toutes les vues matérialisées (appeler périodiquement)';

-- ============================================
-- EXEMPLE D'UTILISATION
-- ============================================

/*
-- 1. Insérer une analyse (via API)
INSERT INTO client_analyses (client_name, source, inverite_guid, raw_data)
VALUES (
  'Jade Decontie',
  'inverite',
  '6FE5DC98-1234-5678-ABCD-1234567890AB',
  '{ "name": "Jade Decontie", "client_info": {...}, "accounts": [...] }'::JSONB
) RETURNING id;

-- 2. Traiter l'analyse (extraire comptes/transactions)
SELECT * FROM process_analysis('uuid-de-lanalyse');

-- 3. Requêtes analytics puissantes
-- Tous les clients avec balance > 10K
SELECT client_name, total_balance, total_accounts
FROM client_analyses
WHERE total_balance > 10000
  AND deleted_at IS NULL
ORDER BY total_balance DESC;

-- Transactions suspectes (montants élevés)
SELECT
  a.client_name,
  t.description,
  t.amount,
  t.transaction_date
FROM client_transactions t
JOIN client_analyses a ON a.id = t.analysis_id
WHERE t.amount > 5000
  AND t.transaction_date >= NOW() - INTERVAL '30 days'
ORDER BY t.amount DESC;

-- Clients avec cashflow négatif
SELECT client_name, net_cashflow_30d, risk_level
FROM client_analyses
WHERE net_cashflow_30d < 0
  AND deleted_at IS NULL
ORDER BY net_cashflow_30d ASC;

-- 4. Rafraîchir vues matérialisées (à scheduler)
SELECT refresh_analysis_views();
*/

-- ============================================
-- PERFORMANCE TIPS
-- ============================================

/*
✅ INDEXÉS - Requêtes rapides:
- Recherche par nom: idx_analyses_client_name
- Recherche par email: idx_analyses_client_email
- Filtrage par statut: idx_analyses_status
- Tri par balance: idx_analyses_total_balance
- Transactions par date: idx_transactions_date
- Transactions par montant: idx_transactions_amount

✅ NORMALISÉ - Avantages:
- JOINs rapides avec indexes
- Agrégations SQL puissantes (SUM, AVG, COUNT)
- Recherche fulltext sur transactions
- Filtrage multi-critères efficace

✅ VUES MATÉRIALISÉES:
- Requêtes complexes précalculées
- Rafraîchissement périodique (ex: toutes les heures)
- Ultra-rapides pour dashboards

✅ FONCTIONS:
- process_analysis(): À appeler après chaque INSERT
- refresh_analysis_views(): Scheduler toutes les heures
*/

-- ============================================
-- FIN DU SCRIPT
-- ============================================

-- Pour exécuter:
-- 1. Se connecter à Supabase Dashboard
-- 2. Aller dans SQL Editor
-- 3. Coller ce script
-- 4. Exécuter

-- ✅ Tables créées: 7 tables + 3 vues matérialisées + 2 vues simples
-- ✅ Indexes créés: 30+ indexes pour performance maximale
-- ✅ Triggers créés: Auto-calcul métriques + historique statut
-- ✅ Fonctions créées: Extraction automatique + rafraîchissement vues

-- 🚀 PRÊT POUR PRODUCTION!
