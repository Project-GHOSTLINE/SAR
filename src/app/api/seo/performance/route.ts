/**
 * API: GET /api/seo/performance
 * Returns performance metrics from telemetry_requests
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
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get performance data by page
    const { data: requests, error } = await supabase
      .from('telemetry_requests')
      .select('path, duration_ms, status, created_at')
      .not('duration_ms', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate by page
    const pageMetrics = new Map<string, {
      path: string;
      count: number;
      durations: number[];
      status_2xx: number;
      status_4xx: number;
      status_5xx: number;
    }>();

    requests?.forEach((req) => {
      const path = req.path;
      if (!pageMetrics.has(path)) {
        pageMetrics.set(path, {
          path,
          count: 0,
          durations: [],
          status_2xx: 0,
          status_4xx: 0,
          status_5xx: 0,
        });
      }
      const metrics = pageMetrics.get(path)!;
      metrics.count++;
      metrics.durations.push(req.duration_ms);

      if (req.status >= 200 && req.status < 300) metrics.status_2xx++;
      else if (req.status >= 400 && req.status < 500) metrics.status_4xx++;
      else if (req.status >= 500) metrics.status_5xx++;
    });

    // Calculate stats for each page
    const pages = Array.from(pageMetrics.values()).map((m) => {
      const sorted = m.durations.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

      return {
        path: m.path,
        requests: m.count,
        p50_ms: Math.round(p50 || 0),
        p95_ms: Math.round(p95 || 0),
        avg_ms: Math.round(avg || 0),
        status_2xx: m.status_2xx,
        status_4xx: m.status_4xx,
        status_5xx: m.status_5xx,
      };
    });

    // Sort by request count
    pages.sort((a, b) => b.requests - a.requests);

    // Overall stats
    const allDurations = requests?.map((r) => r.duration_ms).sort((a, b) => a - b) || [];
    const overall = {
      total_requests: requests?.length || 0,
      p50_ms: Math.round(allDurations[Math.floor(allDurations.length * 0.5)] || 0),
      p95_ms: Math.round(allDurations[Math.floor(allDurations.length * 0.95)] || 0),
      avg_ms: Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length || 0),
    };

    return NextResponse.json({
      overall,
      pages: pages.slice(0, 50), // Top 50 pages
      period_days: days,
    });
  } catch (error: any) {
    console.error('[API /api/seo/performance] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
