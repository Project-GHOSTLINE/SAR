-- =====================================================
-- QUICKBOOKS INTEGRATION TABLES
-- Created: 2026-01-20
-- Description: Tables pour l'intégration QuickBooks Online
-- =====================================================

-- Table pour stocker les tokens OAuth QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT NOT NULL, -- QuickBooks Company ID
  company_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index sur realm_id pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_realm_id ON quickbooks_tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_expires_at ON quickbooks_tokens(expires_at);

-- Table pour les clients QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_id TEXT NOT NULL UNIQUE, -- QuickBooks Customer ID
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Lien avec notre table clients
  display_name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  balance DECIMAL(10, 2) DEFAULT 0,
  taxable BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  sync_token TEXT, -- Pour éviter les conflits de mise à jour
  metadata JSONB, -- Données brutes de QuickBooks
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_customers_qb_id ON quickbooks_customers(qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_customers_client_id ON quickbooks_customers(client_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_customers_email ON quickbooks_customers(email);

-- Table pour les factures QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_id TEXT NOT NULL UNIQUE,
  customer_qb_id TEXT NOT NULL,
  customer_id UUID REFERENCES quickbooks_customers(id) ON DELETE CASCADE,
  doc_number TEXT,
  txn_date DATE NOT NULL,
  due_date DATE,
  total_amount DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  currency_code TEXT DEFAULT 'CAD',
  status TEXT, -- Draft, Sent, Paid, Partial, Overdue
  email_status TEXT,
  line_items JSONB, -- Lignes de la facture
  metadata JSONB,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_qb_id ON quickbooks_invoices(qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_customer_qb_id ON quickbooks_invoices(customer_qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_status ON quickbooks_invoices(status);
CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_txn_date ON quickbooks_invoices(txn_date);
CREATE INDEX IF NOT EXISTS idx_quickbooks_invoices_balance ON quickbooks_invoices(balance) WHERE balance > 0;

-- Table pour les paiements QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_id TEXT NOT NULL UNIQUE,
  customer_qb_id TEXT NOT NULL,
  customer_id UUID REFERENCES quickbooks_customers(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency_code TEXT DEFAULT 'CAD',
  payment_method TEXT,
  payment_ref_number TEXT,
  deposit_to_account_id TEXT,
  line_items JSONB, -- Liens vers les factures payées
  metadata JSONB,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_payments_qb_id ON quickbooks_payments(qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_payments_customer_qb_id ON quickbooks_payments(customer_qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_payments_txn_date ON quickbooks_payments(txn_date);

-- Table pour le plan comptable QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_sub_type TEXT,
  classification TEXT,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  description TEXT,
  metadata JSONB,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_accounts_qb_id ON quickbooks_accounts(qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_accounts_type ON quickbooks_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_quickbooks_accounts_active ON quickbooks_accounts(active) WHERE active = true;

-- Table pour les fournisseurs QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  billing_address JSONB,
  balance DECIMAL(10, 2) DEFAULT 0,
  taxable BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  sync_token TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_vendors_qb_id ON quickbooks_vendors(qb_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_vendors_email ON quickbooks_vendors(email);

-- Table pour les webhooks QuickBooks
CREATE TABLE IF NOT EXISTS quickbooks_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  entity_name TEXT NOT NULL, -- Customer, Invoice, Payment, etc.
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- Create, Update, Delete, Merge
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_webhooks_realm_id ON quickbooks_webhooks(realm_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_webhooks_entity ON quickbooks_webhooks(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_webhooks_processed ON quickbooks_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_quickbooks_webhooks_received_at ON quickbooks_webhooks(received_at);

-- Table pour les logs de synchronisation
CREATE TABLE IF NOT EXISTS quickbooks_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- customers, invoices, payments, accounts, vendors, full
  status TEXT NOT NULL, -- started, completed, failed
  records_synced INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_logs_sync_type ON quickbooks_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_logs_status ON quickbooks_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_logs_started_at ON quickbooks_sync_logs(started_at);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_quickbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_quickbooks_tokens_updated_at
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_customers_updated_at
  BEFORE UPDATE ON quickbooks_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_invoices_updated_at
  BEFORE UPDATE ON quickbooks_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_payments_updated_at
  BEFORE UPDATE ON quickbooks_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_accounts_updated_at
  BEFORE UPDATE ON quickbooks_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

CREATE TRIGGER update_quickbooks_vendors_updated_at
  BEFORE UPDATE ON quickbooks_vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_updated_at();

-- Commentaires sur les tables
COMMENT ON TABLE quickbooks_tokens IS 'Tokens OAuth pour QuickBooks Online API';
COMMENT ON TABLE quickbooks_customers IS 'Clients synchronisés depuis QuickBooks';
COMMENT ON TABLE quickbooks_invoices IS 'Factures synchronisées depuis QuickBooks';
COMMENT ON TABLE quickbooks_payments IS 'Paiements synchronisés depuis QuickBooks';
COMMENT ON TABLE quickbooks_accounts IS 'Plan comptable synchronisé depuis QuickBooks';
COMMENT ON TABLE quickbooks_vendors IS 'Fournisseurs synchronisés depuis QuickBooks';
COMMENT ON TABLE quickbooks_webhooks IS 'Événements webhook reçus de QuickBooks';
COMMENT ON TABLE quickbooks_sync_logs IS 'Logs de synchronisation avec QuickBooks';
