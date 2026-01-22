/**
 * VoPay Bank Account Creation Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/bank-account
 *
 * Reçoit les notifications de création de compte bancaire
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface BankAccountWebhookPayload {
  AccountToken: string
  InstitutionNumber: string
  TransitNumber: string
  AccountNumber: string
  InstitutionName: string
  Status: string
  ValidationKey: string
  CreatedAt: string
  Environment: string
  ClientAccountID?: string
}

function validateSignature(accountToken: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(accountToken)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Bank Account Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: BankAccountWebhookPayload = await request.json()

    if (!payload.AccountToken || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.AccountToken, payload.ValidationKey)) {
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
        event_type: 'bank_account',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer le compte bancaire
    const { error: insertError } = await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.AccountToken,
        object_type: 'bank_account',
        status: payload.Status,
        metadata: {
          institution_number: payload.InstitutionNumber,
          transit_number: payload.TransitNumber,
          account_number: payload.AccountNumber,
          institution_name: payload.InstitutionName,
          client_account_id: payload.ClientAccountID
        },
        raw_data: payload
      })

    if (insertError) {
      console.error('[Bank Account Webhook] Insert error:', insertError)
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account webhook processed',
      accountToken: payload.AccountToken
    })
  } catch (error) {
    console.error('[Bank Account Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/bank-account', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Bank Account Creation Webhook',
    methods: ['POST']
  })
}
