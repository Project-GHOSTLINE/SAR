/**
 * Check recent webhook_logs entries
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🔍 Checking recent webhook logs...\n')

  // Get last 20 webhook logs
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('📭 No webhook logs found')
    return
  }

  console.log(`Found ${data.length} recent webhooks:\n`)

  data.forEach(log => {
    console.log(`${log.provider.toUpperCase()} - ${log.event_type}`)
    console.log(`  ID: ${log.external_id || 'N/A'}`)
    console.log(`  Status: ${log.status}`)
    console.log(`  Environment: ${log.environment}`)
    console.log(`  Received: ${new Date(log.received_at).toLocaleString('fr-CA')}`)
    if (log.error_message) {
      console.log(`  ❌ Error: ${log.error_message}`)
    }
    console.log('')
  })

  // Count by status
  const statusCounts = data.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1
    return acc
  }, {})

  console.log('📊 Status breakdown:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
}

main()
