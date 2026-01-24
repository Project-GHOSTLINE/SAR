/**
 * API: GET /api/admin/client/[id]/dossier
 *
 * Purpose: Unified client dossier endpoint
 * Method: Single RPC call (no N+1) + optional Margill data
 * RPC: get_client_dossier_unified(client_id)
 *
 * Accepts:
 * - [id] = UUID → Direct RPC call
 * - [id] = margill_id → Resolve to client_id via client_external_ids, then RPC call
 *
 * Replaces: Multiple separate queries for client data
 *
 * Response Schema:
 * {
 *   client: { ... },
 *   applications: [ ... ],
 *   analyses: [ ... ],
 *   events: [ ... ],
 *   metrics: { applications_count, analyses_count, events_count },
 *   concordances: [ ... ],  // Only if margill_id provided
 *   autres_contrats: [ ... ]  // Only if margill_id provided
 * }
 */

import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const supabase = getSupabaseServer();

    // Check if ID is UUID or margill_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(id);

    let clientId: string;
    let margillId: string | null = null;

    if (isUUID) {
      // Direct UUID → use as client_id
      clientId = id;
    } else {
      // Not UUID → treat as margill_id, resolve to client_id
      margillId = id;

      const { data: mapping, error: mappingError } = await supabase
        .from('client_external_ids')
        .select('client_id')
        .eq('provider', 'margill')
        .eq('external_id', margillId)
        .maybeSingle();

      if (mappingError) {
        console.error('[dossier] Mapping resolution error:', mappingError);
        return NextResponse.json(
          { error: 'Failed to resolve margill_id', details: mappingError.message },
          { status: 500 }
        );
      }

      if (!mapping) {
        return NextResponse.json(
          {
            error: 'No client_id mapping for margill_id',
            margill_id: margillId,
            hint: 'This margill_id is not linked to any client_id in client_external_ids table'
          },
          { status: 404 }
        );
      }

      clientId = mapping.client_id;
    }

    // ========================================================================
    // SINGLE RPC CALL - NO N+1
    // ========================================================================
    const { data, error } = await supabase.rpc('get_client_dossier_unified', {
      p_client_id: clientId,
    });

    if (error) {
      console.error('[dossier] RPC error:', error);

      // Client not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }

      // RPC doesn't exist
      if (error.message.includes('Could not find the function')) {
        return NextResponse.json(
          {
            error: 'RPC function not deployed',
            hint: 'Run: supabase/migrations/20260124230000_create_get_client_dossier_unified.sql',
          },
          { status: 503 }
        );
      }

      // Other errors
      return NextResponse.json(
        { error: 'Failed to fetch client dossier', details: error.message },
        { status: 500 }
      );
    }

    // ========================================================================
    // OPTIONAL: Fetch Margill-specific data if margill_id was provided
    // ========================================================================
    let concordances: any[] = [];
    let autresContrats: any[] = [];

    if (margillId) {
      // Fetch concordances and autres contrats in parallel
      try {
        const [concordancesRes, autresContratsRes] = await Promise.all([
          fetch(`${request.nextUrl.origin}/api/admin/clients-sar/concordances?margill_id=${margillId}`),
          fetch(`${request.nextUrl.origin}/api/admin/clients-sar/autres-contrats?margill_id=${margillId}`)
        ]);

        const concordancesData = await concordancesRes.json();
        const autresContratsData = await autresContratsRes.json();

        if (concordancesData.success) {
          concordances = concordancesData.concordances || [];
        }

        if (autresContratsData.success) {
          autresContrats = autresContratsData.contrats || [];
        }
      } catch (margillError) {
        console.error('[dossier] Error fetching Margill data:', margillError);
        // Don't fail the whole request if Margill data fails
      }
    }

    // Return unified response
    return NextResponse.json({
      ...data,
      concordances,
      autres_contrats: autresContrats,
      _meta: {
        resolved_from_margill_id: margillId !== null,
        margill_id: margillId,
        client_id: clientId
      }
    }, { status: 200 });
  } catch (error) {
    console.error('[dossier] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
