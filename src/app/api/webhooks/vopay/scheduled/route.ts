/**
 * VoPay Scheduled Transaction Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/scheduled
 *
 * Reçoit les notifications de transactions planifiées
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface ScheduledTransactionWebhookPayload {
  ScheduledTransactionID: string
  TransactionIDs: string[]
  Frequency: string
  Amount: string
  TransferType: string
  Status: string
  ValidationKey: string
  CreatedAt: string
  Environment: string
  ClientAccountID?: string
}

function validateSignature(scheduledId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(scheduledId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Scheduled Transaction Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: ScheduledTransactionWebhookPayload = await request.json()

    if (!payload.ScheduledTransactionID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.ScheduledTransactionID, payload.ValidationKey)) {
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
        event_type: 'scheduled_transaction',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer la transaction planifiée
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.ScheduledTransactionID,
        object_type: 'scheduled_transaction',
        status: payload.Status,
        metadata: {
          transaction_ids: payload.TransactionIDs,
          frequency: payload.Frequency,
          amount: parseFloat(payload.Amount),
          transfer_type: payload.TransferType,
          client_account_id: payload.ClientAccountID
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Scheduled transaction webhook processed',
      scheduledId: payload.ScheduledTransactionID
    })
  } catch (error) {
    console.error('[Scheduled Transaction Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/scheduled', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Scheduled Transaction Webhook',
    methods: ['POST']
  })
}
