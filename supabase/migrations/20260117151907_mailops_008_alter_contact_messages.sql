-- Mail Ops - Migration 008: Alter contact_messages (Colonnes Mail Ops)
-- Description: Ajouter colonnes Mail Ops à contact_messages existante + Backfill events
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

-- Ajouter colonnes Mail Ops
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_time_seconds INT,
  ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_sla_met BOOLEAN;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_contact_messages_resolved ON contact_messages(resolved_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_sla ON contact_messages(sla_deadline_at) WHERE is_sla_met IS NULL;

-- Commentaires
COMMENT ON COLUMN contact_messages.category IS 'Catégorie: QUESTION_GENERALE, DEMANDE_INFO_PRET, PLAINTE, etc.';
COMMENT ON COLUMN contact_messages.priority IS 'Priorité: low, medium, high, urgent';
COMMENT ON COLUMN contact_messages.response_time_seconds IS 'Temps réponse en secondes (calcul: resolved_at - created_at)';
COMMENT ON COLUMN contact_messages.sla_deadline_at IS 'Deadline SLA (created_at + SLA hours de la catégorie)';
COMMENT ON COLUMN contact_messages.is_sla_met IS 'true = résolu avant deadline, false = dépassement SLA, null = en cours';

-- Backfill: Créer events pour messages existants
INSERT INTO client_events (client_email, client_name, event_type, event_source, event_data, created_at)
SELECT
  email,
  nom,
  'message_created',
  'admin',
  jsonb_build_object(
    'message_id', id,
    'question', question,
    'status', status
  ),
  created_at
FROM contact_messages
WHERE email IS NOT NULL
ON CONFLICT DO NOTHING;
