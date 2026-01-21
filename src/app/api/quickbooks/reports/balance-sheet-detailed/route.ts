import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Get detailed Balance Sheet with all account balances
 * This is the CORRECT way to get account balances in QuickBooks
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

    // Check if token needs refresh
    const expiresAt = new Date(tokenData.expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilExpiry < 1) {
      return NextResponse.json(
        { error: 'Token expired or about to expire, please refresh' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('date') // format: YYYY-MM-DD
    const accountingMethod = searchParams.get('accounting_method') || 'Accrual' // or 'Cash'

    const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const baseUrl = environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    // Build query params
    const params = new URLSearchParams({
      accounting_method: accountingMethod,
      minorversion: '65'
    })

    if (asOfDate) {
      params.append('date_macro', 'All')
      params.append('end_date', asOfDate)
    }

    console.log(`Fetching Balance Sheet from QuickBooks...`)
    const response = await fetch(
      `${baseUrl}/v3/company/${tokenData.realm_id}/reports/BalanceSheet?${params.toString()}`,
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

      // Parse error for better message
      let errorMessage = 'Failed to fetch balance sheet'
      try {
        const errorData = JSON.parse(error)
        if (errorData.Fault?.Error?.[0]?.code === '3100') {
          errorMessage = 'Authorization failed - please reconnect QuickBooks with proper scopes'
        } else if (errorData.Fault?.Error?.[0]?.Message) {
          errorMessage = errorData.Fault.Error[0].Message
        }
      } catch (e) {
        // ignore parse error
      }

      return NextResponse.json(
        {
          error: errorMessage,
          status: response.status,
          details: error
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Parse the Balance Sheet to extract account balances
    const accounts: any[] = []
    const bankAccounts: any[] = []

    // Balance Sheet structure: Rows -> Rows -> Rows (nested)
    // Assets, Liabilities, Equity each have their own sections
    const parseRows = (rows: any[], category: string, type: string) => {
      if (!rows) return

      for (const row of rows) {
        if (row.type === 'Section' && row.Rows) {
          // This is a section (e.g., "Current Assets", "Bank Accounts")
          parseRows(row.Rows.Row, category, row.Header?.ColData?.[0]?.value || type)
        } else if (row.type === 'Data' && row.ColData) {
          // This is an actual account line
          const accountName = row.ColData[0]?.value || ''
          const balance = parseFloat(row.ColData[1]?.value?.replace(/,/g, '') || '0')

          // Extract account number if present (e.g., "1000 Compte RBC")
          const accountNumber = accountName.match(/^(\d+)/)?.[1] || null

          const accountInfo = {
            name: accountName,
            accountNumber,
            balance,
            category,
            type,
            href: row.ColData[0]?.href || null
          }

          accounts.push(accountInfo)

          // Identify bank accounts (usually in "Bank Accounts" section or start with 10xx)
          if (type.includes('Bank') || (accountNumber && accountNumber.startsWith('10'))) {
            bankAccounts.push(accountInfo)
          }
        }
      }
    }

    // Parse all sections
    const rows = data.Rows?.Row || []
    for (const row of rows) {
      if (row.type === 'Section') {
        const sectionName = row.Header?.ColData?.[0]?.value || ''
        if (row.Rows) {
          parseRows(row.Rows.Row, sectionName, sectionName)
        }
      }
    }

    // Get report metadata
    const reportName = data.Header?.ReportName
    const reportDate = data.Header?.Time
    const currency = data.Header?.Currency
    const asOf = data.Columns?.Column?.find((c: any) => c.ColTitle)?.ColTitle || ''

    return NextResponse.json({
      success: true,
      report: {
        name: reportName,
        date: reportDate,
        currency,
        asOf
      },
      summary: {
        totalAccounts: accounts.length,
        bankAccounts: bankAccounts.length
      },
      bankAccounts: bankAccounts.map(acc => ({
        accountNumber: acc.accountNumber,
        name: acc.name,
        balance: acc.balance,
        formattedBalance: new Intl.NumberFormat('fr-CA', {
          style: 'currency',
          currency: currency || 'CAD'
        }).format(acc.balance)
      })),
      allAccounts: accounts,
      rawReport: data // Include full report for debugging
    })

  } catch (error: any) {
    console.error('Error fetching balance sheet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet', message: error.message },
      { status: 500 }
    )
  }
}
