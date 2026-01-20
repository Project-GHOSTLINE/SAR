import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sync vendors from QuickBooks to local database
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

    // Fetch vendors from QuickBooks
    console.log('Fetching vendors from QuickBooks...')
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Vendor MAXRESULTS 1000`,
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
        { error: 'Failed to fetch vendors from QuickBooks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const vendors = data.QueryResponse?.Vendor || []

    console.log(`Syncing ${vendors.length} vendors...`)

    // Store vendors in database
    let syncedCount = 0
    for (const vendor of vendors) {
      const vendorData = {
        qb_id: vendor.Id,
        display_name: vendor.DisplayName,
        company_name: vendor.CompanyName || null,
        email: vendor.PrimaryEmailAddr?.Address || null,
        phone: vendor.PrimaryPhone?.FreeFormNumber || null,
        mobile: vendor.Mobile?.FreeFormNumber || null,
        billing_address: vendor.BillAddr || null,
        balance: parseFloat(vendor.Balance || '0'),
        taxable: vendor.Vendor1099 || false,
        active: vendor.Active !== false,
        metadata: vendor,
        sync_token: vendor.SyncToken,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if vendor exists
      const { data: existing } = await supabase
        .from('quickbooks_vendors')
        .select('id')
        .eq('qb_id', vendor.Id)
        .single()

      if (existing) {
        await supabase
          .from('quickbooks_vendors')
          .update(vendorData)
          .eq('qb_id', vendor.Id)
      } else {
        await supabase
          .from('quickbooks_vendors')
          .insert(vendorData)
      }

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} vendors`)

    return NextResponse.json({
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} vendors`
    })

  } catch (error: any) {
    console.error('Error syncing vendors:', error)
    return NextResponse.json(
      { error: 'Failed to sync vendors', message: error.message },
      { status: 500 }
    )
  }
}
