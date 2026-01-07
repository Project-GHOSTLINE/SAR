-- ============================================================
-- MIGRATION: Ajouter colonnes pour statistiques messages
-- Copier-coller ce fichier COMPLET dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter colonne assigned_to
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_to TEXT NULL;

-- 2. Ajouter colonne system_responded
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS system_responded BOOLEAN DEFAULT false;

-- 3. Index pour assigned_to
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned_to
ON contact_messages(assigned_to)
WHERE assigned_to IS NOT NULL;

-- 4. Index pour system_responded
CREATE INDEX IF NOT EXISTS idx_contact_messages_system_responded
ON contact_messages(system_responded);

-- 5. Ajouter colonne assigned_at
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE NULL;

-- 6. Ajouter colonne assigned_by
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_by TEXT NULL;

-- 7. Mettre à jour les messages existants avec réponses système
UPDATE contact_messages
SET system_responded = true
WHERE id IN (
  SELECT DISTINCT message_id
  FROM emails_envoyes
  WHERE type = 'system'
);

-- 8. Vérifier le résultat
SELECT
  COUNT(*) as total_messages,
  COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_messages,
  COUNT(CASE WHEN system_responded = true THEN 1 END) as with_system_response,
  COUNT(CASE WHEN system_responded = false THEN 1 END) as without_system_response
FROM contact_messages;
