/**
 * API: POST /api/telemetry/track-event
 *
 * Purpose: Track client-side events (page views, clicks, etc.)
 * Method: Stores events in telemetry_events table
 * Security: Public endpoint (no auth required for analytics)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Mark as dynamic route (not static)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-sar-visit-id, x-sar-session-id, x-sar-visitor-id',
};

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract identity headers (set by client)
    const visitId = request.headers.get('x-sar-visit-id');
    const sessionId = request.headers.get('x-sar-session-id');
    const visitorId = request.headers.get('x-sar-visitor-id');

    console.log('[telemetry] Received event:', {
      visitId,
      sessionId,
      visitorId,
      event_name: body.event_name,
      page_path: body.page_path,
    });

    if (!visitId) {
      console.error('[telemetry] Missing visit_id header');
      return NextResponse.json(
        { error: 'Missing visit_id' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Extract event data
    const {
      event_name,
      page_path,
      referrer,
      utm,
      device,
      timestamp,
      properties,
      ...extra
    } = body;

    if (!event_name) {
      console.error('[telemetry] Missing event_name in body');
      return NextResponse.json(
        { error: 'Missing event_name' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prepare insert payload
    const eventPayload = {
      visit_id: visitId,
      session_id: sessionId || null,
      visitor_id: visitorId || null,
      event_name,
      page_path: page_path || null,
      referrer: referrer || null,
      utm: utm || null,
      device: device || null,
      properties: properties || (Object.keys(extra).length > 0 ? extra : null),
      created_at: timestamp || new Date().toISOString(),
    };

    console.log('[telemetry] Inserting event:', eventPayload);

    // Insert event
    const { data, error } = await supabase
      .from('telemetry_events')
      .insert(eventPayload)
      .select('id')
      .single();

    if (error) {
      console.error('[telemetry] Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to track event', details: error.message, code: error.code },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('[telemetry] Event tracked successfully:', data.id);
    return NextResponse.json({ success: true, id: data.id }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[telemetry] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500, headers: corsHeaders }
    );
  }
}
