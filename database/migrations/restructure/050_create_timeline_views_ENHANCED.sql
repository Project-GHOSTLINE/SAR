-- 050_create_timeline_views_ENHANCED.sql
-- Phase 5: Timeline et Summary Views Complètes
-- Date: 2026-01-15
-- Amélioration: Inclut loans, payment_events, vopay_objects

-- ==============================================================================
-- VUE 1: TIMELINE UNIFIÉE CLIENT
-- ==============================================================================
-- Agrège tous les événements d'un client en une seule timeline chronologique

CREATE OR REPLACE VIEW public.vw_client_timeline AS

-- 1️⃣ COMMUNICATIONS (Emails, SMS, etc.)
SELECT
  co.client_id,
  co.occurred_at AS ts,
  'COMMUNICATION'::text AS kind,
  co.channel AS subtype,
  co.direction,
  co.subject AS title,
  left(COALESCE(co.body_text,''), 240) AS summary,
  jsonb_build_object(
    'communication_id', co.id,
    'provider', co.provider,
    'provider_message_id', co.provider_message_id
  ) AS ref
FROM public.communications co

UNION ALL

-- 2️⃣ SUPPORT (via vue support_as_communications)
SELECT
  sc.client_id,
  sc.occurred_at AS ts,
  'SUPPORT'::text AS kind,
  sc.channel AS subtype,
  sc.direction,
  sc.subject AS title,
  left(COALESCE(sc.body_text,''), 240) AS summary,
  sc.metadata AS ref
FROM public.vw_support_as_communications sc

UNION ALL

-- 3️⃣ LEDGER (Transactions bancaires)
SELECT
  ca.client_id,
  ct.created_at AS ts,
  'LEDGER'::text AS kind,
  ct.transaction_type AS subtype,
  NULL::text AS direction,
  ct.transaction_type AS title,
  ct.description AS summary,
  jsonb_build_object(
    'transaction_id', ct.id,
    'amount', ct.amount,
    'vopay_transaction_id', ct.vopay_transaction_id
  ) AS ref
FROM public.client_transactions ct
JOIN public.client_accounts ca ON ca.id = ct.account_id
WHERE ca.client_id IS NOT NULL

UNION ALL

-- 4️⃣ FRAUD CASES
SELECT
  la.client_id,
  fc.reported_at AS ts,
  'FRAUD'::text AS kind,
  fc.fraud_type AS subtype,
  NULL::text AS direction,
  'Fraud Case'::text AS title,
  left(COALESCE(fc.description,''), 240) AS summary,
  jsonb_build_object(
    'fraud_case_id', fc.id,
    'severity', fc.severity,
    'status', fc.status
  ) AS ref
FROM public.fraud_cases fc
JOIN public.loan_applications la ON la.id = fc.application_id
WHERE la.client_id IS NOT NULL

UNION ALL

-- 5️⃣ LOANS (Création de prêts)
SELECT
  l.client_id,
  l.created_at AS ts,
  'LOAN'::text AS kind,
  l.status AS subtype,
  NULL::text AS direction,
  'Loan Created'::text AS title,
  'New loan created' AS summary,
  jsonb_build_object(
    'loan_id', l.id,
    'application_id', l.application_id,
    'status', l.status,
    'metadata', l.metadata
  ) AS ref
FROM public.loans l
WHERE l.client_id IS NOT NULL

UNION ALL

-- 6️⃣ PAYMENT EVENTS (NSF, Reports, Adjustments)
SELECT
  l.client_id,
  pe.created_at AS ts,
  'PAYMENT_EVENT'::text AS kind,
  pe.event_type AS subtype,
  NULL::text AS direction,
  pe.event_type AS title,
  COALESCE(pe.payload->>'description', pe.event_type) AS summary,
  jsonb_build_object(
    'payment_event_id', pe.id,
    'loan_id', pe.loan_id,
    'amount', pe.amount,
    'effective_date', pe.effective_date,
    'created_by', pe.created_by
  ) AS ref
FROM public.payment_events pe
JOIN public.loans l ON l.id = pe.loan_id
WHERE l.client_id IS NOT NULL

UNION ALL

-- 7️⃣ VOPAY TRANSACTIONS (Paiements VoPay)
SELECT
  vo.client_id,
  vo.occurred_at AS ts,
  'VOPAY'::text AS kind,
  vo.object_type AS subtype,
  NULL::text AS direction,
  CONCAT('VoPay ', vo.object_type) AS title,
  CONCAT('Amount: $', COALESCE(vo.amount::text, 'N/A'), ' - Status: ', COALESCE(vo.status, 'unknown')) AS summary,
  jsonb_build_object(
    'vopay_object_id', vo.id,
    'vopay_id', vo.vopay_id,
    'loan_id', vo.loan_id,
    'amount', vo.amount,
    'status', vo.status
  ) AS ref
FROM public.vopay_objects vo
WHERE vo.client_id IS NOT NULL

ORDER BY ts DESC;

COMMENT ON VIEW vw_client_timeline IS 'Timeline unifiée de tous les événements client (communications, support, ledger, fraud, loans, payment events, vopay)';

-- ==============================================================================
-- VUE 2: RÉSUMÉ CLIENT (Métriques agrégées)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_client_summary AS
SELECT
  cl.id AS client_id,
  cl.primary_email,
  cl.primary_phone,
  cl.first_name,
  cl.last_name,
  cl.date_of_birth,
  cl.created_at AS client_since,

  -- Applications
  (SELECT COUNT(*) FROM public.loan_applications la WHERE la.client_id = cl.id) AS applications_count,
  (SELECT COUNT(*) FROM public.loan_applications la WHERE la.client_id = cl.id AND la.status = 'approved') AS applications_approved,

  -- Loans
  (SELECT COUNT(*) FROM public.loans l WHERE l.client_id = cl.id) AS loans_count,
  (SELECT COUNT(*) FROM public.loans l WHERE l.client_id = cl.id AND l.status = 'active') AS loans_active,

  -- Accounts
  (SELECT COUNT(*) FROM public.client_accounts ca WHERE ca.client_id = cl.id) AS accounts_count,

  -- Communications
  (SELECT COUNT(*) FROM public.communications co WHERE co.client_id = cl.id) AS communications_count,
  (SELECT MAX(co.occurred_at) FROM public.communications co WHERE co.client_id = cl.id) AS last_communication_at,

  -- VoPay
  (SELECT COUNT(*) FROM public.vopay_objects vo WHERE vo.client_id = cl.id) AS vopay_transactions_count,
  (SELECT SUM(vo.amount) FROM public.vopay_objects vo WHERE vo.client_id = cl.id AND vo.status = 'successful') AS vopay_total_successful,
  (SELECT COUNT(*) FROM public.vopay_objects vo WHERE vo.client_id = cl.id AND vo.status = 'failed') AS vopay_failed_count,

  -- Payment Events
  (SELECT COUNT(*) FROM public.payment_events pe JOIN public.loans l ON l.id = pe.loan_id WHERE l.client_id = cl.id AND pe.event_type = 'NSF') AS nsf_count,

  -- Fraud Cases
  (SELECT COUNT(*) FROM public.fraud_cases fc JOIN public.loan_applications la ON la.id = fc.application_id WHERE la.client_id = cl.id) AS fraud_cases_count,

  -- Last Activity (any type)
  (SELECT MAX(ts) FROM public.vw_client_timeline t WHERE t.client_id = cl.id) AS last_activity_at

FROM public.clients cl;

COMMENT ON VIEW vw_client_summary IS 'Résumé complet par client avec toutes les métriques agrégées';

-- ==============================================================================
-- VUE 3: TIMELINE PAR TYPE (Pour filtrage rapide)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_client_timeline_by_type AS
SELECT
  client_id,
  kind,
  COUNT(*) as event_count,
  MIN(ts) as first_event_at,
  MAX(ts) as last_event_at,
  array_agg(DISTINCT subtype) as subtypes
FROM public.vw_client_timeline
GROUP BY client_id, kind;

COMMENT ON VIEW vw_client_timeline_by_type IS 'Statistiques timeline groupées par type d''événement';

-- ==============================================================================
-- VUE 4: CLIENTS ACTIFS (Activité récente)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_active_clients AS
SELECT
  cs.*,
  CASE
    WHEN cs.last_activity_at >= NOW() - INTERVAL '7 days' THEN 'very_active'
    WHEN cs.last_activity_at >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN cs.last_activity_at >= NOW() - INTERVAL '90 days' THEN 'moderate'
    WHEN cs.last_activity_at >= NOW() - INTERVAL '180 days' THEN 'low'
    ELSE 'inactive'
  END AS activity_level,
  EXTRACT(EPOCH FROM (NOW() - cs.last_activity_at)) / 86400 AS days_since_last_activity
FROM public.vw_client_summary cs
WHERE cs.last_activity_at IS NOT NULL
ORDER BY cs.last_activity_at DESC;

COMMENT ON VIEW vw_active_clients IS 'Clients avec niveau d''activité calculé selon dernière activité';

-- ==============================================================================
-- INDEX POUR PERFORMANCE
-- ==============================================================================

-- Note: Les vues ne peuvent pas avoir d'indexes directs,
-- mais on peut créer des indexes sur les colonnes utilisées dans les UNION

-- Index déjà créés dans phases précédentes:
-- - communications(client_id, occurred_at)
-- - client_transactions(account_id, created_at) via client_accounts(client_id)
-- - loans(client_id, created_at)
-- - payment_events(loan_id, created_at)
-- - vopay_objects(client_id, occurred_at)

-- Aucun index supplémentaire nécessaire

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  timeline_count INTEGER;
  summary_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDATION PHASE 5 ===';

  -- Compter timeline
  SELECT COUNT(*) INTO timeline_count FROM vw_client_timeline;
  RAISE NOTICE '✅ vw_client_timeline: % événements', timeline_count;

  -- Compter summary
  SELECT COUNT(*) INTO summary_count FROM vw_client_summary;
  RAISE NOTICE '✅ vw_client_summary: % clients', summary_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Phase 5 Complete: Timeline views created!';

END $$;
