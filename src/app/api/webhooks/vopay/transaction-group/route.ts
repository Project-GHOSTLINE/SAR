/**
 * VoPay Transaction Group Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/transaction-group
 *
 * Reçoit les notifications de groupes de transactions
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface TransactionGroupWebhookPayload {
  TransactionGroupID: string
  CollectedAmount: string
  FailedAmount: string
  ProcessedAmount: string
  Status: string
  ValidationKey: string
  ProcessedAt: string
  Environment: string
}

function validateSignature(groupId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(groupId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Transaction Group Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: TransactionGroupWebhookPayload = await request.json()

    if (!payload.TransactionGroupID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.TransactionGroupID, payload.ValidationKey)) {
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
        event_type: 'transaction_group',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer le groupe de transactions
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.TransactionGroupID,
        object_type: 'transaction_group',
        status: payload.Status,
        metadata: {
          collected_amount: parseFloat(payload.CollectedAmount),
          failed_amount: parseFloat(payload.FailedAmount),
          processed_amount: parseFloat(payload.ProcessedAmount)
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Transaction group webhook processed',
      groupId: payload.TransactionGroupID,
      status: payload.Status
    })
  } catch (error) {
    console.error('[Transaction Group Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/transaction-group', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Transaction Group Webhook',
    methods: ['POST']
  })
}
