/**
 * API: Dataflow Health Alerts
 * GET /api/admin/dataflow-health/alerts
 *
 * Returns active alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    const { searchParams } = new URL(req.url)

    const state = searchParams.get('state') || 'open'
    const severity = searchParams.get('severity') || 'all'

    // Build query
    let query = supabase
      .from('telemetry_alerts')
      .select('id, alert_key, severity, state, summary, occurrence_count, first_seen_at, last_seen_at, sample_trace_id')
      .order('last_seen_at', { ascending: false })

    if (state !== 'all') {
      query = query.eq('state', state)
    }

    if (severity !== 'all') {
      query = query.eq('severity', severity)
    }

    const { data: alerts, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      alerts: alerts || [],
      count: alerts?.length || 0,
      filters: { state, severity }
    })
  } catch (error: any) {
    console.error('[Dataflow Health] Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST: Acknowledge alert
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    const body = await req.json()

    const { alertId, action } = body

    if (!alertId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: alertId, action' },
        { status: 400 }
      )
    }

    if (action === 'acknowledge') {
      const { error } = await supabase
        .from('telemetry_alerts')
        .update({
          state: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: 'admin'  // TODO: get from JWT
        })
        .eq('id', alertId)

      if (error) throw error

      return NextResponse.json({ success: true, action: 'acknowledged' })
    }

    if (action === 'close') {
      const { error } = await supabase
        .from('telemetry_alerts')
        .update({
          state: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: 'admin'  // TODO: get from JWT
        })
        .eq('id', alertId)

      if (error) throw error

      return NextResponse.json({ success: true, action: 'closed' })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[Dataflow Health] Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert', details: error.message },
      { status: 500 }
    )
  }
}
