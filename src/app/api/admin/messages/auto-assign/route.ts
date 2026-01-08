import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET!

// Vérifier le token JWT
async function verifyAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin-session')

  if (!token) return { isAuth: false, email: null }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token.value, secret)
    return { isAuth: true, email: payload.email as string }
  } catch {
    return { isAuth: false, email: null }
  }
}

// Créer le client Supabase
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * POST /api/admin/messages/auto-assign
 * Assigner automatiquement les messages en fonction des emails envoyés
 * - mrosa@... → Michel
 * - perception@... ou sandra@... → Sandra
 */
export async function POST(request: NextRequest) {
  const { isAuth, email } = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // 1. Récupérer tous les messages qui n'ont pas d'assignation
    const { data: messages, error: messagesError } = await supabase
      .from('contact_messages')
      .select('id')
      .is('assigned_to', null)

    if (messagesError) throw messagesError

    let assignedCount = 0
    let sandraCount = 0
    let michelCount = 0

    // 2. Pour chaque message, regarder les emails envoyés
    for (const message of messages || []) {
      const { data: emails, error: emailsError } = await supabase
        .from('emails_envoyes')
        .select('destinataire')
        .eq('message_id', message.id)
        .eq('type', 'system')

      if (emailsError) continue

      // 3. Détecter l'assignation selon le destinataire
      let assignTo: string | null = null

      for (const emailLog of emails || []) {
        const dest = emailLog.destinataire?.toLowerCase() || ''

        // Si envoyé à perception@ ou sandra@ → Sandra
        if (dest.includes('perception@') || dest.includes('sandra@')) {
          assignTo = 'Sandra'
          break
        }

        // Si envoyé à mrosa@ → Michel
        if (dest.includes('mrosa@')) {
          assignTo = 'Michel'
          break
        }
      }

      // 4. Si on a détecté une assignation, mettre à jour
      if (assignTo) {
        const { error: updateError } = await supabase
          .from('contact_messages')
          .update({
            assigned_to: assignTo,
            assigned_at: new Date().toISOString(),
            assigned_by: 'auto-system'
          })
          .eq('id', message.id)

        if (!updateError) {
          assignedCount++
          if (assignTo === 'Sandra') sandraCount++
          if (assignTo === 'Michel') michelCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${assignedCount} messages assignés automatiquement`,
      details: {
        total: assignedCount,
        sandra: sandraCount,
        michel: michelCount
      }
    })
  } catch (error) {
    console.error('Error auto-assigning messages:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
