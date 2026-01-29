-- ============================================
-- Migration: Add deleted_at tracking to contact_messages
-- Date: 2026-01-29
-- Description: Soft delete support for messages
-- ============================================

-- 1. Add deleted_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_messages'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE contact_messages
    ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

    COMMENT ON COLUMN contact_messages.deleted_at IS 'Date et heure de suppression du message (soft delete)';
  END IF;
END $$;

-- 2. Create index for deleted_at queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_deleted_at
  ON contact_messages(deleted_at);

-- 3. Create index for deleted today queries (deleted_at >= today 00:01)
CREATE INDEX IF NOT EXISTS idx_contact_messages_deleted_at_date
  ON contact_messages(DATE(deleted_at))
  WHERE deleted_at IS NOT NULL;

-- 4. Add comment
COMMENT ON TABLE contact_messages IS 'Messages de contact des clients avec support pour soft delete';

-- 5. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne deleted_at ajoutée à contact_messages';
  RAISE NOTICE '✅ Index créés pour les requêtes de suppression';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Usage:';
  RAISE NOTICE '   - Pour soft delete: UPDATE contact_messages SET deleted_at = NOW() WHERE id = X';
  RAISE NOTICE '   - Pour compter supprimés aujourd''hui: WHERE DATE(deleted_at) = CURRENT_DATE';
END $$;
