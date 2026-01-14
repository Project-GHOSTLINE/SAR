#!/usr/bin/env node
/**
 * 🔍 Diagnostic Complet - Vérifie tout
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

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

async function diagnostic() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  log('blue', '\n🔍 ════════════════════════════════════════')
  log('blue', '🔍   DIAGNOSTIC COMPLET')
  log('blue', '🔍 ════════════════════════════════════════\n')

  // 1. Test toutes les tables TITAN
  const titanTables = [
    'loan_applications',
    'loan_objectives',
    'cortex_rules',
    'cortex_execution_logs'
  ]

  log('magenta', '📋 Test 1: Tables TITAN\n')

  for (const table of titanTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5)

      if (error) {
        log('red', `❌ ${table}`)
        log('yellow', `   Erreur: ${error.message}`)
        log('yellow', `   Code: ${error.code}`)
        log('yellow', `   Details: ${error.details || 'N/A'}`)
      } else {
        log('green', `✅ ${table}`)
        log('blue', `   Lignes: ${count || 0}`)
        if (data && data.length > 0) {
          log('blue', `   Exemple: ${JSON.stringify(data[0]).substring(0, 100)}...`)
        }
      }
    } catch (err) {
      log('red', `❌ ${table}`)
      log('yellow', `   Exception: ${err.message}`)
    }
    log('blue', '')
  }

  // 2. Test fonction generate_loan_reference
  log('magenta', '📋 Test 2: Fonction generate_loan_reference\n')

  try {
    const { data, error } = await supabase.rpc('generate_loan_reference')

    if (error) {
      log('red', '❌ Fonction generate_loan_reference')
      log('yellow', `   Erreur: ${error.message}`)
    } else {
      log('green', '✅ Fonction generate_loan_reference')
      log('blue', `   Référence générée: ${data}`)
    }
  } catch (err) {
    log('red', '❌ Fonction generate_loan_reference')
    log('yellow', `   Exception: ${err.message}`)
  }

  log('blue', '\n')

  // 3. Test création d'une application
  log('magenta', '📋 Test 3: Création d\'une application test\n')

  try {
    const testApp = {
      origin: 'argentrapide',
      reference: 'TEST-' + Date.now(),
      prenom: 'Test',
      nom: 'Diagnostic',
      courriel: 'test@diagnostic.com',
      telephone: '5141234567',
      montant_demande: 500000,
    }

    const { data, error } = await supabase
      .from('loan_applications')
      .insert(testApp)
      .select()
      .single()

    if (error) {
      log('red', '❌ Création application')
      log('yellow', `   Erreur: ${error.message}`)
      log('yellow', `   Code: ${error.code}`)
    } else {
      log('green', '✅ Création application réussie')
      log('blue', `   ID: ${data.id}`)
      log('blue', `   Référence: ${data.reference}`)

      // Nettoyer
      await supabase.from('loan_applications').delete().eq('id', data.id)
      log('blue', '   🧹 Application test supprimée')
    }
  } catch (err) {
    log('red', '❌ Création application')
    log('yellow', `   Exception: ${err.message}`)
  }

  log('blue', '\n')

  // 4. Vérifier les seed data
  log('magenta', '📋 Test 4: Seed Data\n')

  try {
    const { data: objectives, error: objError } = await supabase
      .from('loan_objectives')
      .select('*')

    if (!objError && objectives) {
      log('green', `✅ Objectifs: ${objectives.length} trouvés`)
      objectives.forEach(obj => {
        log('blue', `   - ${obj.name}`)
      })
    } else {
      log('yellow', '⚠️  Aucun objectif trouvé')
    }

    const { data: rules, error: rulesError } = await supabase
      .from('cortex_rules')
      .select('*')

    if (!rulesError && rules) {
      log('green', `✅ Règles Cortex: ${rules.length} trouvées`)
      rules.forEach(rule => {
        log('blue', `   - ${rule.name}`)
      })
    } else {
      log('yellow', '⚠️  Aucune règle trouvée')
    }

  } catch (err) {
    log('red', `❌ Erreur seed data: ${err.message}`)
  }

  log('blue', '\n════════════════════════════════════════')
  log('blue', '📊 FIN DU DIAGNOSTIC')
  log('blue', '════════════════════════════════════════\n')
}

diagnostic().catch(error => {
  log('red', `\n❌ Erreur fatale: ${error.message}`)
  console.error(error)
  process.exit(1)
})
