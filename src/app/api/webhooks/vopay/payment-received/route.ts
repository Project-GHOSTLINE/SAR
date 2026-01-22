/**
 * VoPay Payment Received Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/payment-received
 *
 * Reçoit les notifications de paiements entrants
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface PaymentReceivedWebhookPayload {
  TransactionID: string
  TransactionAmount: string
  TransactionType: string
  TransactionDate: string
  ReferenceNumber: string
  SenderName?: string
  ValidationKey: string
  ReceivedAt: string
  Environment: string
}

function validateSignature(transactionId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(transactionId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Payment Received Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: PaymentReceivedWebhookPayload = await request.json()

    if (!payload.TransactionID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.TransactionID, payload.ValidationKey)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseServer()

    // Enregistrer le webhook
    await supabase
      .from('webhook_logs')
      .insert({
        provider: 'vopay',
        event_type: 'payment_received',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer le paiement reçu
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.TransactionID,
        object_type: 'inbound_payment',
        status: 'received',
        metadata: {
          amount: parseFloat(payload.TransactionAmount),
          transaction_type: payload.TransactionType,
          reference_number: payload.ReferenceNumber,
          sender_name: payload.SenderName
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Payment received webhook processed',
      transactionId: payload.TransactionID,
      amount: payload.TransactionAmount
    })
  } catch (error) {
    console.error('[Payment Received Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/payment-received', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Payment Received Webhook',
    methods: ['POST']
  })
}
