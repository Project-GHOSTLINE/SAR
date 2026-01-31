/**
 * Check production Supabase data
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dllyzfuqjzuhvshrlmuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
);

async function checkProdData() {
  console.log('🔍 Checking PRODUCTION Supabase data...\n');

  // Check telemetry_requests
  const { count: telemetryCount, error: telemetryError } = await supabase
    .from('telemetry_requests')
    .select('*', { count: 'exact', head: true });

  if (telemetryError) {
    console.log('❌ telemetry_requests:', telemetryError.message);
  } else {
    console.log(`✅ telemetry_requests: ${telemetryCount} rows`);
  }

  // Check recent requests
  const { data: recentRequests } = await supabase
    .from('telemetry_requests')
    .select('created_at, path, visitor_id')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n📊 5 most recent requests:');
  recentRequests?.forEach(r => {
    console.log(`  - ${r.created_at}: ${r.path} (visitor: ${r.visitor_id?.substring(0, 8) || 'none'})`);
  });

  // Test API endpoint
  console.log('\n🌐 Testing production API...');
  try {
    const response = await fetch('https://solutionargentrapide.ca/api/seo/overview?range=7d');
    const data = await response.json();
    console.log('API Response:', {
      status: response.status,
      hasKpis: !!data.kpis,
      timelineLength: data.timeline?.length || 0,
      topPagesCount: data.topPages?.length || 0,
      dataSource: data.meta?.dataSource,
    });
  } catch (err: any) {
    console.log('❌ API Error:', err.message);
  }
}

checkProdData().catch(console.error);
