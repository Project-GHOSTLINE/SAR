import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

const JWT_SECRET = process.env.JWT_SECRET!

// Verifier le token JWT
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return false

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    await jwtVerify(token.value, secret)
    return true
  } catch {
    return false
  }
}

// Generer reference unique
function generateReference(id: number | string) {
  return `SAR-${id.toString().padStart(6, '0')}`
}

// GET - Recuperer tous les messages avec emails et notes
async function handleGET(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100

    // Si on demande un message specifique avec ses emails/notes
    if (messageId) {
      console.log(`[Messages API] Fetching details for message ID: ${messageId}`)

      // Fetch emails for this message
      const { data: emails, error: emailsError } = await supabase
        .from('emails_envoyes')
        .select('*')
        .eq('message_id', parseInt(messageId))
        .order('created_at', { ascending: false })

      if (emailsError) {
        console.error('[Messages API] Emails error:', emailsError)
        return NextResponse.json({
          error: 'Erreur lors de la récupération des emails',
          details: emailsError.message
        }, { status: 500 })
      }

      // Fetch notes for this message
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('message_id', parseInt(messageId))
        .order('created_at', { ascending: false })

      if (notesError) {
        console.error('[Messages API] Notes error:', notesError)
        return NextResponse.json({
          error: 'Erreur lors de la récupération des notes',
          details: notesError.message
        }, { status: 500 })
      }

      // Format response
      const formattedEmails = (emails || []).map(e => ({
        id: e.id.toString(),
        messageId: messageId,
        type: e.type,
        to: e.destinataire,
        subject: e.sujet,
        content: e.contenu,
        sentBy: e.envoye_par,
        date: e.created_at
      }))

      const formattedNotes = (notes || []).map(n => ({
        id: n.id.toString(),
        messageId: messageId,
        from: n.de,
        to: n.a,
        content: n.contenu,
        date: n.created_at
      }))

      return NextResponse.json({
        emails: formattedEmails,
        notes: formattedNotes
      })
    }

    // Build query for all messages
    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: messages, error, count } = await query

    if (error) {
      console.error('Messages error:', error)
      throw error
    }

    // Get counts of emails and notes for each message
    const messageIds = messages?.map(m => m.id) || []

    let emailCounts: Record<number, number> = {}
    let noteCounts: Record<number, number> = {}

    if (messageIds.length > 0) {
      // Get email counts
      const { data: emailCountsData } = await supabase
        .from('emails_envoyes')
        .select('message_id')
        .in('message_id', messageIds)

      emailCountsData?.forEach(e => {
        emailCounts[e.message_id] = (emailCounts[e.message_id] || 0) + 1
      })

      // Get note counts
      const { data: noteCountsData } = await supabase
        .from('notes')
        .select('message_id')
        .in('message_id', messageIds)

      noteCountsData?.forEach(n => {
        noteCounts[n.message_id] = (noteCounts[n.message_id] || 0) + 1
      })
    }

    // Format messages
    const formattedMessages = (messages || []).map((m: any) => ({
      id: m.id.toString(),
      nom: m.nom,
      email: m.email,
      telephone: m.telephone,
      question: m.question,
      date: m.created_at,
      lu: m.lu,
      status: m.status,
      reference: m.reference || generateReference(m.id),
      assigned_to: m.assigned_to,
      assigned_at: m.assigned_at,
      assigned_by: m.assigned_by,
      system_responded: m.system_responded,
      email_count: emailCounts[m.id] || 0,
      note_count: noteCounts[m.id] || 0
    }))

    // Count unread messages
    const { count: unreadCount } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('lu', false)

    return NextResponse.json({
      messages: formattedMessages,
      total: count || 0,
      nonLus: unreadCount || 0
    })
  } catch (error) {
    console.error('[Messages API] Error fetching messages:', error)
    console.error('[Messages API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: 'Erreur serveur',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}

export const GET = withPerf('admin/messages', handleGET)

// POST - Ajouter un message (appele par l'API contact)
async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, email, telephone, question } = body

    const supabase = getSupabaseServer()

    // Inserer le message
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        nom,
        email,
        telephone,
        question,
        lu: false,
        status: 'nouveau'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    // Creer l'email de confirmation automatique
    const reference = generateReference(data.id)
    const prenom = nom.split(' ')[0]

    // Email de confirmation au client
    await supabase
      .from('emails_envoyes')
      .insert({
        message_id: data.id,
        type: 'system',
        destinataire: email,
        sujet: `Confirmation de votre demande #${reference}`,
        contenu: `Bonjour ${prenom},

Nous avons bien recu votre demande.

Votre numero de reference: #${reference}

Notre equipe traite votre demande et vous contactera dans les 24-48h ouvrables.

Cordialement,
L'equipe Solution Argent Rapide`,
        envoye_par: 'system'
      })

    // Notification interne a l'equipe (perception)
    await supabase
      .from('emails_envoyes')
      .insert({
        message_id: data.id,
        type: 'system',
        destinataire: 'perception@solutionargentrapide.ca',
        sujet: `[NOUVELLE DEMANDE] ${nom} - #${reference}`,
        contenu: `Nouvelle demande recue:

Reference: #${reference}
Date: ${new Date().toLocaleString('fr-CA')}

CLIENT:
Nom: ${nom}
Email: ${email}
Telephone: ${telephone || 'Non fourni'}

MESSAGE:
${question}

---
Connectez-vous a l'admin pour repondre: /admin/dashboard`,
        envoye_par: 'system'
      })

    return NextResponse.json({ success: true, id: data.id, reference })
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const POST = withPerf('admin/messages', handlePOST)

// PATCH - Mettre a jour un message (lu, status)
async function handlePATCH(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status } = body
    const supabase = getSupabaseServer()

    const updateData: Record<string, unknown> = { lu: true }
    if (status) {
      updateData.status = status
    }

    const { error } = await supabase
      .from('contact_messages')
      .update(updateData)
      .eq('id', parseInt(id))

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const PATCH = withPerf('admin/messages', handlePATCH)

// DELETE - Supprimer un message (soft delete)
async function handleDELETE(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')

    if (!messageId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    // Soft delete: mettre deleted_at à NOW()
    const { error } = await supabase
      .from('contact_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parseInt(messageId))

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const DELETE = withPerf('admin/messages', handleDELETE)
