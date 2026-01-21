import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dllyzfuqjzuhvshrlmuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicates() {
  console.log('=== NETTOYAGE DES DOUBLONS ===\n');

  // 1. Trouver tous les records avec \n dans measurement_id ou property_id
  const { data: badRecords, error: error1 } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('id, date, measurement_id, property_id')
    .or('measurement_id.like.*\n*,property_id.like.*\n*');

  if (error1) {
    console.error('Erreur recherche:', error1);
    return;
  }

  console.log(`Trouvé ${badRecords?.length || 0} records avec des newlines`);

  if (badRecords && badRecords.length > 0) {
    // Supprimer ces records
    const ids = badRecords.map(r => r.id);

    console.log(`\nSuppression de ${ids.length} records...`);

    const { error: deleteError } = await supabase
      .from('seo_ga4_metrics_daily')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Erreur suppression:', deleteError);
      return;
    }

    console.log('✅ Records avec newlines supprimés');
  }

  // 2. Vérifier qu'il n'y a plus de doublons
  const { data: remaining, error: error2 } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('date, COUNT(*)')
    .group('date')
    .having('COUNT(*) > 1');

  console.log('\n=== VERIFICATION POST-NETTOYAGE ===');

  if (remaining && remaining.length > 0) {
    console.log('⚠️  Il reste encore des doublons:');
    console.table(remaining);
  } else {
    console.log('✅ Plus de doublons détectés');
  }

  // 3. Afficher le compte final
  const { count } = await supabase
    .from('seo_ga4_metrics_daily')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal records: ${count}`);
}

cleanDuplicates().catch(console.error);
