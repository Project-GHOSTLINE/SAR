/**
 * API: GET /api/seo/visitor/[visitor_id]
 *
 * Returns complete visitor identity graph with:
 * - All IPs used by visitor (multi-IP tracking)
 * - Timeline of all requests
 * - Metrics per IP
 * - Application/client attribution if exists
 * - Evidence with trace_ids
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { visitor_id: string } }
) {
  try {
    const visitorId = params.visitor_id;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(visitorId)) {
      return NextResponse.json(
        { error: 'Invalid visitor_id format' },
        { status: 400 }
      );
    }

    // 1. Get visitor identity graph
    const { data: visitorGraph, error: graphError } = await supabase
      .from('visitor_identity_graph')
      .select('*')
      .eq('visitor_id', visitorId)
      .single();

    if (graphError || !visitorGraph) {
      return NextResponse.json(
        { error: 'Visitor not found', details: graphError?.message },
        { status: 404 }
      );
    }

    // 2. Get timeline (last 100 requests)
    const { data: timeline, error: timelineError } = await supabase.rpc(
      'get_visitor_timeline',
      {
        p_visitor_id: visitorId,
        p_limit: 100,
      }
    );

    // 3. Get IPs with metrics
    const { data: ipsWithMetrics, error: ipsError } = await supabase.rpc(
      'get_visitor_ips_with_metrics',
      {
        p_visitor_id: visitorId,
      }
    );

    // 4. Get application details if exists
    let applicationDetails = null;
    if (visitorGraph.application_id) {
      const { data: app } = await supabase
        .from('loan_applications')
        .select('id, reference, status, prenom, nom, courriel, telephone, montant_demande, created_at')
        .eq('id', visitorGraph.application_id)
        .single();

      applicationDetails = app;
    }

    // 5. Build response
    const response = {
      visitor_id: visitorId,

      // Identity
      identity: {
        ips: visitorGraph.ips || [],
        unique_ips: visitorGraph.unique_ips || 0,
        sessions: visitorGraph.session_ids || [],
        unique_sessions: visitorGraph.unique_sessions || 0,
        visits: visitorGraph.visit_ids || [],
        unique_visits: visitorGraph.unique_visits || 0,
        user_id: visitorGraph.user_id || null,
      },

      // Metrics
      metrics: {
        total_requests: visitorGraph.total_requests || 0,
        unique_pages: visitorGraph.unique_pages || 0,
        active_days: visitorGraph.active_days || 0,
        first_seen: visitorGraph.first_seen,
        last_seen: visitorGraph.last_seen,
        session_duration_seconds: visitorGraph.last_seen && visitorGraph.first_seen
          ? Math.floor(
              (new Date(visitorGraph.last_seen).getTime() -
                new Date(visitorGraph.first_seen).getTime()) /
                1000
            )
          : 0,
        landing_page: visitorGraph.landing_page,
        most_visited_page: visitorGraph.most_visited_page,
      },

      // Performance
      performance: {
        p50_duration_ms: visitorGraph.p50_duration_ms,
        p95_duration_ms: visitorGraph.p95_duration_ms,
        avg_duration_ms: visitorGraph.avg_duration_ms,
        status_2xx_count: visitorGraph.status_2xx_count || 0,
        status_4xx_count: visitorGraph.status_4xx_count || 0,
        status_5xx_count: visitorGraph.status_5xx_count || 0,
      },

      // Conversion
      conversion: {
        has_application: !!visitorGraph.application_id,
        application_id: visitorGraph.application_id,
        application_reference: visitorGraph.application_reference,
        application_status: visitorGraph.application_status,
        application_submitted_at: visitorGraph.application_submitted_at,
        client_email: visitorGraph.client_email,
        client_phone: visitorGraph.client_phone,
        client_name: visitorGraph.client_name,
        application_details: applicationDetails,
      },

      // Device
      device: visitorGraph.latest_device_info || null,

      // Evidence
      evidence: {
        first_request: visitorGraph.evidence_first_request,
        last_request: visitorGraph.evidence_last_request,
      },

      // Timeline (array of requests)
      timeline: timeline || [],

      // IPs with detailed metrics
      ips_detailed: ipsWithMetrics || [],
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /api/seo/visitor] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
