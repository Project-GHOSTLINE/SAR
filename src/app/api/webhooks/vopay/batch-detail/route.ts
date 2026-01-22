/**
 * VoPay Batch Detail Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/batch-detail
 *
 * Reçoit les notifications de transactions individuelles échouées dans un lot
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface BatchDetailWebhookPayload {
  BatchRequestID: string
  TransactionID: string
  Status: string
  FailureReason: string
  TransactionPayload: any
  ValidationKey: string
  FailedAt: string
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
    console.error('[Batch Detail Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: BatchDetailWebhookPayload = await request.json()

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
        event_type: 'batch_detail',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer l'échec
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.TransactionID,
        object_type: 'batch_detail',
        status: 'failed',
        metadata: {
          batch_request_id: payload.BatchRequestID,
          failure_reason: payload.FailureReason,
          transaction_payload: payload.TransactionPayload
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Batch detail webhook processed',
      transactionId: payload.TransactionID
    })
  } catch (error) {
    console.error('[Batch Detail Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/batch-detail', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Batch Detail Webhook',
    methods: ['POST']
  })
}
