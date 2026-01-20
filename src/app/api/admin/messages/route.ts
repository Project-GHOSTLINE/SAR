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

    // Si on demande un message specifique avec ses emails/notes
    // OPTIMIZED: Use RPC function (1 query instead of 2)
    if (messageId) {
      const { data, error } = await supabase
        .rpc('get_message_emails_and_notes', {
          p_message_id: parseInt(messageId)
        })

      if (error) {
        console.error('RPC error:', error)
        throw error
      }

      // Group results by email/note
      const emails: any[] = []
      const notes: any[] = []

      data?.forEach((row: any) => {
        if (row.email_id && !emails.find(e => e.id === row.email_id.toString())) {
          emails.push({
            id: row.email_id.toString(),
            messageId: messageId,
            type: row.email_type,
            to: row.email_to,
            subject: row.email_subject,
            content: row.email_content,
            sentBy: row.email_sent_by,
            date: row.email_date
          })
        }
        if (row.note_id && !notes.find(n => n.id === row.note_id.toString())) {
          notes.push({
            id: row.note_id.toString(),
            messageId: messageId,
            from: row.note_from,
            to: row.note_to,
            content: row.note_content,
            date: row.note_date
          })
        }
      })

      return NextResponse.json({ emails, notes })
    }

    // OPTIMIZED: Use RPC function (1 query instead of 2 + N)
    const { data: messages, error } = await supabase
      .rpc('get_messages_with_details', {
        p_limit: 100,
        p_offset: 0
      })

    if (error) {
      console.error('RPC error:', error)
      throw error
    }

    // Format messages (RPC already returns most fields in correct format)
    const formattedMessages = (messages || []).map((m: any) => ({
      id: m.message_id.toString(),
      nom: m.nom,
      email: m.email,
      telephone: m.telephone,
      question: m.question,
      date: m.created_at,
      lu: m.lu,
      status: m.status,
      reference: m.reference,
      assigned_to: m.assigned_to,
      assigned_at: m.assigned_at,
      assigned_by: m.assigned_by,
      system_responded: m.system_responded,
      // Counts from RPC
      email_count: m.email_count,
      note_count: m.note_count
    }))

    // Get total_unread from first row (or 0 if no messages)
    const totalUnread = messages?.[0]?.total_unread || 0

    return NextResponse.json({
      messages: formattedMessages,
      total: messages?.length || 0,
      nonLus: totalUnread
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
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
