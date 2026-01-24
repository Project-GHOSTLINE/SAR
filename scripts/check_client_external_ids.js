/**
 * Check if client_external_ids table exists and has margill mappings
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTable() {
  console.log('🔍 Checking client_external_ids table...\n')

  // Check if table exists
  const { data: tableData, error: tableError } = await supabase
    .from('client_external_ids')
    .select('*')
    .limit(5)

  if (tableError) {
    console.error('❌ Table does NOT exist or is not accessible')
    console.error('Error:', tableError.message)
    return
  }

  console.log('✅ Table EXISTS\n')

  // Show structure
  if (tableData && tableData.length > 0) {
    console.log('📋 Sample records:', tableData.length)
    console.log('Columns:', Object.keys(tableData[0]).join(', '))
    console.log('\nFirst record:')
    console.log(JSON.stringify(tableData[0], null, 2))
  } else {
    console.log('⚠️  Table is EMPTY (no records)')
  }

  // Check for margill provider
  const { data: margillData, count: margillCount } = await supabase
    .from('client_external_ids')
    .select('*', { count: 'exact', head: false })
    .eq('provider', 'margill')
    .limit(3)

  console.log(`\n🔎 Margill mappings: ${margillCount || 0} found`)

  if (margillData && margillData.length > 0) {
    console.log('Sample margill mappings:')
    margillData.forEach((m, i) => {
      console.log(`  ${i + 1}. client_id: ${m.client_id}, external_id: ${m.external_id}`)
    })
  }
}

checkTable().catch(console.error)
