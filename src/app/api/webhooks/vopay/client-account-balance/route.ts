/**
 * VoPay Client Account Balance Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/client-account-balance
 *
 * Reçoit les alertes de solde de compte client
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface ClientAccountBalanceWebhookPayload {
  ClientAccountID: string
  Balance: string
  PendingAmount: string
  AvailableBalance: string
  ThresholdAmount: string
  ValidationKey: string
  UpdatedAt: string
  Environment: string
}

function validateSignature(clientAccountId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(clientAccountId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Client Account Balance Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: ClientAccountBalanceWebhookPayload = await request.json()

    if (!payload.ClientAccountID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.ClientAccountID, payload.ValidationKey)) {
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
        event_type: 'client_account_balance',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer l'alerte de balance client
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: `client_balance_${payload.ClientAccountID}_${Date.now()}`,
        object_type: 'client_balance_alert',
        status: 'low_balance',
        metadata: {
          client_account_id: payload.ClientAccountID,
          balance: parseFloat(payload.Balance),
          pending_amount: parseFloat(payload.PendingAmount),
          available_balance: parseFloat(payload.AvailableBalance),
          threshold_amount: parseFloat(payload.ThresholdAmount)
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Client account balance webhook processed',
      clientAccountId: payload.ClientAccountID
    })
  } catch (error) {
    console.error('[Client Account Balance Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/client-account-balance', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Client Account Balance Webhook',
    methods: ['POST']
  })
}
