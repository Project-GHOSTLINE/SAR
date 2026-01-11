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

// GET /api/admin/support/tickets
// Récupérer tous les tickets avec filtres optionnels
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

    const { searchParams } = new URL(request.url)

    // Filtres optionnels
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const created_by = searchParams.get('created_by')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Query de base
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .limit(limit)

    // Appliquer les filtres
    if (status) {
      query = query.eq('status', status)
    }

    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        query = query.is('assigned_to', null)
      } else {
        query = query.eq('assigned_to', assigned_to)
      }
    }

    if (created_by) {
      query = query.eq('created_by', created_by)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error('Erreur récupération tickets:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Calculer les stats
    const stats = {
      nouveau: tickets?.filter(t => t.status === 'nouveau').length || 0,
      en_cours: tickets?.filter(t => t.status === 'en_cours').length || 0,
      resolu: tickets?.filter(t => t.status === 'resolu').length || 0,
      ferme: tickets?.filter(t => t.status === 'ferme').length || 0,
      total: tickets?.length || 0
    }

    return NextResponse.json({
      tickets: tickets || [],
      stats,
      total: tickets?.length || 0
    })

  } catch (error) {
    console.error('Erreur API GET /support/tickets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/support/tickets
// Créer un nouveau ticket
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
      created_by,
      created_by_email,
      title,
      description,
      category,
      priority = 'medium',
      browser_info,
      system_info,
      console_logs,
      connection_tests,
      page_url
    } = body

    if (!created_by || !created_by_email || !title || !description || !category) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Générer le ticket number
    const { data: ticketNumberData, error: ticketNumberError } = await supabase
      .rpc('generate_ticket_number')

    if (ticketNumberError) {
      console.error('Erreur génération ticket number:', ticketNumberError)
      // Fallback: générer manuellement
      const { data: lastTicket } = await supabase
        .from('support_tickets')
        .select('ticket_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastTicket?.ticket_number
        ? parseInt(lastTicket.ticket_number.split('-')[1]) || 0
        : 0

      const ticketNumber = `SUP-${String(lastNumber + 1).padStart(6, '0')}`

      // Créer le ticket
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          created_by,
          created_by_email,
          title,
          description,
          category,
          priority,
          status: 'nouveau',
          browser_info,
          system_info,
          console_logs,
          connection_tests,
          page_url
        })
        .select()
        .single()

      if (error) {
        console.error('Erreur création ticket:', error)
        return NextResponse.json({ error: 'Erreur création ticket' }, { status: 500 })
      }

      return NextResponse.json({ ticket, ticket_number: ticketNumber }, { status: 201 })
    }

    // Créer le ticket avec le numéro généré
    const ticketNumber = ticketNumberData as string

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        created_by,
        created_by_email,
        title,
        description,
        category,
        priority,
        status: 'nouveau',
        browser_info,
        system_info,
        console_logs,
        connection_tests,
        page_url
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création ticket:', error)
      return NextResponse.json({ error: 'Erreur création ticket' }, { status: 500 })
    }

    // TODO: Envoyer les emails de notification
    // - Email de confirmation à l'employé
    // - Email de notification à Anthony et Frederic

    return NextResponse.json({ ticket, ticket_number: ticketNumber }, { status: 201 })

  } catch (error) {
    console.error('Erreur API POST /support/tickets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
