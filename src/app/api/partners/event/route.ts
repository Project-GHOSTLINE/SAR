/**
 * POST /api/partners/event
 *
 * Tracking d'événements partenaires (shares, clicks, etc.)
 *
 * Rate-limiting:
 * - Max 60 events par partenaire par heure
 * - Détection doublons (même partner + event + jour + IP)
 *
 * Auth: Cookie httpOnly (sb-access-token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { EventSchema, type EventResponse } from '@/types/partners'
import {
  hashValue,
  calculateDuplicateCheckKey,
  isDuplicateEvent
} from '@/lib/partners-helpers'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseServer()

  try {
    // ============================================
    // 1. Authentification via cookie
    // ============================================

    const accessToken = request.cookies.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Non authentifié'
        },
        { status: 401 }
      )
    }

    // Créer client Supabase avec auth du user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    })

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalide'
        },
        { status: 401 }
      )
    }

    // ============================================
    // 2. Récupérer le partner_id via user_id
    // ============================================

    const { data: profile } = await supabaseAdmin
      .from('partner_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Profil partenaire introuvable'
        },
        { status: 404 }
      )
    }

    const partnerId = profile.id

    // ============================================
    // 3. Rate-limiting (60 events/heure par partner)
    // ============================================

    const rateLimitResult = checkRateLimit(`partner_event:${partnerId}`, {
      maxRequests: 60,
      windowMs: 60 * 60 * 1000 // 1 heure
    })

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // ============================================
    // 4. Parse et valide le body
    // ============================================

    const body = await request.json()
    const validation = EventSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { event_type, ref_code, metadata } = validation.data

    // ============================================
    // 5. Anti-fraude: Hash IP + UA
    // ============================================

    const clientIP = getClientIP(request.headers)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const ipHash = hashValue(clientIP)
    const uaHash = hashValue(userAgent)

    // ============================================
    // 6. Détection doublons (même partner + event + jour + IP)
    // ============================================

    const duplicateCheckKey = calculateDuplicateCheckKey(partnerId, event_type, ipHash)
    const isDuplicate = await isDuplicateEvent(duplicateCheckKey)

    let isSuspicious = false

    // Si doublon détecté, on log quand même mais on marque suspicious
    if (isDuplicate) {
      isSuspicious = true
    }

    // ============================================
    // 7. Créer l'événement
    // ============================================

    const { data: event, error: eventError } = await supabaseAdmin
      .from('partner_events')
      .insert({
        partner_id: partnerId,
        event_type,
        ref_code: ref_code || null,
        ip_hash: ipHash,
        ua_hash: uaHash,
        metadata: metadata || null,
        is_suspicious: isSuspicious,
        duplicate_check_key: duplicateCheckKey
      })
      .select()
      .single()

    if (eventError || !event) {
      console.error('Erreur création event:', eventError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de l\'enregistrement de l\'événement'
        },
        { status: 500 }
      )
    }

    // ============================================
    // 8. Mettre à jour last_activity_at du profil
    // ============================================

    await supabaseAdmin
      .from('partner_profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', partnerId)

    // ============================================
    // 9. Response
    // ============================================

    const response: EventResponse = {
      success: true,
      event_id: event.id,
      message: isSuspicious
        ? 'Événement enregistré (possiblement en doublon)'
        : 'Événement enregistré avec succès'
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Erreur tracking event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors du tracking'
      },
      { status: 500 }
    )
  }
}
