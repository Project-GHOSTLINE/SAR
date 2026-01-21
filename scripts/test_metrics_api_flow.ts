// Simuler exactement ce que fait /api/seo/metrics

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

function getDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

async function fetchMultiPeriodData(tableName: string) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = getDaysAgo(1)
  const weekAgo = getDaysAgo(7)
  const monthAgo = getDaysAgo(30)
  const yearAgo = getDaysAgo(365)

  console.log('Dates calculées:');
  console.log(`  today: ${today}`);
  console.log(`  yesterday: ${yesterday}`);
  console.log(`  weekAgo: ${weekAgo}`);
  console.log(`  monthAgo: ${monthAgo}`);
  console.log(`  yearAgo: ${yearAgo}\n`);

  const [todayData, yesterdayData, weekData, monthData, yearData] = await Promise.all([
    // Today
    supabase
      .from(tableName)
      .select('*')
      .eq('date', today)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Yesterday
    supabase
      .from(tableName)
      .select('*')
      .eq('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 7 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', weekAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 30 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', monthAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || []),

    // Last 365 days
    supabase
      .from(tableName)
      .select('*')
      .gte('date', yearAgo)
      .lte('date', yesterday)
      .order('date', { ascending: false })
      .then((r: any) => r.data || [])
  ])

  console.log('Résultats:');
  console.log(`  today: ${todayData.length} records`);
  console.log(`  yesterday: ${yesterdayData.length} records`);
  console.log(`  last_week: ${weekData.length} records`);
  console.log(`  last_month: ${monthData.length} records`);
  console.log(`  last_year: ${yearData.length} records\n`);

  if (monthData.length > 0) {
    console.log('last_month details:');
    console.log(`  First date: ${monthData[0].date}`);
    console.log(`  Last date: ${monthData[monthData.length - 1].date}`);
    console.log(`  Total users: ${monthData.reduce((sum: number, d: any) => sum + (d.users || 0), 0)}`);
  }

  return {
    today: todayData,
    yesterday: yesterdayData,
    last_week: weekData,
    last_month: monthData,
    last_year: yearData
  }
}

async function testFlow() {
  console.log('=== TEST DU FLOW DE /api/seo/metrics ===\n');

  const periods = await fetchMultiPeriodData('seo_ga4_metrics_daily');

  console.log('\nCe que l\'API devrait retourner:');
  console.log(JSON.stringify({
    ga4: {
      last_month: {
        records: periods.last_month.length,
        summary: {
          total_users: periods.last_month.reduce((sum: number, d: any) => sum + (d.users || 0), 0)
        }
      }
    }
  }, null, 2));
}

testFlow().catch(console.error);
