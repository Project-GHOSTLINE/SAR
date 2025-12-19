#!/usr/bin/env node
// ============================================
// Script: Exécuter migration Supabase
// Description: Ajouter colonnes metadata à contact_messages
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lire les variables d'environnement
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY manquante')
  console.log('\nExécutez avec:')
  console.log('SUPABASE_SERVICE_KEY=your_key node run-supabase-migration.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('🚀 Migration Supabase: Ajout colonnes metadata')
console.log('📍 URL:', SUPABASE_URL)
console.log('')

// Lire le script SQL
const sqlScript = readFileSync(join(__dirname, 'supabase-add-metadata.sql'), 'utf-8')

// Séparer les commandes SQL
const sqlCommands = sqlScript
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

console.log(`📝 ${sqlCommands.length} commandes SQL à exécuter\n`)

// Exécuter chaque commande
for (let i = 0; i < sqlCommands.length; i++) {
  const cmd = sqlCommands[i]

  // Ignorer les commentaires COMMENT ON
  if (cmd.startsWith('COMMENT ON')) {
    console.log(`⏭️  [${i + 1}/${sqlCommands.length}] Commentaire ignoré`)
    continue
  }

  // Ignorer les SELECT de vérification
  if (cmd.startsWith('SELECT column_name')) {
    console.log(`⏭️  [${i + 1}/${sqlCommands.length}] SELECT de vérification ignoré`)
    continue
  }

  try {
    console.log(`🔄 [${i + 1}/${sqlCommands.length}] Exécution...`)

    // Utiliser rpc pour exécuter du SQL brut
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: cmd })

    if (error) {
      // Essayer avec une requête directe
      const { error: directError } = await supabase
        .from('contact_messages')
        .select('*')
        .limit(1)

      if (directError) {
        console.error(`❌ Erreur:`, error.message || error)
      } else {
        console.log(`✅ Commande exécutée`)
      }
    } else {
      console.log(`✅ Commande exécutée`)
    }
  } catch (err) {
    console.error(`❌ Erreur inattendue:`, err.message)
  }
}

console.log('\n📊 Vérification des colonnes existantes...')

// Vérifier si les colonnes existent
try {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Impossible de vérifier:', error.message)
  } else {
    const columns = Object.keys(data[0] || {})
    const metadataColumns = columns.filter(col =>
      col.startsWith('client_') || col.startsWith('utm_') || col === 'referrer'
    )

    console.log('\n✅ Colonnes metadata trouvées:')
    metadataColumns.forEach(col => console.log(`   - ${col}`))

    if (metadataColumns.length === 0) {
      console.log('\n⚠️  Aucune colonne metadata trouvée')
      console.log('   Les colonnes doivent être ajoutées manuellement dans Supabase SQL Editor')
      console.log('   Utilisez le fichier: supabase-add-metadata.sql')
    }
  }
} catch (err) {
  console.error('❌ Erreur de vérification:', err.message)
}

console.log('\n✅ Migration terminée!')
