/**
 * 🚀 API Route: Submit Loan Application
 * Route principale pour soumettre une demande de prêt
 *
 * Flow complet:
 * 1. Rate limiting (3 par IP/heure)
 * 2. Validation complète (38 champs)
 * 3. Génération référence (SAR-LP-XXXXXX)
 * 4. Stockage Supabase (status: draft)
 * 5. Exécution Cortex (calcul score)
 * 6. Soumission à Margill
 * 7. Mise à jour status (submitted/failed)
 * 8. Email confirmation
 * 9. Logging métriques
 * 10. Retour résultat
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { LoanApplicationFormData, LoanApplication } from '@/lib/types/titan'
import { validateLoanApplication } from '@/lib/validators/margill-validation'
import { rateLimitFormSubmission } from '@/lib/utils/rate-limiter'
import { generateUniqueReference } from '@/lib/utils/reference-generator'
import {
  logFormCompleted,
  logMargillSuccess,
  logMargillFailure,
  logRateLimitHit,
  logValidationError,
} from '@/lib/utils/metrics-logger'
import { margillClient } from '@/lib/margill-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes max

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ============================================
    // 1. RÉCUPÉRER IP & DONNÉES
    // ============================================

    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const userAgent = request.headers.get('user-agent') || 'unknown'

    const body = (await request.json()) as LoanApplicationFormData

    // ============================================
    // 2. RATE LIMITING
    // ============================================

    const rateLimit = await rateLimitFormSubmission(clientIP)

    if (!rateLimit.allowed) {
      await logRateLimitHit(clientIP, '/api/applications/submit')
      return NextResponse.json(
        {
          success: false,
          error: 'Trop de demandes. Veuillez réessayer plus tard.',
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      )
    }

    // ============================================
    // 3. VALIDATION COMPLÈTE
    // ============================================

    const validation = validateLoanApplication(body)

    if (!validation.valid) {
      // Logger les erreurs de validation
      if (validation.errors) {
        for (const error of validation.errors) {
          await logValidationError(5, error.field, body.origin)
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          errors: validation.errors,
        },
        { status: 400 }
      )
    }

    // ============================================
    // 4. GÉNÉRER RÉFÉRENCE UNIQUE
    // ============================================

    const reference = await generateUniqueReference()

    // ============================================
    // 5. CRÉER DANS SUPABASE (STATUS: DRAFT)
    // ============================================

    const applicationData: Partial<LoanApplication> = {
      reference,
      origin: body.origin,
      status: 'draft',

      // Informations personnelles
      prenom: body.prenom,
      nom: body.nom,
      courriel: body.courriel,
      telephone: body.telephone,
      date_naissance: body.date_naissance,

      // Adresse
      adresse_rue: body.adresse_rue,
      adresse_ville: body.adresse_ville,
      adresse_province: body.adresse_province,
      adresse_code_postal: body.adresse_code_postal,
      duree_residence_mois: body.duree_residence_mois,
      type_logement: body.type_logement,

      // Montant et prêt
      montant_demande: body.montant_demande,
      raison_pret: body.raison_pret,
      duree_pret_mois: body.duree_pret_mois,

      // Emploi
      statut_emploi: body.statut_emploi,
      employeur: body.employeur,
      poste: body.poste,
      revenu_annuel: body.revenu_annuel,
      anciennete_emploi_mois: body.anciennete_emploi_mois,
      frequence_paie: body.frequence_paie,
      prochaine_paie: body.prochaine_paie,

      // Informations bancaires
      institution_financiere: body.institution_financiere,
      transit: body.transit,
      numero_compte: body.numero_compte,
      type_compte: body.type_compte,

      // Autres revenus
      autres_revenus: body.autres_revenus,
      source_autres_revenus: body.source_autres_revenus,

      // Dettes
      paiement_loyer_hypotheque: body.paiement_loyer_hypotheque,
      autres_prets: body.autres_prets,
      cartes_credit: body.cartes_credit,
      autres_dettes: body.autres_dettes,

      // Co-emprunteur
      coemprunteur_prenom: body.coemprunteur_prenom,
      coemprunteur_nom: body.coemprunteur_nom,
      coemprunteur_telephone: body.coemprunteur_telephone,
      coemprunteur_revenu: body.coemprunteur_revenu,

      // Références
      reference_1_nom: body.reference_1_nom,
      reference_1_telephone: body.reference_1_telephone,
      reference_1_relation: body.reference_1_relation,
      reference_2_nom: body.reference_2_nom,
      reference_2_telephone: body.reference_2_telephone,
      reference_2_relation: body.reference_2_relation,

      // Métadonnées
      ip_address: clientIP,
      user_agent: userAgent,
      form_completed_at: new Date().toISOString(),
      last_step_completed: 5,

      // Score Cortex (sera calculé après)
      cortex_score: 0,
      cortex_rules_applied: [],
    }

    const { data: application, error: insertError } = await supabase
      .from('loan_applications')
      .insert(applicationData)
      .select()
      .single()

    if (insertError || !application) {
      console.error('[SubmitAPI] Error inserting application:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur lors de la sauvegarde de votre demande. Veuillez réessayer.',
        },
        { status: 500 }
      )
    }

    // ============================================
    // 6. EXÉCUTER CORTEX (SCORING)
    // ============================================

    // TODO: Implémenter le moteur Cortex
    // Pour l'instant, score de base = 50
    let cortexScore = 50
    let riskLevel: 'low' | 'medium' | 'high' = 'medium'

    // Logique simple temporaire
    if (body.revenu_annuel && body.revenu_annuel >= 5000000) {
      cortexScore += 20
      riskLevel = 'low'
    }
    if (body.type_logement === 'proprietaire') {
      cortexScore += 15
    }
    if (
      body.autres_dettes &&
      body.revenu_annuel &&
      body.autres_dettes > body.revenu_annuel / 2
    ) {
      cortexScore -= 25
      riskLevel = 'high'
    }

    // Mettre à jour avec le score
    await supabase
      .from('loan_applications')
      .update({
        cortex_score: cortexScore,
        risk_level: riskLevel,
      })
      .eq('id', application.id)

    // ============================================
    // 7. SOUMETTRE À MARGILL
    // ============================================

    let margillSuccess = false
    let margillResponse = null
    let margillError = null
    let finalStatus: 'submitted' | 'failed' = 'failed'

    try {
      margillResponse = await margillClient.submitApplication(body)

      if (margillResponse.success) {
        margillSuccess = true
        finalStatus = 'submitted'
        await logMargillSuccess(
          body.origin,
          body.montant_demande,
          Date.now() - startTime
        )
      } else {
        margillError = margillResponse.error || 'Erreur inconnue de Margill'
        await logMargillFailure(body.origin, margillError)
      }
    } catch (error) {
      margillError =
        error instanceof Error ? error.message : 'Erreur de connexion à Margill'
      await logMargillFailure(body.origin, margillError)
    }

    // ============================================
    // 8. METTRE À JOUR STATUS
    // ============================================

    await supabase
      .from('loan_applications')
      .update({
        status: finalStatus,
        margill_response: margillResponse,
        margill_error: margillError,
        margill_submitted_at: margillSuccess
          ? new Date().toISOString()
          : null,
        submitted_at: margillSuccess ? new Date().toISOString() : null,
      })
      .eq('id', application.id)

    // ============================================
    // 9. ENVOYER EMAIL CONFIRMATION
    // ============================================

    if (margillSuccess) {
      // TODO: Implémenter envoi email via Resend
      // Pour l'instant, juste logger
    }

    // ============================================
    // 10. LOGGER MÉTRIQUES
    // ============================================

    await logFormCompleted(body.origin, Date.now() - startTime)

    // ============================================
    // 11. RETOURNER RÉSULTAT
    // ============================================

    if (margillSuccess) {
      return NextResponse.json(
        {
          success: true,
          data: {
            reference: application.reference,
            status: finalStatus,
            cortex_score: cortexScore,
            message:
              'Votre demande a été soumise avec succès! Vous recevrez une confirmation par courriel.',
          },
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Votre demande a été sauvegardée mais n\'a pas pu être envoyée à Margill. Notre équipe va la traiter manuellement.',
          data: {
            reference: application.reference,
            status: finalStatus,
            cortex_score: cortexScore,
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[SubmitAPI] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
      },
      { status: 500 }
    )
  }
}
