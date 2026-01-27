import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/ip-details
 *
 * Returns aggregated metrics by IP hash (unique visitors analysis)
 */
export async function GET() {
  try {
    // Get all sessions grouped by IP hash
    const { data: sessions, error } = await supabase
      .from('client_sessions')
      .select(`
        ip_hash,
        session_id,
        client_id,
        device_type,
        browser,
        country_code,
        asn,
        first_utm_source,
        first_referrer,
        created_at,
        last_activity_at
      `)
      .not('ip_hash', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('[Analytics/IPDetails] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch IP details', details: error.message },
        { status: 500 }
      )
    }

    // Group by IP hash
    const ipMap = new Map<string, {
      ip_hash: string
      session_count: number
      sessions: string[]
      linked_sessions: number
      anonymous_sessions: number
      devices: Set<string>
      countries: Set<string>
      sources: Set<string>
      first_seen: string
      last_seen: string
      total_duration_seconds: number
    }>()

    for (const session of sessions || []) {
      const ipHash = session.ip_hash
      if (!ipHash) continue

      if (!ipMap.has(ipHash)) {
        ipMap.set(ipHash, {
          ip_hash: ipHash,
          session_count: 0,
          sessions: [],
          linked_sessions: 0,
          anonymous_sessions: 0,
          devices: new Set(),
          countries: new Set(),
          sources: new Set(),
          first_seen: session.created_at,
          last_seen: session.last_activity_at,
          total_duration_seconds: 0
        })
      }

      const ipData = ipMap.get(ipHash)!
      ipData.session_count += 1
      ipData.sessions.push(session.session_id)

      if (session.client_id) {
        ipData.linked_sessions += 1
      } else {
        ipData.anonymous_sessions += 1
      }

      if (session.device_type) {
        ipData.devices.add(session.device_type + ' - ' + (session.browser || 'unknown'))
      }

      if (session.country_code) {
        ipData.countries.add(session.country_code)
      }

      const source = session.first_utm_source || (session.first_referrer ? 'Referrer' : 'Direct')
      ipData.sources.add(source)

      // Update first/last seen
      if (new Date(session.created_at) < new Date(ipData.first_seen)) {
        ipData.first_seen = session.created_at
      }
      if (new Date(session.last_activity_at) > new Date(ipData.last_seen)) {
        ipData.last_seen = session.last_activity_at
      }

      // Calculate session duration
      const duration = new Date(session.last_activity_at).getTime() - new Date(session.created_at).getTime()
      ipData.total_duration_seconds += Math.round(duration / 1000)
    }

    // Get event counts per IP (via sessions)
    const allSessionIds = Array.from(ipMap.values()).flatMap(ip => ip.sessions)
    const { data: events } = await supabase
      .from('client_telemetry_events')
      .select('session_id, event_type')
      .in('session_id', allSessionIds.slice(0, 1000)) // Limit to avoid query size issues

    // Aggregate events by session → IP
    const eventsBySession = new Map<string, { page_views: number; total: number }>()
    for (const event of events || []) {
      if (!eventsBySession.has(event.session_id)) {
        eventsBySession.set(event.session_id, { page_views: 0, total: 0 })
      }
      const sessionEvents = eventsBySession.get(event.session_id)!
      sessionEvents.total += 1
      if (event.event_type === 'page_view') {
        sessionEvents.page_views += 1
      }
    }

    // Convert Map to Array with enriched data
    const result = Array.from(ipMap.values()).map(ip => {
      // Aggregate events for all sessions of this IP
      let totalEvents = 0
      let totalPageViews = 0
      for (const sessionId of ip.sessions) {
        const sessionEvents = eventsBySession.get(sessionId)
        if (sessionEvents) {
          totalEvents += sessionEvents.total
          totalPageViews += sessionEvents.page_views
        }
      }

      return {
        ip_hash: ip.ip_hash.substring(0, 12) + '...', // Partial hash for privacy
        session_count: ip.session_count,
        linked_sessions: ip.linked_sessions,
        anonymous_sessions: ip.anonymous_sessions,
        conversion_rate: ip.session_count > 0
          ? ((ip.linked_sessions / ip.session_count) * 100).toFixed(1)
          : '0.0',
        devices: Array.from(ip.devices),
        countries: Array.from(ip.countries),
        sources: Array.from(ip.sources),
        first_seen: ip.first_seen,
        last_seen: ip.last_seen,
        total_duration_seconds: ip.total_duration_seconds,
        avg_duration_seconds: Math.round(ip.total_duration_seconds / ip.session_count),
        total_events: totalEvents,
        total_page_views: totalPageViews,
        avg_events_per_session: (totalEvents / ip.session_count).toFixed(1)
      }
    })

    // Sort by session count desc
    result.sort((a, b) => b.session_count - a.session_count)

    return NextResponse.json({
      success: true,
      data: result.slice(0, 50) // Top 50 IPs
    })

  } catch (error) {
    console.error('[Analytics/IPDetails] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
