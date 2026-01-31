/**
 * API: GET /api/seo/gsc
 *
 * Google Search Console Data
 * Fallback to seo_unified_daily_plus when GSC API not configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const days = daysMap[range] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch from seo_unified_daily_plus
    const { data: timeline, error } = await supabase
      .from('seo_unified_daily_plus')
      .select('date, gsc_clicks, gsc_impressions, gsc_ctr, gsc_position, gsc_top_queries, gsc_top_pages')
      .gte('date', since)
      .order('date', { ascending: false });

    if (error) throw error;

    if (!timeline || timeline.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No GSC data available',
        message: 'No data in seo_unified_daily_plus for the selected period',
      });
    }

    // Find latest data with GSC metrics
    const latestGsc = timeline.find(d => d.gsc_clicks > 0) || timeline[0];
    const previousGsc = timeline.find(d => d !== latestGsc && d.gsc_clicks > 0) || latestGsc;

    // Calculate overview metrics
    const totalClicks = timeline.reduce((sum, d) => sum + (d.gsc_clicks || 0), 0);
    const totalImpressions = timeline.reduce((sum, d) => sum + (d.gsc_impressions || 0), 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Calculate average position (weighted by impressions)
    let totalWeightedPosition = 0;
    let totalImpressionsForPosition = 0;
    timeline.forEach(d => {
      if (d.gsc_position && d.gsc_impressions) {
        totalWeightedPosition += d.gsc_position * d.gsc_impressions;
        totalImpressionsForPosition += d.gsc_impressions;
      }
    });
    const avgPosition = totalImpressionsForPosition > 0
      ? totalWeightedPosition / totalImpressionsForPosition
      : 0;

    // Calculate trends
    const recentClicks = timeline.slice(0, Math.floor(timeline.length / 2)).reduce((sum, d) => sum + (d.gsc_clicks || 0), 0);
    const oldClicks = timeline.slice(Math.floor(timeline.length / 2)).reduce((sum, d) => sum + (d.gsc_clicks || 0), 0);
    const clicksTrend = oldClicks > 0 ? ((recentClicks - oldClicks) / oldClicks) * 100 : 0;

    const recentImpressions = timeline.slice(0, Math.floor(timeline.length / 2)).reduce((sum, d) => sum + (d.gsc_impressions || 0), 0);
    const oldImpressions = timeline.slice(Math.floor(timeline.length / 2)).reduce((sum, d) => sum + (d.gsc_impressions || 0), 0);
    const impressionsTrend = oldImpressions > 0 ? ((recentImpressions - oldImpressions) / oldImpressions) * 100 : 0;

    // Parse top queries
    let topQueries: any[] = [];
    if (latestGsc.gsc_top_queries) {
      try {
        const queries = typeof latestGsc.gsc_top_queries === 'string'
          ? JSON.parse(latestGsc.gsc_top_queries)
          : latestGsc.gsc_top_queries;
        topQueries = Array.isArray(queries) ? queries.slice(0, 20) : [];
      } catch (e) {
        console.error('Failed to parse gsc_top_queries:', e);
      }
    }

    // Parse top pages
    let topPages: any[] = [];
    if (latestGsc.gsc_top_pages) {
      try {
        const pages = typeof latestGsc.gsc_top_pages === 'string'
          ? JSON.parse(latestGsc.gsc_top_pages)
          : latestGsc.gsc_top_pages;
        topPages = Array.isArray(pages) ? pages.slice(0, 20) : [];
      } catch (e) {
        console.error('Failed to parse gsc_top_pages:', e);
      }
    }

    // Build time series
    const timeSeries = timeline.reverse().map(d => ({
      date: d.date,
      clicks: d.gsc_clicks || 0,
      impressions: d.gsc_impressions || 0,
      ctr: d.gsc_ctr || 0,
      position: d.gsc_position || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalClicks: Math.round(totalClicks),
          totalImpressions: Math.round(totalImpressions),
          avgCTR: parseFloat(avgCTR.toFixed(2)),
          avgPosition: parseFloat(avgPosition.toFixed(1)),
          trends: {
            clicks: parseFloat(clicksTrend.toFixed(1)),
            impressions: parseFloat(impressionsTrend.toFixed(1)),
          },
        },
        topQueries,
        topPages,
        timeSeries,
        dateRange: {
          startDate: since,
          endDate: timeline[0].date,
          days,
        },
      },
      meta: {
        range,
        days,
        dataPoints: timeline.length,
        dataSource: 'seo_unified_daily_plus',
        lastUpdated: latestGsc.date,
      },
    });

  } catch (error: any) {
    console.error('❌ [GSC API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch GSC data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
