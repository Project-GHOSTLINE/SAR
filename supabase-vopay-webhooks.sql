-- Table pour stocker les webhooks VoPay
CREATE TABLE IF NOT EXISTS vopay_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identifiants de la transaction
  transaction_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,

  -- Montant et devise
  transaction_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'CAD',

  -- Statut
  status TEXT NOT NULL, -- pending, in progress, failed, cancelled, successful
  previous_status TEXT,

  -- Informations additionnelles
  failure_reason TEXT,
  environment TEXT DEFAULT 'Production', -- Production ou Sandbox

  -- Validation
  validation_key TEXT NOT NULL,
  is_validated BOOLEAN DEFAULT false,

  -- Payload complet (pour debug)
  raw_payload JSONB NOT NULL,

  -- Timestamps
  updated_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_vopay_transaction_id ON vopay_webhook_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vopay_status ON vopay_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_vopay_received_at ON vopay_webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_vopay_environment ON vopay_webhook_logs(environment);

-- Commentaires pour documentation
COMMENT ON TABLE vopay_webhook_logs IS 'Stocke tous les webhooks reçus de VoPay pour audit et traçabilité';
COMMENT ON COLUMN vopay_webhook_logs.transaction_id IS 'ID unique de la transaction VoPay';
COMMENT ON COLUMN vopay_webhook_logs.status IS 'Statut actuel: pending, in progress, failed, cancelled, successful';
COMMENT ON COLUMN vopay_webhook_logs.validation_key IS 'Clé HMAC SHA1 envoyée par VoPay pour validation';
COMMENT ON COLUMN vopay_webhook_logs.is_validated IS 'Indique si la signature a été validée avec succès';
COMMENT ON COLUMN vopay_webhook_logs.raw_payload IS 'Payload JSON complet reçu de VoPay';
