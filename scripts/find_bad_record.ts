import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findBadRecord() {
  console.log('=== RECHERCHE DU BAD RECORD ===\n');

  // Chercher par ID spécifique
  const badId = '92099d9d-3464-41b3-86e7-c1a152189299';

  const { data, error } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*')
    .eq('id', badId);

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`⚠️  Record trouvé avec ID ${badId}:`);
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log(`✅ Aucun record avec ID ${badId}`);
  }

  // Chercher tous les records avec \n dans measurement_id
  console.log('\n=== RECHERCHE DE TOUS LES RECORDS AVEC \\n ===\n');

  const { data: allData } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('id, date, measurement_id, property_id, users')
    .order('date', { ascending: false });

  const badRecords = allData?.filter(d =>
    d.measurement_id?.includes('\n') || d.property_id?.includes('\n')
  ) || [];

  console.log(`Records avec \\n trouvés: ${badRecords.length}`);

  if (badRecords.length > 0) {
    badRecords.forEach((r, i) => {
      console.log(`\n[${i + 1}] ${r.id}`);
      console.log(`    date: ${r.date}`);
      console.log(`    users: ${r.users}`);
      console.log(`    measurement_id: "${r.measurement_id}"`);
      console.log(`    property_id: "${r.property_id}"`);
    });

    console.log(`\n⚠️  SUPPRESSION DES ${badRecords.length} BAD RECORDS...`);

    const ids = badRecords.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('seo_ga4_metrics_daily')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Erreur suppression:', deleteError);
    } else {
      console.log('✅ Bad records supprimés');
    }
  } else {
    console.log('✅ Aucun bad record trouvé');
  }
}

findBadRecord().catch(console.error);
