-- 031_backfill_loans_from_client_accounts.sql
-- Blueprint client_accounts: (id, application_id, account_number, client_id, status, balance, credit_limit, created_at, updated_at)

-- Assure d'abord que client_accounts.client_id est rempli (Phase 1).
INSERT INTO public.loans (client_id, application_id, account_id, status, metadata)
SELECT
  ca.client_id,
  ca.application_id,
  ca.id AS account_id,
  COALESCE(ca.status, 'active') AS status,
  jsonb_build_object(
    'source','backfill_client_accounts',
    'account_number', ca.account_number,
    'balance', ca.balance,
    'credit_limit', ca.credit_limit
  )
FROM public.client_accounts ca
LEFT JOIN public.loans l ON l.account_id = ca.id
WHERE ca.client_id IS NOT NULL
  AND l.id IS NULL;
