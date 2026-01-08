import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

/**
 * GET /api/admin/webhooks/stats
 * Récupère les statistiques agrégées des webhooks VoPay
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification admin
    const authHeader = request.headers.get('cookie')
    if (!authHeader?.includes('admin-session=')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // Calculer les dates
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)

    // 1. Stats globales - FILTRER UNIQUEMENT LES DONNÉES DE PRODUCTION
    const { data: allWebhooks, error: allError } = await supabase
      .from('vopay_webhook_logs')
      .select('status, transaction_amount, received_at, environment')
      .order('received_at', { ascending: false })

    if (allError) {
      console.error('Error fetching webhooks:', allError)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }

    // IMPORTANT: Filtrer UNIQUEMENT les transactions de production (pas sandbox/test)
    const webhooks = (allWebhooks || []).filter(w =>
      !w.environment || w.environment.toLowerCase() === 'production'
    )

    // 2. Filtrer par période
    const todayWebhooks = webhooks.filter(w => new Date(w.received_at) >= today)
    const yesterdayWebhooks = webhooks.filter(w => {
      const date = new Date(w.received_at)
      return date >= yesterday && date < today
    })
    const weekWebhooks = webhooks.filter(w => new Date(w.received_at) >= weekAgo)
    const monthWebhooks = webhooks.filter(w => new Date(w.received_at) >= monthAgo)

    // 3. Calculer les stats par statut
    const countByStatus = (webhooks: any[]) => {
      const counts: Record<string, number> = {
        successful: 0,
        failed: 0,
        pending: 0,
        'in progress': 0,
        cancelled: 0
      }
      webhooks.forEach(w => {
        const status = w.status.toLowerCase()
        if (counts[status] !== undefined) {
          counts[status]++
        }
      })
      return counts
    }

    const allStats = countByStatus(webhooks)
    const weekStats = countByStatus(weekWebhooks)

    // 4. Calculer les montants
    const calculateVolume = (webhooks: any[]) => {
      return webhooks.reduce((sum, w) => {
        return sum + (parseFloat(w.transaction_amount) || 0)
      }, 0)
    }

    const todayVolume = calculateVolume(todayWebhooks)
    const yesterdayVolume = calculateVolume(yesterdayWebhooks)
    const weekVolume = calculateVolume(weekWebhooks)
    const monthVolume = calculateVolume(monthWebhooks)

    // 5. Calculer les taux de succès
    const calculateSuccessRate = (webhooks: any[]) => {
      if (webhooks.length === 0) return 100
      const successful = webhooks.filter(w => w.status.toLowerCase() === 'successful').length
      return Math.round((successful / webhooks.length) * 100 * 10) / 10
    }

    const weekSuccessRate = calculateSuccessRate(weekWebhooks)
    const monthSuccessRate = calculateSuccessRate(monthWebhooks)

    // 6. Calculer les pourcentages de variation
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 10) / 10
    }

    const volumeChange = calculatePercentageChange(todayVolume, yesterdayVolume)

    // 7. Récupérer les transactions récentes de PRODUCTION uniquement
    // On récupère 500 transactions pour avoir assez d'entrées et sorties
    const { data: allRecentTransactions, error: recentError } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(500) // Prendre beaucoup plus pour avoir assez d'entrées

    if (recentError) {
      console.error('Error fetching recent transactions:', recentError)
    }

    // Filtrer uniquement production et limiter à 100 pour garantir d'avoir les entrées (positions #77-86)
    const recentTransactions = (allRecentTransactions || [])
      .filter(w => !w.environment || w.environment.toLowerCase() === 'production')
      .slice(0, 100) // Augmenté de 50 à 100 pour inclure les entrées

    // 8. Récupérer les transactions failed de PRODUCTION qui nécessitent une action
    const { data: allFailedTransactions, error: failedError } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .eq('status', 'failed')
      .order('received_at', { ascending: false })
      .limit(50) // Prendre plus pour filtrer ensuite

    if (failedError) {
      console.error('Error fetching failed transactions:', failedError)
    }

    // Filtrer uniquement production
    const failedTransactions = (allFailedTransactions || [])
      .filter(w => !w.environment || w.environment.toLowerCase() === 'production')
      .slice(0, 10)

    // 9. Statistiques par jour (7 derniers jours)
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayWebhooks = webhooks.filter(w => {
        const wDate = new Date(w.received_at)
        return wDate >= date && wDate < nextDate
      })

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        total: dayWebhooks.length,
        successful: dayWebhooks.filter(w => w.status.toLowerCase() === 'successful').length,
        failed: dayWebhooks.filter(w => w.status.toLowerCase() === 'failed').length,
        pending: dayWebhooks.filter(w =>
          w.status.toLowerCase() === 'pending' || w.status.toLowerCase() === 'in progress'
        ).length,
        volume: calculateVolume(dayWebhooks)
      })
    }

    // 10. Retourner les stats
    return NextResponse.json({
      success: true,
      stats: {
        // Compteurs globaux
        total: webhooks.length,
        totalSuccessful: allStats.successful,
        totalFailed: allStats.failed,
        totalPending: allStats.pending + allStats['in progress'],
        totalCancelled: allStats.cancelled,

        // Stats de la semaine
        weekTotal: weekWebhooks.length,
        weekSuccessful: weekStats.successful,
        weekFailed: weekStats.failed,
        weekPending: weekStats.pending + weekStats['in progress'],
        weekSuccessRate,

        // Stats du mois
        monthTotal: monthWebhooks.length,
        monthSuccessRate,

        // Volumes
        todayVolume,
        yesterdayVolume,
        weekVolume,
        monthVolume,
        volumeChange, // Pourcentage de variation aujourd'hui vs hier

        // Transactions récentes
        recentTransactions: recentTransactions || [],

        // Alertes (transactions failed)
        failedTransactions: failedTransactions || [],
        failedCount: allStats.failed,

        // Stats quotidiennes
        dailyStats,
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in /api/admin/webhooks/stats:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
