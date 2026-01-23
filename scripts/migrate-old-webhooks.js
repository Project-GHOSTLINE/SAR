/**
 * Migrate Old VoPay Webhooks to Unified webhook_logs Table
 *
 * Migrates 964 production webhooks from vopay_webhook_logs to webhook_logs
 * Only migrates production data (excludes sandbox/test)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateWebhooks() {
  console.log('🔄 Migrating VoPay Webhooks to Unified Table')
  console.log('=' .repeat(60))
  console.log('')

  // 1. Count existing webhooks in old table
  const { count: oldCount } = await supabase
    .from('vopay_webhook_logs')
    .select('*', { count: 'exact', head: true })
    .ilike('environment', 'production')

  console.log(`📊 Found ${oldCount} production webhooks in vopay_webhook_logs`)

  // 2. Count existing in new table
  const { count: newCount } = await supabase
    .from('webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'vopay')

  console.log(`📊 Currently ${newCount} VoPay webhooks in webhook_logs`)
  console.log(`📦 Need to migrate: ${oldCount - newCount} webhooks`)
  console.log('')

  if (oldCount <= newCount) {
    console.log('✅ All webhooks already migrated!')
    return
  }

  // 3. Fetch old webhooks in batches
  console.log('🔄 Starting migration...')

  let migrated = 0
  let errors = 0
  let from = 0
  const batchSize = 100

  while (true) {
    // Fetch batch from old table
    const { data: oldWebhooks, error: fetchError } = await supabase
      .from('vopay_webhook_logs')
      .select('*')
      .ilike('environment', 'production')
      .order('received_at', { ascending: true })
      .range(from, from + batchSize - 1)

    if (fetchError) {
      console.error('❌ Error fetching batch:', fetchError.message)
      break
    }

    if (!oldWebhooks || oldWebhooks.length === 0) break

    // Transform and insert into new table
    for (const old of oldWebhooks) {
      // Check if already exists (by transaction_id)
      const { data: existing } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('external_id', old.transaction_id)
        .eq('provider', 'vopay')
        .single()

      if (existing) {
        // Skip, already migrated
        continue
      }

      // Map old status to new status
      const mapStatus = (oldStatus) => {
        const status = (oldStatus || '').toLowerCase()
        if (status === 'successful' || status === 'complete') return 'completed'
        if (status === 'failed' || status === 'cancelled') return 'failed'
        if (status === 'pending' || status === 'in progress') return 'processing'
        return 'received'
      }

      // Insert into new table
      const { error: insertError } = await supabase
        .from('webhook_logs')
        .insert({
          provider: 'vopay',
          event_type: old.transaction_type || 'transaction',
          status: mapStatus(old.status),
          payload: old.raw_payload || {},
          error_message: old.failure_reason,
          external_id: old.transaction_id,
          signature: old.validation_key,
          is_validated: old.is_validated || false,
          environment: 'production',
          received_at: old.received_at || old.created_at,
          processed_at: old.processed_at,
          created_at: old.created_at,
          updated_at: old.updated_at
        })

      if (insertError) {
        console.error(`   ❌ Error migrating ${old.transaction_id}:`, insertError.message)
        errors++
      } else {
        migrated++
      }
    }

    from += batchSize
    process.stdout.write(`\r   Migrated ${migrated} webhooks (${errors} errors)...`)

    if (oldWebhooks.length < batchSize) break
  }

  console.log(`\n`)
  console.log('=' .repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('=' .repeat(60))
  console.log(`✅ Migrated: ${migrated} webhooks`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`📈 Success rate: ${((migrated / (migrated + errors)) * 100).toFixed(1)}%`)
  console.log('')

  // Verify final count
  const { count: finalCount } = await supabase
    .from('webhook_logs')
    .select('*', { count: 'exact', head: true })
    .eq('provider', 'vopay')

  console.log(`✅ Total VoPay webhooks in webhook_logs: ${finalCount}`)
  console.log('')
  console.log('🎉 Migration complete!')
}

migrateWebhooks().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
