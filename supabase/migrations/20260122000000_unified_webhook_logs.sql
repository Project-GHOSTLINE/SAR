-- Unified webhook logs table for all providers
-- Supports VoPay, Flinks, QuickBooks, and future integrations

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN ('vopay', 'flinks', 'quickbooks', 'stripe', 'other')),
  event_type TEXT NOT NULL, -- e.g., 'transaction.completed', 'account.updated', etc.

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'failed', 'retrying')),

  -- Payload data
  payload JSONB NOT NULL, -- Original webhook payload
  response JSONB, -- Response sent back to provider
  headers JSONB, -- HTTP headers for debugging

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Performance metrics
  processing_time_ms INTEGER, -- Time taken to process webhook in milliseconds

  -- External references
  external_id TEXT, -- Provider's transaction/event ID
  client_id UUID, -- Link to our clients table if applicable
  loan_id UUID, -- Link to loans table if applicable

  -- Validation
  signature TEXT, -- Webhook signature for validation
  is_validated BOOLEAN DEFAULT false,
  validation_method TEXT, -- 'hmac_sha256', 'jwt', etc.

  -- Environment
  environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'sandbox', 'test')),

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_external_id ON webhook_logs(external_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_client_id ON webhook_logs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_environment ON webhook_logs(environment);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_status ON webhook_logs(provider, status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_received ON webhook_logs(provider, received_at DESC);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_webhook_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_logs_updated_at();

-- Comments for documentation
COMMENT ON TABLE webhook_logs IS 'Unified webhook logs for all external providers (VoPay, Flinks, QuickBooks, etc.)';
COMMENT ON COLUMN webhook_logs.provider IS 'External provider sending the webhook';
COMMENT ON COLUMN webhook_logs.event_type IS 'Type of event (transaction.completed, account.updated, etc.)';
COMMENT ON COLUMN webhook_logs.status IS 'Processing status: received, processing, completed, failed, retrying';
COMMENT ON COLUMN webhook_logs.payload IS 'Original webhook payload from provider';
COMMENT ON COLUMN webhook_logs.processing_time_ms IS 'Time taken to process webhook in milliseconds';
COMMENT ON COLUMN webhook_logs.external_id IS 'Provider transaction/event ID for cross-reference';
COMMENT ON COLUMN webhook_logs.is_validated IS 'Whether webhook signature was validated successfully';

-- Migrate existing VoPay webhooks to new table
INSERT INTO webhook_logs (
  provider,
  event_type,
  status,
  payload,
  external_id,
  signature,
  is_validated,
  environment,
  received_at,
  processed_at,
  created_at,
  error_message,
  processing_time_ms
)
SELECT
  'vopay' as provider,
  transaction_type as event_type,
  CASE
    WHEN status = 'successful' THEN 'completed'
    WHEN status = 'failed' THEN 'failed'
    WHEN status = 'pending' THEN 'received'
    WHEN status = 'in progress' THEN 'processing'
    ELSE 'received'
  END as status,
  raw_payload as payload,
  transaction_id as external_id,
  validation_key as signature,
  is_validated,
  LOWER(COALESCE(environment, 'production')) as environment,
  received_at,
  processed_at,
  created_at,
  failure_reason as error_message,
  NULL as processing_time_ms
FROM vopay_webhook_logs
WHERE environment = 'Production' -- Only migrate production data, exclude sandbox/test
AND NOT EXISTS (
  SELECT 1 FROM webhook_logs
  WHERE provider = 'vopay'
  AND external_id = vopay_webhook_logs.transaction_id
)
ON CONFLICT DO NOTHING;

-- Create view for backward compatibility
CREATE OR REPLACE VIEW vopay_webhooks_view AS
SELECT
  id,
  external_id as transaction_id,
  event_type as transaction_type,
  (payload->>'TransactionAmount')::DECIMAL as transaction_amount,
  COALESCE(payload->>'Currency', 'CAD') as currency,
  CASE
    WHEN status = 'completed' THEN 'successful'
    WHEN status = 'failed' THEN 'failed'
    WHEN status = 'received' THEN 'pending'
    WHEN status = 'processing' THEN 'in progress'
    ELSE status
  END as status,
  error_message as failure_reason,
  environment,
  is_validated,
  received_at,
  updated_at,
  payload as raw_payload
FROM webhook_logs
WHERE provider = 'vopay';

COMMENT ON VIEW vopay_webhooks_view IS 'Backward compatibility view for VoPay webhooks';
