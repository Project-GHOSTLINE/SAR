import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDataRange() {
  console.log('=== VERIFICATION DE LA PLAGE DE DONNEES ===\n');

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  console.log(`Aujourd'hui: ${today}`);
  console.log(`Hier: ${yesterday}`);
  console.log(`Il y a 30 jours: ${monthAgo}\n`);

  // 1. Compter les records dans chaque période
  const { count: todayCount } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);

  const { count: yesterdayCount } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*', { count: 'exact', head: true })
    .eq('date', yesterday);

  const { count: last30Count } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*', { count: 'exact', head: true })
    .gte('date', monthAgo)
    .lte('date', yesterday);

  console.log(`Records pour aujourd'hui: ${todayCount}`);
  console.log(`Records pour hier: ${yesterdayCount}`);
  console.log(`Records pour les 30 derniers jours: ${last30Count}\n`);

  // 2. Récupérer les données pour les 30 derniers jours
  const { data: last30Data } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('date, users, new_users, sessions')
    .gte('date', monthAgo)
    .lte('date', yesterday)
    .order('date', { ascending: false });

  console.log('Données des 30 derniers jours:');
  console.table(last30Data);

  // 3. Calculer le total
  const totalUsers = last30Data?.reduce((sum, d) => sum + (d.users || 0), 0) || 0;
  const totalNewUsers = last30Data?.reduce((sum, d) => sum + (d.new_users || 0), 0) || 0;
  const totalSessions = last30Data?.reduce((sum, d) => sum + (d.sessions || 0), 0) || 0;

  console.log(`\nTOTAL pour les 30 derniers jours:`);
  console.log(`  - Total users: ${totalUsers}`);
  console.log(`  - Total new_users: ${totalNewUsers}`);
  console.log(`  - Total sessions: ${totalSessions}`);

  // 4. Vérifier les dates manquantes
  const dates = last30Data?.map(d => d.date) || [];
  const expectedDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - (i + 1) * 86400000);
    expectedDates.push(d.toISOString().split('T')[0]);
  }

  const missingDates = expectedDates.filter(d => !dates.includes(d));

  if (missingDates.length > 0) {
    console.log(`\n⚠️  ${missingDates.length} dates manquantes:`);
    missingDates.slice(0, 10).forEach(d => console.log(`  - ${d}`));
    if (missingDates.length > 10) {
      console.log(`  ... et ${missingDates.length - 10} autres`);
    }
  } else {
    console.log('\n✅ Toutes les dates sont présentes');
  }
}

verifyDataRange().catch(console.error);
