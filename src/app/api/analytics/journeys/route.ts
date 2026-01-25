import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/journeys
 *
 * Returns top user journeys (most common paths)
 */
export async function GET() {
  try {
    // Get top journeys grouped by path
    const { data: journeysData, error: journeysError } = await supabase
      .rpc('get_top_journeys', {}, { count: 'exact' })
      .limit(20)

    // Fallback: if RPC doesn't exist, query the view directly
    if (journeysError) {
      const { data, error } = await supabase
        .from('analytics_user_journeys')
        .select('journey_visual, path_length, journey_duration')
        .order('path_length', { ascending: false })
        .limit(20)

      if (error) {
        console.error('[Analytics/Journeys] Error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch journeys data', details: error.message },
          { status: 500 }
        )
      }

      // Group by journey_visual and count
      const grouped = (data || []).reduce((acc: any[], journey: any) => {
        const existing = acc.find(j => j.journey_visual === journey.journey_visual)
        if (existing) {
          existing.count += 1
        } else {
          acc.push({
            journey_visual: journey.journey_visual,
            path_length: journey.path_length,
            count: 1
          })
        }
        return acc
      }, [])

      return NextResponse.json({
        success: true,
        data: grouped.sort((a, b) => b.count - a.count).slice(0, 10)
      })
    }

    return NextResponse.json({
      success: true,
      data: journeysData || []
    })

  } catch (error) {
    console.error('[Analytics/Journeys] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
