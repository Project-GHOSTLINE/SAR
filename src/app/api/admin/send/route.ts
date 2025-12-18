import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET!

// Verifier le token JWT
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')

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

// POST - Envoyer un email au client ou une note interne
export async function POST(request: NextRequest) {
  const isAuth = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, messageId, content, to, subject, from } = body

    const supabase = getSupabase()

    if (type === 'email') {
      // Envoyer un email au client
      const { data, error } = await supabase
        .from('emails_envoyes')
        .insert({
          message_id: parseInt(messageId),
          type: 'agent',
          destinataire: to,
          sujet: subject,
          contenu: content,
          envoye_par: from || 'admin'
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      // Mettre a jour le status du message si c'est nouveau
      await supabase
        .from('contact_messages')
        .update({ status: 'en_cours' })
        .eq('id', parseInt(messageId))
        .eq('status', 'nouveau')

      // TODO: Integrer un vrai service d'envoi d'email (Resend, SendGrid, etc.)
      // Pour l'instant on simule l'envoi
      console.log(`Email envoye a ${to}: ${subject}`)

      return NextResponse.json({
        success: true,
        email: {
          id: data.id.toString(),
          messageId: data.message_id.toString(),
          type: 'agent',
          to: data.destinataire,
          subject: data.sujet,
          content: data.contenu,
          sentBy: data.envoye_par,
          date: data.created_at
        }
      })
    } else if (type === 'note') {
      // Envoyer une note interne
      const { data, error } = await supabase
        .from('notes_internes')
        .insert({
          message_id: parseInt(messageId),
          de: from || 'admin',
          a: to,
          contenu: content
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        note: {
          id: data.id.toString(),
          messageId: data.message_id.toString(),
          from: data.de,
          to: data.a,
          content: data.contenu,
          date: data.created_at
        }
      })
    }

    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  } catch (error) {
    console.error('Error sending:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
