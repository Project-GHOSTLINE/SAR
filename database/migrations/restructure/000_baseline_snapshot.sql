-- 000_baseline_snapshot.sql
SELECT now() AS executed_at;

SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind='r' AND n.nspname='public'
ORDER BY c.relname;

-- Blueprint counters
SELECT COUNT(*) AS loan_applications FROM public.loan_applications;
SELECT COUNT(*) AS client_accounts FROM public.client_accounts;
SELECT COUNT(*) AS client_transactions FROM public.client_transactions;
SELECT COUNT(*) AS client_analyses FROM public.client_analyses;
SELECT COUNT(*) AS emails_envoyes FROM public.emails_envoyes;
SELECT COUNT(*) AS contact_messages FROM public.contact_messages;
SELECT COUNT(*) AS support_tickets FROM public.support_tickets;
SELECT COUNT(*) AS vopay_webhook_logs FROM public.vopay_webhook_logs;
SELECT COUNT(*) AS fraud_cases FROM public.fraud_cases;
