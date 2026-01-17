-- Mail Ops - Migration 002: Email Accounts (Connecteurs Gmail/Outlook)
-- Description: Comptes emails connectés avec OAuth tokens
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT,
  department TEXT,

  -- OAuth credentials (encrypted)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_cursor TEXT,

  -- Config
  sync_settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_provider CHECK (provider IN ('gmail', 'microsoft', 'outlook'))
);

-- Indexes
CREATE INDEX idx_email_accounts_email ON email_accounts(email);
CREATE INDEX idx_email_accounts_provider ON email_accounts(provider);
CREATE INDEX idx_email_accounts_active ON email_accounts(is_active);

-- Commentaires
COMMENT ON TABLE email_accounts IS 'Comptes emails connectés (Gmail, Outlook) avec OAuth tokens';
COMMENT ON COLUMN email_accounts.provider IS 'Provider: gmail, microsoft, outlook';
COMMENT ON COLUMN email_accounts.department IS 'Département: perception, analyse, support';
COMMENT ON COLUMN email_accounts.sync_cursor IS 'Provider-specific cursor (Gmail historyId, Graph deltaLink)';
COMMENT ON COLUMN email_accounts.access_token_encrypted IS 'Access token chiffré (ne JAMAIS stocker en clair)';
COMMENT ON COLUMN email_accounts.refresh_token_encrypted IS 'Refresh token chiffré';
