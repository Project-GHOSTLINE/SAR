/**
 * Test de l'API /api/applications/submit
 * Envoie une demande de prêt test
 */

import 'dotenv/config'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
  'https://dllyzfuqjzuhvshrlmuq.supabase.co',
  'http://localhost:3000'
) || 'http://localhost:3000'

const testApplication = {
  origin: 'argentrapide',

  // Informations personnelles
  prenom: 'Jean',
  nom: 'Testeur',
  courriel: 'jean.testeur@test.com',
  telephone: '5141234567',
  date_naissance: '1985-03-15',

  // Adresse
  adresse_rue: '123 Rue Test',
  adresse_ville: 'Montreal',
  adresse_province: 'QC',
  adresse_code_postal: 'H2X1Y5',
  duree_residence_mois: 36,
  type_logement: 'locataire',

  // Prêt
  montant_demande: 300000, // 3000$
  raison_pret: 'Consolidation de dettes',
  duree_pret_mois: 24,

  // Emploi
  statut_emploi: 'salarie',
  employeur: 'Test Corp Inc.',
  poste: 'Développeur',
  revenu_annuel: 6500000, // 65000$
  anciennete_emploi_mois: 48,
  frequence_paie: 'bi_hebdomadaire',
  prochaine_paie: '2026-01-20',

  // Banque
  institution_financiere: 'Banque Nationale',
  transit: '00001',
  numero_compte: '1234567',
  type_compte: 'cheque',

  // Revenus/Dettes
  autres_revenus: 0,
  source_autres_revenus: '',
  paiement_loyer_hypotheque: 125000, // 1250$/mois
  autres_prets: 0,
  cartes_credit: 5000, // 50$/mois
  autres_dettes: 0,

  // Références
  reference_1_nom: 'Marie Test',
  reference_1_telephone: '5149876543',
  reference_1_relation: 'Ami',
  reference_2_nom: 'Pierre Test',
  reference_2_telephone: '5145556666',
  reference_2_relation: 'Collegue',
}

console.log('\n🧪 Test API /api/applications/submit\n')
console.log('Données envoyées:')
console.log(`  - Nom: ${testApplication.prenom} ${testApplication.nom}`)
console.log(`  - Email: ${testApplication.courriel}`)
console.log(`  - Montant: ${testApplication.montant_demande / 100}$`)
console.log(`  - Revenu: ${testApplication.revenu_annuel / 100}$\n`)

try {
  const response = await fetch(`${API_URL}/api/applications/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testApplication),
  })

  const result = await response.json()

  console.log(`\n📊 Réponse (Status ${response.status}):\n`)

  if (result.success) {
    console.log('✅ SUCCÈS!')
    console.log(`   Référence: ${result.data.reference}`)
    console.log(`   Status: ${result.data.status}`)
    console.log(`   Score Cortex: ${result.data.cortex_score}`)
    console.log(`   Message: ${result.data.message}`)
  } else {
    console.log('❌ ÉCHEC')
    console.log(`   Erreur: ${result.error}`)
    if (result.errors) {
      console.log('   Détails:')
      result.errors.forEach((err) => {
        console.log(`     - ${err.field}: ${err.message}`)
      })
    }
    if (result.data) {
      console.log(`   Référence sauvegardée: ${result.data.reference}`)
      console.log(`   Score Cortex: ${result.data.cortex_score}`)
    }
  }

  console.log('\n')
} catch (error) {
  console.error('❌ Erreur réseau:', error.message)
  console.log('\n⚠️  Assurez-vous que le serveur Next.js est en cours d\'exécution:')
  console.log('   npm run dev\n')
}
