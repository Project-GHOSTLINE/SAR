import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get Aged Receivables (Accounts Receivable Aging) report from QuickBooks (real-time)
 * Query params:
 * - report_date: YYYY-MM-DD (default: today) - Report as of this date
 * - aging_method: Report_Date or Current (default: Report_Date)
 * - num_periods: Number of aging periods (default: 4)
 * - aging_period: Number of days in each period (default: 30)
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
    const reportDate = searchParams.get('report_date') || new Date().toISOString().split('T')[0]
    const agingMethod = searchParams.get('aging_method') || 'Report_Date'
    const numPeriods = searchParams.get('num_periods') || '4'
    const agingPeriod = searchParams.get('aging_period') || '30'

    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const baseUrl = environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    // Build report URL with parameters
    const reportUrl = new URL(`${baseUrl}/v3/company/${tokenData.realm_id}/reports/AgedReceivables`)
    reportUrl.searchParams.set('report_date', reportDate)
    reportUrl.searchParams.set('aging_method', agingMethod)
    reportUrl.searchParams.set('num_periods', numPeriods)
    reportUrl.searchParams.set('aging_period', agingPeriod)

    console.log('Fetching Aged Receivables report:', reportUrl.toString())

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
        { error: 'Failed to fetch Aged Receivables report' },
        { status: response.status }
      )
    }

    const reportData = await response.json()

    console.log('✅ Aged Receivables report fetched successfully')

    return NextResponse.json({
      success: true,
      report: reportData,
      parameters: {
        report_date: reportDate,
        aging_method: agingMethod,
        num_periods: numPeriods,
        aging_period: agingPeriod,
        company_name: tokenData.company_name,
        realm_id: tokenData.realm_id
      },
      fetched_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching Aged Receivables report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report', message: error.message },
      { status: 500 }
    )
  }
}
