import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // Récupérer tous les webhooks, triés par date (plus récents en premier)
    const { data: webhooks, error } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      webhooks: webhooks || []
    })
  } catch (error) {
    console.error('Error in /api/admin/webhooks/list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
