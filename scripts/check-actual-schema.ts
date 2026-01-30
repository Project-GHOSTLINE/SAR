/**
 * Check actual database schema
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('🔍 CHECKING ACTUAL DATABASE SCHEMA\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check telemetry_requests columns
  console.log('📊 telemetry_requests:');
  const { data: tr, error: trErr } = await supabase
    .from('telemetry_requests')
    .select('*')
    .limit(1);

  if (tr && tr[0]) {
    console.log('   Columns:', Object.keys(tr[0]).join(', '));
  }
  console.log('');

  // Check telemetry_events columns
  console.log('📊 telemetry_events:');
  const { data: te, error: teErr } = await supabase
    .from('telemetry_events')
    .select('*')
    .limit(1);

  if (te && te[0]) {
    console.log('   Columns:', Object.keys(te[0]).join(', '));
  } else if (teErr) {
    console.log('   Error:', teErr.message);
  }
  console.log('');

  // Check loan_applications columns
  console.log('📊 loan_applications:');
  const { data: la, error: laErr } = await supabase
    .from('loan_applications')
    .select('*')
    .limit(1);

  if (la && la[0]) {
    console.log('   Columns:', Object.keys(la[0]).join(', '));
  } else if (laErr) {
    console.log('   Error:', laErr.message);
  }
  console.log('');

  // Check if client_accounts exists
  console.log('📊 client_accounts:');
  const { data: ca, error: caErr } = await supabase
    .from('client_accounts')
    .select('*')
    .limit(1);

  if (ca !== null) {
    if (ca[0]) {
      console.log('   ✅ Table exists');
      console.log('   Columns:', Object.keys(ca[0]).join(', '));
    } else {
      console.log('   ✅ Table exists (empty)');
    }
  } else if (caErr) {
    console.log('   ❌ Table does NOT exist');
    console.log('   Error:', caErr.message);
  }
  console.log('');

  // Check client_sessions
  console.log('📊 client_sessions:');
  const { data: cs, error: csErr } = await supabase
    .from('client_sessions')
    .select('*')
    .limit(1);

  if (cs !== null) {
    if (cs[0]) {
      console.log('   ✅ Table exists');
      console.log('   Columns:', Object.keys(cs[0]).join(', '));
    } else {
      console.log('   ✅ Table exists (empty)');
    }
  } else if (csErr) {
    console.log('   ❌ Table does NOT exist');
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkSchema().catch(console.error);
