import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sync payments from QuickBooks to local database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get QuickBooks token
    const { data: tokenData, error: tokenError } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'QuickBooks not connected' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired, please reconnect QuickBooks' },
        { status: 401 }
      )
    }

    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const baseUrl = environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    // Fetch payments from QuickBooks
    console.log('Fetching payments from QuickBooks...')
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Payment MAXRESULTS 1000`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('QuickBooks API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payments from QuickBooks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const payments = data.QueryResponse?.Payment || []

    console.log(`Syncing ${payments.length} payments...`)

    // Store payments in database
    let syncedCount = 0
    for (const payment of payments) {
      const paymentData = {
        qb_id: payment.Id,
        customer_qb_id: payment.CustomerRef?.value || null,
        txn_date: payment.TxnDate,
        total_amount: parseFloat(payment.TotalAmt || '0'),
        currency_code: payment.CurrencyRef?.value || 'CAD',
        payment_method: payment.PaymentMethodRef?.name || null,
        payment_ref_number: payment.PaymentRefNum || null,
        deposit_to_account_id: payment.DepositToAccountRef?.value || null,
        line_items: payment.Line || [],
        metadata: payment,
        sync_token: payment.SyncToken,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if payment exists
      const { data: existing } = await supabase
        .from('quickbooks_payments')
        .select('id')
        .eq('qb_id', payment.Id)
        .single()

      if (existing) {
        await supabase
          .from('quickbooks_payments')
          .update(paymentData)
          .eq('qb_id', payment.Id)
      } else {
        await supabase
          .from('quickbooks_payments')
          .insert(paymentData)
      }

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} payments`)

    return NextResponse.json({
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} payments`
    })

  } catch (error: any) {
    console.error('Error syncing payments:', error)
    return NextResponse.json(
      { error: 'Failed to sync payments', message: error.message },
      { status: 500 }
    )
  }
}
