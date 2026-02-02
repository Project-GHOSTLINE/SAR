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
 * POST /api/admin/devops/comments
 * Ajouter un commentaire à une tâche
 */
export async function POST(request: NextRequest) {
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()
    const body = await request.json()

    // Validation
    if (!body.task_id || !body.user_name || !body.comment) {
      return NextResponse.json(
        { error: 'Champs requis manquants: task_id, user_name, comment' },
        { status: 400 }
      )
    }

    const { data: comment, error } = await supabase
      .from('devops_task_comments')
      .insert({
        task_id: body.task_id,
        user_name: body.user_name,
        user_email: body.user_email || null,
        comment: body.comment,
        is_internal: body.is_internal || false
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création comment:', error)
      return NextResponse.json({ error: 'Erreur création', details: error.message }, { status: 500 })
    }

    // Update task's last_activity_at
    await supabase
      .from('devops_tasks')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', body.task_id)

    return NextResponse.json({ comment }, { status: 201 })

  } catch (error) {
    console.error('Erreur API POST /devops/comments:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
