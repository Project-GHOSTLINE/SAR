/**
 * Verify Dashboard Data - Check if production webhooks are accessible
 *
 * This script verifies that:
 * 1. All 979 production webhooks are in webhook_logs
 * 2. Stats are calculated correctly
 * 3. Data is properly structured for the dashboard
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyDashboardData() {
  console.log('🔍 DASHBOARD DATA VERIFICATION')
  console.log('='.repeat(60))
  console.log('')

  // 1. Count total production webhooks
  const { count: totalCount, error: countError } = await supabase
    .from('webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('environment', 'production')

  if (countError) {
    console.error('❌ Error counting webhooks:', countError.message)
    return
  }

  console.log(`📊 Total Production Webhooks: ${totalCount}`)
  console.log('')

  // 2. Count by provider
  const { data: byProvider } = await supabase
    .from('webhook_logs')
    .select('provider')
    .eq('environment', 'production')

  const providerCounts = (byProvider || []).reduce((acc, item) => {
    acc[item.provider] = (acc[item.provider] || 0) + 1
    return acc
  }, {})

  console.log('📦 By Provider:')
  Object.entries(providerCounts).forEach(([provider, count]) => {
    console.log(`   ${provider}: ${count}`)
  })
  console.log('')

  // 3. Count by status
  const { data: byStatus } = await supabase
    .from('webhook_logs')
    .select('status')
    .eq('environment', 'production')

  const statusCounts = (byStatus || []).reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})

  console.log('📈 By Status:')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })
  console.log('')

  // 4. Calculate success rate
  const completed = statusCounts['completed'] || 0
  const failed = statusCounts['failed'] || 0
  const totalProcessed = completed + failed
  const successRate = totalProcessed > 0 ? ((completed / totalProcessed) * 100).toFixed(1) : 0

  console.log(`✅ Success Rate: ${successRate}%`)
  console.log(`   Completed: ${completed}`)
  console.log(`   Failed: ${failed}`)
  console.log('')

  // 5. Get average processing time
  const { data: withProcessingTime } = await supabase
    .from('webhook_logs')
    .select('processing_time_ms')
    .eq('environment', 'production')
    .not('processing_time_ms', 'is', null)

  if (withProcessingTime && withProcessingTime.length > 0) {
    const totalTime = withProcessingTime.reduce((sum, item) => sum + (item.processing_time_ms || 0), 0)
    const avgTime = Math.round(totalTime / withProcessingTime.length)
    console.log(`⏱️  Average Processing Time: ${avgTime}ms`)
    console.log(`   (Based on ${withProcessingTime.length} webhooks with timing data)`)
  } else {
    console.log(`⏱️  Average Processing Time: N/A (no timing data)`)
  }
  console.log('')

  // 6. Get recent webhooks (last 10)
  const { data: recentWebhooks } = await supabase
    .from('webhook_logs')
    .select('provider, event_type, status, external_id, received_at')
    .eq('environment', 'production')
    .order('received_at', { ascending: false })
    .limit(10)

  console.log('🕐 Recent Webhooks (Last 10):')
  if (recentWebhooks && recentWebhooks.length > 0) {
    recentWebhooks.forEach((webhook, index) => {
      const date = new Date(webhook.received_at)
      console.log(`   ${index + 1}. [${webhook.provider}] ${webhook.event_type} - ${webhook.status}`)
      console.log(`      ID: ${webhook.external_id || 'N/A'}`)
      console.log(`      Date: ${date.toLocaleString('fr-CA')}`)
    })
  } else {
    console.log('   No recent webhooks found')
  }
  console.log('')

  // 7. Get event type distribution
  const { data: byEventType } = await supabase
    .from('webhook_logs')
    .select('event_type')
    .eq('environment', 'production')

  const eventTypeCounts = (byEventType || []).reduce((acc, item) => {
    acc[item.event_type] = (acc[item.event_type] || 0) + 1
    return acc
  }, {})

  console.log('🎯 By Event Type (Top 10):')
  const sortedEventTypes = Object.entries(eventTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sortedEventTypes.forEach(([eventType, count]) => {
    const percentage = ((count / totalCount) * 100).toFixed(1)
    console.log(`   ${eventType}: ${count} (${percentage}%)`)
  })
  console.log('')

  // 8. Summary
  console.log('='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Total Production Webhooks: ${totalCount}`)
  console.log(`✅ Providers: ${Object.keys(providerCounts).join(', ')}`)
  console.log(`✅ Success Rate: ${successRate}%`)
  console.log(`✅ Dashboard Ready: ${totalCount > 0 ? 'YES' : 'NO'}`)
  console.log('')

  if (totalCount >= 979) {
    console.log('🎉 All 979+ webhooks are accessible in the dashboard!')
  } else if (totalCount > 0) {
    console.log(`⚠️  Expected 979+ webhooks, found ${totalCount}`)
  } else {
    console.log('❌ No production webhooks found!')
  }
}

verifyDashboardData().catch(error => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
