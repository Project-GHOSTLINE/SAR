/**
 * GET /api/partners/me
 *
 * Dashboard data pour le partenaire authentifié
 *
 * Retourne un payload unique contenant:
 * - Infos partenaire (started_at, status, ref_code)
 * - État du projet (phase, participants, changelog)
 * - Cards d'impact (shares, clicks, applications, ibv, funded)
 * - Crédits (total, applied, available, next_apply_date)
 * - Timeline d'actions
 *
 * Auth: Cookie httpOnly (sb-access-token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import type { PartnerDashboard } from '@/types/partners'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseServer()

  try {
    // ============================================
    // 1. Authentification via cookie
    // ============================================

    const accessToken = request.cookies.get('sb-access-token')?.value
    const refreshToken = request.cookies.get('sb-refresh-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Non authentifié. Session expirée ou invalide.'
        },
        { status: 401 }
      )
    }

    // Créer client Supabase avec auth du user (pas service role)
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

    // Vérifier le user
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
    // 2. Récupérer le partner_profile via user_id
    // ============================================

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('partner_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
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
    // 3. Récupérer le ref_code
    // ============================================

    const { data: refLink } = await supabaseAdmin
      .from('partner_ref_links')
      .select('ref_code, full_url')
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .single()

    const refCode = refLink?.ref_code || 'N/A'

    // ============================================
    // 4. Calculer les impact_cards
    // ============================================

    // Count shares
    const { count: sharesCount } = await supabaseAdmin
      .from('partner_events')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .in('event_type', ['share_whatsapp', 'share_sms', 'share_messenger', 'share_copy'])

    // Count clicks
    const { count: clicksCount } = await supabaseAdmin
      .from('partner_events')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .eq('event_type', 'click_referral')

    // Count applications
    const { count: applicationsCount } = await supabaseAdmin
      .from('partner_attributions')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)

    // Count IBV completed
    const { count: ibvCount } = await supabaseAdmin
      .from('partner_attributions')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .in('status', ['ibv_completed', 'funded'])

    // Count funded
    const { count: fundedCount } = await supabaseAdmin
      .from('partner_attributions')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partnerId)
      .eq('status', 'funded')

    // ============================================
    // 5. Calculer les crédits
    // ============================================

    // Total crédits gagnés (non-void)
    const { data: ledgerEntries } = await supabaseAdmin
      .from('partner_credit_ledger')
      .select('credit_amount')
      .eq('partner_id', partnerId)
      .eq('is_void', false)

    const totalCredits = (ledgerEntries || []).reduce(
      (sum, entry) => sum + Number(entry.credit_amount),
      0
    )

    // Crédits appliqués
    const { data: adjustments } = await supabaseAdmin
      .from('partner_balance_adjustments')
      .select('amount')
      .eq('partner_id', partnerId)
      .eq('status', 'applied')

    const appliedCredits = (adjustments || []).reduce(
      (sum, adj) => sum + Number(adj.amount),
      0
    )

    // Available = total - applied
    const availableCredits = totalCredits - appliedCredits

    // Next apply date (placeholder MVP - À implémenter selon logique business)
    const nextApplyDate = availableCredits >= 10 ? new Date().toISOString() : null

    // ============================================
    // 6. Construire la timeline (20 dernières actions)
    // ============================================

    const { data: recentEvents } = await supabaseAdmin
      .from('partner_events')
      .select('event_type, created_at, metadata')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(20)

    const timeline = (recentEvents || []).map(event => ({
      type: event.event_type,
      at: event.created_at,
      label: getEventLabel(event.event_type),
      meta: event.metadata || undefined
    }))

    // ============================================
    // 7. État du projet (hardcodé MVP, peut être dynamique plus tard)
    // ============================================

    // Count total participants actifs
    const { count: totalParticipants } = await supabaseAdmin
      .from('partner_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const projectState = {
      phase: 'MVP - Phase test (500 partenaires)',
      updated_at: '2026-02-02T00:00:00Z',
      participants_active: totalParticipants || 0,
      changelog: [
        {
          date: '2026-02-02',
          change: 'Lancement du programme partenaires (MVP)'
        },
        {
          date: '2026-02-01',
          change: 'Invitation des 500 clients éligibles'
        }
      ]
    }

    // ============================================
    // 8. Construire le payload dashboard
    // ============================================

    const dashboard: PartnerDashboard = {
      partner: {
        started_at: profile.activated_at,
        status: profile.status,
        ref_code: refCode,
        preferred_channels: profile.preferred_channels || []
      },
      project_state: projectState,
      impact_cards: {
        shares: sharesCount || 0,
        clicks: clicksCount || 0,
        applications: applicationsCount || 0,
        ibv: ibvCount || 0,
        funded: fundedCount || 0
      },
      credits: {
        total: totalCredits,
        applied: appliedCredits,
        available: availableCredits,
        next_apply_date: nextApplyDate
      },
      timeline
    }

    return NextResponse.json(dashboard, { status: 200 })
  } catch (error) {
    console.error('Erreur récupération dashboard:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors de la récupération du dashboard'
      },
      { status: 500 }
    )
  }
}

/**
 * Mapper event_type -> label français
 */
function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    click_referral: 'Clic sur lien de référence',
    share_whatsapp: 'Partage WhatsApp',
    share_sms: 'Partage SMS',
    share_messenger: 'Partage Messenger',
    share_copy: 'Copie du lien',
    application_submitted: 'Demande soumise',
    ibv_completed: 'Vérification bancaire complétée',
    funded: 'Prêt financé'
  }

  return labels[eventType] || eventType
}
