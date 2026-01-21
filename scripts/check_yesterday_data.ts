import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYesterday() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  console.log(`=== VÉRIFICATION DES DONNÉES HIER (${yesterday}) ===\n`);

  // Toutes les entrées pour hier
  const { data: yesterdayData } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*')
    .eq('date', yesterday);

  console.log(`Entrées pour hier: ${yesterdayData?.length || 0}`);
  if (yesterdayData) {
    yesterdayData.forEach((d, i) => {
      console.log(`  [${i}] users: ${d.users}, new: ${d.new_users}, measurement_id: "${d.measurement_id}"`);
    });
  }

  // Test de la requête EXACTE de l'API
  console.log(`\n=== TEST REQUÊTE API last_month ===`);
  console.log(`  .gte('date', '${monthAgo}')`);
  console.log(`  .lte('date', '${yesterday}')\n`);

  const { data: monthData } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*')
    .gte('date', monthAgo)
    .lte('date', yesterday)
    .order('date', { ascending: false });

  console.log(`Records retournés: ${monthData?.length || 0}`);

  if (monthData && monthData.length > 0) {
    const totalUsers = monthData.reduce((sum, d) => sum + (d.users || 0), 0);
    console.log(`Total users: ${totalUsers}`);

    // Vérifier s'il y a la fameuse entrée "377"
    const entry377 = monthData.find(d => d.users === 377);
    if (entry377) {
      console.log(`\n⚠️  Entrée avec 377 users trouvée!`);
      console.log(`  Date: ${entry377.date}`);
      console.log(`  Users: ${entry377.users}`);
      console.log(`  New users: ${entry377.new_users}`);
      console.log(`  Sessions: ${entry377.sessions}`);
      console.log(`  measurement_id: "${entry377.measurement_id}"`);
    } else {
      console.log(`\n✅ Aucune entrée avec 377 users`);
    }
  }
}

checkYesterday().catch(console.error);
