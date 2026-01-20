import { createClient } from '@supabase/supabase-js'

async function testReport() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get token
  const { data: tokenData } = await supabase
    .from('quickbooks_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('Token data:', {
    realm_id: tokenData.realm_id,
    company_name: tokenData.company_name,
    expires_at: tokenData.expires_at,
    expired: new Date(tokenData.expires_at) < new Date()
  })

  const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox'
  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

  const startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]

  const reportUrl = new URL(`${baseUrl}/v3/company/${tokenData.realm_id}/reports/ProfitAndLoss`)
  reportUrl.searchParams.set('start_date', startDate)
  reportUrl.searchParams.set('end_date', endDate)
  reportUrl.searchParams.set('accounting_method', 'Accrual')

  console.log('\nFetching from:', reportUrl.toString())

  const response = await fetch(reportUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/json'
    }
  })

  console.log('Response status:', response.status)

  const text = await response.text()
  console.log('\nResponse body (first 1000 chars):')
  console.log(text.substring(0, 1000))

  if (!response.ok) {
    try {
      const json = JSON.parse(text)
      console.log('\nParsed error:', JSON.stringify(json, null, 2))
    } catch (e) {
      console.log('Could not parse as JSON')
    }
  }
}

testReport().catch(console.error)
