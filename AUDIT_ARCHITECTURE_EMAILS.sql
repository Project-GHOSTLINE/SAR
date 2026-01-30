-- ============================================
-- AUDIT ARCHITECTURAL: Système d'Emails
-- Date: 2026-01-29
-- ============================================

-- 1. Vérifier si la table emails_envoyes existe
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('emails_envoyes', 'contact_messages', 'notes');

-- 2. Vérifier la structure de emails_envoyes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'emails_envoyes'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes et clés étrangères
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'emails_envoyes';

-- 4. Compter les emails enregistrés
SELECT
  COUNT(*) as total_emails,
  COUNT(CASE WHEN type = 'system' THEN 1 END) as system_emails,
  COUNT(CASE WHEN type = 'manual' THEN 1 END) as manual_emails,
  MIN(created_at) as oldest_email,
  MAX(created_at) as newest_email
FROM emails_envoyes;

-- 5. Compter les messages avec emails vs sans emails
SELECT
  COUNT(*) as total_messages,
  COUNT(CASE WHEN system_responded = true THEN 1 END) as with_system_response,
  COUNT(CASE WHEN system_responded = false THEN 1 END) as without_system_response
FROM contact_messages;

-- 6. Vérifier les messages récents (dernières 24h) et leurs emails
SELECT
  cm.id,
  cm.reference,
  cm.nom,
  cm.created_at,
  cm.system_responded,
  COUNT(ee.id) as email_count
FROM contact_messages cm
LEFT JOIN emails_envoyes ee ON ee.message_id = cm.id
WHERE cm.created_at > NOW() - INTERVAL '24 hours'
GROUP BY cm.id, cm.reference, cm.nom, cm.created_at, cm.system_responded
ORDER BY cm.created_at DESC
LIMIT 20;

-- 7. Vérifier les permissions RLS (Row Level Security)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('emails_envoyes', 'contact_messages', 'notes');

-- 8. Vérifier les policies RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('emails_envoyes', 'contact_messages', 'notes');
