-- ============================================
-- DIAGNOSTIC COMPLET SUPABASE
-- Date: 2026-01-29
-- But: Identifier pourquoi /api/admin/messages?messageId=X retourne 500
-- ============================================

-- 1. Vérifier si la table emails_envoyes existe
SELECT
  'Table emails_envoyes existe?' as test,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'emails_envoyes'
    ) THEN '✅ OUI'
    ELSE '❌ NON - VOUS DEVEZ EXECUTER CREATE_TABLE_EMAILS_ENVOYES.sql'
  END as resultat;

-- 2. Vérifier si la table notes existe
SELECT
  'Table notes existe?' as test,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notes'
    ) THEN '✅ OUI'
    ELSE '❌ NON - VOUS DEVEZ CREER LA TABLE notes'
  END as resultat;

-- 3. Vérifier la structure de emails_envoyes (si elle existe)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'emails_envoyes'
ORDER BY ordinal_position;

-- 4. Vérifier la structure de notes (si elle existe)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notes'
ORDER BY ordinal_position;

-- 5. Compter les emails enregistrés
SELECT
  'Nombre emails dans la BD' as info,
  COUNT(*) as count,
  MAX(created_at) as dernier_email
FROM emails_envoyes;

-- 6. Compter les notes
SELECT
  'Nombre notes dans la BD' as info,
  COUNT(*) as count
FROM notes;

-- 7. Tester une requête typique qui cause le 500
-- Remplacez 647 par l'ID qui cause l'erreur
SELECT
  'Test requete emails pour message 647' as test,
  COUNT(*) as nb_emails
FROM emails_envoyes
WHERE message_id = 647;

-- 8. Vérifier les permissions RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('emails_envoyes', 'notes', 'contact_messages');

-- 9. Vérifier les policies RLS (si activées)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('emails_envoyes', 'notes');

-- ============================================
-- RÉSULTAT ATTENDU:
-- ============================================
-- Si emails_envoyes n'existe PAS:
--   ➡️ Exécuter CREATE_TABLE_EMAILS_ENVOYES.sql
--
-- Si notes n'existe PAS:
--   ➡️ Créer la table notes:
--   CREATE TABLE notes (
--     id SERIAL PRIMARY KEY,
--     message_id INTEGER REFERENCES contact_messages(id),
--     de TEXT,
--     a TEXT,
--     contenu TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW()
--   );
--
-- Si RLS est activé sans policy:
--   ➡️ Désactiver RLS ou créer une policy
-- ============================================
