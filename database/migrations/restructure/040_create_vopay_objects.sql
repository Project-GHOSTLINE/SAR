-- 040_create_vopay_objects.sql

CREATE TABLE IF NOT EXISTS public.vopay_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  loan_id uuid NULL REFERENCES public.loans(id) ON DELETE SET NULL,
  object_type text NOT NULL, -- event_type
  vopay_id text NOT NULL,    -- transaction_id (ou fallback)
  status text NULL,
  amount numeric(12,2) NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NULL,
  raw_log_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (object_type, vopay_id)
);

CREATE INDEX IF NOT EXISTS vopay_objects_client_id_idx ON public.vopay_objects(client_id);
CREATE INDEX IF NOT EXISTS vopay_objects_occurred_at_idx ON public.vopay_objects(occurred_at);
