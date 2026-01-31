/**
 * API: GET /api/seo/analytics/detailed
 * Advanced analytics with segments from telemetry
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: requests } = await supabase
    .from('telemetry_requests')
    .select('*')
    .gte('created_at', since);

  const total = requests?.length || 0;
  const uniqueVisitors = new Set(requests?.filter(r => r.visitor_id).map(r => r.visitor_id)).size;

  return NextResponse.json({
    success: true,
    metrics: { total_requests: total, unique_visitors: uniqueVisitors },
    segments: [],
    meta: { data_source: 'telemetry_requests' },
  });
}
