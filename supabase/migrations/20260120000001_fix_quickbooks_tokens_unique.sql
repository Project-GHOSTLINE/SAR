-- =====================================================
-- FIX: Ajouter contrainte UNIQUE sur realm_id
-- Created: 2026-01-20
-- Description: Fix pour permettre upsert avec onConflict
-- =====================================================

-- Ajouter contrainte UNIQUE sur realm_id
ALTER TABLE quickbooks_tokens
ADD CONSTRAINT quickbooks_tokens_realm_id_unique UNIQUE (realm_id);

COMMENT ON CONSTRAINT quickbooks_tokens_realm_id_unique ON quickbooks_tokens
IS 'Assure qu''il n''y a qu''un seul token par realm_id (company)';
