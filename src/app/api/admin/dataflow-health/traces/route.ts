/**
 * API: Dataflow Health Traces
 * GET /api/admin/dataflow-health/traces
 *
 * Returns list of recent traces with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(req.url)

    const timeRange = searchParams.get('timeRange') || '1h'
    const source = searchParams.get('source') || 'all'
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Convert time range to interval
    const intervalMap: Record<string, string> = {
      '5m': '5 minutes',
      '15m': '15 minutes',
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days'
    }
    const interval = intervalMap[timeRange] || '1 hour'
    const cutoffTime = new Date(Date.now() - parseInterval(interval)).toISOString()

    // Build query
    let query = supabase
      .from('telemetry_requests')
      .select('trace_id, created_at, method, path, status, duration_ms, source, error_code, error_message_redacted')
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (source !== 'all') {
      query = query.eq('source', source)
    }

    if (status !== 'all') {
      if (status === '2xx') {
        query = query.gte('status', 200).lt('status', 300)
      } else if (status === '4xx') {
        query = query.gte('status', 400).lt('status', 500)
      } else if (status === '5xx') {
        query = query.gte('status', 500)
      }
    }

    const { data: requests, error } = await query

    if (error) {
      throw error
    }

    // For each request, count spans
    const traces = await Promise.all(
      (requests || []).map(async (req) => {
        const { data: spans } = await supabase
          .from('telemetry_spans')
          .select('id, status')
          .eq('trace_id', req.trace_id)

        const hasErrors = spans?.some(s => s.status === 'error' || s.status === 'timeout') || false

        return {
          traceId: req.trace_id,
          timestamp: req.created_at,
          method: req.method,
          path: req.path,
          status: req.status,
          durationMs: req.duration_ms || 0,
          source: req.source,
          spanCount: spans?.length || 0,
          hasErrors: hasErrors || req.error_code != null
        }
      })
    )

    return NextResponse.json({
      traces,
      count: traces.length,
      timeRange,
      filters: { source, status }
    })
  } catch (error: any) {
    console.error('[Dataflow Health] Error fetching traces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch traces', details: error.message },
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
