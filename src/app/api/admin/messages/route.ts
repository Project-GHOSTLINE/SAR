import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

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

// Creer le client Supabase
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Generer reference unique
function generateReference(id: number | string) {
  return `SAR-${id.toString().padStart(6, '0')}`
}

// GET - Recuperer tous les messages avec emails et notes
export async function GET(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    // Si on demande un message specifique avec ses emails/notes
    if (messageId) {
      const [emailsResult, notesResult] = await Promise.all([
        supabase
          .from('emails_envoyes')
          .select('*')
          .eq('message_id', parseInt(messageId))
          .order('created_at', { ascending: true }),
        supabase
          .from('notes_internes')
          .select('*')
          .eq('message_id', parseInt(messageId))
          .order('created_at', { ascending: true })
      ])

      return NextResponse.json({
        emails: (emailsResult.data || []).map(e => ({
          id: e.id.toString(),
          messageId: e.message_id.toString(),
          type: e.type,
          to: e.destinataire,
          subject: e.sujet,
          content: e.contenu,
          sentBy: e.envoye_par,
          date: e.created_at
        })),
        notes: (notesResult.data || []).map(n => ({
          id: n.id.toString(),
          messageId: n.message_id.toString(),
          from: n.de,
          to: n.a,
          content: n.contenu,
          date: n.created_at
        }))
      })
    }

    // Recuperer tous les messages
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Compter les non lus
    const { count: nonLusCount } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('lu', false)

    // Formater les messages
    const formattedMessages = (messages || []).map(m => ({
      id: m.id.toString(),
      nom: m.nom,
      email: m.email,
      telephone: m.telephone,
      question: m.question,
      date: m.created_at,
      lu: m.lu,
      status: m.status || (m.lu ? 'traite' : 'nouveau'),
      reference: generateReference(m.id),
      // Métriques de connexion client
      client_ip: m.client_ip,
      client_user_agent: m.client_user_agent,
      client_device: m.client_device,
      client_browser: m.client_browser,
      client_os: m.client_os,
      client_timezone: m.client_timezone,
      client_language: m.client_language,
      client_screen_resolution: m.client_screen_resolution,
      referrer: m.referrer,
      utm_source: m.utm_source,
      utm_medium: m.utm_medium,
      utm_campaign: m.utm_campaign
    }))

    return NextResponse.json({
      messages: formattedMessages,
      total: messages?.length || 0,
      nonLus: nonLusCount || 0
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajouter un message (appele par l'API contact)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nom, email, telephone, question } = body

    const supabase = getSupabase()

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

// PATCH - Mettre a jour un message (lu, status)
export async function PATCH(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status } = body
    const supabase = getSupabase()

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
