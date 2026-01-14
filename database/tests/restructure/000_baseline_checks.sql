SELECT now() AS executed_at;
SELECT to_regclass('public.loan_applications') AS has_loan_applications;
SELECT to_regclass('public.client_accounts') AS has_client_accounts;
SELECT to_regclass('public.emails_envoyes') AS has_emails_envoyes;
SELECT to_regclass('public.support_tickets') AS has_support_tickets;
SELECT to_regclass('public.vopay_webhook_logs') AS has_vopay_webhook_logs;
