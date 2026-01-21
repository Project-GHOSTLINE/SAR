import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGA4Data() {
  console.log('=== VERIFICATION DES DONNEES GA4 DANS SUPABASE ===\n');

  // 1. Récupérer les 30 derniers jours
  const { data: last30Days, error: error1 } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('date, new_users, users, conversion_rate, engaged_sessions')
    .order('date', { ascending: false })
    .limit(30);

  if (error1) {
    console.error('Erreur lors de la récupération des données:', error1);
    return;
  }

  console.log(`1. DERNIERES DONNEES (${last30Days?.length || 0} jours):`);
  console.table(last30Days);

  // 2. Vérifier la variation des données
  const { data: stats, error: error2 } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('new_users');

  if (error2) {
    console.error('Erreur stats:', error2);
    return;
  }

  const uniqueNewUsers = new Set(stats?.map(d => d.new_users) || []);
  const newUsersArray = stats?.map(d => d.new_users) || [];
  const min = Math.min(...newUsersArray);
  const max = Math.max(...newUsersArray);
  const avg = newUsersArray.reduce((a, b) => a + b, 0) / newUsersArray.length;

  console.log('\n2. STATISTIQUES DE VARIATION:');
  console.log(`   - Valeurs uniques: ${uniqueNewUsers.size}`);
  console.log(`   - Min: ${min}`);
  console.log(`   - Max: ${max}`);
  console.log(`   - Moyenne: ${avg.toFixed(2)}`);
  console.log(`   - Total records: ${stats?.length || 0}`);

  // 3. Vérifier si toutes les valeurs sont identiques (MOCK)
  if (uniqueNewUsers.size === 1) {
    console.log('\n⚠️  ALERTE: Toutes les valeurs de new_users sont IDENTIQUES = MOCK DATA!');
  } else {
    console.log('\n✅ Les données varient = Possiblement des vraies données');
  }

  // 4. Compter combien de jours ont exactement 377 new_users
  const mockCount = stats?.filter(d => d.new_users === 377).length || 0;
  console.log(`\n3. DETECTION DE MOCK (377 new_users): ${mockCount} jours sur ${stats?.length || 0}`);

  if (mockCount === stats?.length) {
    console.log('⚠️  TOUTES LES DONNEES SONT DU MOCK (377)');
  } else if (mockCount > 0) {
    console.log(`⚠️  ${mockCount} jours contiennent le mock 377`);
  } else {
    console.log('✅ Aucun mock 377 détecté');
  }
}

checkGA4Data().catch(console.error);
