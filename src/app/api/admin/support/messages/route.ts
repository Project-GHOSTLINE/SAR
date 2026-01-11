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

// POST /api/admin/support/messages
// Ajouter un message à un ticket
export async function POST(request: NextRequest) {
  // Vérifier l'authentification
  const isAuth = await verifyAdminAuth(request)
  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validation des champs requis
    const {
      ticket_id,
      sender_name,
      sender_email,
      sender_role, // 'employee' ou 'support'
      message,
      is_internal_note = false
    } = body

    if (!ticket_id || !sender_name || !sender_email || !sender_role || !message) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Validation du sender_role
    if (!['employee', 'support'].includes(sender_role)) {
      return NextResponse.json(
        { error: 'sender_role doit être "employee" ou "support"' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Vérifier que le ticket existe
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 })
    }

    // Créer le message
    const { data: newMessage, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id,
        sender_name,
        sender_email,
        sender_role,
        message,
        is_internal_note
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création message:', error)
      return NextResponse.json({ error: 'Erreur création message' }, { status: 500 })
    }

    // Si c'est un employé qui répond et que le ticket est 'en_cours', ne pas changer le statut
    // Si c'est le support qui répond et que le ticket est 'nouveau', passer à 'en_cours'
    if (sender_role === 'support' && ticket.status === 'nouveau') {
      await supabase
        .from('support_tickets')
        .update({ status: 'en_cours' })
        .eq('id', ticket_id)
    }

    // TODO: Envoyer notification email
    // - Si support répond: notifier l'employé
    // - Si employé répond: notifier le support assigné

    return NextResponse.json({ message: newMessage }, { status: 201 })

  } catch (error) {
    console.error('Erreur API POST /support/messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
