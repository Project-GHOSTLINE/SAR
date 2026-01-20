import { createClient } from '@supabase/supabase-js'

async function testCustomers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: tokenData } = await supabase
    .from('quickbooks_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const baseUrl = 'https://sandbox-quickbooks.api.intuit.com'
  const url = `${baseUrl}/v3/company/${tokenData.realm_id}/query?query=SELECT * FROM Customer MAXRESULTS 5`

  console.log('Testing Customer query...')
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/json'
    }
  })

  console.log('Status:', response.status)
  const data = await response.text()
  console.log('Response (first 500 chars):', data.substring(0, 500))
}

testCustomers().catch(console.error)
