import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/sessions
 *
 * Returns detailed session-level metrics (by IP hash, with geo, device, events)
 * Supports pagination via query params: ?limit=50&offset=0
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get sessions with aggregated event counts
    const { data: sessions, error } = await supabase
      .from('client_sessions')
      .select(`
        session_id,
        client_id,
        created_at,
        last_activity_at,
        device_type,
        browser,
        os,
        first_referrer,
        first_utm_source,
        first_utm_medium,
        first_utm_campaign,
        country_code,
        asn,
        ip_hash
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Analytics/Sessions] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      )
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { limit, offset, total: 0 }
      })
    }

    // Get event counts for each session
    const sessionIds = sessions.map(s => s.session_id)
    const { data: eventCounts } = await supabase
      .from('client_telemetry_events')
      .select('session_id, event_type')
      .in('session_id', sessionIds)

    // Aggregate events by session
    const eventsBySession = (eventCounts || []).reduce((acc: any, event: any) => {
      if (!acc[event.session_id]) {
        acc[event.session_id] = {
          total: 0,
          page_views: 0,
          form_interactions: 0
        }
      }
      acc[event.session_id].total += 1
      if (event.event_type === 'page_view') {
        acc[event.session_id].page_views += 1
      } else if (event.event_type.startsWith('form_')) {
        acc[event.session_id].form_interactions += 1
      }
      return acc
    }, {})

    // Enrich sessions with event counts
    const enrichedSessions = sessions.map(session => {
      const events = eventsBySession[session.session_id] || {
        total: 0,
        page_views: 0,
        form_interactions: 0
      }

      // Calculate session duration (last_activity - created)
      const durationMs = new Date(session.last_activity_at).getTime() - new Date(session.created_at).getTime()
      const durationSeconds = Math.round(durationMs / 1000)

      return {
        session_id: session.session_id.substring(0, 16) + '...', // Anonymize
        client_id: session.client_id ? 'linked' : 'anonymous',
        created_at: session.created_at,
        last_activity_at: session.last_activity_at,
        duration_seconds: durationSeconds,
        device: {
          type: session.device_type,
          browser: session.browser,
          os: session.os
        },
        source: {
          referrer: session.first_referrer,
          utm_source: session.first_utm_source,
          utm_medium: session.first_utm_medium,
          utm_campaign: session.first_utm_campaign
        },
        location: {
          country_code: session.country_code,
          asn: session.asn
        },
        events: {
          total: events.total,
          page_views: events.page_views,
          form_interactions: events.form_interactions
        },
        ip_hash: session.ip_hash ? session.ip_hash.substring(0, 8) + '...' : null // Partial hash
      }
    })

    // Get total count for pagination
    const { count } = await supabase
      .from('client_sessions')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: enrichedSessions,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('[Analytics/Sessions] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
