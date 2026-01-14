-- 011_add_client_id_columns.sql

ALTER TABLE IF EXISTS public.loan_applications
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.client_accounts
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.client_analyses
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.contact_messages
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

ALTER TABLE IF EXISTS public.support_tickets
  ADD COLUMN IF NOT EXISTS client_id uuid NULL;

CREATE INDEX IF NOT EXISTS loan_applications_client_id_idx ON public.loan_applications(client_id);
CREATE INDEX IF NOT EXISTS client_accounts_client_id_idx ON public.client_accounts(client_id);
CREATE INDEX IF NOT EXISTS client_analyses_client_id_idx ON public.client_analyses(client_id);
CREATE INDEX IF NOT EXISTS contact_messages_client_id_idx ON public.contact_messages(client_id);
CREATE INDEX IF NOT EXISTS support_tickets_client_id_idx ON public.support_tickets(client_id);
