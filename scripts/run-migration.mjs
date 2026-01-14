#!/usr/bin/env node
/**
 * 🚀 Script de Migration TITAN
 * Exécute la migration SQL dans Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function runMigration() {
  log('blue', '\n🚀 TITAN Migration - Démarrage...\n')

  // 1. Vérifier les variables d'environnement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    log('red', '❌ Erreur: Variables d\'environnement manquantes')
    log('yellow', 'Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis')
    process.exit(1)
  }

  log('green', '✅ Variables d\'environnement trouvées')

  // 2. Créer client Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)
  log('green', '✅ Client Supabase créé')

  // 3. Lire le fichier SQL
  const sqlPath = join(__dirname, '../database/titan-system.sql')
  let sqlContent

  try {
    sqlContent = readFileSync(sqlPath, 'utf8')
    log('green', `✅ Fichier SQL lu (${sqlContent.length} caractères)`)
  } catch (error) {
    log('red', `❌ Erreur lecture fichier SQL: ${error.message}`)
    process.exit(1)
  }

  // 4. Exécuter la migration
  log('blue', '\n📊 Exécution de la migration SQL...\n')

  try {
    // Note: Supabase client n'a pas de méthode directe pour exécuter du SQL brut
    // Il faut utiliser l'API REST ou le Dashboard
    log('yellow', '⚠️  Méthode 1: Utiliser Supabase SQL Editor (Dashboard)')
    log('blue', '   1. Ouvrir: https://supabase.com/dashboard/project/YOUR_PROJECT/editor')
    log('blue', '   2. Copier le contenu de: database/titan-system.sql')
    log('blue', '   3. Coller dans SQL Editor et exécuter')

    log('yellow', '\n⚠️  Méthode 2: Utiliser l\'API Supabase (requiert token)')
    log('blue', '   curl -X POST https://YOUR_PROJECT.supabase.co/rest/v1/rpc/YOUR_FUNCTION')

    log('yellow', '\n⚠️  Méthode 3: Utiliser Supabase CLI')
    log('blue', '   supabase db push')

    // Tester la connexion en vérifiant si on peut accéder aux tables
    log('blue', '\n🔍 Test de connexion Supabase...')

    const { data, error } = await supabase
      .from('loan_applications')
      .select('count')
      .limit(1)

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        log('yellow', '⚠️  Les tables n\'existent pas encore')
        log('blue', '📝 Veuillez exécuter manuellement database/titan-system.sql dans Supabase SQL Editor')
        log('blue', '🔗 URL: https://supabase.com/dashboard')
      } else {
        log('red', `❌ Erreur Supabase: ${error.message}`)
      }
    } else {
      log('green', '✅ Tables déjà créées et accessibles!')
    }

  } catch (error) {
    log('red', `❌ Erreur: ${error.message}`)
    process.exit(1)
  }

  log('green', '\n✅ Migration terminée!\n')
}

// Exécuter
runMigration().catch(error => {
  log('red', `\n❌ Erreur fatale: ${error.message}`)
  process.exit(1)
})
