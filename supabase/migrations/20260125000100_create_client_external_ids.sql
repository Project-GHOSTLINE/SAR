-- Migration: Create client_external_ids table
-- Date: 2026-01-25
-- Purpose: Map external identifiers (margill_id, etc.) to internal client_id UUID

-- Create table
CREATE TABLE IF NOT EXISTS public.client_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('margill', 'flinks', 'inverite', 'equifax', 'transunion')),
  external_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate mappings
  CONSTRAINT unique_provider_external_id UNIQUE (provider, external_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_client_external_ids_provider_external
  ON public.client_external_ids(provider, external_id);

CREATE INDEX IF NOT EXISTS idx_client_external_ids_client
  ON public.client_external_ids(client_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_external_ids_updated_at
  BEFORE UPDATE ON public.client_external_ids
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies (admin access only)
ALTER TABLE public.client_external_ids ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to client_external_ids"
  ON public.client_external_ids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own mappings (if needed later)
CREATE POLICY "Authenticated users can read client_external_ids"
  ON public.client_external_ids
  FOR SELECT
  TO authenticated
  USING (true);

-- Comment
COMMENT ON TABLE public.client_external_ids IS
  'Maps external system identifiers (margill_id, etc.) to internal client_id UUID. Enables "medical record" model where client_id is lifetime identifier.';

COMMENT ON COLUMN public.client_external_ids.provider IS
  'External system name: margill, flinks, inverite, equifax, transunion';

COMMENT ON COLUMN public.client_external_ids.external_id IS
  'Identifier in the external system (e.g., MC9004 for Margill)';

COMMENT ON COLUMN public.client_external_ids.metadata IS
  'Optional metadata about the mapping (e.g., sync date, source)';
