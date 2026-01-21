import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get accounts from local database
 * Query params:
 * - type: filter by account_type (e.g. "Bank", "Asset", "Expense")
 * - active: filter by active status (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('active') !== 'false'

    let query = supabase
      .from('quickbooks_accounts')
      .select('*')
      .order('name', { ascending: true })

    if (type) {
      query = query.eq('account_type', type)
    }

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: error.message },
        { status: 500 }
      )
    }

    // Format accounts for display
    const formattedAccounts = accounts?.map(account => ({
      id: account.id,
      qbId: account.qb_id,
      name: account.name,
      accountType: account.account_type,
      accountSubType: account.account_sub_type,
      classification: account.classification,
      currentBalance: account.current_balance,
      active: account.active,
      description: account.description,
      lastSynced: account.last_synced_at,
      // Extract account number if it exists (like "1000 Compte RBC")
      accountNumber: account.name?.match(/^\d+/)?.[0] || null
    })) || []

    return NextResponse.json({
      success: true,
      count: formattedAccounts.length,
      accounts: formattedAccounts,
      filters: {
        type: type || 'all',
        activeOnly
      }
    })

  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', message: error.message },
      { status: 500 }
    )
  }
}
