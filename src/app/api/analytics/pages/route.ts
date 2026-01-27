import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/pages
 *
 * Returns detailed metrics by page (views, avg duration, bounce rate, conversions)
 */
export async function GET() {
  try {
    // Aggregate page-level metrics from events
    const { data, error } = await supabase.rpc('get_page_metrics')

    // Fallback: Query events directly and aggregate
    if (error || !data) {
      const { data: events, error: eventsError } = await supabase
        .from('client_telemetry_events')
        .select(`
          page_url,
          event_type,
          duration_ms,
          session_id,
          created_at
        `)
        .eq('event_type', 'page_view')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10000)

      if (eventsError) {
        console.error('[Analytics/Pages] Error:', eventsError)
        return NextResponse.json(
          { error: 'Failed to fetch page metrics', details: eventsError.message },
          { status: 500 }
        )
      }

      // Aggregate by page_url
      const pageMetrics = (events || []).reduce((acc: any[], event: any) => {
        const existing = acc.find(p => p.page_url === event.page_url)

        if (existing) {
          existing.views += 1
          existing.total_duration += event.duration_ms || 0
          existing.sessions.add(event.session_id)
        } else {
          acc.push({
            page_url: event.page_url,
            views: 1,
            total_duration: event.duration_ms || 0,
            sessions: new Set([event.session_id])
          })
        }

        return acc
      }, [])

      // Calculate averages
      const result = pageMetrics.map(page => ({
        page_url: page.page_url,
        views: page.views,
        unique_sessions: page.sessions.size,
        avg_duration_seconds: Math.round(page.total_duration / page.views / 1000),
        views_per_session: (page.views / page.sessions.size).toFixed(1)
      }))

      // Sort by views desc
      result.sort((a, b) => b.views - a.views)

      return NextResponse.json({
        success: true,
        data: result.slice(0, 20)
      })
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Pages] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
