/**
 * VoPay Webhook Endpoint
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay
 *
 * Reçoit les notifications de statut de transaction de VoPay
 * Documentation: https://docs.vopay.com/docs/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabase } from '@/lib/supabase'

// Types pour les webhooks VoPay
interface VoPayWebhookPayload {
  Success: boolean
  TransactionType: string
  TransactionID: string
  TransactionAmount: string
  Status: string // pending, in progress, failed, cancelled, successful
  UpdatedAt: string
  ValidationKey: string
  FailureReason?: string
  Environment: string // Production ou Sandbox
}

/**
 * Valide la signature du webhook VoPay
 * Signature = HMAC SHA1(SharedSecret + TransactionID)
 */
function validateWebhookSignature(
  transactionId: string,
  validationKey: string,
  sharedSecret: string
): boolean {
  try {
    // Calculer la signature attendue
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(transactionId)
      .digest('hex')

    // Comparaison sécurisée
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('Validation error:', error)
    return false
  }
}

/**
 * POST /api/webhooks/vopay
 * Reçoit et enregistre les webhooks VoPay
 */
export async function POST(request: NextRequest) {

  try {
    // 1. Parser le payload
    const payload: VoPayWebhookPayload = await request.json()

    // 2. Vérifier les champs requis
    if (!payload.TransactionID || !payload.Status || !payload.ValidationKey) {
      console.error('[VoPay Webhook] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 3. Valider la signature
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const isValid = validateWebhookSignature(
      payload.TransactionID,
      payload.ValidationKey,
      sharedSecret
    )

    if (!isValid) {
      console.error('[VoPay Webhook] Invalid signature for transaction:', payload.TransactionID)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }


    // 4. Connexion Supabase
    const supabase = getSupabase()
    if (!supabase) {
      console.error('[VoPay Webhook] Supabase not configured')
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 500 }
      )
    }

    // 5. Enregistrer dans la base de données
    const { data, error } = await supabase
      .from('vopay_webhook_logs')
      .insert({
        transaction_id: payload.TransactionID,
        transaction_type: payload.TransactionType,
        transaction_amount: parseFloat(payload.TransactionAmount),
        status: payload.Status.toLowerCase(),
        failure_reason: payload.FailureReason || null,
        environment: payload.Environment,
        validation_key: payload.ValidationKey,
        is_validated: true,
        raw_payload: payload,
        updated_at: payload.UpdatedAt,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[VoPay Webhook] Database error:', error)
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      )
    }

    // 5.5. Insérer AUSSI dans vopay_objects (table normalisée)
    let voPayObjectId: string | null = null
    let clientId: string | null = null
    let loanId: string | null = null

    try {
      const { data: voData, error: voError } = await supabase
        .from('vopay_objects')
        .insert({
          object_type: payload.TransactionType || 'unknown',
          vopay_id: payload.TransactionID,
          status: payload.Status?.toLowerCase() || null,
          amount: parseFloat(payload.TransactionAmount) || null,
          payload: payload,
          occurred_at: payload.UpdatedAt || new Date().toISOString(),
          raw_log_id: data.id,
        })
        .select()
        .single()

      if (voError) {
        console.warn('[VoPay Webhook] vopay_objects insertion warning:', voError.message)
      } else {
        voPayObjectId = voData.id
        console.log('[VoPay Webhook] vopay_objects created:', voData.id)
      }
    } catch (voInsertError) {
      console.warn('[VoPay Webhook] vopay_objects insert failed:', voInsertError)
    }

    // 5.6. Tenter matching automatique client_id (si email présent)
    if (voPayObjectId) {
      // Extraire email depuis plusieurs chemins possibles
      const email = (payload as any).email ||
                    (payload as any).EmailAddress ||
                    (payload as any).ClientInfo?.email

      if (email) {
        try {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .ilike('primary_email', email.trim())
            .single()

          if (clientData?.id) {
            await supabase
              .from('vopay_objects')
              .update({ client_id: clientData.id })
              .eq('id', voPayObjectId)

            clientId = clientData.id
            console.log('[VoPay Webhook] Auto-matched client:', clientData.id)
          }
        } catch (matchError) {
          console.debug('[VoPay Webhook] Client matching skipped')
        }
      }
    }

    // 5.7. Tenter matching automatique loan_id (si référence présente)
    if (voPayObjectId) {
      const reference = (payload as any).ClientReferenceNumber ||
                        (payload as any).Notes ||
                        (payload as any).Description

      if (reference) {
        try {
          const referenceStr = String(reference).toUpperCase()
          const sarMatch = referenceStr.match(/SAR-LP-\d+/)

          if (sarMatch) {
            const { data: appData } = await supabase
              .from('loan_applications')
              .select('id')
              .eq('reference', sarMatch[0])
              .single()

            if (appData?.id) {
              const { data: loanData } = await supabase
                .from('loans')
                .select('id, client_id')
                .eq('application_id', appData.id)
                .single()

              if (loanData?.id) {
                await supabase
                  .from('vopay_objects')
                  .update({
                    loan_id: loanData.id,
                    client_id: loanData.client_id
                  })
                  .eq('id', voPayObjectId)

                loanId = loanData.id
                clientId = clientId || loanData.client_id
                console.log('[VoPay Webhook] Auto-matched loan:', loanData.id)
              }
            }
          }
        } catch (matchError) {
          console.debug('[VoPay Webhook] Loan matching skipped')
        }
      }
    }

    // 6. Traitement selon le statut
    switch (payload.Status.toLowerCase()) {
      case 'successful':
        // Mettre à jour payment_installments si loan lié
        if (loanId) {
          try {
            // Trouver le schedule actif pour ce loan
            const { data: scheduleData } = await supabase
              .from('payment_schedule_versions')
              .select('id')
              .eq('loan_id', loanId)
              .order('version', { ascending: false })
              .limit(1)
              .single()

            if (scheduleData?.id) {
              // Trouver l'installment correspondant (par date proche)
              const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
              const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

              const { data: installments } = await supabase
                .from('payment_installments')
                .select('id')
                .eq('schedule_version_id', scheduleData.id)
                .eq('status', 'scheduled')
                .gte('due_date', sevenDaysAgo)
                .lte('due_date', sevenDaysLater)
                .limit(1)

              if (installments?.[0]) {
                await supabase
                  .from('payment_installments')
                  .update({
                    status: 'paid',
                    paid_at: payload.UpdatedAt || new Date().toISOString()
                  })
                  .eq('id', installments[0].id)

                console.log('[VoPay Webhook] Marked installment as paid:', installments[0].id)
              }
            }

            // Créer payment_event
            await supabase
              .from('payment_events')
              .insert({
                loan_id: loanId,
                event_type: 'PAYMENT_RECEIVED',
                amount: parseFloat(payload.TransactionAmount),
                effective_date: new Date().toISOString().split('T')[0],
                payload: {
                  vopay_transaction_id: payload.TransactionID,
                  vopay_object_id: voPayObjectId,
                  source: 'vopay_webhook'
                }
              })

            console.log('[VoPay Webhook] Payment event created for loan:', loanId)
          } catch (updateError) {
            console.error('[VoPay Webhook] Payment update failed:', updateError)
          }
        }
        break

      case 'failed':
        // Créer payment_event NSF si loan lié
        if (loanId) {
          try {
            await supabase
              .from('payment_events')
              .insert({
                loan_id: loanId,
                event_type: 'NSF',
                amount: parseFloat(payload.TransactionAmount),
                effective_date: new Date().toISOString().split('T')[0],
                payload: {
                  vopay_transaction_id: payload.TransactionID,
                  vopay_object_id: voPayObjectId,
                  failure_reason: payload.FailureReason,
                  source: 'vopay_webhook'
                }
              })

            console.log('[VoPay Webhook] NSF event created for loan:', loanId)
            // TODO: Envoyer notification au client
            // TODO: Notifier l'admin
          } catch (nsfError) {
            console.error('[VoPay Webhook] NSF event creation failed:', nsfError)
          }
        }
        break

      case 'pending':
      case 'in progress':
        // Rien à faire
        break

      case 'cancelled':
        // Marquer comme skipped si applicable
        break

      default:
        console.warn('[VoPay Webhook] Unknown status:', payload.Status)
    }

    // 7. Retourner succès (VoPay attend une réponse 200)
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      transactionId: payload.TransactionID,
      status: payload.Status,
      logId: data.id,
    })
  } catch (error) {
    console.error('[VoPay Webhook] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/vopay
 * Endpoint de test pour vérifier que le webhook est accessible
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Webhook Receiver',
    methods: ['POST'],
    timestamp: new Date().toISOString(),
  })
}
