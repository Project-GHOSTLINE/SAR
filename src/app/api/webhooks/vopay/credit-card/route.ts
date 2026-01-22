/**
 * VoPay Credit Card Connection Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/credit-card
 *
 * Reçoit les notifications de connexion de carte de crédit
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface CreditCardWebhookPayload {
  CardToken: string
  CardBrand: string
  MaskedCardNumber: string
  CardholderName: string
  ExpiryMonth: string
  ExpiryYear: string
  Status: string
  ValidationKey: string
  ConnectedAt: string
  Environment: string
}

function validateSignature(cardToken: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(cardToken)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Credit Card Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: CreditCardWebhookPayload = await request.json()

    if (!payload.CardToken || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.CardToken, payload.ValidationKey)) {
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
        event_type: 'credit_card',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer la carte de crédit
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.CardToken,
        object_type: 'credit_card',
        status: payload.Status,
        metadata: {
          card_brand: payload.CardBrand,
          masked_card_number: payload.MaskedCardNumber,
          cardholder_name: payload.CardholderName,
          expiry_month: payload.ExpiryMonth,
          expiry_year: payload.ExpiryYear
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Credit card webhook processed',
      cardToken: payload.CardToken,
      cardBrand: payload.CardBrand
    })
  } catch (error) {
    console.error('[Credit Card Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/credit-card', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Credit Card Connection Webhook',
    methods: ['POST']
  })
}
