/**
 * API: GET /api/seo/overview-telemetry
 * Returns consolidated SEO overview from REAL telemetry data
 * Replaces seo_unified_daily_plus dependency with actual telemetry_requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimelineDataPoint {
  date: string;
  total_requests: number;
  unique_visitors: number;
  unique_ips: number;
  page_views: number;
  conversions: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  error_5xx: number;
  error_4xx: number;
}

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

    // 1️⃣ Fetch telemetry requests for period
    const { data: requests, error: reqError } = await supabase
      .from('telemetry_requests')
      .select('created_at, path, visitor_id, ip, duration_ms, status')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (reqError) throw reqError;

    // 2️⃣ Fetch conversions (loan applications) for period
    const { count: conversionsCount } = await supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    // 3️⃣ Aggregate KPIs
    const totalRequests = requests?.length || 0;
    const uniqueVisitors = new Set(requests?.filter(r => r.visitor_id).map(r => r.visitor_id)).size;
    const uniqueIPs = new Set(requests?.map(r => r.ip)).size;

    // Calculate performance metrics
    const durations = requests?.filter(r => r.duration_ms !== null).map(r => r.duration_ms!) || [];
    durations.sort((a, b) => a - b);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;
    const p95Duration = durations.length > 0
      ? durations[Math.floor(durations.length * 0.95)]
      : 0;

    // Error counts
    const errors5xx = requests?.filter(r => r.status >= 500).length || 0;
    const errors4xx = requests?.filter(r => r.status >= 400 && r.status < 500).length || 0;
    const successRate = totalRequests > 0
      ? Math.round(((totalRequests - errors5xx - errors4xx) / totalRequests) * 100)
      : 100;

    // 4️⃣ Build timeline (group by day)
    const timelineMap = new Map<string, TimelineDataPoint>();

    requests?.forEach(req => {
      const date = req.created_at.split('T')[0];

      if (!timelineMap.has(date)) {
        timelineMap.set(date, {
          date,
          total_requests: 0,
          unique_visitors: 0,
          unique_ips: 0,
          page_views: 0,
          conversions: 0,
          avg_duration_ms: 0,
          p95_duration_ms: 0,
          error_5xx: 0,
          error_4xx: 0,
        });
      }

      const point = timelineMap.get(date)!;
      point.total_requests++;
      point.page_views++;
      if (req.status >= 500) point.error_5xx++;
      if (req.status >= 400 && req.status < 500) point.error_4xx++;
    });

    // Calculate unique visitors per day
    const visitorsByDay = new Map<string, Set<string>>();
    const ipsByDay = new Map<string, Set<string>>();

    requests?.forEach(req => {
      const date = req.created_at.split('T')[0];
      if (!visitorsByDay.has(date)) visitorsByDay.set(date, new Set());
      if (!ipsByDay.has(date)) ipsByDay.set(date, new Set());
      if (req.visitor_id) visitorsByDay.get(date)!.add(req.visitor_id);
      ipsByDay.get(date)!.add(req.ip);
    });

    // Update timeline with unique counts
    timelineMap.forEach((point, date) => {
      point.unique_visitors = visitorsByDay.get(date)?.size || 0;
      point.unique_ips = ipsByDay.get(date)?.size || 0;
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // 5️⃣ Top Pages
    const pageCountsMap = new Map<string, number>();
    requests?.forEach(req => {
      pageCountsMap.set(req.path, (pageCountsMap.get(req.path) || 0) + 1);
    });

    const topPages = Array.from(pageCountsMap.entries())
      .map(([path, count]) => ({ path, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // 6️⃣ Recent trend calculation (compare last 7 days vs previous 7 days)
    const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last14days = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const recentRequests = requests?.filter(r => r.created_at >= last7days) || [];
    const previousRequests = requests?.filter(r =>
      r.created_at >= last14days && r.created_at < last7days
    ) || [];

    const recentUniqueVisitors = new Set(recentRequests.filter(r => r.visitor_id).map(r => r.visitor_id)).size;
    const previousUniqueVisitors = new Set(previousRequests.filter(r => r.visitor_id).map(r => r.visitor_id)).size;

    const visitorsTrend = previousUniqueVisitors > 0
      ? Math.round(((recentUniqueVisitors - previousUniqueVisitors) / previousUniqueVisitors) * 100)
      : 0;

    const requestsTrend = previousRequests.length > 0
      ? Math.round(((recentRequests.length - previousRequests.length) / previousRequests.length) * 100)
      : 0;

    // 7️⃣ Return consolidated data
    return NextResponse.json({
      kpis: {
        traffic: {
          total_requests: totalRequests,
          unique_visitors: uniqueVisitors,
          unique_ips: uniqueIPs,
          page_views: totalRequests,
          conversions: conversionsCount || 0,
          conversion_rate: uniqueVisitors > 0
            ? ((conversionsCount || 0) / uniqueVisitors * 100).toFixed(2)
            : '0.00',
          trend: {
            visitors: visitorsTrend,
            requests: requestsTrend,
          },
        },
        performance: {
          avg_duration_ms: avgDuration,
          p95_duration_ms: p95Duration,
          success_rate: successRate,
          errors_5xx: errors5xx,
          errors_4xx: errors4xx,
        },
      },
      timeline,
      topPages,
      meta: {
        range,
        days,
        period_start: since,
        period_end: new Date().toISOString(),
        data_source: 'telemetry_requests',
        total_data_points: requests?.length || 0,
      },
    });

  } catch (error: any) {
    console.error('[API /api/seo/overview-telemetry] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
