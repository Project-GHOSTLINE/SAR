/**
 * API: GET /api/seo/ga4-status
 * GA4 metrics from seo_unified_daily_plus
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from('seo_unified_daily_plus')
    .select('ga4_users, ga4_sessions, ga4_conversions, ga4_engagement_rate')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    success: true,
    status: 'operational',
    metrics: data || {},
    meta: { data_source: 'seo_unified_daily_plus' },
  });
}
