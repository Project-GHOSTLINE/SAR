-- Mail Ops - Migration 010: RLS Policies Mail Ops
-- Description: Row Level Security pour Mail Ops (admin full, agents restreints)
-- Date: 2026-01-17
-- Phase: MAIL OPS - Foundation

-- client_events
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access events"
  ON client_events FOR ALL
  USING (true);

-- email_messages
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access email_messages"
  ON email_messages FOR ALL
  USING (true);

-- email_classifications
ALTER TABLE email_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access classifications"
  ON email_classifications FOR ALL
  USING (true);

-- email_accounts
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access email_accounts"
  ON email_accounts FOR ALL
  USING (true);

-- classification_taxonomy
ALTER TABLE classification_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access taxonomy"
  ON classification_taxonomy FOR ALL
  USING (true);

-- event_actions
ALTER TABLE event_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access event_actions"
  ON event_actions FOR ALL
  USING (true);

-- email_metrics_daily
ALTER TABLE email_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access email_metrics"
  ON email_metrics_daily FOR ALL
  USING (true);

-- Commentaires
COMMENT ON POLICY "Admins full access events" ON client_events IS 'Phase 1: Accès complet admins. Phase 2: Ajouter policies basées sur roles/départements';
COMMENT ON POLICY "Admins full access email_messages" ON email_messages IS 'Phase 1: Accès complet admins. Phase 2: Restreindre par département';

-- NOTE: Pour Phase 2, ajouter policies basées sur roles
-- Ex: Agents perception peuvent voir seulement emails de leur département
-- CREATE POLICY "Agents perception access"
--   ON email_messages FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM email_accounts
--       WHERE email_accounts.id = email_messages.account_id
--       AND email_accounts.department = 'perception'
--     )
--   );
