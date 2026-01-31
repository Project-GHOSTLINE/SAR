import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRouteById } from '@/lib/api-explorer/route-matcher';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/api-explorer/route?routeId=xxx
 * Détails d'une route + exemples de traces
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const routeId = searchParams.get('routeId');

    if (!routeId) {
      return NextResponse.json(
        { success: false, error: 'Missing routeId' },
        { status: 400 }
      );
    }

    // Get catalog info
    const catalogRoute = getRouteById(routeId);

    if (!catalogRoute) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      );
    }

    // Get runtime stats
    const { data: stats } = await supabase
      .from('telemetry_requests')
      .select('duration_ms, status, db_call_count, db_total_ms, error_code')
      .eq('method', catalogRoute.methods[0])
      .like('path', `${catalogRoute.path.replace(/:[^/]+/g, '%')}`)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    // Calculate aggregates
    const durations = (stats || []).map(s => s.duration_ms).filter(Boolean);
    const dbCalls = (stats || []).map(s => s.db_call_count).filter(Boolean);
    const dbTimes = (stats || []).map(s => s.db_total_ms).filter(Boolean);

    const errors = (stats || []).filter(s => s.status >= 400);
    const errorCodes = errors.reduce((acc: any, e) => {
      const code = e.error_code || 'unknown';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    // Get recent traces
    const { data: recentTraces } = await supabase
      .from('telemetry_requests')
      .select('trace_id, created_at, status, duration_ms, db_call_count, visitor_id, session_id')
      .eq('method', catalogRoute.methods[0])
      .like('path', `${catalogRoute.path.replace(/:[^/]+/g, '%')}`)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      route: catalogRoute,
      runtime: {
        total_requests: stats?.length || 0,
        error_count: errors.length,
        error_rate: stats?.length ? ((errors.length / stats.length) * 100).toFixed(2) : 0,
        p50_ms: percentile(durations, 0.5),
        p95_ms: percentile(durations, 0.95),
        p99_ms: percentile(durations, 0.99),
        avg_db_calls: avg(dbCalls),
        p95_db_ms: percentile(dbTimes, 0.95),
        error_codes: errorCodes
      },
      recent_traces: recentTraces || []
    });
  } catch (error) {
    console.error('Error fetching route details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch route details' },
      { status: 500 }
    );
  }
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return Math.round(sorted[index] || 0);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
