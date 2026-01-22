#!/usr/bin/env node
/**
 * Script de vérification simple du dataflow
 */

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' })

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

console.log('========================================')
console.log('🔍 VÉRIFICATION SETUP - Système Fraude')
console.log('========================================\n')

// Config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const csvPath = '/Users/xunit/Desktop/clientsar.csv'

let errors = 0
let warnings = 0

async function main() {
  // Test 1: Variables d'environnement
  console.log('📋 Test 1: Variables d\'environnement')
  console.log('─────────────────────────────────────\n')

  if (!supabaseUrl) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL non définie')
    errors++
  } else {
    console.log(`✅ Supabase URL: ${supabaseUrl}`)
  }

  if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY non définie')
    errors++
  } else {
    console.log(`✅ Supabase Key: ${supabaseKey.substring(0, 20)}...`)
  }

  console.log('')

  // Test 2: Fichier CSV
  console.log('📄 Test 2: Fichier CSV')
  console.log('─────────────────────────────────────\n')

  if (!fs.existsSync(csvPath)) {
    console.log(`❌ Fichier CSV introuvable: ${csvPath}`)
    errors++
  } else {
    const stats = fs.statSync(csvPath)
    console.log(`✅ Fichier trouvé: ${csvPath}`)
    console.log(`ℹ️  Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
  }

  console.log('')

  // Test 3: Connexion Supabase
  console.log('🔌 Test 3: Connexion Supabase')
  console.log('─────────────────────────────────────\n')

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Impossible de tester la connexion (credentials manquantes)')
    warnings++
  } else {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Test simple
      const { error: err } = await supabase.from('_test_').select('*').limit(1)

      if (err && (err.message.includes('does not exist') || err.message.includes('not find'))) {
        console.log('✅ Connexion Supabase OK')
      } else if (!err) {
        console.log('✅ Connexion Supabase OK')
      } else {
        console.log(`⚠️  Connexion Supabase (erreur mineure): ${err.message}`)
        warnings++
      }

      // Test table clients_sar
      const { data, error: tableErr, count } = await supabase
        .from('clients_sar')
        .select('*', { count: 'exact', head: true })

      if (tableErr) {
        if (tableErr.message.includes('does not exist')) {
          console.log('⚠️  Table clients_sar n\'existe pas encore')
          console.log('ℹ️  → Exécutez: migrations/001_create_clients_fraud_detection.sql')
          warnings++
        } else {
          console.log(`❌ Erreur table: ${tableErr.message}`)
          errors++
        }
      } else {
        console.log(`✅ Table clients_sar existe`)
        console.log(`ℹ️  Nombre de clients: ${count || 0}`)

        if (count === 0) {
          console.log('⚠️  Table vide - aucune donnée importée')
          console.log('ℹ️  → Exécutez: npx tsx scripts/import-clients-sar.ts')
          warnings++
        } else {
          // Stats rapides
          const { data: stats } = await supabase
            .from('clients_sar')
            .select('score_fraude, flag_pas_ibv, etat_dossier')

          if (stats && stats.length > 0) {
            const sansIBV = stats.filter(s => s.flag_pas_ibv).length
            const actifs = stats.filter(s => s.etat_dossier === 'Actif').length
            const risqueCritique = stats.filter(s => s.score_fraude >= 80).length

            console.log('\nℹ️  Statistiques:')
            console.log(`   - Total: ${stats.length}`)
            console.log(`   - Sans IBV: ${sansIBV} (${((sansIBV / stats.length) * 100).toFixed(1)}%)`)
            console.log(`   - Actifs: ${actifs}`)
            console.log(`   - Risque Critique: ${risqueCritique}`)
          }
        }
      }
    } catch (e) {
      console.log(`❌ Exception: ${e.message}`)
      errors++
    }
  }

  console.log('')

  // Résumé
  console.log('========================================')
  console.log('📊 RÉSUMÉ')
  console.log('========================================\n')

  if (errors === 0 && warnings === 0) {
    console.log('✅ TOUS LES TESTS PASSÉS')
    console.log('\n🎉 Le système est complètement opérationnel!\n')
    console.log('Accès: https://admin.solutionargentrapide.ca/admin/clients-sar')
  } else if (errors === 0 && warnings > 0) {
    console.log(`⚠️  ${warnings} AVERTISSEMENT(S)\n`)
    console.log('Actions requises:')
    console.log('  1. Créer la table SQL dans Supabase')
    console.log('  2. Importer les données CSV')
  } else {
    console.log(`❌ ${errors} ERREUR(S) - ${warnings} AVERTISSEMENT(S)\n`)
    console.log('Vérifiez la configuration!')
  }

  console.log('')

  return errors > 0 ? 1 : 0
}

main().then(exitCode => {
  process.exit(exitCode)
}).catch(error => {
  console.error('❌ Erreur fatale:', error.message)
  process.exit(1)
})
