import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * Cron job to clean up expired and revoked magic links
 * Run this hourly via Vercel cron
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Delete expired magic links
    const { data: deletedExpired, error: expiredError } = await supabase
      .from('magic_links')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (expiredError) {
      console.error('Error deleting expired links:', expiredError)
    }

    // Delete revoked magic links (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: deletedRevoked, error: revokedError } = await supabase
      .from('magic_links')
      .delete()
      .not('revoked_at', 'is', null)
      .lt('revoked_at', sevenDaysAgo.toISOString())
      .select('id')

    if (revokedError) {
      console.error('Error deleting revoked links:', revokedError)
    }

    const expiredCount = deletedExpired?.length || 0
    const revokedCount = deletedRevoked?.length || 0
    const totalCleaned = expiredCount + revokedCount

    console.log(`🧹 Cleanup completed: ${totalCleaned} links removed (${expiredCount} expired, ${revokedCount} revoked)`)

    return NextResponse.json({
      success: true,
      data: {
        expired_count: expiredCount,
        revoked_count: revokedCount,
        total_cleaned: totalCleaned,
      },
    })
  } catch (error) {
    console.error('Error in /api/cron/cleanup:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
