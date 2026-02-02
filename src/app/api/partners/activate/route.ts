/**
 * POST /api/partners/activate
 *
 * Activation d'un partenaire via token d'invitation
 *
 * Flow:
 * 1. Valide token (non expiré, non utilisé)
 * 2. Crée user Supabase Auth (email: partner+<client_id>@solutionargentrapide.ca)
 * 3. Crée partner_profile (avec user_id)
 * 4. Génère ref_code unique
 * 5. Crée partner_ref_link
 * 6. Retourne session cookie httpOnly (Domain=.solutionargentrapide.ca)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { ActivateSchema, type ActivateResponse } from '@/types/partners'
import {
  generateUniqueRefCode,
  formatPartnerEmail,
  hashValue
} from '@/lib/partners-helpers'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()

  try {
    // Rate-limit: Max 5 tentatives par IP par heure
    const clientIP = getClientIP(request.headers)
    const rateLimitResult = checkRateLimit(`activate:${clientIP}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000 // 1 heure
    })

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Parse et valide le body
    const body = await request.json()
    const validation = ActivateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token invalide',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { token } = validation.data

    // ============================================
    // 1. Valider le token d'invitation
    // ============================================

    const { data: invite, error: inviteError } = await supabase
      .from('partner_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation introuvable ou invalide'
        },
        { status: 404 }
      )
    }

    // Vérifier si déjà utilisé
    if (invite.used_at) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cette invitation a déjà été utilisée'
        },
        { status: 400 }
      )
    }

    // Vérifier si expiré
    const now = new Date()
    const expiresAt = new Date(invite.expires_at)
    if (expiresAt < now) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cette invitation a expiré'
        },
        { status: 400 }
      )
    }

    // Vérifier si le client n'a pas déjà un profil partenaire
    const { data: existingProfile } = await supabase
      .from('partner_profiles')
      .select('id')
      .eq('client_id', invite.client_id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ce client a déjà un profil partenaire actif'
        },
        { status: 400 }
      )
    }

    // ============================================
    // 2. Créer user Supabase Auth
    // ============================================

    const partnerEmail = formatPartnerEmail(invite.client_id)
    const randomPassword = Math.random().toString(36).slice(-32) + Math.random().toString(36).slice(-32)

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: partnerEmail,
      password: randomPassword,
      email_confirm: true, // Confirmer automatiquement (pas d'email envoyé)
      user_metadata: {
        is_partner: true,
        client_id: invite.client_id,
        activated_via: 'invite_token'
      }
    })

    if (authError || !authUser.user) {
      console.error('Erreur création user Auth:', authError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la création du compte'
        },
        { status: 500 }
      )
    }

    const userId = authUser.user.id

    // ============================================
    // 3. Créer partner_profile
    // ============================================

    const consentIP = getClientIP(request.headers)
    const consentUA = request.headers.get('user-agent') || 'unknown'

    const { data: profile, error: profileError } = await supabase
      .from('partner_profiles')
      .insert({
        client_id: invite.client_id,
        user_id: userId,
        invite_id: invite.id,
        status: 'active',
        consent_accepted_at: new Date().toISOString(),
        consent_ip: consentIP,
        consent_ua: consentUA,
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError || !profile) {
      console.error('Erreur création profile:', profileError)

      // Rollback: supprimer le user Auth créé
      await supabase.auth.admin.deleteUser(userId)

      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la création du profil'
        },
        { status: 500 }
      )
    }

    // ============================================
    // 4. Générer ref_code unique
    // ============================================

    const refCode = await generateUniqueRefCode()

    // ============================================
    // 5. Créer partner_ref_link
    // ============================================

    const fullUrl = `https://solutionargentrapide.ca/apply?ref=${refCode}`

    const { error: refLinkError } = await supabase
      .from('partner_ref_links')
      .insert({
        partner_id: profile.id,
        ref_code: refCode,
        full_url: fullUrl,
        is_active: true
      })

    if (refLinkError) {
      console.error('Erreur création ref_link:', refLinkError)

      // Rollback complet
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('partner_profiles').delete().eq('id', profile.id)

      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la création du lien de référence'
        },
        { status: 500 }
      )
    }

    // ============================================
    // 6. Marquer l'invitation comme utilisée
    // ============================================

    await supabase
      .from('partner_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    // ============================================
    // 7. Créer session Supabase (via signIn)
    // ============================================

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: partnerEmail,
      password: randomPassword
    })

    if (sessionError || !sessionData.session) {
      console.error('Erreur création session:', sessionError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la création de la session'
        },
        { status: 500 }
      )
    }

    const accessToken = sessionData.session.access_token
    const refreshToken = sessionData.session.refresh_token

    // ============================================
    // 8. Retourner response avec cookie httpOnly
    // ============================================

    const response: ActivateResponse = {
      success: true,
      partner_id: profile.id,
      ref_code: refCode,
      message: 'Activation réussie. Bienvenue au projet Partners.'
    }

    const res = NextResponse.json(response, { status: 200 })

    // Cookie httpOnly sécurisé (Domain=.solutionargentrapide.ca)
    // Permet partage session entre solutionargentrapide.ca et partners.solutionargentrapide.ca
    res.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: true, // HTTPS uniquement
      sameSite: 'lax', // Protection CSRF (lax pour allow navigation depuis emails/liens)
      domain: '.solutionargentrapide.ca', // Partage sous-domaines
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    })

    res.cookies.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.solutionargentrapide.ca',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 jours
    })

    return res
  } catch (error) {
    console.error('Erreur activation partner:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors de l\'activation'
      },
      { status: 500 }
    )
  }
}
