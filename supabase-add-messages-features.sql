-- Migration: Ajouter fonctionnalités d'assignation et réponse système aux messages
-- Date: 2026-01-07
-- Description: Ajoute les colonnes assigned_to et system_responded pour gérer les assignations et tracer les réponses automatiques

-- 1. Ajouter colonne assigned_to pour assigner à Sandra, Michel, ou autres
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_to TEXT NULL;

-- 2. Ajouter colonne system_responded pour savoir si le système a répondu automatiquement
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS system_responded BOOLEAN DEFAULT false;

-- 3. Créer un index pour rechercher rapidement les messages assignés à quelqu'un
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned_to
ON contact_messages(assigned_to)
WHERE assigned_to IS NOT NULL;

-- 4. Créer un index pour rechercher rapidement les messages sans réponse système
CREATE INDEX IF NOT EXISTS idx_contact_messages_system_responded
ON contact_messages(system_responded);

-- 5. Ajouter colonne assigned_at pour savoir quand l'assignation a été faite
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE NULL;

-- 6. Ajouter colonne assigned_by pour savoir qui a fait l'assignation
ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS assigned_by TEXT NULL;

-- 7. Mettre à jour les messages existants qui ont des emails système envoyés
-- Marquer system_responded = true pour les messages qui ont déjà un email système
UPDATE contact_messages
SET system_responded = true
WHERE id IN (
  SELECT DISTINCT message_id
  FROM emails_envoyes
  WHERE type = 'system'
);

-- 8. Commentaires sur les colonnes
COMMENT ON COLUMN contact_messages.assigned_to IS 'Nom du collègue à qui le message est assigné (ex: Sandra, Michel)';
COMMENT ON COLUMN contact_messages.system_responded IS 'Indique si le système a envoyé une réponse automatique au client';
COMMENT ON COLUMN contact_messages.assigned_at IS 'Date et heure de l assignation';
COMMENT ON COLUMN contact_messages.assigned_by IS 'Qui a fait l assignation (email admin)';

-- 9. Afficher le résultat
SELECT
  COUNT(*) as total_messages,
  COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as assigned_messages,
  COUNT(CASE WHEN system_responded = true THEN 1 END) as with_system_response,
  COUNT(CASE WHEN system_responded = false THEN 1 END) as without_system_response
FROM contact_messages;
