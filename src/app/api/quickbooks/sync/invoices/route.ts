import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sync invoices from QuickBooks to local database
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

    // Fetch invoices from QuickBooks
    console.log('Fetching invoices from QuickBooks...')
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Invoice MAXRESULTS 1000`,
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
        { error: 'Failed to fetch invoices from QuickBooks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const invoices = data.QueryResponse?.Invoice || []

    console.log(`Syncing ${invoices.length} invoices...`)

    // Store invoices in database
    let syncedCount = 0
    for (const invoice of invoices) {
      const invoiceData = {
        qb_id: invoice.Id,
        customer_qb_id: invoice.CustomerRef?.value || null,
        doc_number: invoice.DocNumber || null,
        txn_date: invoice.TxnDate,
        due_date: invoice.DueDate || null,
        total_amount: parseFloat(invoice.TotalAmt || '0'),
        balance: parseFloat(invoice.Balance || '0'),
        currency_code: invoice.CurrencyRef?.value || 'CAD',
        status: invoice.Balance > 0 ? 'Partial' : 'Paid',
        email_status: invoice.EmailStatus || null,
        line_items: invoice.Line || [],
        metadata: invoice,
        sync_token: invoice.SyncToken,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if invoice exists
      const { data: existing } = await supabase
        .from('quickbooks_invoices')
        .select('id')
        .eq('qb_id', invoice.Id)
        .single()

      if (existing) {
        await supabase
          .from('quickbooks_invoices')
          .update(invoiceData)
          .eq('qb_id', invoice.Id)
      } else {
        await supabase
          .from('quickbooks_invoices')
          .insert(invoiceData)
      }

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} invoices`)

    return NextResponse.json({
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} invoices`
    })

  } catch (error: any) {
    console.error('Error syncing invoices:', error)
    return NextResponse.json(
      { error: 'Failed to sync invoices', message: error.message },
      { status: 500 }
    )
  }
}
