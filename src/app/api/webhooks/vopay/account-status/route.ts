/**
 * VoPay Account Status Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/account-status
 *
 * Reçoit les notifications de changement de statut de compte
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface AccountStatusWebhookPayload {
  AccountID: string
  Status: string // active, suspended, closed
  PreviousStatus: string
  Reason?: string
  APIKey?: string
  SharedSecret?: string
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
    console.error('[Account Status Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: AccountStatusWebhookPayload = await request.json()

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
        event_type: 'account_status',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer le changement de statut
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: `status_${payload.AccountID}_${Date.now()}`,
        object_type: 'account_status',
        status: payload.Status,
        metadata: {
          account_id: payload.AccountID,
          previous_status: payload.PreviousStatus,
          reason: payload.Reason,
          api_key: payload.APIKey ? '***' : undefined, // Ne pas stocker la clé complète
          has_shared_secret: !!payload.SharedSecret
        },
        raw_data: payload
      })

    // Si activation de compte, logger l'info
    if (payload.Status === 'active' && payload.APIKey) {
      console.log('[Account Status] Account activated:', payload.AccountID)
      // TODO: Notifier les admins
    }

    return NextResponse.json({
      success: true,
      message: 'Account status webhook processed',
      accountId: payload.AccountID,
      status: payload.Status
    })
  } catch (error) {
    console.error('[Account Status Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/account-status', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Account Status Webhook',
    methods: ['POST']
  })
}
