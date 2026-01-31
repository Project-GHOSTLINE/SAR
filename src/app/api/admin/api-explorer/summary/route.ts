import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePathPattern } from '@/lib/api-explorer/route-matcher';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/api-explorer/summary?days=30
 * Stats runtime par route depuis telemetry_requests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Query summary par route
    const { data, error } = await supabase.rpc('get_api_summary', {
      days_back: days
    });

    if (error) throw error;

    // Normaliser les paths
    const normalized = (data || []).map((row: any) => ({
      ...row,
      path_pattern: normalizePathPattern(row.path)
    }));

    // Grouper par path_pattern
    const grouped = normalized.reduce((acc: any, row: any) => {
      const key = `${row.method}:${row.path_pattern}`;

      if (!acc[key]) {
        acc[key] = {
          method: row.method,
          path: row.path_pattern,
          hits: 0,
          avg_ms: 0,
          p95_ms: 0,
          errors: 0,
          error_rate_pct: 0,
          avg_db_calls: 0,
          p95_db_ms: 0,
          last_seen: row.last_seen,
          sample_paths: []
        };
      }

      acc[key].hits += row.hits;
      acc[key].errors += row.errors;
      acc[key].sample_paths.push(row.path);

      // Keep max p95, most recent last_seen
      if (row.p95_ms > acc[key].p95_ms) acc[key].p95_ms = row.p95_ms;
      if (row.p95_db_ms > acc[key].p95_db_ms) acc[key].p95_db_ms = row.p95_db_ms;
      if (new Date(row.last_seen) > new Date(acc[key].last_seen)) {
        acc[key].last_seen = row.last_seen;
      }

      return acc;
    }, {});

    // Recalculer error_rate_pct et avg
    const summary = Object.values(grouped).map((g: any) => ({
      ...g,
      error_rate_pct: g.hits > 0 ? ((g.errors / g.hits) * 100).toFixed(2) : 0,
      sample_paths: g.sample_paths.slice(0, 5) // Limite à 5 exemples
    }));

    return NextResponse.json({
      success: true,
      days,
      routes: summary.sort((a: any, b: any) => b.hits - a.hits)
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
