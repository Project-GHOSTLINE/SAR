/**
 * VoPay eLinx Status Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/elinx
 *
 * Reçoit les notifications eLinx (statut de connexion bancaire)
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface ELinxWebhookPayload {
  TransactionID: string
  ELinxTransactionID: string
  Status: string // connected, declined, cancelled
  ValidationKey: string
  AccountToken?: string
  InstitutionName?: string
  AccountNumber?: string
  TransitNumber?: string
  UpdatedAt: string
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
    console.error('[eLinx Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: ELinxWebhookPayload = await request.json()

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
    const { data: logData, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'vopay',
        event_type: 'elinx',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[eLinx Webhook] Log error:', logError)
    }

    // Si connexion réussie, enregistrer les infos bancaires
    if (payload.Status === 'connected' && payload.AccountToken) {
      const { error: insertError } = await supabase
        .from('vopay_objects')
        .insert({
          vopay_id: payload.ELinxTransactionID,
          object_type: 'elinx',
          status: payload.Status,
          metadata: {
            account_token: payload.AccountToken,
            institution_name: payload.InstitutionName,
            account_number: payload.AccountNumber,
            transit_number: payload.TransitNumber
          },
          raw_data: payload
        })

      if (insertError) {
        console.error('[eLinx Webhook] Insert error:', insertError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'eLinx webhook processed',
      transactionId: payload.TransactionID,
      status: payload.Status
    })
  } catch (error) {
    console.error('[eLinx Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/elinx', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay eLinx Status Webhook',
    methods: ['POST']
  })
}
