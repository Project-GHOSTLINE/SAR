/**
 * Check which SEO tables exist and have data
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTable(tableName: string) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      return false;
    }

    console.log(`✅ ${tableName}: ${count || 0} rows`);
    return count && count > 0;
  } catch (err: any) {
    console.log(`❌ ${tableName}: ${err.message}`);
    return false;
  }
}

async function checkView(viewName: string) {
  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ VIEW ${viewName}: ${error.message}`);
      return false;
    }

    console.log(`✅ VIEW ${viewName}: ${data?.length || 0} sample rows`);
    return data && data.length > 0;
  } catch (err: any) {
    console.log(`❌ VIEW ${viewName}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking SEO data sources...\n');

  // Check base tables
  console.log('📊 BASE TABLES:');
  await checkTable('ga4_daily');
  await checkTable('gsc_daily');
  await checkTable('semrush_daily');
  await checkTable('vercel_speed_insights_daily');
  await checkTable('telemetry_requests');
  await checkTable('telemetry_events');
  await checkTable('loan_applications');

  console.log('\n📈 VIEWS:');
  await checkView('seo_unified_daily');
  await checkView('seo_unified_daily_plus');
  await checkView('visitor_identity_graph');

  console.log('\n🔍 Sample telemetry data:');
  const { data: recentRequests, error } = await supabase
    .from('telemetry_requests')
    .select('trace_id, path, ip, visitor_id, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log(`❌ Error: ${error.message}`);
  } else {
    console.log(`Found ${recentRequests?.length || 0} recent requests`);
    recentRequests?.forEach(r => {
      console.log(`  - ${r.path} (${r.duration_ms}ms) from ${r.ip}`);
    });
  }
}

main().catch(console.error);
