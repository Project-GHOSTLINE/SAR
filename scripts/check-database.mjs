#!/usr/bin/env node
/**
 * 🔍 Check Database Tables
 * Verifies what tables actually exist in the database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  const supabase = createClient(supabaseUrl, supabaseKey)

  log('blue', '\n🔍 Checking Database Tables...\n')

  // Try to query information_schema
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')

    if (error) {
      log('yellow', `⚠️  Cannot query information_schema: ${error.message}`)
      log('yellow', '⚠️  This is expected - Supabase restricts direct information_schema access\n')
    } else if (data) {
      log('green', `✅ Found ${data.length} tables:`)
      data.forEach(row => log('blue', `   - ${row.table_name}`))
    }
  } catch (err) {
    log('yellow', `⚠️  Error: ${err.message}\n`)
  }

  // Alternative: Try to list tables by attempting to query each one
  log('blue', '\n📊 Attempting direct table queries...\n')

  const expectedTables = [
    'loan_applications',
    'loan_objectives',
    'cortex_rules',
    'cortex_execution_logs',
    'metrics_log',
    'ab_tests',
    'ab_test_assignments',
    'workflows',
    'workflow_executions',
    'notification_templates',
    'notification_logs',
    'ml_models',
    'ml_predictions',
    'api_keys',
    'audit_logs',
  ]

  const existingTables = []
  const missingTables = []

  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('schema cache')) {
          log('yellow', `⚠️  ${table} - Not in schema cache`)
          missingTables.push(table)
        } else {
          log('red', `❌ ${table} - Error: ${error.message}`)
          missingTables.push(table)
        }
      } else {
        log('green', `✅ ${table} - EXISTS`)
        existingTables.push(table)
      }
    } catch (err) {
      log('red', `❌ ${table} - Exception: ${err.message}`)
      missingTables.push(table)
    }
  }

  log('blue', '\n════════════════════════════════════════')
  log('blue', '📊 SUMMARY')
  log('blue', '════════════════════════════════════════')
  log('green', `✅ Existing tables: ${existingTables.length}/${expectedTables.length}`)
  log('red', `❌ Missing tables: ${missingTables.length}/${expectedTables.length}`)

  if (missingTables.length > 0) {
    log('yellow', '\n⚠️  Missing tables:')
    missingTables.forEach(table => log('blue', `   - ${table}`))
  }

  if (existingTables.length === 0) {
    log('red', '\n❌ NO TABLES FOUND!')
    log('yellow', '\n📋 Possible causes:')
    log('blue', '   1. SQL was not executed in Supabase SQL Editor')
    log('blue', '   2. SQL execution had errors (check Supabase logs)')
    log('blue', '   3. Tables created in wrong schema (not "public")')
    log('blue', '   4. Wrong Supabase project connected')
    log('yellow', '\n💡 Next steps:')
    log('blue', '   1. Go to: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor')
    log('blue', '   2. Check the "Tables" section in left sidebar')
    log('blue', '   3. If empty, re-run the SQL from database/titan-system.sql')
    log('blue', '   4. Check for any error messages in SQL Editor')
  } else if (missingTables.length > 0) {
    log('yellow', '\n⚠️  Some tables are missing')
    log('blue', '   The SQL migration may have partially failed')
    log('blue', '   Check Supabase logs for errors')
  } else {
    log('green', '\n🎉 ALL TABLES EXIST!')
    log('green', '   Migration was successful!')
  }

  log('blue', '\n════════════════════════════════════════\n')
}

checkDatabase().catch(error => {
  log('red', `\n❌ Fatal error: ${error.message}`)
  process.exit(1)
})
