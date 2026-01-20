/**
 * VoPay Webhook Endpoint
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay
 *
 * Reçoit les notifications de statut de transaction de VoPay
 * Documentation: https://docs.vopay.com/docs/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

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
async function handlePOST(request: NextRequest) {

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
    const supabase = getSupabaseServer()

    // 5. OPTIMIZED: Use RPC function (1 atomic call instead of 10 waterfall queries)
    // This RPC handles: webhook logging, vopay_objects insert, client matching, loan matching
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('process_vopay_webhook', {
        p_transaction_id: payload.TransactionID,
        p_transaction_type: payload.TransactionType,
        p_amount: parseFloat(payload.TransactionAmount),
        p_status: payload.Status.toLowerCase(),
        p_failure_reason: payload.FailureReason || null,
        p_environment: payload.Environment,
        p_validation_key: payload.ValidationKey,
        p_updated_at: payload.UpdatedAt,
        p_payload: payload as any
      })

    if (rpcError || !rpcData?.[0]) {
      console.error('[VoPay Webhook] RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Database error', details: rpcError?.message || 'RPC failed' },
        { status: 500 }
      )
    }

    // Extract results from RPC
    const result = rpcData[0]
    const voPayObjectId = result.vopay_object_id
    const clientId = result.client_id
    const loanId = result.loan_id
    const logId = result.webhook_log_id

    if (!result.success) {
      console.error('[VoPay Webhook] RPC returned error:', result.error_message)
      return NextResponse.json(
        { error: 'Processing failed', details: result.error_message },
        { status: 500 }
      )
    }

    console.log('[VoPay Webhook] Processed via RPC:', {
      logId,
      voPayObjectId,
      clientId,
      loanId
    })

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
      logId,
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

export const POST = withPerf('webhooks/vopay', handlePOST)

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
