import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sync chart of accounts from QuickBooks to local database
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

    // Fetch accounts from QuickBooks
    console.log('Fetching accounts from QuickBooks...')
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Account MAXRESULTS 1000`,
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
        { error: 'Failed to fetch accounts from QuickBooks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const accounts = data.QueryResponse?.Account || []

    console.log(`Syncing ${accounts.length} accounts...`)

    // Store accounts in database
    let syncedCount = 0
    for (const account of accounts) {
      const accountData = {
        qb_id: account.Id,
        name: account.Name,
        account_type: account.AccountType,
        account_sub_type: account.AccountSubType || null,
        classification: account.Classification || null,
        current_balance: parseFloat(account.CurrentBalance || '0'),
        active: account.Active !== false,
        description: account.Description || null,
        metadata: account,
        sync_token: account.SyncToken,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if account exists
      const { data: existing } = await supabase
        .from('quickbooks_accounts')
        .select('id')
        .eq('qb_id', account.Id)
        .single()

      if (existing) {
        await supabase
          .from('quickbooks_accounts')
          .update(accountData)
          .eq('qb_id', account.Id)
      } else {
        await supabase
          .from('quickbooks_accounts')
          .insert(accountData)
      }

      syncedCount++
    }

    console.log(`✅ Synced ${syncedCount} accounts`)

    return NextResponse.json({
      success: true,
      count: syncedCount,
      message: `Synced ${syncedCount} accounts`
    })

  } catch (error: any) {
    console.error('Error syncing accounts:', error)
    return NextResponse.json(
      { error: 'Failed to sync accounts', message: error.message },
      { status: 500 }
    )
  }
}
