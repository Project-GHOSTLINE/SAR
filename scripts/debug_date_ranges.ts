import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

function getDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

async function debugDateRanges() {
  console.log('=== DEBUG DATE RANGES ===\n');

  const today = new Date().toISOString().split('T')[0];
  const yesterday = getDaysAgo(1);
  const monthAgo = getDaysAgo(30);

  console.log(`Aujourd'hui: ${today}`);
  console.log(`Hier: ${yesterday}`);
  console.log(`Il y a 30 jours: ${monthAgo}\n`);

  // Tester la requête exacte de l'API
  console.log('Test de la requête last_month:');
  console.log(`  .gte('date', '${monthAgo}')`);
  console.log(`  .lte('date', '${yesterday}')\n`);

  const { data, error, count } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*', { count: 'exact' })
    .gte('date', monthAgo)
    .lte('date', yesterday)
    .order('date', { ascending: false });

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.log(`Records retournés: ${data?.length || 0}`);
  console.log(`Count exact: ${count}\n`);

  if (data && data.length > 0) {
    console.log('Premières 5 dates:');
    data.slice(0, 5).forEach(d => {
      console.log(`  ${d.date}: ${d.users} users, ${d.new_users} new`);
    });

    console.log(`\nDernières 5 dates:`);
    data.slice(-5).forEach(d => {
      console.log(`  ${d.date}: ${d.users} users, ${d.new_users} new`);
    });
  }
}

debugDateRanges().catch(console.error);
