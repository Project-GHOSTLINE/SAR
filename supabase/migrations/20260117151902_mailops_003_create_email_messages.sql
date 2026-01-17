-- Mail Ops - Migration 003: Email Messages (Emails Entrants Raw)
-- Description: Emails entrants depuis Gmail/Outlook (raw data)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants provider (idempotency)
  provider TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  provider_thread_id TEXT,

  -- Account
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,

  -- Email headers
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT,

  -- Content
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,

  -- Metadata
  received_at TIMESTAMPTZ NOT NULL,
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INT DEFAULT 0,
  labels JSONB DEFAULT '[]'::jsonb,

  -- Raw
  raw_data JSONB,

  -- Processing
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_provider_message UNIQUE(provider, provider_message_id)
);

-- Indexes
CREATE INDEX idx_email_messages_account ON email_messages(account_id, received_at DESC);
CREATE INDEX idx_email_messages_from ON email_messages(from_email);
CREATE INDEX idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_provider_id ON email_messages(provider_message_id);
CREATE INDEX idx_email_messages_processed ON email_messages(is_processed) WHERE NOT is_processed;

-- Commentaires
COMMENT ON TABLE email_messages IS 'Emails entrants (raw) depuis Gmail/Outlook';
COMMENT ON CONSTRAINT unique_provider_message ON email_messages IS 'Idempotency: un message provider ne peut être inséré qu''une fois';
COMMENT ON COLUMN email_messages.provider IS 'Provider: gmail, microsoft';
COMMENT ON COLUMN email_messages.provider_message_id IS 'ID unique du provider (Gmail: message.id, Graph: message.id)';
COMMENT ON COLUMN email_messages.snippet IS 'Preview (first 200 chars)';
COMMENT ON COLUMN email_messages.labels IS 'Gmail labels ou Outlook categories (array JSON)';
