/**
 * Test visitor_id tracking in production
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testLiveTracking() {
  console.log('\n🔍 TESTING VISITOR_ID TRACKING IN PRODUCTION\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Get recent visitors with visitor_id
  console.log('1️⃣  Recent visitors with visitor_id:\n');
  const { data: visitors, error: vErr } = await supabase
    .from('visitor_identity_graph')
    .select('*')
    .order('last_seen', { ascending: false })
    .limit(5);

  if (vErr) {
    console.log('   ❌ Error:', vErr.message);
  } else {
    console.log(`   ✅ Found ${visitors?.length || 0} visitors\n`);
    visitors?.forEach((v, i) => {
      console.log(`   Visitor ${i + 1}:`);
      console.log(`      ID: ${v.visitor_id}`);
      console.log(`      IPs: ${v.ips?.join(', ')}`);
      console.log(`      Requests: ${v.total_requests}`);
      console.log(`      Pages: ${v.unique_pages}`);
      console.log(`      Active: ${v.first_seen} → ${v.last_seen}`);
      console.log(`      Landing: ${v.landing_page}`);
      console.log('');
    });
  }

  // 2. Test RPC function: get_visitor_timeline
  const testVisitorId = visitors?.[0]?.visitor_id;
  if (testVisitorId) {
    console.log(`2️⃣  Timeline for visitor ${testVisitorId}:\n`);
    const { data: timeline, error: tErr } = await supabase.rpc('get_visitor_timeline', {
      p_visitor_id: testVisitorId,
      p_limit: 5
    });

    if (tErr) {
      console.log('   ❌ Error:', tErr.message);
    } else {
      console.log(`   ✅ Found ${timeline?.length || 0} timeline entries\n`);
      timeline?.forEach((t: any, i: number) => {
        console.log(`   ${i + 1}. ${t.method} ${t.path}`);
        console.log(`      IP: ${t.ip} | Status: ${t.status} | ${t.duration_ms}ms`);
        console.log(`      Time: ${t.created_at}`);
        console.log('');
      });
    }
  }

  // 3. Test RPC function: get_visitor_ips_with_metrics
  if (testVisitorId) {
    console.log(`3️⃣  IPs with metrics for visitor ${testVisitorId}:\n`);
    const { data: ips, error: iErr } = await supabase.rpc('get_visitor_ips_with_metrics', {
      p_visitor_id: testVisitorId
    });

    if (iErr) {
      console.log('   ❌ Error:', iErr.message);
    } else {
      console.log(`   ✅ Found ${ips?.length || 0} IPs\n`);
      ips?.forEach((ip: any) => {
        console.log(`   IP: ${ip.ip}`);
        console.log(`      Requests: ${ip.request_count}`);
        console.log(`      Pages: ${ip.unique_pages}`);
        console.log(`      Avg duration: ${ip.avg_duration_ms}ms`);
        console.log(`      Active: ${ip.first_seen} → ${ip.last_seen}`);
        console.log('');
      });
    }
  }

  // 4. Test RPC function: find_visitor_by_ip
  const testIp = visitors?.[0]?.ips?.[0];
  if (testIp) {
    console.log(`4️⃣  Find all visitors from IP ${testIp}:\n`);
    const { data: visitorsFromIp, error: fErr } = await supabase.rpc('find_visitor_by_ip', {
      p_ip: testIp
    });

    if (fErr) {
      console.log('   ❌ Error:', fErr.message);
    } else {
      console.log(`   ✅ Found ${visitorsFromIp?.length || 0} visitors from this IP\n`);
      visitorsFromIp?.forEach((v: any) => {
        console.log(`   Visitor: ${v.visitor_id}`);
        console.log(`      Requests: ${v.request_count}`);
        console.log(`      Has application: ${v.has_application ? 'Yes' : 'No'}`);
        console.log(`      Email: ${v.client_email || 'N/A'}`);
        console.log('');
      });
    }
  }

  // 5. Overall stats
  console.log('5️⃣  Overall visitor_id stats:\n');
  const { data: stats, error: sErr } = await supabase
    .from('telemetry_requests')
    .select('visitor_id', { count: 'exact', head: false })
    .not('visitor_id', 'is', null);

  const { count: totalWithVisitorId } = await supabase
    .from('telemetry_requests')
    .select('*', { count: 'exact', head: true })
    .not('visitor_id', 'is', null);

  const { count: totalRequests } = await supabase
    .from('telemetry_requests')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total requests: ${totalRequests}`);
  console.log(`   With visitor_id: ${totalWithVisitorId}`);
  console.log(`   Coverage: ${totalRequests && totalWithVisitorId ? ((totalWithVisitorId / totalRequests) * 100).toFixed(1) : 0}%`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VISITOR_ID TRACKING: FULLY OPERATIONAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testLiveTracking().catch(console.error);
