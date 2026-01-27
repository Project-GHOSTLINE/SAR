import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/sources
 *
 * Returns traffic sources breakdown (UTM + referrer analysis)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('visual_conversion_by_source')
      .select('*')
      .order('sessions', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[Analytics/Sources] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sources data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Analytics/Sources] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
