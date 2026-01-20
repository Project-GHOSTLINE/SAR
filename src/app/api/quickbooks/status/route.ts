import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check if QuickBooks tokens exist in database
    const { data: tokens, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !tokens) {
      return NextResponse.json({
        connection: {
          connected: false
        }
      })
    }

    // Check if token is still valid
    const expiryDate = new Date(tokens.expires_at)
    const isExpired = expiryDate < new Date()

    return NextResponse.json({
      connection: {
        connected: !isExpired,
        companyName: tokens.company_name,
        realmId: tokens.realm_id,
        lastSync: tokens.last_sync_at,
        tokenExpiry: tokens.expires_at
      }
    })

  } catch (error) {
    console.error('Error checking QuickBooks status:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
