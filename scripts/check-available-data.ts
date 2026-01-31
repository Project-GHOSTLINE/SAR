/**
 * Check what data is available for SEO pages
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkData() {
  console.log('\n📊 CHECKING AVAILABLE DATA FOR SEO PAGES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Performance data (from telemetry_requests)
  console.log('1️⃣  PERFORMANCE DATA (telemetry_requests):\n');
  const { data: perfData, error: perfErr } = await supabase
    .from('telemetry_requests')
    .select('duration_ms, status, path, created_at')
    .not('duration_ms', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(5);

  if (perfData) {
    console.log(`   ✅ ${perfData.length} requests with duration data (last 24h)`);
    console.log(`   Sample: ${perfData[0]?.path} - ${perfData[0]?.duration_ms}ms\n`);
  }

  // 2. Real-time data (recent requests)
  console.log('2️⃣  REAL-TIME DATA (last 5 minutes):\n');
  const { count: recentCount } = await supabase
    .from('telemetry_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  const { count: activeVisitors } = await supabase
    .from('telemetry_requests')
    .select('visitor_id', { count: 'exact', head: true })
    .not('visitor_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  console.log(`   ✅ ${recentCount} requests in last 5 min`);
  console.log(`   ✅ ${activeVisitors} active visitors\n`);

  // 3. Check for external API keys
  console.log('3️⃣  EXTERNAL API CREDENTIALS:\n');

  console.log(`   ${process.env.SEMRUSH_API_KEY ? '✅' : '❌'} Semrush API Key: ${process.env.SEMRUSH_API_KEY ? 'Present' : 'Missing'}`);
  console.log(`   ${process.env.GOOGLE_ANALYTICS_PROPERTY_ID ? '✅' : '❌'} Google Analytics Property ID: ${process.env.GOOGLE_ANALYTICS_PROPERTY_ID ? 'Present' : 'Missing'}`);
  console.log(`   ${process.env.GOOGLE_SEARCH_CONSOLE_SITE ? '✅' : '❌'} Google Search Console Site: ${process.env.GOOGLE_SEARCH_CONSOLE_SITE ? 'Present' : 'Missing'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SUMMARY:\n');
  console.log('✅ CAN IMPLEMENT NOW:');
  console.log('   - Performance Monitor (using telemetry_requests.duration_ms)');
  console.log('   - Real-time Monitor (using telemetry_requests recent data)\n');

  console.log('⚠️  HAVE API KEY, CAN IMPLEMENT:');
  if (process.env.SEMRUSH_API_KEY) {
    console.log('   - Semrush (keywords, backlinks, traffic)\n');
  }

  console.log('❌ MISSING API CREDENTIALS:');
  if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
    console.log('   - Google Analytics 4 (need GA4_PROPERTY_ID + service account)');
  }
  if (!process.env.GOOGLE_SEARCH_CONSOLE_SITE) {
    console.log('   - Google Search Console (need GSC_SITE_URL + service account)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkData().catch(console.error);
