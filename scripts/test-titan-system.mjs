#!/usr/bin/env node
/**
 * 🧪 Script de Test TITAN
 * Teste toutes les fonctionnalités du système
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Couleurs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

let testsPassed = 0
let testsFailed = 0

function testResult(name, passed, details = '') {
  if (passed) {
    testsPassed++
    log('green', `✅ ${name}`)
    if (details) log('blue', `   ${details}`)
  } else {
    testsFailed++
    log('red', `❌ ${name}`)
    if (details) log('yellow', `   ${details}`)
  }
}

async function runTests() {
  log('blue', '\n🧪 ════════════════════════════════════════')
  log('blue', '🧪    TITAN SYSTEM - Tests Complets')
  log('blue', '🧪 ════════════════════════════════════════\n')

  // 1. Vérifier variables d'environnement
  log('magenta', '📋 Test 1: Variables d\'environnement')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  const margillEndpoint = process.env.MARGILL_ENDPOINT
  const margillOrigin = process.env.MARGILL_ORIGIN

  testResult(
    'NEXT_PUBLIC_SUPABASE_URL',
    !!supabaseUrl,
    supabaseUrl ? `URL: ${supabaseUrl.substring(0, 30)}...` : 'Manquant'
  )
  testResult('SUPABASE_SERVICE_KEY', !!supabaseKey, supabaseKey ? 'Présent' : 'Manquant')
  testResult('MARGILL_ENDPOINT', !!margillEndpoint, margillEndpoint || 'Manquant')
  testResult('MARGILL_ORIGIN', !!margillOrigin, margillOrigin || 'Manquant')

  if (!supabaseUrl || !supabaseKey) {
    log('red', '\n❌ Tests arrêtés: Variables d\'environnement manquantes')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 2. Tester connexion Supabase
  log('magenta', '\n📋 Test 2: Connexion Supabase')
  try {
    const { error } = await supabase.from('loan_applications').select('count').limit(1)
    testResult('Connexion Supabase', !error, error ? error.message : 'Connexion réussie')
  } catch (error) {
    testResult('Connexion Supabase', false, error.message)
  }

  // 3. Vérifier existence des tables
  log('magenta', '\n📋 Test 3: Vérification des tables')
  const tables = [
    'loan_applications',
    'loan_objectives',
    'cortex_rules',
    'cortex_execution_logs',
    'metrics_log',
    'ab_tests',
    'ab_test_assignments',
    'workflows',
    'workflow_executions',
    'notification_templates',
    'notification_logs',
    'ml_models',
    'ml_predictions',
    'api_keys',
    'audit_logs',
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1)
      testResult(`Table: ${table}`, !error)
    } catch (error) {
      testResult(`Table: ${table}`, false, error.message)
    }
  }

  // 4. Tester génération de référence
  log('magenta', '\n📋 Test 4: Génération de référence')
  try {
    const { data, error } = await supabase.rpc('generate_loan_reference')
    testResult(
      'Fonction generate_loan_reference',
      !error && data,
      data ? `Référence générée: ${data}` : error?.message
    )
  } catch (error) {
    testResult('Fonction generate_loan_reference', false, error.message)
  }

  // 5. Tester création d'une application
  log('magenta', '\n📋 Test 5: Création d\'une demande test')
  try {
    // Générer la référence d'abord
    const { data: refData } = await supabase.rpc('generate_loan_reference')

    const testApplication = {
      reference: refData || 'SAR-LP-TEST001',
      origin: 'argentrapide',
      status: 'draft',
      prenom: 'Test',
      nom: 'Titan',
      courriel: 'test@titan.com',
      telephone: '5141234567',
      date_naissance: '1990-01-01',
      adresse_rue: '123 Test St',
      adresse_ville: 'Montreal',
      adresse_province: 'QC',
      adresse_code_postal: 'H1A1A1',
      duree_residence_mois: 24,
      type_logement: 'locataire',
      montant_demande: 500000, // 5000$
      duree_pret_mois: 12,
      statut_emploi: 'salarie',
      employeur: 'Test Corp',
      revenu_annuel: 5000000, // 50000$
      anciennete_emploi_mois: 36,
      frequence_paie: 'bi_hebdomadaire',
      prochaine_paie: '2026-01-20',
      institution_financiere: 'Test Bank',
      transit: '12345',
      numero_compte: '1234567',
      type_compte: 'cheque',
    }

    const { data, error } = await supabase
      .from('loan_applications')
      .insert(testApplication)
      .select()
      .single()

    testResult(
      'Création demande test',
      !error && data,
      data ? `Référence: ${data.reference}` : error?.message
    )

    // 5b. Nettoyer (supprimer la demande test)
    if (data?.id) {
      await supabase.from('loan_applications').delete().eq('id', data.id)
      log('blue', '   🧹 Demande test supprimée')
    }
  } catch (error) {
    testResult('Création demande test', false, error.message)
  }

  // 6. Tester règles Cortex seeds
  log('magenta', '\n📋 Test 6: Règles Cortex (seeds)')
  try {
    const { data, error } = await supabase.from('cortex_rules').select('count')

    testResult('Règles Cortex existantes', !error && data, `${data?.length || 0} règles trouvées`)
  } catch (error) {
    testResult('Règles Cortex existantes', false, error.message)
  }

  // 7. Tester objectifs seeds
  log('magenta', '\n📋 Test 7: Objectifs (seeds)')
  try {
    const { data, error } = await supabase.from('loan_objectives').select('*')

    testResult('Objectifs existants', !error && data, `${data?.length || 0} objectifs trouvés`)

    if (data && data.length > 0) {
      data.forEach((obj) => {
        log('blue', `   - ${obj.name}: ${obj.current_value}/${obj.target_value}`)
      })
    }
  } catch (error) {
    testResult('Objectifs existants', false, error.message)
  }

  // 8. Tester templates notifications seeds
  log('magenta', '\n📋 Test 8: Templates notifications (seeds)')
  try {
    const { data, error } = await supabase.from('notification_templates').select('count')

    testResult('Templates notifications', !error && data, `${data?.length || 0} templates trouvés`)
  } catch (error) {
    testResult('Templates notifications', false, error.message)
  }

  // 9. Tester materialized view
  log('magenta', '\n📋 Test 9: Materialized View (metrics_daily_summary)')
  try {
    const { data, error } = await supabase.from('metrics_daily_summary').select('count').limit(1)

    testResult('Materialized view accessible', !error)
  } catch (error) {
    testResult('Materialized view accessible', false, error.message)
  }

  // 10. Résumé
  log('blue', '\n════════════════════════════════════════')
  log('blue', '📊 RÉSUMÉ DES TESTS')
  log('blue', '════════════════════════════════════════')
  log('green', `✅ Tests réussis: ${testsPassed}`)
  log('red', `❌ Tests échoués: ${testsFailed}`)
  log('blue', `📊 Total: ${testsPassed + testsFailed}`)

  const successRate = Math.round((testsPassed / (testsPassed + testsFailed)) * 100)
  log('blue', `🎯 Taux de réussite: ${successRate}%`)

  if (testsFailed === 0) {
    log('green', '\n🎉 TOUS LES TESTS SONT PASSÉS! 🎉')
    log('green', '✅ Le système TITAN est prêt!')
  } else {
    log('yellow', '\n⚠️  Certains tests ont échoué')
    log('yellow', 'Vérifiez que la migration SQL a été exécutée correctement')
  }

  log('blue', '\n════════════════════════════════════════\n')
}

// Exécuter
runTests().catch((error) => {
  log('red', `\n❌ Erreur fatale: ${error.message}`)
  process.exit(1)
})
