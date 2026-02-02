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
 * GET /api/admin/devops/tasks/[id]
 * Récupère une tâche par ID avec ses commentaires
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()

    // Fetch task + comments en parallèle
    const [taskRes, commentsRes] = await Promise.all([
      supabase
        .from('devops_tasks')
        .select('*')
        .eq('id', params.id)
        .single(),
      supabase
        .from('devops_task_comments')
        .select('*')
        .eq('task_id', params.id)
        .order('created_at', { ascending: true })
    ])

    if (taskRes.error) {
      if (taskRes.error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 })
      }
      console.error('Erreur fetch task:', taskRes.error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({
      task: taskRes.data,
      comments: commentsRes.data || []
    })

  } catch (error) {
    console.error('Erreur API GET /devops/tasks/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/devops/tasks/[id]
 * Modifier une tâche
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()
    const body = await request.json()

    // Préparer les données à mettre à jour
    const updateData: any = { ...body }

    // Auto-set completed_at si status passe à 'done'
    if (body.status === 'done' && !body.completed_at) {
      updateData.completed_at = new Date().toISOString()
    }

    // Reset completed_at si status n'est plus 'done'
    if (body.status && body.status !== 'done') {
      updateData.completed_at = null
    }

    // Auto-set assigned_at si assigned_to change
    if (body.assigned_to !== undefined) {
      if (body.assigned_to) {
        // Vérifier si l'assignation a changé
        const { data: currentTask } = await supabase
          .from('devops_tasks')
          .select('assigned_to')
          .eq('id', params.id)
          .single()

        if (currentTask && currentTask.assigned_to !== body.assigned_to) {
          updateData.assigned_at = new Date().toISOString()
        }
      } else {
        // Désassigner
        updateData.assigned_at = null
      }
    }

    const { data: task, error } = await supabase
      .from('devops_tasks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur update task:', error)
      return NextResponse.json({ error: 'Erreur update', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ task })

  } catch (error) {
    console.error('Erreur API PATCH /devops/tasks/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/devops/tasks/[id]
 * Supprimer une tâche
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()

    const { error } = await supabase
      .from('devops_tasks')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Erreur delete task:', error)
      return NextResponse.json({ error: 'Erreur delete', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur API DELETE /devops/tasks/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
