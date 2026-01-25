import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/funnel
 *
 * Returns conversion funnel data (awareness → exploration → consideration → converted)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('visual_conversion_funnel')
      .select('*')
      .order('stage_order')

    if (error) {
      console.error('[Analytics/Funnel] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch funnel data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Funnel] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
