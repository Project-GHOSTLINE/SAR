/**
 * API: GET /api/seo/metrics  
 * Network graph from telemetry
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: requests } = await supabase
    .from('telemetry_requests')
    .select('ip, path')
    .limit(1000);

  const nodes = new Set<string>();
  const edges: any[] = [];

  requests?.forEach(r => {
    nodes.add(r.ip);
    nodes.add(r.path);
    edges.push({ source: r.ip, target: r.path });
  });

  return NextResponse.json({
    success: true,
    nodes: Array.from(nodes).map(id => ({ id })),
    edges: edges.slice(0, 500),
    meta: { data_source: 'telemetry_requests' },
  });
}
