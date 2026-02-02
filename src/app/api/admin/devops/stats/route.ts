import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

async function verifyAdminAuth(request: NextRequest) {
  const token = request.cookies.get('admin-session')?.value
  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch {
    return null
  }
}

/**
 * GET /api/admin/devops/stats
 * Récupère les statistiques DevOps agrégées
 */
export async function GET(request: NextRequest) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()

    // Call RPC function get_devops_stats()
    const { data: stats, error } = await supabase.rpc('get_devops_stats')

    if (error) {
      console.error('Erreur fetch stats:', error)
      return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 })
    }

    // RPC returns array with single object
    const statsData = stats && stats.length > 0 ? stats[0] : {
      total_tasks: 0,
      todo_count: 0,
      in_progress_count: 0,
      blocked_count: 0,
      done_count: 0,
      urgent_count: 0,
      high_priority_count: 0,
      overdue_count: 0,
      completed_this_week: 0,
      tasks_by_department: {},
      tasks_by_layer: {},
      tasks_by_assignee: {}
    }

    return NextResponse.json({ stats: statsData })

  } catch (error) {
    console.error('Erreur API GET /devops/stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
