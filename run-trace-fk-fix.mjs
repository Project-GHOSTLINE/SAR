#!/usr/bin/env node
// ============================================
// Script: Remove trace_id FK constraint
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante')
  console.log('\nExécutez avec:')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_key node run-trace-fk-fix.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

console.log('🚀 Migration: Remove trace_id FK constraint')
console.log('📍 URL:', SUPABASE_URL)
console.log('')

// SQL command to drop the constraint
const dropConstraintSQL = `
ALTER TABLE public.client_telemetry_events
DROP CONSTRAINT IF EXISTS fk_trace;
`

console.log('🔄 Dropping FK constraint fk_trace...')

try {
  // Execute the SQL directly using Supabase client
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: dropConstraintSQL
  })

  if (error) {
    // Try alternate approach - use raw query if RPC doesn't work
    console.log('⚠️  RPC failed, trying alternate approach...')

    // Check if constraint exists first
    const { data: constraints, error: checkError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'client_telemetry_events')
      .eq('constraint_name', 'fk_trace')
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking constraint:', checkError.message)
      console.log('\n⚠️  Manual action required:')
      console.log('   1. Go to Supabase SQL Editor')
      console.log('   2. Run: ALTER TABLE public.client_telemetry_events DROP CONSTRAINT IF EXISTS fk_trace;')
      process.exit(1)
    }

    if (constraints) {
      console.log('✅ Constraint exists and needs to be dropped manually')
      console.log('\n⚠️  Manual action required:')
      console.log('   1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/' + SUPABASE_URL.split('//')[1].split('.')[0] + '/sql')
      console.log('   2. Run: ALTER TABLE public.client_telemetry_events DROP CONSTRAINT IF EXISTS fk_trace;')
    } else {
      console.log('✅ Constraint fk_trace does not exist (already removed or never existed)')
    }
  } else {
    console.log('✅ FK constraint dropped successfully')
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message)
  console.log('\n⚠️  Manual action required:')
  console.log('   1. Go to Supabase SQL Editor')
  console.log('   2. Run: ALTER TABLE public.client_telemetry_events DROP CONSTRAINT IF EXISTS fk_trace;')
}

console.log('\n✅ Migration script completed!')
