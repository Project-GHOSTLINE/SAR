import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/page-flow
 *
 * Returns page-to-page flow data for Sankey diagram (journey visualization)
 */
export async function GET() {
  try {
    // Get page flow data from existing view or compute
    const { data, error } = await supabase
      .from('visual_page_flow')
      .select('*')
      .order('flow_count', { ascending: false })
      .limit(50)

    // Fallback: Compute from events directly
    if (error || !data || data.length === 0) {
      const { data: events, error: eventsError } = await supabase
        .from('client_telemetry_events')
        .select('session_id, page_url, created_at')
        .eq('event_type', 'page_view')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(10000)

      if (eventsError) {
        console.error('[Analytics/PageFlow] Error:', eventsError)
        return NextResponse.json(
          { error: 'Failed to fetch page flow data', details: eventsError.message },
          { status: 500 }
        )
      }

      // Group by session and build flows
      const sessionFlows = new Map<string, string[]>()
      for (const event of events || []) {
        if (!sessionFlows.has(event.session_id)) {
          sessionFlows.set(event.session_id, [])
        }
        sessionFlows.get(event.session_id)!.push(event.page_url)
      }

      // Count page-to-page transitions
      const flowMap = new Map<string, number>()
      for (const pages of sessionFlows.values()) {
        for (let i = 0; i < pages.length - 1; i++) {
          const source = pages[i] || '/'
          const target = pages[i + 1] || '/'
          const flowKey = `${source} → ${target}`

          flowMap.set(flowKey, (flowMap.get(flowKey) || 0) + 1)
        }
      }

      // Convert to array and format for Sankey
      const flows = Array.from(flowMap.entries()).map(([flow, count]) => {
        const [source, target] = flow.split(' → ')
        return {
          source,
          target,
          flow_count: count,
          flow_label: flow
        }
      })

      // Sort by count desc
      flows.sort((a, b) => b.flow_count - a.flow_count)

      return NextResponse.json({
        success: true,
        data: flows.slice(0, 30) // Top 30 flows
      })
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/PageFlow] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
