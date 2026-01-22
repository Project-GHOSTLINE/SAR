/**
 * VoPay Virtual Accounts Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/virtual-accounts
 *
 * Reçoit les notifications de comptes virtuels
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface VirtualAccountWebhookPayload {
  VirtualAccountID: string
  AccountToken: string
  TransactionAmount: string
  TransactionType: string // funding, balance_update
  Balance: string
  Status: string
  ValidationKey: string
  UpdatedAt: string
  Environment: string
}

function validateSignature(virtualAccountId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(virtualAccountId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Virtual Account Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: VirtualAccountWebhookPayload = await request.json()

    if (!payload.VirtualAccountID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.VirtualAccountID, payload.ValidationKey)) {
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
        event_type: 'virtual_account',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer la transaction du compte virtuel
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.VirtualAccountID,
        object_type: 'virtual_account',
        status: payload.Status,
        metadata: {
          account_token: payload.AccountToken,
          transaction_amount: parseFloat(payload.TransactionAmount),
          transaction_type: payload.TransactionType,
          balance: parseFloat(payload.Balance)
        },
        raw_data: payload
      })

    return NextResponse.json({
      success: true,
      message: 'Virtual account webhook processed',
      virtualAccountId: payload.VirtualAccountID,
      balance: payload.Balance
    })
  } catch (error) {
    console.error('[Virtual Account Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/virtual-accounts', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Virtual Accounts Webhook',
    methods: ['POST']
  })
}
