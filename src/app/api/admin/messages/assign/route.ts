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
 * POST /api/admin/messages/assign
 * Assigner un message à un collègue (Sandra, Michel, etc.)
 */
export async function POST(request: NextRequest) {
  const { isAuth, email } = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { messageId, assignTo } = body

    if (!messageId || !assignTo) {
      return NextResponse.json(
        { error: 'messageId et assignTo sont requis' },
        { status: 400 }
      )
    }

    // Valider que assignTo est un collègue valide
    const validColleagues = ['Sandra', 'Michel', 'Unassigned']
    if (!validColleagues.includes(assignTo)) {
      return NextResponse.json(
        { error: `assignTo doit être: ${validColleagues.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Préparer les données de mise à jour
    const updateData: Record<string, any> = {
      assigned_at: new Date().toISOString(),
      assigned_by: email
    }

    // Si "Unassigned", mettre null
    if (assignTo === 'Unassigned') {
      updateData.assigned_to = null
      updateData.assigned_at = null
      updateData.assigned_by = null
    } else {
      updateData.assigned_to = assignTo
    }

    // Mettre à jour le message
    const { error } = await supabase
      .from('contact_messages')
      .update(updateData)
      .eq('id', parseInt(messageId))

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

    // Créer une note interne pour tracer l'assignation
    if (assignTo !== 'Unassigned') {
      await supabase
        .from('notes_internes')
        .insert({
          message_id: parseInt(messageId),
          de: email,
          a: assignTo,
          contenu: `Message assigné à ${assignTo} par ${email}`
        })
    }

    return NextResponse.json({
      success: true,
      message: assignTo === 'Unassigned'
        ? 'Message désassigné'
        : `Message assigné à ${assignTo}`
    })
  } catch (error) {
    console.error('Error assigning message:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/messages/assign/stats
 * Récupérer les statistiques d'assignation
 */
export async function GET(request: NextRequest) {
  const { isAuth } = await verifyAuth()

  if (!isAuth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Calculer le début du mois actuel
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayISO = firstDayOfMonth.toISOString()

    // Calculer le début de la journée à 00:01
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 0)
    const startOfTodayISO = startOfToday.toISOString()

    // Récupérer tous les messages DU MOIS EN COURS avec leurs infos
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('id, assigned_to, system_responded, lu, created_at')
      .gte('created_at', firstDayISO)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Calculer les stats du mois
    const totalDuMois = messages?.length || 0

    // Réponses envoyées avec succès = messages où system_responded = true
    const reponsesEnvoyees = messages?.filter(m => m.system_responded).length || 0

    // Acheminés à Sandra
    const acheminesSandra = messages?.filter(m => m.assigned_to === 'Sandra').length || 0

    // Acheminés à Michel
    const acheminesMichel = messages?.filter(m => m.assigned_to === 'Michel').length || 0

    // Non acheminés = pas d'assigned_to
    const nonAchemines = messages?.filter(m => !m.assigned_to).length || 0

    // Réponses non envoyées (échec)
    const reponsesNonEnvoyees = messages?.filter(m => !m.system_responded).length || 0

    // Dates des derniers messages par catégorie
    const lastAll = messages?.[0]?.created_at || null
    const lastReponse = messages?.filter(m => m.system_responded)[0]?.created_at || null
    const lastSandra = messages?.filter(m => m.assigned_to === 'Sandra')[0]?.created_at || null
    const lastMichel = messages?.filter(m => m.assigned_to === 'Michel')[0]?.created_at || null
    const lastNone = messages?.filter(m => !m.assigned_to)[0]?.created_at || null

    // Compter les messages supprimés aujourd'hui (depuis 00:01)
    // NOTE: Temporairement désactivé jusqu'à ce que la migration soit exécutée
    const deletedToday = 0

    // Stats détaillées par collègue (pour la carte d'assignations)
    const byColleague: Record<string, number> = {
      Sandra: acheminesSandra,
      Michel: acheminesMichel
    }

    return NextResponse.json({
      success: true,
      stats: {
        // Total du mois
        totalDuMois,

        // Réponses envoyées
        reponsesEnvoyees,
        reponsesNonEnvoyees,

        // Acheminements
        acheminesSandra,
        acheminesMichel,
        nonAchemines,

        // Messages supprimés aujourd'hui
        deletedToday: deletedToday || 0,

        // Dates des derniers messages
        lastAll,
        lastReponse,
        lastSandra,
        lastMichel,
        lastNone,

        // Pour compatibilité avec l'ancienne structure
        total: totalDuMois,
        byColleague
      }
    })
  } catch (error) {
    console.error('Error fetching assignment stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
