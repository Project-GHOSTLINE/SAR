import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

// Vérifier l'authentification admin
async function verifyAdminAuth(request: NextRequest) {
  const token = request.cookies.get('admin-session')?.value

  if (!token) {
    return null
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch {
    return null
  }
}

// GET /api/admin/support/stats
// Récupérer les statistiques du système de support
export async function GET(request: NextRequest) {
  // Vérifier l'authentification
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Récupérer tous les tickets actifs (non fermés)
    const { data: allTickets, error: allError } = await supabase
      .from('support_tickets')
      .select('*')

    if (allError) {
      console.error('Erreur récupération tickets:', allError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const tickets = allTickets || []

    // Statistiques par statut
    const stats = {
      total: tickets.length,
      nouveau: tickets.filter(t => t.status === 'nouveau').length,
      en_cours: tickets.filter(t => t.status === 'en_cours').length,
      resolu: tickets.filter(t => t.status === 'resolu').length,
      ferme: tickets.filter(t => t.status === 'ferme').length
    }

    // Statistiques par assignation
    const assignmentStats = {
      'Anthony Rosa': tickets.filter(t => t.assigned_to === 'Anthony Rosa' && t.status !== 'ferme').length,
      'Frederic Rosa': tickets.filter(t => t.assigned_to === 'Frederic Rosa' && t.status !== 'ferme').length,
      unassigned: tickets.filter(t => !t.assigned_to && t.status !== 'ferme').length
    }

    // Statistiques par catégorie
    const categoryStats: Record<string, number> = {}
    tickets.forEach(t => {
      if (!categoryStats[t.category]) {
        categoryStats[t.category] = 0
      }
      categoryStats[t.category]++
    })

    // Statistiques par priorité
    const priorityStats = {
      urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'ferme').length,
      high: tickets.filter(t => t.priority === 'high' && t.status !== 'ferme').length,
      medium: tickets.filter(t => t.priority === 'medium' && t.status !== 'ferme').length,
      low: tickets.filter(t => t.priority === 'low' && t.status !== 'ferme').length
    }

    // Temps moyen de résolution (en heures)
    const resolvedTickets = tickets.filter(t => t.resolved_at && t.created_at)
    let avgResolutionTime = 0

    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc, t) => {
        const created = new Date(t.created_at).getTime()
        const resolved = new Date(t.resolved_at).getTime()
        return acc + (resolved - created)
      }, 0)

      // Convertir en heures
      avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60)
    }

    // Tickets récents (derniers 7 jours)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentTickets = tickets.filter(t => {
      const created = new Date(t.created_at)
      return created >= sevenDaysAgo
    })

    // Statistiques par employé (qui crée le plus de tickets)
    const employeeStats: Record<string, number> = {}
    tickets.forEach(t => {
      if (!employeeStats[t.created_by]) {
        employeeStats[t.created_by] = 0
      }
      employeeStats[t.created_by]++
    })

    return NextResponse.json({
      stats,
      assignmentStats,
      categoryStats,
      priorityStats,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Arrondir à 1 décimale
      recentTickets: recentTickets.length,
      employeeStats,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur API GET /support/stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
