import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/timeline
 *
 * Returns timeline data (events per day for last 30 days)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('visual_events_timeline')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[Analytics/Timeline] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch timeline data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Timeline] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
