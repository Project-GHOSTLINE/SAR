import { createClient } from '@supabase/supabase-js'

async function deleteToken() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('Deleting existing QuickBooks tokens...')

  const { data: tokens, error: selectError } = await supabase
    .from('quickbooks_tokens')
    .select('*')

  if (selectError) {
    console.error('Error fetching tokens:', selectError)
    return
  }

  console.log(`Found ${tokens.length} token(s):`)
  tokens.forEach(token => {
    console.log(`  - Realm ID: ${token.realm_id}, Company: ${token.company_name}, Created: ${token.created_at}`)
  })

  const { error: deleteError } = await supabase
    .from('quickbooks_tokens')
    .delete()
    .neq('realm_id', 'IMPOSSIBLE_VALUE') // Delete all

  if (deleteError) {
    console.error('Error deleting tokens:', deleteError)
    return
  }

  console.log('✅ All tokens deleted successfully!')
  console.log('\nNext steps:')
  console.log('1. Go to https://admin.solutionargentrapide.ca/admin/quickbooks')
  console.log('2. Click "Connecter QuickBooks"')
  console.log('3. Authorize ALL permissions requested')
  console.log('4. You should now have full access to QuickBooks API')
}

deleteToken().catch(console.error)
