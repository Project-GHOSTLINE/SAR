/**
 * GET /api/seo/ip/[ip]?range=30d
 * Returns complete IP dossier
 * Fallbacks to direct telemetry_requests if ip_to_seo_segment view doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { ip: string } }
) {
  try {
    const ip = params.ip;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[range] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Try to get from ip_to_seo_segment view first
    const { data: ipIntel, error: intelError } = await supabase
      .from('ip_to_seo_segment')
      .select('*')
      .eq('ip', ip)
      .single();

    // If view doesn't exist or IP not found, build intelligence from telemetry_requests
    if (intelError || !ipIntel) {
      console.log('[IP Dossier] Falling back to direct telemetry aggregation');
      return buildFromTelemetry(ip, startDate, range, days);
    }

    // Rest of the original logic for when ip_to_seo_segment exists
    const { data: timelineRaw } = await supabase
      .from('telemetry_requests')
      .select('created_at, method, path, status, duration_ms')
      .eq('ip', ip)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    const timeline = timelineRaw?.map((r) => ({
      timestamp: r.created_at,
      created_at: r.created_at,
      method: r.method,
      path: r.path,
      status: r.status,
      duration_ms: r.duration_ms || 0,
      region: null,
    })) || [];

    const { data: topPaths } = await supabase
      .from('telemetry_requests')
      .select('path')
      .eq('ip', ip)
      .gte('created_at', startDate.toISOString());

    const pathCounts: Record<string, number> = {};
    topPaths?.forEach((r) => {
      pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
    });
    const topPathsList = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const pathDurations: Record<string, { sum: number; count: number }> = {};
    timelineRaw?.forEach((r) => {
      if (!pathDurations[r.path]) pathDurations[r.path] = { sum: 0, count: 0 };
      pathDurations[r.path].sum += r.duration_ms || 0;
      pathDurations[r.path].count += 1;
    });

    const slowestEndpoints = Object.entries(pathDurations)
      .map(([path, stats]) => ({
        path,
        avg_duration: Math.round(stats.sum / stats.count),
        count: stats.count,
      }))
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, 10);

    const score = calculateIpScore(ipIntel);
    const alerts = generateAlerts(ipIntel);

    const successCount = ipIntel.success_count || 0;
    const totalRequests = ipIntel.total_requests || 1;
    const successRate = Math.round((successCount / totalRequests) * 100);

    return NextResponse.json({
      ip: ipIntel.ip,
      intelligence: {
        first_seen: ipIntel.first_seen,
        last_seen: ipIntel.last_seen,
        total_requests: ipIntel.total_requests,
        active_days: ipIntel.active_days,
        unique_pages: ipIntel.unique_pages,
        landing_page: ipIntel.landing_page,
        most_visited_page: ipIntel.most_visited_page,
        device: ipIntel.device || 'Unknown',
        utm_source: ipIntel.utm_source || 'Unknown',
        utm_medium: ipIntel.utm_medium || 'Unknown',
        utm_campaign: ipIntel.utm_campaign || 'Unknown',
        avg_duration_ms: ipIntel.avg_duration_ms,
        p50_duration_ms: ipIntel.p50_duration_ms,
        p95_duration_ms: ipIntel.p95_duration_ms,
        success_count: ipIntel.success_count,
        client_error_count: ipIntel.client_error_count,
        server_error_count: ipIntel.server_error_count,
      },
      score,
      alerts,
      stats: {
        total_requests: totalRequests,
        unique_paths: ipIntel.unique_pages || 0,
        avg_duration: ipIntel.avg_duration_ms || 0,
        success_rate: successRate,
        regions: [],
      },
      timeline: timeline || [],
      topPaths: topPathsList,
      slowestEndpoints,
      meta: {
        range,
        days,
        dataPoints: timeline?.length || 0,
        dataSource: 'ip_to_seo_segment',
      },
    });
  } catch (err: any) {
    console.error('[IP Dossier] Error:', err.message);
    return NextResponse.json(
      { error: 'Internal error', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Build IP intelligence directly from telemetry_requests
 */
async function buildFromTelemetry(
  ip: string,
  startDate: Date,
  range: string,
  days: number
) {
  // Fetch all requests for this IP
  const { data: requests, error } = await supabase
    .from('telemetry_requests')
    .select('created_at, method, path, status, duration_ms, visitor_id')
    .eq('ip', ip)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error || !requests || requests.length === 0) {
    return NextResponse.json(
      {
        error: 'IP not found',
        message: `No telemetry data found for IP ${ip} in the last ${days} days`,
      },
      { status: 404 }
    );
  }

  // Aggregate intelligence
  const totalRequests = requests.length;
  const uniquePaths = new Set(requests.map(r => r.path)).size;
  const firstSeen = requests[requests.length - 1].created_at;
  const lastSeen = requests[0].created_at;

  // Calculate durations
  const durations = requests
    .filter(r => r.duration_ms !== null)
    .map(r => r.duration_ms!)
    .sort((a, b) => a - b);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : 0;
  const p50Duration = durations.length > 0
    ? durations[Math.floor(durations.length * 0.5)]
    : 0;
  const p95Duration = durations.length > 0
    ? durations[Math.floor(durations.length * 0.95)]
    : 0;

  // Status codes
  const successCount = requests.filter(r => r.status >= 200 && r.status < 400).length;
  const clientErrorCount = requests.filter(r => r.status >= 400 && r.status < 500).length;
  const serverErrorCount = requests.filter(r => r.status >= 500).length;
  const successRate = Math.round((successCount / totalRequests) * 100);

  // Active days
  const uniqueDays = new Set(requests.map(r => r.created_at.split('T')[0])).size;

  // Top paths
  const pathCounts: Record<string, number> = {};
  requests.forEach(r => {
    pathCounts[r.path] = (pathCounts[r.path] || 0) + 1;
  });
  const topPathsList = Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const landingPage = topPathsList[0]?.path || '/';
  const mostVisitedPage = topPathsList[0]?.path || '/';

  // Slowest endpoints
  const pathDurations: Record<string, { sum: number; count: number }> = {};
  requests.forEach(r => {
    if (r.duration_ms !== null) {
      if (!pathDurations[r.path]) pathDurations[r.path] = { sum: 0, count: 0 };
      pathDurations[r.path].sum += r.duration_ms;
      pathDurations[r.path].count += 1;
    }
  });

  const slowestEndpoints = Object.entries(pathDurations)
    .map(([path, stats]) => ({
      path,
      avg_duration: Math.round(stats.sum / stats.count),
      count: stats.count,
    }))
    .sort((a, b) => b.avg_duration - a.avg_duration)
    .slice(0, 10);

  // Timeline
  const timeline = requests.slice(0, 100).map(r => ({
    timestamp: r.created_at,
    created_at: r.created_at,
    method: r.method,
    path: r.path,
    status: r.status,
    duration_ms: r.duration_ms || 0,
    region: null,
  }));

  // Visitor IDs associated with this IP
  const visitorIds = Array.from(new Set(requests.filter(r => r.visitor_id).map(r => r.visitor_id)));

  const intelligence = {
    first_seen: firstSeen,
    last_seen: lastSeen,
    total_requests: totalRequests,
    active_days: uniqueDays,
    unique_pages: uniquePaths,
    landing_page: landingPage,
    most_visited_page: mostVisitedPage,
    device: 'Unknown',
    utm_source: 'Unknown',
    utm_medium: 'Unknown',
    utm_campaign: 'Unknown',
    avg_duration_ms: avgDuration,
    p50_duration_ms: p50Duration,
    p95_duration_ms: p95Duration,
    success_count: successCount,
    client_error_count: clientErrorCount,
    server_error_count: serverErrorCount,
  };

  const score = calculateIpScore(intelligence);
  const alerts = generateAlerts(intelligence);

  return NextResponse.json({
    ip,
    intelligence,
    score,
    alerts,
    stats: {
      total_requests: totalRequests,
      unique_paths: uniquePaths,
      avg_duration: avgDuration,
      success_rate: successRate,
      regions: [],
    },
    timeline,
    topPaths: topPathsList,
    slowestEndpoints,
    visitor_ids: visitorIds,
    meta: {
      range,
      days,
      dataPoints: timeline.length,
      dataSource: 'telemetry_requests (fallback)',
    },
  });
}

function calculateIpScore(ipData: any): number {
  let score = 0;
  if (ipData.unique_pages >= 3) score += 10;
  if (ipData.total_requests >= 20) score += 10;
  if (ipData.active_days >= 2) score += 10;
  if (
    ipData.landing_page?.includes('/demande') ||
    ipData.landing_page?.includes('/faq')
  )
    score += 10;
  if (ipData.p95_duration_ms < 800) score += 20;
  if (ipData.server_error_count === 0) score += 10;
  if (ipData.client_error_count <= 2) score += 10;
  if (ipData.utm_source === 'google' && ipData.utm_medium === 'organic') score += 10;
  const targetPages = ['/demande', '/faq', '/ibv', '/marge-credit'];
  if (targetPages.some((page) => ipData.landing_page?.includes(page))) score += 10;
  return Math.min(score, 100);
}

function generateAlerts(ipData: any) {
  const alerts: any[] = [];
  if (
    ipData.server_error_count >= 1 &&
    ipData.landing_page?.includes('/demande')
  ) {
    alerts.push({
      level: 'CRIT',
      title: 'Erreurs 5xx sur page conversion',
      description: `${ipData.server_error_count} erreur(s) serveur`,
      action: 'Vérifier logs backend',
      metric: '5xx',
      value: ipData.server_error_count,
    });
  }
  if (ipData.p95_duration_ms >= 2000) {
    alerts.push({
      level: 'CRIT',
      title: 'Backend très lent',
      description: `p95 à ${ipData.p95_duration_ms}ms`,
      action: 'Profiler endpoints',
      metric: 'p95',
      value: `${ipData.p95_duration_ms}ms`,
    });
  }
  if (ipData.client_error_count >= 5) {
    alerts.push({
      level: 'WARN',
      title: 'Nombreuses erreurs 4xx',
      description: `${ipData.client_error_count} erreur(s) client`,
      action: 'Vérifier liens cassés',
      metric: '4xx',
      value: ipData.client_error_count,
    });
  }
  if (ipData.p95_duration_ms >= 800 && ipData.p95_duration_ms < 2000) {
    alerts.push({
      level: 'WARN',
      title: 'Latence élevée',
      description: `p95 à ${ipData.p95_duration_ms}ms`,
      action: 'Optimiser DB',
      metric: 'p95',
      value: `${ipData.p95_duration_ms}ms`,
    });
  }
  if (ipData.unique_pages === 1 && ipData.total_requests >= 10) {
    alerts.push({
      level: 'WARN',
      title: 'Boucle détectée',
      description: `${ipData.total_requests} requêtes sur 1 page`,
      action: 'Possible bot',
      metric: 'Loop',
      value: `${ipData.total_requests}x`,
    });
  }
  if (
    ipData.server_error_count === 0 &&
    ipData.p95_duration_ms < 800 &&
    ipData.unique_pages >= 3
  ) {
    alerts.push({
      level: 'OK',
      title: 'Expérience fluide',
      description: 'Aucune erreur, latence faible',
      metric: 'UX',
    });
  }
  return alerts.sort((a, b) => {
    const order: Record<string, number> = { CRIT: 0, WARN: 1, OK: 2 };
    return order[a.level] - order[b.level];
  });
}
