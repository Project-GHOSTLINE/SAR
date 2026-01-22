/**
 * VoPay Account Balance Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/account-balance
 *
 * Reçoit les alertes de solde de compte principal VoPay
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface AccountBalanceWebhookPayload {
  AccountID: string
  Balance: string
  PendingAmount: string
  AvailableBalance: string
  ThresholdAmount: string
  ValidationKey: string
  UpdatedAt: string
  Environment: string
}

function validateSignature(accountId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(accountId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Account Balance Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: AccountBalanceWebhookPayload = await request.json()

    if (!payload.AccountID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.AccountID, payload.ValidationKey)) {
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
        event_type: 'account_balance',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer l'alerte de balance
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: `balance_${payload.AccountID}_${Date.now()}`,
        object_type: 'balance_alert',
        status: 'low_balance',
        metadata: {
          account_id: payload.AccountID,
          balance: parseFloat(payload.Balance),
          pending_amount: parseFloat(payload.PendingAmount),
          available_balance: parseFloat(payload.AvailableBalance),
          threshold_amount: parseFloat(payload.ThresholdAmount)
        },
        raw_data: payload
      })

    // TODO: Envoyer une notification aux admins
    console.warn('[Account Balance] Low balance alert:', {
      accountId: payload.AccountID,
      availableBalance: payload.AvailableBalance,
      threshold: payload.ThresholdAmount
    })

    return NextResponse.json({
      success: true,
      message: 'Account balance webhook processed',
      accountId: payload.AccountID,
      availableBalance: payload.AvailableBalance
    })
  } catch (error) {
    console.error('[Account Balance Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/account-balance', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Account Balance Webhook',
    methods: ['POST']
  })
}
