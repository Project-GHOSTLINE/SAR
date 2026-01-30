/**
 * API: POST /api/telemetry/track-event
 *
 * Purpose: Track client-side events (page views, clicks, etc.)
 * Method: Stores events in telemetry_events table
 * Security: Public endpoint (no auth required for analytics)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract visit_id from header (set by client)
    const visitId = request.headers.get('x-sar-visit-id');
    const sessionId = request.headers.get('x-sar-session-id');

    if (!visitId) {
      return NextResponse.json(
        { error: 'Missing visit_id' },
        { status: 400 }
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
      ...extra
    } = body;

    if (!event_name) {
      return NextResponse.json(
        { error: 'Missing event_name' },
        { status: 400 }
      );
    }

    // Insert event
    const { data, error } = await supabase
      .from('telemetry_events')
      .insert({
        visit_id: visitId,
        session_id: sessionId || null,
        event_name,
        page_path: page_path || null,
        referrer: referrer || null,
        utm: utm || null,
        device: device || null,
        properties: Object.keys(extra).length > 0 ? extra : null,
        created_at: timestamp || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[telemetry] Event write error:', error);
      return NextResponse.json(
        { error: 'Failed to track event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('[telemetry] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
