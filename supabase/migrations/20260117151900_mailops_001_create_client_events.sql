-- Mail Ops - Migration 001: Client Events (Timeline Unifiée)
-- Description: Table pivot centrale pour dossier médical client unifié
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS client_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,

  CONSTRAINT check_event_type CHECK (event_type IN (
    'email_received',
    'email_sent',
    'message_created',
    'analysis_completed',
    'payment_processed',
    'note_added',
    'classification_updated',
    'action_triggered'
  ))
);

-- Indexes pour performance
CREATE INDEX idx_client_events_email_date ON client_events(client_email, created_at DESC);
CREATE INDEX idx_client_events_type ON client_events(event_type);
CREATE INDEX idx_client_events_source ON client_events(event_source);
CREATE INDEX idx_client_events_created_at ON client_events(created_at DESC);

-- Commentaires
COMMENT ON TABLE client_events IS 'Timeline unifiée de tous les events client (dossier médical multi-départements)';
COMMENT ON COLUMN client_events.client_email IS 'Email client - clé pivot pour lier tous les départements';
COMMENT ON COLUMN client_events.event_type IS 'Type événement: email_received, email_sent, message_created, analysis_completed, payment_processed, note_added';
COMMENT ON COLUMN client_events.event_source IS 'Source: mail_ops, vopay, flinks, inverite, admin';
COMMENT ON COLUMN client_events.event_data IS 'Payload JSON spécifique à chaque type événement';
