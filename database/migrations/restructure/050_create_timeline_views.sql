-- 050_create_timeline_views.sql

CREATE OR REPLACE VIEW public.vw_client_timeline AS
SELECT
  co.client_id,
  co.occurred_at AS ts,
  'COMMUNICATION'::text AS kind,
  co.channel AS subtype,
  co.direction,
  co.subject AS title,
  left(COALESCE(co.body_text,''), 240) AS summary,
  jsonb_build_object('communication_id', co.id, 'provider', co.provider, 'provider_message_id', co.provider_message_id) AS ref
FROM public.communications co

UNION ALL
SELECT
  sc.client_id,
  sc.occurred_at AS ts,
  'COMMUNICATION'::text AS kind,
  sc.channel AS subtype,
  sc.direction,
  sc.subject AS title,
  left(COALESCE(sc.body_text,''), 240) AS summary,
  sc.metadata AS ref
FROM public.vw_support_as_communications sc

UNION ALL
SELECT
  ca.client_id,
  ct.created_at AS ts,
  'LEDGER'::text AS kind,
  ct.transaction_type AS subtype,
  NULL::text AS direction,
  ct.transaction_type AS title,
  ct.description AS summary,
  jsonb_build_object('transaction_id', ct.id, 'amount', ct.amount, 'vopay_transaction_id', ct.vopay_transaction_id) AS ref
FROM public.client_transactions ct
JOIN public.client_accounts ca ON ca.id = ct.account_id
WHERE ca.client_id IS NOT NULL

UNION ALL
SELECT
  la.client_id,
  fc.reported_at AS ts,
  'FRAUD'::text AS kind,
  fc.fraud_type AS subtype,
  NULL::text AS direction,
  'Fraud Case'::text AS title,
  left(COALESCE(fc.description,''), 240) AS summary,
  jsonb_build_object('fraud_case_id', fc.id, 'severity', fc.severity) AS ref
FROM public.fraud_cases fc
JOIN public.loan_applications la ON la.id = fc.application_id
WHERE la.client_id IS NOT NULL;

CREATE OR REPLACE VIEW public.vw_client_summary AS
SELECT
  cl.id AS client_id,
  cl.primary_email,
  cl.primary_phone,
  cl.first_name,
  cl.last_name,
  (SELECT COUNT(*) FROM public.loan_applications la WHERE la.client_id = cl.id) AS applications_count,
  (SELECT COUNT(*) FROM public.client_accounts ca WHERE ca.client_id = cl.id) AS accounts_count,
  (SELECT MAX(ts) FROM public.vw_client_timeline t WHERE t.client_id = cl.id) AS last_activity_at
FROM public.clients cl;
