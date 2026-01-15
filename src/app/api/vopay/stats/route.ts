import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Stats globales
    const { data: globalStats, error } = await supabase
      .from('vopay_objects')
      .select('status, object_type, amount')

    if (error) {
      console.error('VoPay global stats error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = globalStats?.length || 0
    const successful = globalStats?.filter(t => t.status === 'successful').length || 0
    const failed = globalStats?.filter(t => t.status === 'failed').length || 0
    const totalAmount = globalStats
      ?.filter(t => t.status === 'successful')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    const stats = {
      total_transactions: total,
      successful_count: successful,
      failed_count: failed,
      success_rate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0',
      total_amount: totalAmount
    }

    // Récupérer quelques transactions récentes
    const { data: recentTransactions } = await supabase
      .from('vopay_objects')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats,
      transactions: recentTransactions || []
    })
  } catch (err: any) {
    console.error('VoPay global API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
