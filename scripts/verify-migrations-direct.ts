/**
 * Direct Migration Verification
 * Bypasses schema cache by querying pg_catalog directly
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyColumns() {
  console.log('\n🔍 Verifying visitor_id columns...\n');

  const tables = ['telemetry_requests', 'telemetry_events', 'applications', 'client_accounts'];

  for (const table of tables) {
    // Query actual table to check if column exists
    const { data, error } = await supabase
      .from(table)
      .select('visitor_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`❌ ${table}.visitor_id: Column does NOT exist`);
      } else {
        console.log(`✅ ${table}.visitor_id: Column exists`);
      }
    } else {
      console.log(`✅ ${table}.visitor_id: Column exists`);
    }
  }
}

async function verifyView() {
  console.log('\n🔍 Verifying visitor_identity_graph view...\n');

  const { data, error } = await supabase
    .from('visitor_identity_graph')
    .select('visitor_id')
    .limit(1);

  if (error) {
    console.log(`❌ visitor_identity_graph: View does NOT exist`);
    console.log(`   Error: ${error.message}`);
  } else {
    console.log(`✅ visitor_identity_graph: View exists`);
    console.log(`   Rows found: ${data?.length || 0}`);
  }
}

async function verifyFunctions() {
  console.log('\n🔍 Verifying RPC functions...\n');

  // Test get_visitor_timeline with a dummy UUID
  const dummyUUID = '00000000-0000-0000-0000-000000000000';

  const { data: data1, error: error1 } = await supabase
    .rpc('get_visitor_timeline', {
      p_visitor_id: dummyUUID,
      p_limit: 1
    });

  if (error1) {
    console.log(`❌ get_visitor_timeline: Function does NOT exist`);
  } else {
    console.log(`✅ get_visitor_timeline: Function exists`);
  }

  const { data: data2, error: error2 } = await supabase
    .rpc('get_visitor_ips_with_metrics', {
      p_visitor_id: dummyUUID
    });

  if (error2) {
    console.log(`❌ get_visitor_ips_with_metrics: Function does NOT exist`);
  } else {
    console.log(`✅ get_visitor_ips_with_metrics: Function exists`);
  }

  const { data: data3, error: error3 } = await supabase
    .rpc('find_visitor_by_ip', {
      p_ip: '0.0.0.0'
    });

  if (error3) {
    console.log(`❌ find_visitor_by_ip: Function does NOT exist`);
  } else {
    console.log(`✅ find_visitor_by_ip: Function exists`);
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIRECT MIGRATION VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await verifyColumns();
  await verifyView();
  await verifyFunctions();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VERIFICATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
