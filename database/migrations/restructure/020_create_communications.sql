-- 020_create_communications.sql

CREATE TABLE IF NOT EXISTS public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  channel text NOT NULL,          -- email|sms|support|internal
  direction text NOT NULL,        -- inbound|outbound
  thread_key text NULL,

  from_addr text NULL,
  to_addrs jsonb NULL,
  cc_addrs jsonb NULL,

  subject text NULL,
  body_text text NULL,

  provider text NULL,
  provider_message_id text NULL,
  status text NOT NULL DEFAULT 'stored',

  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS communications_provider_msg_uniq
  ON public.communications (provider, provider_message_id)
  WHERE provider IS NOT NULL AND provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS communications_client_id_idx ON public.communications(client_id);
CREATE INDEX IF NOT EXISTS communications_thread_key_idx ON public.communications(thread_key);
CREATE INDEX IF NOT EXISTS communications_occurred_at_idx ON public.communications(occurred_at);

CREATE TABLE IF NOT EXISTS public.communication_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NULL,
  file_size bigint NULL,
  mime_type text NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS comm_attach_comm_id_idx ON public.communication_attachments(communication_id);
