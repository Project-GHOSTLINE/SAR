import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get Balance Sheet report from QuickBooks (real-time)
 * Query params:
 * - date: YYYY-MM-DD (default: today) - Balance sheet as of this date
 * - accounting_method: Cash or Accrual (default: Accrual)
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const accountingMethod = searchParams.get('accounting_method') || 'Accrual'

    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const baseUrl = environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    // Build report URL with parameters
    const reportUrl = new URL(`${baseUrl}/v3/company/${tokenData.realm_id}/reports/BalanceSheet`)
    reportUrl.searchParams.set('date', date)
    reportUrl.searchParams.set('accounting_method', accountingMethod)

    console.log('Fetching Balance Sheet report:', reportUrl.toString())

    // Fetch report from QuickBooks (real-time)
    const response = await fetch(reportUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('QuickBooks API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Balance Sheet report' },
        { status: response.status }
      )
    }

    const reportData = await response.json()

    console.log('✅ Balance Sheet report fetched successfully')

    return NextResponse.json({
      success: true,
      report: reportData,
      parameters: {
        date: date,
        accounting_method: accountingMethod,
        company_name: tokenData.company_name,
        realm_id: tokenData.realm_id
      },
      fetched_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching Balance Sheet report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report', message: error.message },
      { status: 500 }
    )
  }
}
