-- ============================================
-- Migration: Créer table emails_envoyes
-- Date: 2026-01-29
-- Description: Stockage de tous les emails envoyés (client + équipe)
-- ============================================

-- 1. Créer la table emails_envoyes
CREATE TABLE IF NOT EXISTS emails_envoyes (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'manual')),
  destinataire TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  envoye_par TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ajouter la clé étrangère vers contact_messages
-- Note: ON DELETE CASCADE signifie que si un message est supprimé,
-- tous ses emails sont aussi supprimés automatiquement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'emails_envoyes_message_id_fkey'
      AND table_name = 'emails_envoyes'
  ) THEN
    ALTER TABLE emails_envoyes
    ADD CONSTRAINT emails_envoyes_message_id_fkey
    FOREIGN KEY (message_id)
    REFERENCES contact_messages(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Créer des index pour performance
CREATE INDEX IF NOT EXISTS idx_emails_envoyes_message_id
  ON emails_envoyes(message_id);

CREATE INDEX IF NOT EXISTS idx_emails_envoyes_destinataire
  ON emails_envoyes(destinataire);

CREATE INDEX IF NOT EXISTS idx_emails_envoyes_type
  ON emails_envoyes(type);

CREATE INDEX IF NOT EXISTS idx_emails_envoyes_created_at
  ON emails_envoyes(created_at DESC);

-- 4. Désactiver Row Level Security (RLS)
-- Important: Sans cela, les INSERT depuis le service role peuvent être bloqués
ALTER TABLE emails_envoyes DISABLE ROW LEVEL SECURITY;

-- Alternativement, si vous voulez garder RLS activé:
-- ALTER TABLE emails_envoyes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role full access"
--   ON emails_envoyes
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- 5. Ajouter des commentaires sur les colonnes
COMMENT ON TABLE emails_envoyes IS 'Historique de tous les emails envoyés (confirmations clients et notifications équipe)';
COMMENT ON COLUMN emails_envoyes.id IS 'Identifiant unique de l email';
COMMENT ON COLUMN emails_envoyes.message_id IS 'Référence vers le message contact_messages';
COMMENT ON COLUMN emails_envoyes.type IS 'Type d email: system (automatique) ou manual (envoyé manuellement par admin)';
COMMENT ON COLUMN emails_envoyes.destinataire IS 'Adresse email du destinataire';
COMMENT ON COLUMN emails_envoyes.sujet IS 'Objet de l email';
COMMENT ON COLUMN emails_envoyes.contenu IS 'Contenu HTML complet de l email';
COMMENT ON COLUMN emails_envoyes.envoye_par IS 'Qui a envoyé: system ou email de l admin';
COMMENT ON COLUMN emails_envoyes.created_at IS 'Date et heure d envoi';

-- 6. Vérifier que tout a été créé correctement
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'emails_envoyes'
ORDER BY ordinal_position;

-- 7. Vérifier les contraintes
SELECT
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'emails_envoyes';

-- 8. Vérifier les index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'emails_envoyes';

-- 9. Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Table emails_envoyes créée avec succès!';
  RAISE NOTICE '✅ Clé étrangère vers contact_messages ajoutée';
  RAISE NOTICE '✅ Index de performance créés';
  RAISE NOTICE '✅ RLS désactivé pour permettre les INSERT';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes:';
  RAISE NOTICE '   1. Créer un nouveau message de test depuis le site client';
  RAISE NOTICE '   2. Vérifier que des emails apparaissent dans cette table';
  RAISE NOTICE '   3. Ouvrir l admin et cliquer sur le message pour voir les emails';
END $$;
