import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/auth'
import { ApplicationStatus } from '@/types'

/**
 * Webhook endpoint for Margill integration
 * Receives status updates from Margill and syncs to our system
 */

// Mapping Margill status to our internal status
const MARGILL_STATUS_MAP: Record<string, ApplicationStatus> = {
  'nouveau_dossier': 'RECEIVED',
  'en_attente_ibv': 'IBV_PENDING',
  'ibv_completee': 'IBV_COMPLETED',
  'analyse_en_cours': 'ANALYSIS_IN_PROGRESS',
  'offre_en_preparation': 'OFFER_PENDING',
  'offre_envoyee': 'OFFER_SENT',
  'offre_acceptee': 'APPROVED_BY_CLIENT',
  'contrat_en_preparation': 'CONTRACT_PREPARATION',
  'contrat_envoye': 'CONTRACT_SENT',
  'en_attente_signature': 'AWAITING_SIGNATURE',
  'contrat_signe': 'SIGNED',
  'transfert_de_fonds': 'FUNDS_TRANSFER',
  'pret_actif': 'ACTIVE',
  'refuse': 'REFUSED',
  'sans_reponse': 'NO_RESPONSE',
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      dossier_id,
      statut_margill,
      nom_client,
      email_client,
      telephone_client,
      montant,
      date_premier_paiement,
    } = body

    if (!dossier_id || !statut_margill) {
      return NextResponse.json(
        { success: false, error: 'dossier_id et statut_margill requis' },
        { status: 400 }
      )
    }

    // Map Margill status to our status
    const mappedStatus = MARGILL_STATUS_MAP[statut_margill.toLowerCase()]

    if (!mappedStatus) {
      console.warn(`Unknown Margill status: ${statut_margill}`)
      return NextResponse.json(
        { success: false, error: `Statut Margill inconnu: ${statut_margill}` },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Prepare application data
    const appData: any = {
      id: `MARGILL-${dossier_id}`,
      status: mappedStatus,
      status_updated_at: new Date().toISOString(),
      origin: 'Margill',
    }

    // Add client info if provided
    if (nom_client) appData.name = nom_client
    if (email_client) appData.email = email_client
    if (telephone_client) appData.phone = telephone_client
    if (montant) {
      // Convert to cents if Margill sends dollars
      appData.amount_cents = Math.round(montant * 100)
    }
    if (date_premier_paiement) appData.first_payment_date = date_premier_paiement

    // Upsert application (create or update)
    const { error: upsertError } = await supabase
      .from('applications')
      .upsert(appData, { onConflict: 'id' })

    if (upsertError) {
      console.error('Error upserting application from Margill:', upsertError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      )
    }

    // Create event record
    const { error: eventError } = await supabase
      .from('application_events')
      .insert({
        application_id: `MARGILL-${dossier_id}`,
        type: 'margill_status_change',
        payload: {
          margill_status: statut_margill,
          mapped_status: mappedStatus,
          raw_data: body,
        },
      })

    if (eventError) {
      console.error('Error creating event:', eventError)
      // Don't fail the request if event creation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        application_id: `MARGILL-${dossier_id}`,
        margill_status: statut_margill,
        mapped_status: mappedStatus,
        message: 'Dossier synchronisé avec succès',
      },
    })
  } catch (error) {
    console.error('Error in /api/webhook/margill:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
