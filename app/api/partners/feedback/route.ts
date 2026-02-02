/**
 * POST /api/partners/feedback
 *
 * Soumission feedback partenaire (facultatif, 3 questions max)
 * Auth: Cookie httpOnly (sb-access-token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getClientIP } from '@/lib/rate-limit'

const FeedbackSchema = z.object({
  answers: z.record(z.string(), z.any()),
  submitted_from: z.string().optional().default('web')
})

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
    // 3. Parse et valide le body
    // ============================================

    const body = await request.json()
    const validation = FeedbackSchema.safeParse(body)

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

    const { answers, submitted_from } = validation.data

    // ============================================
    // 4. Insérer le feedback
    // ============================================

    const clientIP = getClientIP(request.headers)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { error: insertError } = await supabaseAdmin
      .from('partner_feedback')
      .insert({
        partner_id: partnerId,
        answers,
        submitted_from,
        ip_address: clientIP,
        user_agent: userAgent
      })

    if (insertError) {
      console.error('Erreur insertion feedback:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la soumission du feedback'
        },
        { status: 500 }
      )
    }

    // ============================================
    // 5. Response
    // ============================================

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback soumis avec succès'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur feedback:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur'
      },
      { status: 500 }
    )
  }
}
