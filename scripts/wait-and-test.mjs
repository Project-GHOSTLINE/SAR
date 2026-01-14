#!/usr/bin/env node
/**
 * Wait for schema cache refresh then test
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  log('blue', '\n⏳ Waiting for schema cache to refresh...\n')

  for (let i = 0; i < 6; i++) {
    log('yellow', `Attempt ${i + 1}/6...`)

    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('count')
        .limit(1)

      if (!error) {
        log('green', '\n✅ SUCCESS! Tables are accessible!')
        return true
      } else if (!error.message.includes('schema cache')) {
        log('red', `\nError: ${error.message}`)
        return false
      }
    } catch (err) {
      log('yellow', `Still waiting...`)
    }

    if (i < 5) await sleep(5000) // Wait 5 seconds
  }

  log('red', '\n❌ Tables still not accessible after 30 seconds')
  log('yellow', '\nThis means either:')
  log('blue', '  1. SQL was not executed in Supabase SQL Editor')
  log('blue', '  2. SQL had errors during execution')
  log('blue', '  3. Schema cache needs manual refresh (restart Supabase)')
  return false
}

checkTables().then(success => {
  if (success) {
    log('green', '\n🎉 Ready to run full test suite!')
    log('blue', '\nRun: node scripts/test-titan-system.mjs\n')
    process.exit(0)
  } else {
    log('red', '\n❌ Tables not ready. Please verify SQL execution.\n')
    process.exit(1)
  }
})
