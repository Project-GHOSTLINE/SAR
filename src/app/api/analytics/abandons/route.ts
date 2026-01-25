import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/abandons
 *
 * Returns abandon heatmap data (where users drop off)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('visual_abandon_heatmap')
      .select('*')
      .order('abandon_count', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[Analytics/Abandons] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch abandons data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Abandons] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
