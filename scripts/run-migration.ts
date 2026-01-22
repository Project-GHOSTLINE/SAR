/**
 * Script pour exécuter une migration SQL sur Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Charger les variables d'environnement
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ Usage: npx tsx scripts/run-migration.ts <fichier.sql>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 EXÉCUTION DE MIGRATION SQL')
  console.log('=' .repeat(60))
  console.log(`📁 Fichier: ${migrationFile}`)
  console.log(`🏢 Supabase: ${supabaseUrl}`)
  console.log('')

  try {
    // Lire le fichier SQL
    const sqlContent = fs.readFileSync(migrationFile, 'utf-8')
    console.log('📖 Contenu SQL chargé')
    console.log('')

    // Diviser en commandes individuelles
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    console.log(`📊 ${commands.length} commandes SQL à exécuter`)
    console.log('')

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i]

      // Skip comments
      if (cmd.startsWith('--') || cmd.length === 0) continue

      try {
        console.log(`⏳ Commande ${i + 1}/${commands.length}...`)

        // Extraire le type de commande pour affichage
        const cmdType = cmd.substring(0, 50).replace(/\s+/g, ' ')
        console.log(`   ${cmdType}...`)

        const { data, error } = await supabase.rpc('exec_sql', { query: cmd + ';' })

        if (error) {
          // Essayer avec une requête directe si RPC échoue
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ query: cmd + ';' })
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }
        }

        console.log(`   ✅ OK`)
        successCount++
      } catch (error: any) {
        console.log(`   ⚠️  ${error.message}`)
        errorCount++
      }

      console.log('')
    }

    console.log('=' .repeat(60))
    console.log('📊 RÉSULTAT')
    console.log('=' .repeat(60))
    console.log(`✅ Succès: ${successCount}`)
    console.log(`❌ Erreurs: ${errorCount}`)
    console.log('')

    if (errorCount > 0) {
      console.log('⚠️  Certaines commandes ont échoué.')
      console.log('💡 Essayez d\'exécuter le SQL manuellement dans Supabase SQL Editor:')
      console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}/editor`)
    } else {
      console.log('✅ Migration terminée avec succès!')
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
    console.log('')
    console.log('💡 Pour exécuter manuellement:')
    console.log(`   1. Aller sur Supabase SQL Editor`)
    console.log(`   2. Copier le contenu de: ${migrationFile}`)
    console.log(`   3. Exécuter le SQL`)
    process.exit(1)
  }
}

runMigration()
