/**
 * Test RPC functions directly
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFunctions() {
  console.log('🔍 Testing RPC Functions\n');

  const testVisitorId = '00000000-0000-0000-0000-000000000000';
  const testIp = '1.2.3.4';

  // Test get_visitor_timeline
  console.log('1️⃣  Testing get_visitor_timeline...');
  const { data: d1, error: e1 } = await supabase.rpc('get_visitor_timeline', {
    p_visitor_id: testVisitorId,
    p_limit: 10
  });
  if (e1) {
    console.log('   ❌ Error:', e1.message);
  } else {
    console.log('   ✅ Works! Returned', Array.isArray(d1) ? d1.length : 0, 'rows');
  }
  console.log('');

  // Test get_visitor_ips_with_metrics
  console.log('2️⃣  Testing get_visitor_ips_with_metrics...');
  const { data: d2, error: e2 } = await supabase.rpc('get_visitor_ips_with_metrics', {
    p_visitor_id: testVisitorId
  });
  if (e2) {
    console.log('   ❌ Error:', e2.message);
    console.log('   Details:', e2);
  } else {
    console.log('   ✅ Works! Returned', Array.isArray(d2) ? d2.length : 0, 'rows');
  }
  console.log('');

  // Test find_visitor_by_ip
  console.log('3️⃣  Testing find_visitor_by_ip...');
  const { data: d3, error: e3 } = await supabase.rpc('find_visitor_by_ip', {
    p_ip: testIp
  });
  if (e3) {
    console.log('   ❌ Error:', e3.message);
  } else {
    console.log('   ✅ Works! Returned', Array.isArray(d3) ? d3.length : 0, 'rows');
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testFunctions().catch(console.error);
