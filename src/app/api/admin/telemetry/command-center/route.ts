/**
 * API: GET /api/admin/telemetry/command-center
 *
 * Purpose: Provide REAL telemetry data for NSA-style command center
 * Data Sources:
 *   - telemetry_requests (real HTTP requests)
 *   - telemetry_spans (real DB/API operations)
 *   - telemetry_security (real security checks)
 *   - telemetry_alerts (real alerts)
 *
 * NO MOCK DATA - 100% REAL METRICS ONLY
 */

import { getSupabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const timeWindow = request.nextUrl.searchParams.get('window') || '1h'

    // Calculate time range
    const intervals: Record<string, string> = {
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '6h': '6 hours',
      '24h': '24 hours',
    }
    const interval = intervals[timeWindow] || '1 hour'

    // ========================================================================
    // FETCH 1: Recent request traces (REAL DATA)
    // ========================================================================
    const { data: recentRequests, error: requestsError } = await supabase
      .from('telemetry_requests')
      .select('trace_id, created_at, method, path, status, duration_ms, source, ip_hash, region, error_code, bytes_in, bytes_out')
      .gte('created_at', `now() - interval '${interval}'`)
      .order('created_at', { ascending: false })
      .limit(100)

    if (requestsError) {
      console.error('[command-center] Requests fetch error:', requestsError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // ========================================================================
    // FETCH 2: Request metrics aggregated (REAL DATA)
    // ========================================================================
    const { data: metricsData, error: metricsError } = await supabase
      .from('telemetry_requests')
      .select('created_at, status, duration_ms, path, bytes_out')
      .gte('created_at', `now() - interval '${interval}'`)
      .order('created_at', { ascending: true })

    if (metricsError) {
      console.error('[command-center] Metrics fetch error:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    // ========================================================================
    // FETCH 3: Active pipelines (REAL DATA from spans)
    // ========================================================================
    const { data: spanData, error: spanError } = await supabase
      .from('telemetry_spans')
      .select('span_name, span_type, target, status, duration_ms, created_at, operation')
      .gte('created_at', `now() - interval '${interval}'`)
      .in('span_type', ['external', 'db'])
      .order('created_at', { ascending: false })
      .limit(200)

    if (spanError) {
      console.error('[command-center] Spans fetch error:', spanError)
    }

    // ========================================================================
    // FETCH 4: Active alerts (REAL DATA)
    // ========================================================================
    const { data: alerts, error: alertsError } = await supabase
      .from('telemetry_alerts')
      .select('alert_key, severity, summary, occurrence_count, first_seen_at, last_seen_at, state')
      .eq('state', 'open')
      .order('severity', { ascending: false })
      .limit(20)

    if (alertsError) {
      console.error('[command-center] Alerts fetch error:', alertsError)
    }

    // ========================================================================
    // AGGREGATION: Calculate real-time metrics
    // ========================================================================
    const totalRequests = metricsData?.length || 0
    const totalErrors = metricsData?.filter(r => r.status && r.status >= 400).length || 0
    const avgLatency = metricsData && metricsData.length > 0
      ? Math.round(metricsData.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / metricsData.length)
      : 0
    const totalDataTransferred = metricsData && metricsData.length > 0
      ? Math.round(metricsData.reduce((sum, r) => sum + (r.bytes_out || 0), 0) / 1024 / 1024) // MB
      : 0

    // Time-series data for charts (group by minute)
    const timeSeriesMap = new Map<string, { requests: number; errors: number; totalLatency: number; count: number }>()

    metricsData?.forEach(req => {
      const timestamp = new Date(req.created_at).getTime()
      const minute = Math.floor(timestamp / 60000) * 60000 // Round to minute
      const key = minute.toString()

      const existing = timeSeriesMap.get(key) || { requests: 0, errors: 0, totalLatency: 0, count: 0 }
      existing.requests += 1
      if (req.status && req.status >= 400) existing.errors += 1
      if (req.duration_ms) {
        existing.totalLatency += req.duration_ms
        existing.count += 1
      }
      timeSeriesMap.set(key, existing)
    })

    const timeSeries = Array.from(timeSeriesMap.entries())
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([timestamp, data]) => ({
        timestamp: parseInt(timestamp),
        requests: data.requests,
        errors: data.errors,
        avgLatency: data.count > 0 ? Math.round(data.totalLatency / data.count) : 0,
      }))

    // Endpoint distribution (for pie chart)
    const endpointMap = new Map<string, number>()
    metricsData?.forEach(req => {
      const endpoint = req.path?.split('?')[0] || 'unknown' // Remove query params
      endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1)
    })

    const endpointDistribution = Array.from(endpointMap.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Status code distribution (for bar chart)
    const statusMap = new Map<number, number>()
    metricsData?.forEach(req => {
      if (req.status) {
        statusMap.set(req.status, (statusMap.get(req.status) || 0) + 1)
      }
    })

    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => a.status - b.status)

    // Pipeline aggregation from spans
    const pipelineMap = new Map<string, {
      target: string
      type: string
      count: number
      avgDuration: number
      totalDuration: number
      errors: number
    }>()

    spanData?.forEach(span => {
      const key = `${span.span_type}:${span.target}`
      const existing = pipelineMap.get(key) || {
        target: span.target,
        type: span.span_type,
        count: 0,
        avgDuration: 0,
        totalDuration: 0,
        errors: 0,
      }

      existing.count += 1
      existing.totalDuration += span.duration_ms || 0
      if (span.status === 'error') existing.errors += 1

      pipelineMap.set(key, existing)
    })

    const pipelines = Array.from(pipelineMap.values())
      .map(p => ({
        ...p,
        avgDuration: p.count > 0 ? Math.round(p.totalDuration / p.count) : 0,
        status: p.errors > p.count * 0.1 ? 'error' : (p.count > 0 ? 'active' : 'idle'),
        throughput: p.count, // Operations per window
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // System health determination
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const systemStatus = errorRate > 10 ? 'critical' : errorRate > 5 ? 'degraded' : 'operational'

    // ========================================================================
    // RESPONSE: 100% REAL DATA
    // ========================================================================
    return NextResponse.json({
      success: true,
      timeWindow,
      timestamp: new Date().toISOString(),

      // Summary metrics
      metrics: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%' : '0%',
        avgLatency,
        totalDataTransferred,
      },

      // System status
      systemStatus,

      // Time-series data for charts
      timeSeries,

      // Recent request traces
      requestTraces: recentRequests?.map(req => ({
        id: req.trace_id,
        timestamp: new Date(req.created_at).getTime(),
        method: req.method,
        endpoint: req.path,
        status: req.status || 0,
        duration: req.duration_ms || 0,
        ip: req.ip_hash?.substring(0, 8) || 'unknown',
        region: req.region || 'unknown',
        source: req.source,
        errorCode: req.error_code,
        bytesIn: req.bytes_in || 0,
        bytesOut: req.bytes_out || 0,
      })) || [],

      // Pipeline data
      pipelines: pipelines.map(p => ({
        id: `${p.type}:${p.target}`,
        name: p.target,
        source: p.type === 'external' ? 'External API' : 'Database',
        type: p.type,
        status: p.status,
        throughput: p.throughput,
        avgDuration: p.avgDuration,
        errorCount: p.errors,
      })),

      // Distribution charts
      endpointDistribution,
      statusDistribution,

      // Active alerts
      activeAlerts: alerts || [],

      _meta: {
        source: 'REAL TELEMETRY DATA',
        tables: ['telemetry_requests', 'telemetry_spans', 'telemetry_alerts'],
        no_mock_data: true,
      }
    })

  } catch (error) {
    console.error('[command-center] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
