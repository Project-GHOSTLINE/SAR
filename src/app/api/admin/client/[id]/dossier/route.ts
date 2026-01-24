/**
 * API: GET /api/admin/client/[id]/dossier
 *
 * Purpose: Unified client dossier endpoint
 * Method: Single RPC call (no N+1)
 * RPC: get_client_dossier_unified(client_id)
 *
 * Replaces: Multiple separate queries for client data
 *
 * Response Schema:
 * {
 *   client: { ... },
 *   applications: [ ... ],
 *   analyses: [ ... ],
 *   events: [ ... ],
 *   metrics: { applications_count, analyses_count, events_count }
 * }
 */

import { getSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

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

    // Return unified response
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[dossier] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
