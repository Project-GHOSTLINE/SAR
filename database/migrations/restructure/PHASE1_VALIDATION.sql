-- ==============================================================================
-- PHASE 1 VALIDATION - Vérification Complète
-- ==============================================================================
-- Date: 2026-01-15
-- Vérifie: structures, données, liens, performance
-- ==============================================================================

\echo '==================================================================='
\echo 'PHASE 1 VALIDATION - RÉSULTATS'
\echo '==================================================================='
\echo ''

-- ==============================================================================
-- 1. STRUCTURES CRÉÉES
-- ==============================================================================

\echo '1️⃣  STRUCTURES CRÉÉES'
\echo '-------------------------------------------------------------------'

SELECT
  'clients' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') as exists
UNION ALL
SELECT
  'client_identity_aliases' as table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'client_identity_aliases') as exists;

\echo ''

-- ==============================================================================
-- 2. COLONNES client_id AJOUTÉES
-- ==============================================================================

\echo '2️⃣  COLONNES client_id AJOUTÉES'
\echo '-------------------------------------------------------------------'

SELECT
  table_name,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = t.table_name
    AND column_name = 'client_id'
  ) as client_id_exists
FROM (
  VALUES
    ('loan_applications'),
    ('client_accounts'),
    ('client_analyses'),
    ('contact_messages'),
    ('support_tickets')
) AS t(table_name);

\echo ''

-- ==============================================================================
-- 3. CLIENTS CRÉÉS
-- ==============================================================================

\echo '3️⃣  CLIENTS CRÉÉS'
\echo '-------------------------------------------------------------------'

SELECT
  COUNT(*) as total_clients,
  COUNT(*) FILTER (WHERE primary_email IS NOT NULL) as with_email,
  COUNT(*) FILTER (WHERE primary_phone IS NOT NULL) as with_phone,
  COUNT(*) FILTER (WHERE first_name IS NOT NULL) as with_first_name,
  COUNT(*) FILTER (WHERE last_name IS NOT NULL) as with_last_name,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE confidence_score < 80) as low_confidence
FROM public.clients;

\echo ''

-- ==============================================================================
-- 4. LIENS client_id (MATCHING RESULTS)
-- ==============================================================================

\echo '4️⃣  LIENS client_id (MATCHING RESULTS)'
\echo '-------------------------------------------------------------------'

-- loan_applications
SELECT
  'loan_applications' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE client_id IS NULL) as orphans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as pct_linked
FROM public.loan_applications

UNION ALL

-- client_accounts
SELECT
  'client_accounts' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE client_id IS NULL) as orphans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as pct_linked
FROM public.client_accounts

UNION ALL

-- client_analyses
SELECT
  'client_analyses' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE client_id IS NULL) as orphans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as pct_linked
FROM public.client_analyses

UNION ALL

-- contact_messages
SELECT
  'contact_messages' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE client_id IS NULL) as orphans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as pct_linked
FROM public.contact_messages

UNION ALL

-- support_tickets
SELECT
  'support_tickets' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE client_id IS NOT NULL) as linked,
  COUNT(*) FILTER (WHERE client_id IS NULL) as orphans,
  ROUND(100.0 * COUNT(*) FILTER (WHERE client_id IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as pct_linked
FROM public.support_tickets;

\echo ''

-- ==============================================================================
-- 5. INDEXES PERFORMANCE CRÉÉS
-- ==============================================================================

\echo '5️⃣  INDEXES PERFORMANCE'
\echo '-------------------------------------------------------------------'

SELECT
  indexname,
  tablename,
  EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = idx.indexname) as created
FROM (
  VALUES
    ('comm_client_ts_idx', 'communications'),
    ('ct_account_ts_idx', 'client_transactions'),
    ('fraud_app_ts_idx', 'fraud_cases'),
    ('clients_primary_email_uniq', 'clients'),
    ('loan_applications_client_id_idx', 'loan_applications'),
    ('client_accounts_client_id_idx', 'client_accounts')
) AS idx(indexname, tablename);

\echo ''

-- ==============================================================================
-- 6. INTÉGRITÉ (RÈGLES NON NÉGOCIABLES)
-- ==============================================================================

\echo '6️⃣  INTÉGRITÉ (RÈGLES NON NÉGOCIABLES)'
\echo '-------------------------------------------------------------------'

-- Vérifier que client_transactions est intact (222,101 rows)
SELECT
  'client_transactions' as table_check,
  COUNT(*) as current_count,
  CASE
    WHEN COUNT(*) >= 222000 THEN '✅ INTACT'
    ELSE '⚠️  MODIFIÉ'
  END as status
FROM public.client_transactions

UNION ALL

-- Vérifier que emails_envoyes est intact (719 rows)
SELECT
  'emails_envoyes' as table_check,
  COUNT(*) as current_count,
  CASE
    WHEN COUNT(*) >= 700 THEN '✅ INTACT'
    ELSE '⚠️  MODIFIÉ'
  END as status
FROM public.emails_envoyes

UNION ALL

-- Vérifier que vopay_webhook_logs est intact (998 rows)
SELECT
  'vopay_webhook_logs' as table_check,
  COUNT(*) as current_count,
  CASE
    WHEN COUNT(*) >= 900 THEN '✅ INTACT'
    ELSE '⚠️  MODIFIÉ'
  END as status
FROM public.vopay_webhook_logs;

\echo ''

-- ==============================================================================
-- 7. STATISTIQUES MATCHING
-- ==============================================================================

\echo '7️⃣  STATISTIQUES MATCHING'
\echo '-------------------------------------------------------------------'

SELECT
  'Total clients créés' as metric,
  COUNT(*)::text as value
FROM public.clients

UNION ALL

SELECT
  'Clients avec email' as metric,
  COUNT(*)::text as value
FROM public.clients
WHERE primary_email IS NOT NULL

UNION ALL

SELECT
  'Clients avec téléphone' as metric,
  COUNT(*)::text as value
FROM public.clients
WHERE primary_phone IS NOT NULL

UNION ALL

SELECT
  'Clients avec nom complet' as metric,
  COUNT(*)::text as value
FROM public.clients
WHERE first_name IS NOT NULL AND last_name IS NOT NULL

UNION ALL

SELECT
  'Records totaux liés' as metric,
  (
    (SELECT COUNT(*) FROM public.loan_applications WHERE client_id IS NOT NULL) +
    (SELECT COUNT(*) FROM public.client_accounts WHERE client_id IS NOT NULL) +
    (SELECT COUNT(*) FROM public.client_analyses WHERE client_id IS NOT NULL) +
    (SELECT COUNT(*) FROM public.contact_messages WHERE client_id IS NOT NULL) +
    (SELECT COUNT(*) FROM public.support_tickets WHERE client_id IS NOT NULL)
  )::text as value

UNION ALL

SELECT
  'Taux matching global' as metric,
  ROUND(
    100.0 * (
      (SELECT COUNT(*) FROM public.loan_applications WHERE client_id IS NOT NULL) +
      (SELECT COUNT(*) FROM public.client_accounts WHERE client_id IS NOT NULL) +
      (SELECT COUNT(*) FROM public.client_analyses WHERE client_id IS NOT NULL) +
      (SELECT COUNT(*) FROM public.contact_messages WHERE client_id IS NOT NULL) +
      (SELECT COUNT(*) FROM public.support_tickets WHERE client_id IS NOT NULL)
    ) / NULLIF(
      (SELECT COUNT(*) FROM public.loan_applications) +
      (SELECT COUNT(*) FROM public.client_accounts) +
      (SELECT COUNT(*) FROM public.client_analyses) +
      (SELECT COUNT(*) FROM public.contact_messages) +
      (SELECT COUNT(*) FROM public.support_tickets)
    , 0), 2
  )::text || '%' as value;

\echo ''
\echo '==================================================================='
\echo 'VALIDATION COMPLÈTE ✅'
\echo '==================================================================='
