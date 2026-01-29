-- ============================================
-- Migration: Créer table notes
-- Date: 2026-01-29
-- Description: Notes internes pour les messages clients
-- ============================================

-- 1. Créer la table notes
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  de TEXT NOT NULL,
  a TEXT NOT NULL,
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ajouter la clé étrangère vers contact_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notes_message_id_fkey'
      AND table_name = 'notes'
  ) THEN
    ALTER TABLE notes
    ADD CONSTRAINT notes_message_id_fkey
    FOREIGN KEY (message_id)
    REFERENCES contact_messages(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Créer des index pour performance
CREATE INDEX IF NOT EXISTS idx_notes_message_id
  ON notes(message_id);

CREATE INDEX IF NOT EXISTS idx_notes_created_at
  ON notes(created_at DESC);

-- 4. Désactiver Row Level Security (RLS)
-- Important: Sans cela, les INSERT depuis le service role peuvent être bloqués
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

-- 5. Ajouter des commentaires sur les colonnes
COMMENT ON TABLE notes IS 'Notes internes pour les messages clients';
COMMENT ON COLUMN notes.id IS 'Identifiant unique de la note';
COMMENT ON COLUMN notes.message_id IS 'Référence vers le message contact_messages';
COMMENT ON COLUMN notes.de IS 'Auteur de la note (nom ou email)';
COMMENT ON COLUMN notes.a IS 'Destinataire de la note (nom ou "Tous")';
COMMENT ON COLUMN notes.contenu IS 'Contenu de la note';
COMMENT ON COLUMN notes.created_at IS 'Date et heure de création';

-- 6. Vérifier que tout a été créé correctement
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notes'
ORDER BY ordinal_position;

-- 7. Vérifier les contraintes
SELECT
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'notes';

-- 8. Vérifier les index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'notes';

-- 9. Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Table notes créée avec succès!';
  RAISE NOTICE '✅ Clé étrangère vers contact_messages ajoutée';
  RAISE NOTICE '✅ Index de performance créés';
  RAISE NOTICE '✅ RLS désactivé pour permettre les INSERT';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Usage:';
  RAISE NOTICE '   INSERT INTO notes (message_id, de, a, contenu)';
  RAISE NOTICE '   VALUES (1, ''admin@example.com'', ''Sandra'', ''Note de suivi'')';
END $$;
