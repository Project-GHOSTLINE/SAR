import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/api-explorer/trace?traceId=xxx
 * Timeline complète: request + spans + webhooks liés
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const traceId = searchParams.get('traceId');

    if (!traceId) {
      return NextResponse.json(
        { success: false, error: 'Missing traceId' },
        { status: 400 }
      );
    }

    // Get request
    const { data: req, error: reqError } = await supabase
      .from('telemetry_requests')
      .select('*')
      .eq('trace_id', traceId)
      .single();

    if (reqError) throw reqError;

    // Get spans
    const { data: spans } = await supabase
      .from('telemetry_spans')
      .select('*')
      .eq('trace_id', traceId)
      .order('start_time', { ascending: true });

    // Get related webhooks (si visitor_id ou session_id match)
    const { data: webhooks } = await supabase
      .from('webhook_logs')
      .select('*')
      .or(`visitor_id.eq.${req?.visitor_id},session_id.eq.${req?.session_id}`)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Build timeline
    const timeline = [
      {
        type: 'request',
        timestamp: req?.created_at,
        duration_ms: req?.duration_ms,
        data: req
      },
      ...(spans || []).map(span => ({
        type: 'span',
        timestamp: span.start_time,
        duration_ms: span.duration_ms,
        data: span
      })),
      ...(webhooks || []).map(wh => ({
        type: 'webhook',
        timestamp: wh.timestamp,
        duration_ms: null,
        data: wh
      }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate waterfall
    const startTime = new Date(req?.created_at).getTime();
    const timelineWithOffsets = timeline.map(item => ({
      ...item,
      offset_ms: new Date(item.timestamp).getTime() - startTime
    }));

    return NextResponse.json({
      success: true,
      trace_id: traceId,
      request: req,
      spans: spans || [],
      webhooks: webhooks || [],
      timeline: timelineWithOffsets,
      summary: {
        total_duration_ms: req?.duration_ms,
        span_count: spans?.length || 0,
        db_calls: req?.db_call_count,
        db_time_ms: req?.db_total_ms,
        status: req?.status,
        error: req?.error_code || null
      }
    });
  } catch (error) {
    console.error('Error fetching trace:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trace' },
      { status: 500 }
    );
  }
}
