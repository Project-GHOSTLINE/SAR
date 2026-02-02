import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/cron/cleanup-sessions
 *
 * Daily cron job to cleanup:
 * - Expired sessions (> 90 days inactive)
 * - Old telemetry events (> 30 days)
 * - IP/UA hashes (> 30 days)
 *
 * Schedule: Daily at 2 AM UTC (via Vercel Cron)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets this in production)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call cleanup function
    const { data, error } = await supabase.rpc('cleanup_client_sessions')

    if (error) {
      console.error('[CleanupSessions] Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Format results
    const results: Record<string, number> = {}
    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        results[row.operation] = parseInt(row.rows_affected)
      })
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CleanupSessions] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
