import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('=== DETECTION DES DOUBLONS ===\n');

  const { data, error } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('id, date, measurement_id, property_id, new_users, users, collected_at')
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  console.table(data);

  // Grouper par date
  const byDate: Record<string, any[]> = {};
  data?.forEach(row => {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push(row);
  });

  console.log('\n=== GROUPEMENT PAR DATE ===');
  for (const [date, rows] of Object.entries(byDate)) {
    console.log(`\n${date}: ${rows.length} entrée(s)`);
    if (rows.length > 1) {
      console.log('  ⚠️  DOUBLON DETECTE!');
      rows.forEach((row, i) => {
        console.log(`    [${i}] measurement_id: ${row.measurement_id}, property_id: ${row.property_id}, new_users: ${row.new_users}`);
      });
    }
  }
}

checkDuplicates().catch(console.error);
