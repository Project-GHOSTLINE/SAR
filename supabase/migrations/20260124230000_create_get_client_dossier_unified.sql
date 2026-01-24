-- Migration: Deploy get_client_dossier_unified RPC
-- Date: 2026-01-24
-- Purpose: Single unified client dossier endpoint (proof of concept from N2 audit)

-- Drop if exists (for idempotency)
DROP FUNCTION IF EXISTS public.get_client_dossier_unified(uuid);

-- Create function
CREATE OR REPLACE FUNCTION public.get_client_dossier_unified(
  p_client_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_client jsonb;
  v_applications jsonb;
  v_analyses jsonb;
  v_events jsonb;
  v_applications_count integer;
  v_analyses_count integer;
  v_events_count integer;
BEGIN
  -- CLIENT (REQUIRED)
  SELECT to_jsonb(c.*) INTO v_client
  FROM clients c
  WHERE c.id = p_client_id;

  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Client with id % not found', p_client_id;
  END IF;

  -- LOAN APPLICATIONS (OPTIONAL)
  BEGIN
    SELECT
      jsonb_agg(to_jsonb(la.*) ORDER BY la.created_at DESC),
      COUNT(*)
    INTO v_applications, v_applications_count
    FROM loan_applications la
    WHERE la.client_id = p_client_id;

    v_applications := COALESCE(v_applications, '[]'::jsonb);
    v_applications_count := COALESCE(v_applications_count, 0);
  EXCEPTION
    WHEN undefined_table THEN
      v_applications := '[]'::jsonb;
      v_applications_count := 0;
  END;

  -- CLIENT ANALYSES (OPTIONAL)
  BEGIN
    SELECT
      jsonb_agg(to_jsonb(ca.*) ORDER BY ca.created_at DESC),
      COUNT(*)
    INTO v_analyses, v_analyses_count
    FROM client_analyses ca
    WHERE ca.client_id = p_client_id;

    v_analyses := COALESCE(v_analyses, '[]'::jsonb);
    v_analyses_count := COALESCE(v_analyses_count, 0);
  EXCEPTION
    WHEN undefined_table THEN
      v_analyses := '[]'::jsonb;
      v_analyses_count := 0;
  END;

  -- CLIENT EVENTS (OPTIONAL - limit 50)
  BEGIN
    SELECT
      jsonb_agg(to_jsonb(ce.*) ORDER BY ce.created_at DESC),
      COUNT(*)
    INTO v_events, v_events_count
    FROM (
      SELECT * FROM client_events
      WHERE client_id = p_client_id
      ORDER BY created_at DESC
      LIMIT 50
    ) ce;

    v_events := COALESCE(v_events, '[]'::jsonb);
    v_events_count := COALESCE(v_events_count, 0);
  EXCEPTION
    WHEN undefined_table THEN
      v_events := '[]'::jsonb;
      v_events_count := 0;
    WHEN insufficient_privilege THEN
      v_events := '[]'::jsonb;
      v_events_count := 0;
  END;

  -- BUILD RESPONSE
  v_result := jsonb_build_object(
    'client', v_client,
    'applications', v_applications,
    'analyses', v_analyses,
    'events', v_events,
    'metrics', jsonb_build_object(
      'applications_count', v_applications_count,
      'analyses_count', v_analyses_count,
      'events_count', v_events_count
    )
  );

  RETURN v_result;
END;
$$;

-- Metadata
COMMENT ON FUNCTION public.get_client_dossier_unified(uuid) IS
'Unified client dossier retrieval via single RPC call. Replaces N+1 queries.';

-- Grants (adjust per your security model)
GRANT EXECUTE ON FUNCTION public.get_client_dossier_unified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_dossier_unified(uuid) TO service_role;
