#!/usr/bin/env node

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Read the SQL fix file
const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260202000001_fix_devops_stats_function.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

// Connection config
const config = {
  host: 'db.dllyzfuqjzuhvshrlmuq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Solution%99',
  ssl: { rejectUnauthorized: false }
}

async function applyFix() {
  const client = new Client(config)

  try {
    console.log('🔌 Connecting to Supabase database...')
    await client.connect()
    console.log('✅ Connected!')
    console.log('')

    console.log('🔧 Applying SQL fix...')
    console.log('📄 File:', sqlPath)
    console.log('')

    await client.query(sql)
    console.log('✅ SQL fix applied successfully!')
    console.log('')

    // Test the function
    console.log('🧪 Testing get_devops_stats() function...')
    const result = await client.query('SELECT * FROM get_devops_stats()')
    console.log('✅ Function works!')
    console.log('📊 Stats:', JSON.stringify(result.rows[0], null, 2))
    console.log('')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Connection closed')
  }
}

applyFix()
