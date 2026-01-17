-- Mail Ops - Migration 006: Event Actions
-- Description: Actions déclenchées par des events (audit trail complet)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

CREATE TABLE IF NOT EXISTS event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES client_events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL DEFAULT 'pending',

  -- Payload
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Result
  result_data JSONB,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT check_action_type CHECK (action_type IN (
    'email_sent',
    'ticket_created',
    'escalated',
    'auto_replied',
    'assigned',
    'classified'
  )),
  CONSTRAINT check_status CHECK (action_status IN ('pending', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_event_actions_event ON event_actions(event_id);
CREATE INDEX idx_event_actions_type ON event_actions(action_type);
CREATE INDEX idx_event_actions_status ON event_actions(action_status) WHERE action_status = 'pending';

-- Commentaires
COMMENT ON TABLE event_actions IS 'Actions déclenchées par des events (audit trail complet)';
COMMENT ON COLUMN event_actions.action_type IS 'Type action: email_sent, ticket_created, escalated, auto_replied, assigned, classified';
COMMENT ON COLUMN event_actions.action_status IS 'Statut: pending, completed, failed';
COMMENT ON COLUMN event_actions.action_data IS 'Payload JSON de l''action (params)';
COMMENT ON COLUMN event_actions.result_data IS 'Résultat JSON de l''action (response)';
