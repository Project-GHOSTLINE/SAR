import { createClient } from '@supabase/supabase-js'

async function checkStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Checking QuickBooks connection status...\n')

  const { data: tokens, error } = await supabase
    .from('quickbooks_tokens')
    .select('*')

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!tokens || tokens.length === 0) {
    console.log('❌ NO QUICKBOOKS TOKEN FOUND')
    console.log('\nQuickBooks is NOT connected.')
    console.log('\nACTION REQUIRED:')
    console.log('1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks')
    console.log('2. Click "Connecter QuickBooks"')
    console.log('3. Authorize ALL permissions')
    return
  }

  const token = tokens[0]
  const now = new Date()
  const expiresAt = new Date(token.expires_at)
  const isExpired = expiresAt < now

  console.log('✅ Token found in database:')
  console.log(`   Realm ID: ${token.realm_id}`)
  console.log(`   Company: ${token.company_name}`)
  console.log(`   Created: ${token.created_at}`)
  console.log(`   Expires: ${token.expires_at}`)
  console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`)

  if (isExpired) {
    console.log('\n❌ Token is EXPIRED')
    console.log('\nACTION REQUIRED:')
    console.log('Reconnect QuickBooks to get a fresh token')
  } else {
    console.log('\n✅ Token is VALID')
    console.log('\nTesting API access...')

    // Test API call
    const baseUrl = 'https://sandbox-quickbooks.api.intuit.com'
    const testUrl = `${baseUrl}/v3/company/${token.realm_id}/companyinfo/${token.realm_id}`

    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    })

    console.log(`API Test: ${response.status}`)

    if (response.status === 403) {
      const data = await response.json()
      console.log('\n❌ Error 403: ApplicationAuthorizationFailed')
      console.log('Error:', data.fault?.error?.[0]?.message)
      console.log('\nPROBLEM: Insufficient OAuth scopes')
      console.log('\nACTION REQUIRED:')
      console.log('1. Go to Intuit Developer Dashboard')
      console.log('2. Enable these scopes: Accounting, OpenID, Profile, Email')
      console.log('3. Reconnect QuickBooks')
    } else if (response.ok) {
      console.log('\n✅ API ACCESS WORKING!')
      console.log('QuickBooks integration is fully operational.')
    } else {
      console.log(`\n❌ Unexpected status: ${response.status}`)
      const text = await response.text()
      console.log('Response:', text.substring(0, 200))
    }
  }
}

checkStatus().catch(console.error)
