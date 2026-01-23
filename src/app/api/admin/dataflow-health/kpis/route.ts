/**
 * API: Dataflow Health KPIs
 * GET /api/admin/dataflow-health/kpis
 *
 * Returns real-time KPIs for dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || '1h'

    // Convert time range to interval
    const intervalMap: Record<string, string> = {
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days'
    }
    const interval = intervalMap[timeRange] || '1 hour'

    // Fetch KPIs from telemetry_requests
    const { data: requestStats } = await supabase.rpc('get_request_kpis', {
      p_interval: interval
    })

    // Fallback if RPC doesn't exist yet - direct queries
    if (!requestStats) {
      // Requests per minute
      const { data: recentRequests } = await supabase
        .from('telemetry_requests')
        .select('id, status, duration_ms, source, created_at')
        .gte('created_at', new Date(Date.now() - parseInterval(interval)).toISOString())

      const totalRequests = recentRequests?.length || 0
      const minutesInInterval = parseInterval(interval) / 60000
      const requestsPerMinute = totalRequests / minutesInInterval

      // Error rate
      const errorCount = recentRequests?.filter(r => r.status >= 400).length || 0
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

      // P95 latency
      const durations = recentRequests?.map(r => r.duration_ms).filter(d => d != null).sort((a, b) => a - b) || []
      const p95Index = Math.floor(durations.length * 0.95)
      const p95Latency = durations[p95Index] || 0

      // Webhook success rate
      const webhookRequests = recentRequests?.filter(r => r.source === 'webhook') || []
      const webhookSuccesses = webhookRequests.filter(r => r.status >= 200 && r.status < 400).length
      const webhookSuccessRate = webhookRequests.length > 0
        ? (webhookSuccesses / webhookRequests.length) * 100
        : 100

      // DB latency (from telemetry_spans)
      const { data: dbSpans } = await supabase
        .from('telemetry_spans')
        .select('duration_ms')
        .eq('span_type', 'db')
        .gte('created_at', new Date(Date.now() - parseInterval(interval)).toISOString())
        .order('duration_ms', { ascending: false })

      const dbDurations = dbSpans?.map(s => s.duration_ms).sort((a, b) => a - b) || []
      const dbP95Index = Math.floor(dbDurations.length * 0.95)
      const dbLatencyP95 = dbDurations[dbP95Index] || 0

      // External API error rate
      const { data: externalSpans } = await supabase
        .from('telemetry_spans')
        .select('status')
        .eq('span_type', 'external')
        .gte('created_at', new Date(Date.now() - parseInterval(interval)).toISOString())

      const externalTotal = externalSpans?.length || 0
      const externalErrors = externalSpans?.filter(s => s.status === 'error' || s.status === 'timeout').length || 0
      const externalErrorRate = externalTotal > 0 ? (externalErrors / externalTotal) * 100 : 0

      return NextResponse.json({
        requestsPerMinute: parseFloat(requestsPerMinute.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(2)),
        p95Latency: p95Latency,
        webhookSuccessRate: parseFloat(webhookSuccessRate.toFixed(2)),
        dbLatencyP95: dbLatencyP95,
        externalErrorRate: parseFloat(externalErrorRate.toFixed(2)),
        timeRange,
        interval
      })
    }

    // If RPC exists, use its result
    return NextResponse.json(requestStats)
  } catch (error: any) {
    console.error('[Dataflow Health] Error fetching KPIs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPIs', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Parse time interval string to milliseconds
 */
function parseInterval(interval: string): number {
  const match = interval.match(/(\d+)\s*(minute|hour|day|week)s?/i)
  if (!match) return 3600000 // 1 hour default

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 'minute': return value * 60 * 1000
    case 'hour': return value * 60 * 60 * 1000
    case 'day': return value * 24 * 60 * 60 * 1000
    case 'week': return value * 7 * 24 * 60 * 60 * 1000
    default: return 3600000
  }
}
