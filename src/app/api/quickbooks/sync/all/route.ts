import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Full sync - syncs all data from QuickBooks
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL

    console.log('Starting full QuickBooks sync...')

    const results = {
      customers: { success: false, count: 0, error: null },
      invoices: { success: false, count: 0, error: null },
      payments: { success: false, count: 0, error: null },
      accounts: { success: false, count: 0, error: null },
      vendors: { success: false, count: 0, error: null }
    }

    // Sync customers
    try {
      const customersRes = await fetch(`${baseUrl}/api/quickbooks/sync/customers`, {
        method: 'POST',
        credentials: 'include'
      })
      if (customersRes.ok) {
        const data = await customersRes.json()
        results.customers = { success: true, count: data.count, error: null }
      } else {
        const error = await customersRes.text()
        results.customers = { success: false, count: 0, error }
      }
    } catch (error: any) {
      results.customers = { success: false, count: 0, error: error.message }
    }

    // Sync invoices
    try {
      const invoicesRes = await fetch(`${baseUrl}/api/quickbooks/sync/invoices`, {
        method: 'POST',
        credentials: 'include'
      })
      if (invoicesRes.ok) {
        const data = await invoicesRes.json()
        results.invoices = { success: true, count: data.count, error: null }
      } else {
        const error = await invoicesRes.text()
        results.invoices = { success: false, count: 0, error }
      }
    } catch (error: any) {
      results.invoices = { success: false, count: 0, error: error.message }
    }

    // Sync payments
    try {
      const paymentsRes = await fetch(`${baseUrl}/api/quickbooks/sync/payments`, {
        method: 'POST',
        credentials: 'include'
      })
      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        results.payments = { success: true, count: data.count, error: null }
      } else {
        const error = await paymentsRes.text()
        results.payments = { success: false, count: 0, error }
      }
    } catch (error: any) {
      results.payments = { success: false, count: 0, error: error.message }
    }

    // Sync accounts
    try {
      const accountsRes = await fetch(`${baseUrl}/api/quickbooks/sync/accounts`, {
        method: 'POST',
        credentials: 'include'
      })
      if (accountsRes.ok) {
        const data = await accountsRes.json()
        results.accounts = { success: true, count: data.count, error: null }
      } else {
        const error = await accountsRes.text()
        results.accounts = { success: false, count: 0, error }
      }
    } catch (error: any) {
      results.accounts = { success: false, count: 0, error: error.message }
    }

    // Sync vendors
    try {
      const vendorsRes = await fetch(`${baseUrl}/api/quickbooks/sync/vendors`, {
        method: 'POST',
        credentials: 'include'
      })
      if (vendorsRes.ok) {
        const data = await vendorsRes.json()
        results.vendors = { success: true, count: data.count, error: null }
      } else {
        const error = await vendorsRes.text()
        results.vendors = { success: false, count: 0, error }
      }
    } catch (error: any) {
      results.vendors = { success: false, count: 0, error: error.message }
    }

    const totalCount = Object.values(results).reduce((sum, r) => sum + r.count, 0)
    const successCount = Object.values(results).filter(r => r.success).length

    console.log(`✅ Full sync completed: ${successCount}/5 successful, ${totalCount} total records`)

    return NextResponse.json({
      success: true,
      results,
      totalCount,
      successCount,
      message: `Synced ${totalCount} total records (${successCount}/5 categories successful)`
    })

  } catch (error: any) {
    console.error('Error in full sync:', error)
    return NextResponse.json(
      { error: 'Failed to complete full sync', message: error.message },
      { status: 500 }
    )
  }
}
