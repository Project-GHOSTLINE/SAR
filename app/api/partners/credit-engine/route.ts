/**
 * POST /api/partners/credit-engine
 *
 * Calcul et attribution des crédits partenaires (trigger manuel MVP)
 *
 * Flow:
 * 1. Récupère toutes les attributions sans crédit attribué
 * 2. Applique les règles de crédits (application_submitted: +10, ibv_completed: +15, funded: +50)
 * 3. Vérifie le plafond de 150 crédits/30 jours
 * 4. Crée les entrées dans partner_credit_ledger
 * 5. Idempotent: même attribution ne génère qu'un seul crédit
 *
 * Auth: Admin secret (pour trigger manuel MVP)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'
import { CreditEngineSchema, type CreditEngineResponse } from '@/types/partners'
import { CREDIT_RULES, CREDIT_CAP_30_DAYS, hasReachedCreditCap } from '@/lib/partners-helpers'

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer()

  try {
    // ============================================
    // 1. Validation admin_secret
    // ============================================

    const body = await request.json()
    const validation = CreditEngineSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { admin_secret, dry_run } = validation.data

    // Vérifier le secret admin (variable d'environnement)
    const expectedSecret = process.env.ADMIN_SECRET || process.env.JWT_SECRET

    if (!expectedSecret || admin_secret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accès refusé: secret invalide'
        },
        { status: 403 }
      )
    }

    // ============================================
    // 2. Récupérer les attributions éligibles pour crédits
    // ============================================

    // Récupérer toutes les attributions
    const { data: attributions, error: attrError } = await supabase
      .from('partner_attributions')
      .select('*')
      .order('created_at', { ascending: true })

    if (attrError) {
      console.error('Erreur récupération attributions:', attrError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur récupération des attributions'
        },
        { status: 500 }
      )
    }

    // ============================================
    // 3. Pour chaque attribution, vérifier si crédit déjà attribué
    // ============================================

    let processedCount = 0
    let creditsAwarded = 0
    const errors: Array<{ partner_id: string; error: string }> = []

    for (const attribution of attributions || []) {
      try {
        // Déterminer les crédits à attribuer selon le status
        const creditsToAward: Array<{
          source_type: string
          amount: number
          reason: string
        }> = []

        // Application submitted
        if (attribution.status === 'submitted' || attribution.status === 'ibv_completed' || attribution.status === 'funded') {
          creditsToAward.push({
            source_type: 'application_submitted',
            amount: CREDIT_RULES.application_submitted,
            reason: `Demande soumise (application_id: ${attribution.application_id})`
          })
        }

        // IBV completed
        if (attribution.status === 'ibv_completed' || attribution.status === 'funded') {
          creditsToAward.push({
            source_type: 'ibv_completed',
            amount: CREDIT_RULES.ibv_completed,
            reason: `Vérification bancaire complétée (application_id: ${attribution.application_id})`
          })
        }

        // Funded
        if (attribution.status === 'funded') {
          creditsToAward.push({
            source_type: 'funded',
            amount: CREDIT_RULES.funded,
            reason: `Prêt financé - ${attribution.funded_amount}$ (application_id: ${attribution.application_id})`
          })
        }

        // Pour chaque crédit à attribuer
        for (const credit of creditsToAward) {
          // Vérifier si crédit déjà attribué (idempotence)
          const { data: existingCredit } = await supabase
            .from('partner_credit_ledger')
            .select('id')
            .eq('partner_id', attribution.partner_id)
            .eq('source_event_id', attribution.id)
            .eq('source_type', credit.source_type)
            .eq('is_void', false)
            .single()

          if (existingCredit) {
            // Crédit déjà attribué, skip
            continue
          }

          // Vérifier le plafond de crédits (30 jours)
          const hasReachedCap = await hasReachedCreditCap(attribution.partner_id)

          if (hasReachedCap) {
            errors.push({
              partner_id: attribution.partner_id,
              error: `Plafond de ${CREDIT_CAP_30_DAYS} crédits/30 jours atteint`
            })
            continue
          }

          // Dry run: ne pas insérer, juste compter
          if (dry_run) {
            processedCount++
            creditsAwarded += credit.amount
            continue
          }

          // Insérer dans le ledger
          const { error: ledgerError } = await supabase
            .from('partner_credit_ledger')
            .insert({
              partner_id: attribution.partner_id,
              source_event_id: attribution.id,
              source_type: credit.source_type,
              credit_amount: credit.amount,
              reason: credit.reason,
              created_by_system: 'credit-engine'
            })

          if (ledgerError) {
            console.error('Erreur insertion ledger:', ledgerError)
            errors.push({
              partner_id: attribution.partner_id,
              error: `Erreur insertion ledger: ${ledgerError.message}`
            })
            continue
          }

          processedCount++
          creditsAwarded += credit.amount
        }
      } catch (error) {
        console.error('Erreur traitement attribution:', attribution.id, error)
        errors.push({
          partner_id: attribution.partner_id,
          error: `Erreur traitement: ${error}`
        })
      }
    }

    // ============================================
    // 4. Response
    // ============================================

    const response: CreditEngineResponse = {
      success: true,
      processed_count: processedCount,
      credits_awarded: creditsAwarded,
      errors,
      dry_run: dry_run || false
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Erreur credit-engine:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur lors du calcul des crédits'
      },
      { status: 500 }
    )
  }
}
