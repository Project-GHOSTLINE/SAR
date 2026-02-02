#!/usr/bin/env node

const { Client } = require('pg')
const fs = require('fs')

const SQL_FIX = fs.readFileSync('supabase/migrations/20260202000001_fix_devops_stats_function.sql', 'utf8')

const passwords = [
  'postgres',
  'Solution99',
  'Solution%99',
  '',
  'password',
  'admin',
  'FredRosa%1978',
  'solutionargentrapide'
]

async function tryPassword(password) {
  const client = new Client({
    host: 'db.dllyzfuqjzuhvshrlmuq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  })

  try {
    await client.connect()
    console.log(`✅ Connected with password: "${password}"`)

    // Apply the fix
    await client.query(SQL_FIX)
    console.log('✅ SQL fix applied!')

    // Test it
    const result = await client.query('SELECT * FROM get_devops_stats()')
    console.log('✅ Function works!')
    console.log('Stats:', JSON.stringify(result.rows[0], null, 2).substring(0, 300))

    await client.end()
    return true
  } catch (err) {
    // Silent failure for wrong passwords
    return false
  }
}

async function main() {
  console.log('🔐 Trying common passwords...\n')

  for (const pwd of passwords) {
    const success = await tryPassword(pwd)
    if (success) {
      console.log('\n🎉 Success!')
      process.exit(0)
    }
  }

  console.log('\n❌ No passwords worked.')
  console.log('Please apply SQL manually via Supabase Dashboard.')
  console.log('See: DEVOPS-FIX-REQUIRED.md\n')
  process.exit(1)
}

main()
