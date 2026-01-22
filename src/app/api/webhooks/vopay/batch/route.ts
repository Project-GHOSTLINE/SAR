/**
 * VoPay Batch Request Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/batch
 *
 * Reçoit les notifications de traitement de lots
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface BatchWebhookPayload {
  BatchRequestID: string
  Status: string // completed, processing, failed
  TotalRecords: number
  SuccessfulRecords: number
  FailedRecords: number
  TotalAmount: string
  PaymentType: string
  ValidationKey: string
  CompletedAt: string
  Environment: string
}

function validateSignature(batchId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(batchId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Batch Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: BatchWebhookPayload = await request.json()

    if (!payload.BatchRequestID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.BatchRequestID, payload.ValidationKey)) {
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
        event_type: 'batch_request',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer le batch
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.BatchRequestID,
        object_type: 'batch',
        status: payload.Status,
        metadata: {
          total_records: payload.TotalRecords,
          successful_records: payload.SuccessfulRecords,
          failed_records: payload.FailedRecords,
          total_amount: parseFloat(payload.TotalAmount),
          payment_type: payload.PaymentType
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Batch webhook processed',
      batchId: payload.BatchRequestID,
      status: payload.Status
    })
  } catch (error) {
    console.error('[Batch Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/batch', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Batch Request Webhook',
    methods: ['POST']
  })
}
