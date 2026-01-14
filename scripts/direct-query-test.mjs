#!/usr/bin/env node
/**
 * 🔍 Direct Query Test - Bypass Schema Cache
 * Tests if tables exist using raw SQL queries
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function directQueryTest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  log('blue', '\n🔍 Direct Query Test - Checking Tables via REST API\n')

  // Query pg_tables to see what actually exists
  const query = `
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ query }),
    })

    log('yellow', `Response status: ${response.status}`)

    const text = await response.text()
    log('blue', `Response: ${text.substring(0, 500)}`)

  } catch (error) {
    log('red', `Error: ${error.message}`)
  }

  // Try accessing PostgREST metadata endpoint
  log('blue', '\n📡 Checking PostgREST Schema...\n')

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    })

    log('yellow', `Schema endpoint status: ${response.status}`)

    if (response.ok) {
      const schema = await response.json()
      log('green', '✅ Available tables/views:')

      const definitions = schema.definitions || {}
      const tableNames = Object.keys(definitions).filter(key => !key.startsWith('_'))

      if (tableNames.length > 0) {
        tableNames.forEach(name => {
          log('blue', `   - ${name}`)
        })
      } else {
        log('red', '❌ No tables found in schema')
      }
    } else {
      const text = await response.text()
      log('red', `Failed: ${text}`)
    }

  } catch (error) {
    log('red', `Error checking schema: ${error.message}`)
  }

  // Try a simple count query on loan_applications
  log('blue', '\n🎯 Testing Direct Table Access...\n')

  const tables = [
    'loan_applications',
    'loan_objectives',
    'cortex_rules',
    'notification_templates',
  ]

  for (const table of tables) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=count`,
        {
          method: 'HEAD',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      )

      if (response.ok) {
        const count = response.headers.get('Content-Range')
        log('green', `✅ ${table} - EXISTS (${count || 'accessible'})`)
      } else {
        log('red', `❌ ${table} - Status ${response.status}`)
      }
    } catch (error) {
      log('red', `❌ ${table} - Error: ${error.message}`)
    }
  }

  log('blue', '\n════════════════════════════════════════\n')
}

directQueryTest().catch(error => {
  log('red', `\n❌ Fatal error: ${error.message}`)
  process.exit(1)
})
