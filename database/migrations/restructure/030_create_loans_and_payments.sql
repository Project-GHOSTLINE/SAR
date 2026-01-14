-- 030_create_loans_and_payments.sql

CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  application_id uuid NULL REFERENCES public.loan_applications(id) ON DELETE SET NULL,
  account_id uuid NULL REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS loans_client_id_idx ON public.loans(client_id);
CREATE INDEX IF NOT EXISTS loans_account_id_idx ON public.loans(account_id);

CREATE TABLE IF NOT EXISTS public.payment_schedule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  version int NOT NULL,
  reason text NULL,
  source text NOT NULL DEFAULT 'system', -- margill|manual|system
  created_by text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (loan_id, version)
);

CREATE TABLE IF NOT EXISTS public.payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_version_id uuid NOT NULL REFERENCES public.payment_schedule_versions(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  amount_due numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled|paid|failed|skipped|adjusted
  paid_at timestamptz NULL,
  attempt_count int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS installments_due_date_idx ON public.payment_installments(due_date);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- NSF|REPORT|ADJUSTMENT|FEE|OVERRIDE|NOTE|SCHEDULE_CHANGED
  amount numeric(12,2) NULL,
  effective_date date NULL,
  created_by text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS payment_events_loan_id_idx ON public.payment_events(loan_id);
CREATE INDEX IF NOT EXISTS payment_events_created_at_idx ON public.payment_events(created_at);
