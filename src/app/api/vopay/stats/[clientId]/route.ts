import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Stats pour ce client
    const { data: transactions, error } = await supabase
      .from('vopay_objects')
      .select('status, object_type, amount, occurred_at, vopay_id, id')
      .eq('client_id', clientId)
      .order('occurred_at', { ascending: false })

    if (error) {
      console.error('VoPay stats error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = transactions?.length || 0
    const successful = transactions?.filter(t => t.status === 'successful').length || 0
    const failed = transactions?.filter(t => t.status === 'failed').length || 0
    const totalAmount = transactions
      ?.filter(t => t.status === 'successful')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    const stats = {
      total_transactions: total,
      successful_count: successful,
      failed_count: failed,
      success_rate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0',
      total_amount: totalAmount
    }

    const recentTransactions = transactions?.slice(0, 10) || []

    return NextResponse.json({
      stats,
      transactions: recentTransactions
    })
  } catch (err: any) {
    console.error('VoPay API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
