export const dynamic = 'force-dynamic';
/**
 * GET /api/seo/overview?range=30d&device=all
 * Returns consolidated SEO overview
 * Fallbacks to telemetry_requests if seo_unified_daily_plus is empty
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const days = daysMap[range] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Try seo_unified_daily_plus first
    const { data: unifiedData, error } = await supabase
      .from('seo_unified_daily_plus')
      .select('*')
      .gte('date', since.split('T')[0])
      .order('date', { ascending: false });

    // If we have unified data with actual GA4/GSC/Semrush metrics, use it
    if (unifiedData && unifiedData.length > 0 && unifiedData.some(d => d.ga4_users > 0 || d.gsc_clicks > 0)) {
      return buildResponseFromUnified(unifiedData, range, days);
    }

    // Otherwise, fallback to telemetry_requests
    console.log('[SEO Overview] Falling back to telemetry_requests (no GA4/GSC data)');
    return buildResponseFromTelemetry(since, range, days);

  } catch (err: any) {
    console.error('[SEO Overview] Error:', err.message);
    return NextResponse.json(
      { error: 'Internal error', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Build response from seo_unified_daily_plus (original logic)
 */
async function buildResponseFromUnified(timeline: any[], range: string, days: number) {
  const latestGa4 = timeline.find(d => d.ga4_users > 0) || timeline[0];
  const previousGa4 = timeline.find(d => d !== latestGa4 && d.ga4_users > 0) || latestGa4;

  const latestGsc = timeline.find(d => d.gsc_clicks > 0) || timeline[0];
  const previousGsc = timeline.find(d => d !== latestGsc && d.gsc_clicks > 0) || latestGsc;

  const latestSemrush = timeline.find(d => d.semrush_keywords > 0) || timeline[0];
  const previousSemrush = timeline.find(d => d !== latestSemrush && d.semrush_keywords > 0) || latestSemrush;

  const latestSpeed = timeline.find(d => d.avg_lcp_p75 !== null) || timeline[0];

  const kpis = {
    ga4: {
      users: latestGa4.ga4_users || 0,
      sessions: latestGa4.ga4_sessions || 0,
      conversions: latestGa4.ga4_conversions || 0,
      engagement_rate: latestGa4.ga4_engagement_rate || 0,
      bounce_rate: latestGa4.ga4_bounce_rate || 0,
      trend: {
        users: calculateTrend(latestGa4.ga4_users, previousGa4.ga4_users),
        sessions: calculateTrend(latestGa4.ga4_sessions, previousGa4.ga4_sessions),
        conversions: calculateTrend(latestGa4.ga4_conversions, previousGa4.ga4_conversions),
      },
    },
    gsc: {
      clicks: latestGsc.gsc_clicks || 0,
      impressions: latestGsc.gsc_impressions || 0,
      ctr: latestGsc.gsc_ctr || 0,
      position: latestGsc.gsc_position || 0,
      trend: {
        clicks: calculateTrend(latestGsc.gsc_clicks, previousGsc.gsc_clicks),
        impressions: calculateTrend(latestGsc.gsc_impressions, previousGsc.gsc_impressions),
      },
    },
    semrush: {
      keywords: latestSemrush.semrush_keywords || 0,
      traffic: latestSemrush.semrush_traffic || 0,
      rank: latestSemrush.semrush_rank || 0,
      authority: latestSemrush.semrush_authority || 0,
      backlinks: latestSemrush.semrush_backlinks || 0,
      trend: {
        keywords: calculateTrend(latestSemrush.semrush_keywords, previousSemrush.semrush_keywords),
        traffic: calculateTrend(latestSemrush.semrush_traffic, previousSemrush.semrush_traffic),
      },
    },
    speed: {
      lcp_p75: latestSpeed.avg_lcp_p75 || null,
      inp_p75: latestSpeed.avg_inp_p75 || null,
      cls_p75: latestSpeed.avg_cls_p75 || null,
      ttfb_p75: latestSpeed.avg_ttfb_p75 || null,
      status: latestSpeed.perf_status || null,
      samples: latestSpeed.speed_samples || 0,
      mobile_lcp: latestSpeed.mobile_lcp_p75 || null,
      desktop_lcp: latestSpeed.desktop_lcp_p75 || null,
    },
  };

  let topPages: any[] = [];
  if (latestGa4.ga4_top_pages) {
    try {
      const pages = typeof latestGa4.ga4_top_pages === 'string'
        ? JSON.parse(latestGa4.ga4_top_pages)
        : latestGa4.ga4_top_pages;
      topPages = Array.isArray(pages) ? pages.slice(0, 10) : [];
    } catch (e) {
      console.error('Failed to parse ga4_top_pages:', e);
    }
  }

  let gscQueries: any[] = [];
  let gscPages: any[] = [];

  if (latestGsc.gsc_top_queries) {
    try {
      const queries = typeof latestGsc.gsc_top_queries === 'string'
        ? JSON.parse(latestGsc.gsc_top_queries)
        : latestGsc.gsc_top_queries;
      gscQueries = Array.isArray(queries) ? queries.slice(0, 20) : [];
    } catch (e) {
      console.error('Failed to parse gsc_top_queries:', e);
    }
  }

  if (latestGsc.gsc_top_pages) {
    try {
      const pages = typeof latestGsc.gsc_top_pages === 'string'
        ? JSON.parse(latestGsc.gsc_top_pages)
        : latestGsc.gsc_top_pages;
      gscPages = Array.isArray(pages) ? pages.slice(0, 20) : [];
    } catch (e) {
      console.error('Failed to parse gsc_top_pages:', e);
    }
  }

  const timelineSeries = timeline.reverse().map((d) => ({
    date: d.date,
    ga4_users: d.ga4_users || 0,
    ga4_sessions: d.ga4_sessions || 0,
    ga4_conversions: d.ga4_conversions || 0,
    gsc_clicks: d.gsc_clicks || 0,
    gsc_impressions: d.gsc_impressions || 0,
    semrush_keywords: d.semrush_keywords || 0,
    avg_lcp_p75: d.avg_lcp_p75 || null,
    perf_status: d.perf_status || null,
  }));

  return NextResponse.json({
    kpis,
    timeline: timelineSeries,
    topPages,
    gscQueries,
    gscPages,
    meta: {
      range,
      days,
      dataPoints: timeline.length,
      lastUpdated: timeline[0].date,
      dataSource: 'seo_unified_daily_plus',
    },
  });
}

/**
 * Build response from telemetry_requests (fallback)
 */
async function buildResponseFromTelemetry(since: string, range: string, days: number) {
  // Fetch telemetry requests
  const { data: requests, error: reqError } = await supabase
    .from('telemetry_requests')
    .select('created_at, path, visitor_id, ip, duration_ms, status')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (reqError) throw reqError;

  // Fetch conversions
  const { count: conversionsCount } = await supabase
    .from('loan_applications')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);

  const totalRequests = requests?.length || 0;
  const uniqueVisitors = new Set(requests?.filter(r => r.visitor_id).map(r => r.visitor_id)).size;
  const uniqueIPs = new Set(requests?.map(r => r.ip)).size;

  // Performance metrics
  const durations = requests?.filter(r => r.duration_ms !== null).map(r => r.duration_ms!) || [];
  durations.sort((a, b) => a - b);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : 0;
  const p95Duration = durations.length > 0
    ? durations[Math.floor(durations.length * 0.95)]
    : 0;

  // Build timeline by day
  const timelineMap = new Map<string, any>();
  const visitorsByDay = new Map<string, Set<string>>();
  const ipsByDay = new Map<string, Set<string>>();

  requests?.forEach(req => {
    const date = req.created_at.split('T')[0];

    if (!timelineMap.has(date)) {
      timelineMap.set(date, {
        date,
        ga4_users: 0,
        ga4_sessions: 0,
        ga4_conversions: 0,
        gsc_clicks: 0,
        gsc_impressions: 0,
        semrush_keywords: 0,
        avg_lcp_p75: null,
        perf_status: null,
      });
    }

    if (!visitorsByDay.has(date)) visitorsByDay.set(date, new Set());
    if (!ipsByDay.has(date)) ipsByDay.set(date, new Set());

    if (req.visitor_id) visitorsByDay.get(date)!.add(req.visitor_id);
    ipsByDay.get(date)!.add(req.ip);

    const point = timelineMap.get(date)!;
    point.ga4_sessions++; // Use sessions as request count
  });

  // Update timeline with unique counts
  timelineMap.forEach((point, date) => {
    point.ga4_users = visitorsByDay.get(date)?.size || 0;
  });

  const timeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Top pages
  const pageCountsMap = new Map<string, number>();
  requests?.forEach(req => {
    pageCountsMap.set(req.path, (pageCountsMap.get(req.path) || 0) + 1);
  });

  const topPages = Array.from(pageCountsMap.entries())
    .map(([path, count]) => ({ path, views: count }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  // Calculate trends (last 7 days vs previous 7 days)
  const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last14days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const recentRequests = requests?.filter(r => r.created_at >= last7days) || [];
  const previousRequests = requests?.filter(r => r.created_at >= last14days && r.created_at < last7days) || [];

  const recentVisitors = new Set(recentRequests.filter(r => r.visitor_id).map(r => r.visitor_id)).size;
  const previousVisitors = new Set(previousRequests.filter(r => r.visitor_id).map(r => r.visitor_id)).size;

  const visitorsTrend = previousVisitors > 0
    ? Math.round(((recentVisitors - previousVisitors) / previousVisitors) * 100)
    : 0;

  return NextResponse.json({
    kpis: {
      ga4: {
        users: uniqueVisitors,
        sessions: totalRequests,
        conversions: conversionsCount || 0,
        engagement_rate: 0,
        bounce_rate: 0,
        trend: {
          users: visitorsTrend,
          sessions: 0,
          conversions: 0,
        },
      },
      gsc: {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        trend: { clicks: 0, impressions: 0 },
      },
      semrush: {
        keywords: 0,
        traffic: 0,
        rank: 0,
        authority: 0,
        backlinks: 0,
        trend: { keywords: 0, traffic: 0 },
      },
      speed: {
        lcp_p75: avgDuration,
        inp_p75: null,
        cls_p75: null,
        ttfb_p75: null,
        status: null,
        samples: totalRequests,
        mobile_lcp: null,
        desktop_lcp: null,
      },
    },
    timeline,
    topPages,
    gscQueries: [],
    gscPages: [],
    meta: {
      range,
      days,
      dataPoints: timeline.length,
      lastUpdated: new Date().toISOString().split('T')[0],
      dataSource: 'telemetry_requests (fallback)',
    },
  });
}

function calculateTrend(current: number | null, previous: number | null): number {
  if (!current || !previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}
