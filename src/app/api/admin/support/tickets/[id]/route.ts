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

// GET /api/admin/support/tickets/[id]
// Récupérer un ticket spécifique avec ses messages et attachments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Vérifier l'authentification
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Récupérer le ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 })
    }

    // Récupérer les messages
    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Erreur récupération messages:', messagesError)
    }

    // Récupérer les attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('support_attachments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (attachmentsError) {
      console.error('Erreur récupération attachments:', attachmentsError)
    }

    return NextResponse.json({
      ticket,
      messages: messages || [],
      attachments: attachments || []
    })

  } catch (error) {
    console.error('Erreur API GET /support/tickets/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/admin/support/tickets/[id]
// Mettre à jour un ticket (statut, assignment, résolution)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Vérifier l'authentification
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()

    const {
      status,
      assigned_to,
      priority,
      resolution_notes,
      resolved_by
    } = body

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Construire l'objet de mise à jour
    const updates: any = {}

    if (status !== undefined) {
      updates.status = status

      // Si status devient 'resolu', enregistrer la date et qui a résolu
      if (status === 'resolu' && !updates.resolved_at) {
        updates.resolved_at = new Date().toISOString()
        if (resolved_by) {
          updates.resolved_by = resolved_by
        }
      }

      // Si status devient 'ferme', enregistrer la date
      if (status === 'ferme' && !updates.closed_at) {
        updates.closed_at = new Date().toISOString()
      }
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to

      // Si assigné pour la première fois, enregistrer la date
      if (assigned_to && !updates.assigned_at) {
        updates.assigned_at = new Date().toISOString()
      }

      // Si on passe de 'nouveau' à assigné, changer le statut
      const { data: currentTicket } = await supabase
        .from('support_tickets')
        .select('status')
        .eq('id', id)
        .single()

      if (currentTicket && currentTicket.status === 'nouveau' && assigned_to) {
        updates.status = 'en_cours'
      }
    }

    if (priority !== undefined) {
      updates.priority = priority
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes
    }

    // Mettre à jour le ticket
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour ticket:', error)
      return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
    }

    // TODO: Envoyer notification email selon le changement
    // - Si assigné: notifier l'assigné
    // - Si résolu: notifier l'employé
    // - Si fermé: archiver

    return NextResponse.json({ ticket })

  } catch (error) {
    console.error('Erreur API PATCH /support/tickets/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
