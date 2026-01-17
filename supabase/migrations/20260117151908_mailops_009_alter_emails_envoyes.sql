-- Mail Ops - Migration 009: Alter emails_envoyes (Tracking Resend)
-- Description: Ajouter tracking Resend à emails_envoyes + Backfill events
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

-- Ajouter tracking Resend
ALTER TABLE emails_envoyes
  ADD COLUMN IF NOT EXISTS resend_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_envoyes_resend_id ON emails_envoyes(resend_id);
CREATE INDEX IF NOT EXISTS idx_emails_envoyes_status ON emails_envoyes(status);

-- Commentaires
COMMENT ON COLUMN emails_envoyes.resend_id IS 'ID Resend (pour tracker via webhooks)';
COMMENT ON COLUMN emails_envoyes.status IS 'Statut: sent, delivered, opened, clicked, bounced';
COMMENT ON COLUMN emails_envoyes.opened_at IS 'Date ouverture email (webhook Resend)';
COMMENT ON COLUMN emails_envoyes.clicked_at IS 'Date premier clic lien (webhook Resend)';
COMMENT ON COLUMN emails_envoyes.bounced_at IS 'Date bounce (webhook Resend)';
COMMENT ON COLUMN emails_envoyes.bounce_reason IS 'Raison bounce (hard bounce, soft bounce, spam)';

-- Backfill: Créer events pour emails envoyés
INSERT INTO client_events (client_email, event_type, event_source, event_data, created_at)
SELECT
  destinataire,
  'email_sent',
  'admin',
  jsonb_build_object(
    'email_id', id,
    'sujet', sujet,
    'type', type
  ),
  created_at
FROM emails_envoyes
WHERE destinataire IS NOT NULL
ON CONFLICT DO NOTHING;
