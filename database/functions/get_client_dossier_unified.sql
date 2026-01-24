-- ============================================================================
-- RPC: get_client_dossier_unified
-- ============================================================================
-- Purpose: Single-call unified client dossier retrieval
-- Replaces: Multiple N+1 queries across clients, applications, analyses, events
-- Method: JOIN via client_id ONLY (never email)
-- Returns: Structured JSON with all client data
-- ============================================================================

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
  -- ========================================================================
  -- 1. CLIENT (REQUIRED - will fail if client doesn't exist)
  -- ========================================================================
  SELECT to_jsonb(c.*) INTO v_client
  FROM clients c
  WHERE c.id = p_client_id;

  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Client with id % not found', p_client_id;
  END IF;

  -- ========================================================================
  -- 2. LOAN APPLICATIONS (OPTIONAL - fallback to empty array)
  -- ========================================================================
  BEGIN
    SELECT
      jsonb_agg(to_jsonb(la.*) ORDER BY la.created_at DESC),
      COUNT(*)
    INTO v_applications, v_applications_count
    FROM loan_applications la
    WHERE la.client_id = p_client_id;

    -- If no results, set empty array
    v_applications := COALESCE(v_applications, '[]'::jsonb);
    v_applications_count := COALESCE(v_applications_count, 0);
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, fallback
      v_applications := '[]'::jsonb;
      v_applications_count := 0;
  END;

  -- ========================================================================
  -- 3. CLIENT ANALYSES (OPTIONAL - fallback to empty array)
  -- ========================================================================
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

  -- ========================================================================
  -- 4. CLIENT EVENTS (OPTIONAL - limit 50, most recent)
  -- ========================================================================
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
      -- RLS blocking access
      v_events := '[]'::jsonb;
      v_events_count := 0;
  END;

  -- ========================================================================
  -- 5. BUILD UNIFIED RESPONSE
  -- ========================================================================
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

-- ============================================================================
-- METADATA
-- ============================================================================
COMMENT ON FUNCTION public.get_client_dossier_unified(uuid) IS
'Unified client dossier retrieval via single RPC call.
Replaces N+1 queries by joining via client_id only (never email).
Returns structured JSON with client data, applications, analyses, and events.
Handles missing tables gracefully with empty arrays.';

-- ============================================================================
-- GRANT (adjust as needed for your RLS policies)
-- ============================================================================
-- GRANT EXECUTE ON FUNCTION public.get_client_dossier_unified(uuid) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_client_dossier_unified(uuid) TO service_role;
