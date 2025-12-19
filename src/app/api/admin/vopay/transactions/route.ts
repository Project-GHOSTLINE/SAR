import { NextRequest, NextResponse } from 'next/server'
import { createVoPayClient } from '@/lib/vopay'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/vopay/transactions
 * Récupère l'historique des transactions VoPay
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const days = parseInt(searchParams.get('days') || '30')

    const vopay = createVoPayClient()

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const transactions = await vopay.getTransactions({
      limit,
      StartDateTime: startDate.toISOString().split('T')[0],
      EndDateTime: endDate.toISOString().split('T')[0]
    })

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        days
      }
    })

  } catch (error) {
    console.error('VoPay Transactions API Error:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des transactions',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
