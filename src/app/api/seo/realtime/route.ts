/**
 * API: GET /api/seo/realtime
 * Returns real-time activity from last 5 minutes
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    const last5min = new Date(now - 5 * 60 * 1000).toISOString();
    const last1min = new Date(now - 1 * 60 * 1000).toISOString();

    // Active visitors (unique visitor_ids in last 5 min)
    const { data: recentRequests } = await supabase
      .from('telemetry_requests')
      .select('visitor_id, path, ip, created_at')
      .gte('created_at', last5min)
      .order('created_at', { ascending: false });

    const uniqueVisitors = new Set(
      recentRequests?.filter((r) => r.visitor_id).map((r) => r.visitor_id)
    );
    const uniqueIPs = new Set(recentRequests?.map((r) => r.ip));

    // Page views in last 5 min
    const pageViews5min = recentRequests?.length || 0;

    // Page views in last 1 min
    const recentInLastMin = recentRequests?.filter(
      (r) => new Date(r.created_at) >= new Date(last1min)
    );
    const pageViews1min = recentInLastMin?.length || 0;

    // Top pages right now
    const pageCounts = new Map<string, number>();
    recentRequests?.forEach((r) => {
      pageCounts.set(r.path, (pageCounts.get(r.path) || 0) + 1);
    });
    const topPages = Array.from(pageCounts.entries())
      .map(([path, count]) => ({ path, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Recent events
    const { data: recentEvents } = await supabase
      .from('telemetry_events')
      .select('event_name, page_path, created_at, visitor_id')
      .gte('created_at', last5min)
      .order('created_at', { ascending: false })
      .limit(20);

    // Conversions today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: conversionsToday } = await supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    return NextResponse.json({
      active_visitors: uniqueVisitors.size,
      unique_ips: uniqueIPs.size,
      page_views_5min: pageViews5min,
      page_views_1min: pageViews1min,
      conversions_today: conversionsToday || 0,
      top_pages: topPages,
      recent_events: recentEvents?.slice(0, 10) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/seo/realtime] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
