import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/analytics/referrers
 *
 * Returns top referrer domains (sites d'où viennent les visiteurs)
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('client_sessions')
      .select('first_referrer, session_id, client_id')
      .not('first_referrer', 'is', null)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000)

    if (error) {
      console.error('[Analytics/Referrers] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch referrers', details: error.message },
        { status: 500 }
      )
    }

    // Extract domain from referrer URL
    const referrerMap = new Map<string, {
      domain: string
      sessions: number
      conversions: number
      sample_urls: Set<string>
    }>()

    for (const session of data || []) {
      try {
        const url = new URL(session.first_referrer)
        const domain = url.hostname.replace('www.', '')

        if (!referrerMap.has(domain)) {
          referrerMap.set(domain, {
            domain,
            sessions: 0,
            conversions: 0,
            sample_urls: new Set()
          })
        }

        const referrerData = referrerMap.get(domain)!
        referrerData.sessions += 1
        if (session.client_id) {
          referrerData.conversions += 1
        }
        referrerData.sample_urls.add(session.first_referrer)
      } catch (e) {
        // Invalid URL, skip
        continue
      }
    }

    // Convert to array
    const result = Array.from(referrerMap.values()).map(ref => ({
      domain: ref.domain,
      sessions: ref.sessions,
      conversions: ref.conversions,
      conversion_rate: ((ref.conversions / ref.sessions) * 100).toFixed(1),
      sample_urls: Array.from(ref.sample_urls).slice(0, 3) // Top 3 URLs
    }))

    // Sort by sessions desc
    result.sort((a, b) => b.sessions - a.sessions)

    return NextResponse.json({
      success: true,
      data: result.slice(0, 20) // Top 20 referrers
    })

  } catch (error) {
    console.error('[Analytics/Referrers] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
