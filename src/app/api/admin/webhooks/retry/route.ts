import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
    } catch {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const { webhookId } = await request.json()

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get webhook details
    const { data: webhook, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (fetchError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Update webhook status to retrying
    const { error: updateError } = await supabase
      .from('webhook_logs')
      .update({
        status: 'retrying',
        retry_count: (webhook.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', webhookId)

    if (updateError) {
      console.error('Error updating webhook:', updateError)
      return NextResponse.json(
        { error: 'Failed to update webhook', details: updateError.message },
        { status: 500 }
      )
    }

    // Here you would trigger the actual retry logic based on provider
    // For now, we'll just mark it as retrying
    // In production, you'd call the appropriate handler based on webhook.provider

    return NextResponse.json({
      success: true,
      message: 'Webhook marked for retry',
      webhookId,
      retryCount: (webhook.retry_count || 0) + 1
    })
  } catch (error) {
    console.error('Error in /api/admin/webhooks/retry:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
