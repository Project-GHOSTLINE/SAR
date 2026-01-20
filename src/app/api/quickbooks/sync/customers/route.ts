import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sync customers from QuickBooks to local database
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

    // Fetch customers from QuickBooks
    console.log('Fetching customers from QuickBooks...')
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Customer MAXRESULTS 1000`,
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
        { error: 'Failed to fetch customers from QuickBooks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const customers = data.QueryResponse?.Customer || []

    console.log(`Syncing ${customers.length} customers...`)

    // Store customers in database
    let syncedCount = 0
    for (const customer of customers) {
      const customerData = {
        qb_id: customer.Id,
        display_name: customer.DisplayName,
        given_name: customer.GivenName || null,
        family_name: customer.FamilyName || null,
        company_name: customer.CompanyName || null,
        email: customer.PrimaryEmailAddr?.Address || null,
        phone: customer.PrimaryPhone?.FreeFormNumber || null,
        mobile: customer.Mobile?.FreeFormNumber || null,
        billing_address: customer.BillAddr || null,
        shipping_address: customer.ShipAddr || null,
        balance: parseFloat(customer.Balance || '0'),
        taxable: customer.Taxable || false,
        active: customer.Active !== false,
        sync_token: customer.SyncToken,
        metadata: customer,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if customer exists
      const { data: existing } = await supabase
        .from('quickbooks_customers')
        .select('id')
        .eq('qb_id', customer.Id)
        .single()

      if (existing) {
        await supabase
          .from('quickbooks_customers')
          .update(customerData)
          .eq('qb_id', customer.Id)
      } else {
        await supabase
          .from('quickbooks_customers')
          .insert(customerData)
      }

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} customers`)

    return NextResponse.json({
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} customers`
    })

  } catch (error: any) {
    console.error('Error syncing customers:', error)
    return NextResponse.json(
      { error: 'Failed to sync customers', message: error.message },
      { status: 500 }
    )
  }
}
