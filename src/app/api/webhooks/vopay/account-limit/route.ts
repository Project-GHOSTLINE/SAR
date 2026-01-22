/**
 * VoPay Account Limit Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/account-limit
 *
 * Reçoit les alertes de dépassement de limites
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface AccountLimitWebhookPayload {
  AccountID: string
  LimitType: string // daily, weekly, monthly, transaction
  CurrentAmount: string
  LimitAmount: string
  PercentageExceeded: number
  ValidationKey: string
  TriggeredAt: string
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
    console.error('[Account Limit Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: AccountLimitWebhookPayload = await request.json()

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
        event_type: 'account_limit',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer l'alerte de limite
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: `limit_alert_${payload.AccountID}_${Date.now()}`,
        object_type: 'limit_alert',
        status: 'exceeded',
        metadata: {
          account_id: payload.AccountID,
          limit_type: payload.LimitType,
          current_amount: parseFloat(payload.CurrentAmount),
          limit_amount: parseFloat(payload.LimitAmount),
          percentage_exceeded: payload.PercentageExceeded
        },
        raw_data: payload
      })

    // TODO: Envoyer notification aux admins
    console.warn('[Account Limit] Limit exceeded:', {
      accountId: payload.AccountID,
      limitType: payload.LimitType,
      percentageExceeded: payload.PercentageExceeded
    })

    return NextResponse.json({
      success: true,
      message: 'Account limit webhook processed',
      accountId: payload.AccountID,
      limitType: payload.LimitType
    })
  } catch (error) {
    console.error('[Account Limit Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/account-limit', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Account Limit Webhook',
    methods: ['POST']
  })
}
