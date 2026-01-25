import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/heatmap
 *
 * Returns activity heatmap data (7 days x 24 hours)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('visual_activity_heatmap')
      .select('*')
      .order('day_of_week')
      .order('hour_of_day')

    if (error) {
      console.error('[Analytics/Heatmap] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch heatmap data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Heatmap] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
