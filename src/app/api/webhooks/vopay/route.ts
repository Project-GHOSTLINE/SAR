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
  console.log('[VoPay Webhook] Received webhook')

  try {
    // 1. Parser le payload
    const payload: VoPayWebhookPayload = await request.json()

    console.log('[VoPay Webhook] Payload:', {
      transactionId: payload.TransactionID,
      status: payload.Status,
      amount: payload.TransactionAmount,
      type: payload.TransactionType,
      environment: payload.Environment,
    })

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

    // Debug logs
    console.log('[VoPay Webhook] Debug:', {
      transactionId: payload.TransactionID,
      receivedKey: payload.ValidationKey,
      secretPrefix: sharedSecret.substring(0, 5) + '...',
      hasSecret: !!sharedSecret
    })

    const isValid = validateWebhookSignature(
      payload.TransactionID,
      payload.ValidationKey,
      sharedSecret
    )

    if (!isValid) {
      console.error('[VoPay Webhook] Invalid signature')
      // Log expected signature for debugging
      const expectedSig = crypto.createHmac('sha1', sharedSecret)
        .update(payload.TransactionID)
        .digest('hex')
      console.error('[VoPay Webhook] Expected:', expectedSig)
      console.error('[VoPay Webhook] Received:', payload.ValidationKey)

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('[VoPay Webhook] Signature validated ✓')

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

    console.log('[VoPay Webhook] Saved to database:', data.id)

    // 6. Traitement selon le statut
    switch (payload.Status.toLowerCase()) {
      case 'successful':
        console.log(`[VoPay Webhook] ✅ Transaction ${payload.TransactionID} réussie`)
        // TODO: Mettre à jour le statut dans la table des prêts/remboursements
        break

      case 'failed':
        console.log(`[VoPay Webhook] ❌ Transaction ${payload.TransactionID} échouée: ${payload.FailureReason}`)
        // TODO: Notifier l'admin et le client
        break

      case 'pending':
      case 'in progress':
        console.log(`[VoPay Webhook] ⏳ Transaction ${payload.TransactionID} en cours`)
        break

      case 'cancelled':
        console.log(`[VoPay Webhook] 🚫 Transaction ${payload.TransactionID} annulée`)
        break

      default:
        console.log(`[VoPay Webhook] ❓ Statut inconnu: ${payload.Status}`)
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
export async function GET(request: NextRequest) {
  const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
  const testTxId = 'TEST_123'
  const testSig = crypto.createHmac('sha1', sharedSecret)
    .update(testTxId)
    .digest('hex')

  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Webhook Receiver',
    methods: ['POST'],
    timestamp: new Date().toISOString(),
    debug: {
      hasSecret: !!sharedSecret,
      secretLength: sharedSecret.length,
      secretPrefix: sharedSecret.substring(0, 5),
      testTransaction: testTxId,
      testSignature: testSig
    }
  })
}
