import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Charger .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('loan_applications')
  .select('reference, prenom, nom, montant_demande, status, cortex_score, created_at')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Erreur:', error.message);
} else {
  console.log(`\n✅ ${data.length} demande(s) trouvée(s):\n`);
  data.forEach((loan, i) => {
    console.log(`${i + 1}. ${loan.reference}`);
    console.log(`   Nom: ${loan.prenom} ${loan.nom}`);
    console.log(`   Montant: ${loan.montant_demande / 100}$`);
    console.log(`   Status: ${loan.status}`);
    console.log(`   Score Cortex: ${loan.cortex_score}`);
    console.log(`   Créé: ${new Date(loan.created_at).toLocaleString('fr-CA')}`);
    console.log('');
  });
}
