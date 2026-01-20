import { createClient } from '@supabase/supabase-js'

async function testUpsert() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Testing upsert with test data...')

  const testData = {
    realm_id: 'TEST_REALM_123',
    company_name: 'Test Company',
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    token_type: 'Bearer',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    refresh_token_expires_at: new Date(Date.now() + 8640000).toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('quickbooks_tokens')
    .upsert(testData, {
      onConflict: 'realm_id'
    })

  if (error) {
    console.error('❌ Upsert failed:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
  } else {
    console.log('✅ Upsert succeeded')
    console.log('Data:', data)
  }
}

testUpsert()
