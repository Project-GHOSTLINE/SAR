/**
 * VoPay Account Verification Webhook
 * URL: https://api.solutionargentrapide.ca/api/webhooks/vopay/account-verification
 *
 * Reçoit les notifications de vérification de compte
 * Documentation: https://docs.vopay.com/docs/events
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

interface AccountVerificationWebhookPayload {
  VerificationID: string
  AccountToken: string
  VerificationType: string // instant, micro_deposit
  Status: string // verified, failed, pending
  AttemptCount: number
  ValidationKey: string
  VerifiedAt?: string
  Environment: string
  FailureReason?: string
}

function validateSignature(verificationId: string, validationKey: string): boolean {
  try {
    const sharedSecret = process.env.VOPAY_SHARED_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha1', sharedSecret)
      .update(verificationId)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(validationKey)
    )
  } catch (error) {
    console.error('[Account Verification Webhook] Validation error:', error)
    return false
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const payload: AccountVerificationWebhookPayload = await request.json()

    if (!payload.VerificationID || !payload.ValidationKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateSignature(payload.VerificationID, payload.ValidationKey)) {
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
        event_type: 'account_verification',
        payload: payload,
        status: 'received',
        received_at: new Date().toISOString()
      })

    // Enregistrer la vérification
    await supabase
      .from('vopay_objects')
      .insert({
        vopay_id: payload.VerificationID,
        object_type: 'verification',
        status: payload.Status,
        metadata: {
          account_token: payload.AccountToken,
          verification_type: payload.VerificationType,
          attempt_count: payload.AttemptCount,
          failure_reason: payload.FailureReason
        },
        raw_data: payload
      })

    // Si vérifié avec succès, mettre à jour le compte bancaire
    if (payload.Status === 'verified') {
      await supabase
        .from('vopay_objects')
        .update({
          status: 'verified',
          metadata: {
            verified_at: payload.VerifiedAt || new Date().toISOString()
          }
        })
        .eq('vopay_id', payload.AccountToken)
        .eq('object_type', 'bank_account')
    }

    return NextResponse.json({
      success: true,
      message: 'Account verification webhook processed',
      verificationId: payload.VerificationID,
      status: payload.Status
    })
  } catch (error) {
    console.error('[Account Verification Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withPerf('webhooks/vopay/account-verification', handlePOST)

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'VoPay Account Verification Webhook',
    methods: ['POST']
  })
}
