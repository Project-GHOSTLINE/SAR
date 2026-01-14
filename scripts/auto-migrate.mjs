#!/usr/bin/env node
/**
 * 🤖 Script d'Exécution Automatique Migration TITAN
 * Tente d'exécuter la migration SQL automatiquement
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

async function autoMigrate() {
  log('blue', '\n🤖 ════════════════════════════════════════')
  log('blue', '🤖   TITAN Migration Automatique')
  log('blue', '🤖 ════════════════════════════════════════\n')

  // 1. Vérifier variables d'environnement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    log('red', '❌ Variables d\'environnement manquantes')
    process.exit(1)
  }

  log('green', '✅ Variables d\'environnement OK')

  // 2. Lire le fichier SQL
  const sqlPath = join(__dirname, '../database/titan-system.sql')
  let sqlContent

  try {
    sqlContent = readFileSync(sqlPath, 'utf8')
    log('green', `✅ SQL chargé (${sqlContent.split('\n').length} lignes)`)
  } catch (error) {
    log('red', `❌ Erreur lecture: ${error.message}`)
    process.exit(1)
  }

  // 3. Exécuter via Supabase REST API
  log('blue', '\n📡 Exécution de la migration...\n')

  try {
    // Utiliser l'API REST pour exécuter le SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: sqlContent }),
    })

    if (response.ok) {
      log('green', '✅ Migration exécutée avec succès!')
    } else {
      const error = await response.text()
      log('yellow', '⚠️  L\'API RPC exec_sql n\'existe pas (attendu)')
      log('yellow', '⚠️  Tentative d\'exécution statement par statement...\n')

      // Fallback: exécuter statement par statement
      await executeStatementByStatement(sqlContent, supabaseUrl, supabaseKey)
    }
  } catch (error) {
    log('yellow', `⚠️  Erreur API: ${error.message}`)
    log('yellow', '⚠️  La migration automatique n\'est pas possible avec cette configuration\n')

    log('magenta', '📋 SOLUTION:')
    log('blue', '   Exécutez: node scripts/execute-migration.mjs')
    log('blue', '   Pour ouvrir le SQL Editor et exécuter manuellement\n')
    process.exit(1)
  }

  log('blue', '\n════════════════════════════════════════\n')
}

async function executeStatementByStatement(sqlContent, supabaseUrl, supabaseKey) {
  // Cette approche ne fonctionnera pas pour les DDL statements
  // car Supabase JS client ne supporte pas l'exécution de SQL brut
  log('red', '❌ Impossible d\'exécuter automatiquement les DDL statements')
  log('yellow', '\n📋 RAISON:')
  log('blue', '   - Supabase JS client ne supporte pas le SQL brut')
  log('blue', '   - Les CREATE TABLE, CREATE FUNCTION nécessitent le SQL Editor')
  log('blue', '   - OU connexion PostgreSQL directe avec mot de passe DB\n')

  log('magenta', '💡 SOLUTIONS:')
  log('green', '\n   Option 1 (RECOMMANDÉE):')
  log('blue', '   node scripts/execute-migration.mjs')
  log('blue', '   → Ouvre SQL Editor, SQL copié dans clipboard\n')

  log('green', '   Option 2 (Advanced):')
  log('blue', '   Configurer SUPABASE_DB_PASSWORD dans .env.local')
  log('blue', '   Puis utiliser psql pour connexion directe\n')
}

// Exécuter
autoMigrate().catch((error) => {
  log('red', `\n❌ Erreur fatale: ${error.message}`)
  process.exit(1)
})
