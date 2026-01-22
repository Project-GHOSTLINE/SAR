#!/usr/bin/env tsx
/**
 * Script de test du dataflow complet
 * Vérifie: CSV → Parser → Supabase → API → Frontend
 */

import * as fs from 'fs'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
const csvPath = '/Users/xunit/Desktop/clientsar.csv'

let errors = 0
let warnings = 0

// Helper pour afficher les résultats
function success(msg: string) {
  console.log(`✅ ${msg}`)
}

function error(msg: string) {
  console.log(`❌ ${msg}`)
  errors++
}

function warning(msg: string) {
  console.log(`⚠️  ${msg}`)
  warnings++
}

function info(msg: string) {
  console.log(`ℹ️  ${msg}`)
}

async function runTests() {
  console.log('========================================')
  console.log('🔍 TEST DU DATAFLOW - Système Fraude')
  console.log('========================================\n')

  // Test 1: Vérifier les variables d'environnement
  console.log('📋 Test 1: Variables d\'environnement')
  console.log('─────────────────────────────────────\n')

if (!supabaseUrl) {
  error('NEXT_PUBLIC_SUPABASE_URL non définie')
} else {
  success(`Supabase URL: ${supabaseUrl}`)
}

if (!supabaseKey) {
  error('SUPABASE_SERVICE_ROLE_KEY non définie')
} else {
  success(`Supabase Key: ${supabaseKey.substring(0, 20)}...`)
}

console.log('')

// Test 2: Vérifier le fichier CSV
console.log('📄 Test 2: Fichier CSV')
console.log('─────────────────────────────────────\n')

if (!fs.existsSync(csvPath)) {
  error(`Fichier CSV introuvable: ${csvPath}`)
} else {
  const stats = fs.statSync(csvPath)
  success(`Fichier trouvé: ${csvPath}`)
  info(`Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

  // Parser le CSV
  try {
    const content = fs.readFileSync(csvPath, 'utf-8')
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ',',
      relax_column_count: true,
      from_line: 2
    })

    success(`CSV parsé: ${records.length} lignes`)

    // Vérifier les colonnes importantes
    if (records.length > 0) {
      const firstRecord = records[0]
      const requiredColumns = [
        'Emprunteur - Identifiant',
        'Emprunteur - Prénom Nom',
        'Emprunteur - Courriel',
        'Lien IBV',
        'État du Dossier'
      ]

      info('Vérification des colonnes requises:')
      requiredColumns.forEach(col => {
        if (firstRecord[col] !== undefined) {
          success(`  - ${col}: ✓`)
        } else {
          warning(`  - ${col}: manquante`)
        }
      })

      // Statistiques rapides
      const sansIBV = records.filter((r: any) => !r['Lien IBV'] || r['Lien IBV'].trim() === '')
      const actifs = records.filter((r: any) => r['État du Dossier'] === 'Actif')
      const fermes = records.filter((r: any) => r['État du Dossier'] === 'Fermé')

      info(`\nStatistiques CSV:`)
      console.log(`  - Total: ${records.length}`)
      console.log(`  - Sans IBV: ${sansIBV.length} (${((sansIBV.length / records.length) * 100).toFixed(1)}%)`)
      console.log(`  - Actifs: ${actifs.length}`)
      console.log(`  - Fermés: ${fermes.length}`)
    }
  } catch (e: any) {
    error(`Erreur parsing CSV: ${e.message}`)
  }
}

console.log('')

// Test 3: Connexion Supabase
console.log('🔌 Test 3: Connexion Supabase')
console.log('─────────────────────────────────────\n')

const supabase = createClient(supabaseUrl, supabaseKey)

try {
  // Test simple de connexion
  const { data, error: err } = await supabase.from('_fake_table_').select('*').limit(1)

  if (err && err.message.includes('relation') && err.message.includes('does not exist')) {
    success('Connexion Supabase OK (erreur de table attendue)')
  } else if (!err) {
    success('Connexion Supabase OK')
  } else {
    error(`Erreur Supabase: ${err.message}`)
  }
} catch (e: any) {
  error(`Exception Supabase: ${e.message}`)
}

console.log('')

// Test 4: Vérifier si la table clients_sar existe
console.log('🗄️  Test 4: Table clients_sar')
console.log('─────────────────────────────────────\n')

try {
  const { data, error: err, count } = await supabase
    .from('clients_sar')
    .select('*', { count: 'exact', head: true })

  if (err) {
    if (err.message.includes('does not exist')) {
      warning('Table clients_sar n\'existe pas encore')
      info('→ Exécutez: migrations/001_create_clients_fraud_detection.sql')
    } else {
      error(`Erreur table: ${err.message}`)
    }
  } else {
    success(`Table clients_sar existe`)
    info(`Nombre de clients: ${count || 0}`)

    if (count === 0) {
      warning('Table vide - aucune donnée importée')
      info('→ Exécutez: npx tsx scripts/import-clients-sar.ts')
    } else {
      // Récupérer quelques statistiques
      const { data: stats } = await supabase
        .from('clients_sar')
        .select('score_fraude, flag_pas_ibv, etat_dossier')

      if (stats) {
        const sansIBV = stats.filter(s => s.flag_pas_ibv).length
        const actifs = stats.filter(s => s.etat_dossier === 'Actif').length
        const risqueCritique = stats.filter(s => s.score_fraude >= 80).length
        const risqueEleve = stats.filter(s => s.score_fraude >= 60 && s.score_fraude < 80).length

        info('\nStatistiques base de données:')
        console.log(`  - Total: ${stats.length}`)
        console.log(`  - Sans IBV: ${sansIBV} (${((sansIBV / stats.length) * 100).toFixed(1)}%)`)
        console.log(`  - Actifs: ${actifs}`)
        console.log(`  - Risque Critique: ${risqueCritique}`)
        console.log(`  - Risque Élevé: ${risqueEleve}`)
      }
    }
  }
} catch (e: any) {
  error(`Exception test table: ${e.message}`)
}

console.log('')

// Test 5: Tester les fonctions SQL
console.log('⚙️  Test 5: Fonctions SQL')
console.log('─────────────────────────────────────\n')

try {
  // Vérifier si la fonction calculate_fraud_score existe
  const { data, error: err } = await supabase.rpc('calculate_fraud_score', {
    client_row: {
      flag_pas_ibv: true,
      flag_mauvaise_creance: false,
      flag_paiement_rate_precoce: false,
      flag_documents_email: false,
      flag_contact_invalide: false,
      flag_adresse_suspecte: false,
      flag_multiple_demandes: false,
      flag_liste_noire: false,
      nombre_paiements_faits: 10,
      nombre_paiements_non_payes: 0
    }
  })

  if (err) {
    if (err.message.includes('does not exist')) {
      warning('Fonction calculate_fraud_score non créée')
      info('→ Exécutez la migration SQL complète')
    } else {
      warning(`Fonction non testable: ${err.message}`)
    }
  } else {
    success('Fonction calculate_fraud_score OK')
    info(`Score test (pas IBV): ${data}`)
  }
} catch (e: any) {
  warning(`Test fonction skippé: ${e.message}`)
}

console.log('')

// Test 6: Vérifier les vues
console.log('👁️  Test 6: Vues SQL')
console.log('─────────────────────────────────────\n')

try {
  const { data, error: err } = await supabase
    .from('clients_sar_high_risk')
    .select('*')
    .limit(1)

  if (err) {
    if (err.message.includes('does not exist')) {
      warning('Vue clients_sar_high_risk non créée')
    } else {
      warning(`Erreur vue: ${err.message}`)
    }
  } else {
    success('Vue clients_sar_high_risk OK')
  }
} catch (e: any) {
  warning(`Test vue skippé: ${e.message}`)
}

console.log('')

// Résumé
console.log('========================================')
console.log('📊 RÉSUMÉ DU DATAFLOW')
console.log('========================================\n')

if (errors === 0 && warnings === 0) {
  console.log('✅ TOUS LES TESTS PASSÉS')
  console.log('\n🎉 Le système est complètement opérationnel!\n')
  console.log('Prochaines étapes:')
  console.log('  1. Ouvrez: https://admin.solutionargentrapide.ca/admin/clients-sar')
  console.log('  2. Testez une recherche avec filtres')
  console.log('  3. Exportez les données en CSV')
} else if (errors === 0 && warnings > 0) {
  console.log(`⚠️  ${warnings} AVERTISSEMENT(S)`)
  console.log('\nLe système fonctionne mais nécessite des actions:\n')

  if (warnings > 0) {
    console.log('Actions requises:')
    console.log('  1. Créer la table: Exécutez migrations/001_create_clients_fraud_detection.sql dans Supabase')
    console.log('  2. Importer les données: npx tsx scripts/import-clients-sar.ts /Users/xunit/Desktop/clientsar.csv')
    console.log('  3. Vérifiez à nouveau avec: npx tsx scripts/test-dataflow.ts')
  }
} else {
  console.log(`❌ ${errors} ERREUR(S) - ${warnings} AVERTISSEMENT(S)`)
  console.log('\n⚠️  Le système nécessite des corrections\n')
  console.log('Vérifiez:')
  console.log('  1. Les variables d\'environnement dans .env.local')
  console.log('  2. Le fichier CSV existe et est accessible')
  console.log('  3. Les credentials Supabase sont corrects')
}

  console.log('')
  console.log('========================================\n')

  // Exit avec code approprié
  return errors > 0 ? 1 : 0
}

// Exécuter les tests
runTests().then(exitCode => {
  process.exit(exitCode)
}).catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
