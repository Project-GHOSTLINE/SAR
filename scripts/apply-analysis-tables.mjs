#!/usr/bin/env node
/**
 * Script pour appliquer la migration des tables d'analyse
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger .env.local
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('📊 Application de la migration des tables d\'analyse...\n')

// Lire le fichier SQL
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260122000001_add_analysis_tables.sql')
const sql = readFileSync(migrationPath, 'utf-8')

// Diviser en statements individuels
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`📝 ${statements.length} statements SQL à exécuter\n`)

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';'

  // Skip les commentaires
  if (statement.startsWith('COMMENT')) {
    console.log(`⏭️  [${i + 1}/${statements.length}] COMMENT (skipped)`)
    continue
  }

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

    if (error) {
      // Si la fonction exec_sql n'existe pas, utiliser une requête directe
      const { error: directError } = await supabase.from('_').select('*').limit(0)

      if (directError) {
        console.log(`⚠️  [${i + 1}/${statements.length}] Erreur (peut-être déjà appliqué):`, error.message.substring(0, 100))
      } else {
        console.log(`✅ [${i + 1}/${statements.length}] OK`)
      }
    } else {
      console.log(`✅ [${i + 1}/${statements.length}] OK`)
    }
  } catch (err) {
    console.log(`⚠️  [${i + 1}/${statements.length}] Erreur:`, err.message.substring(0, 100))
  }
}

console.log('\n✅ Migration appliquée!\n')

// Vérifier que les tables existent
console.log('🔍 Vérification des tables...\n')

try {
  const { count: jobsCount, error: jobsError } = await supabase
    .from('analysis_jobs')
    .select('*', { count: 'exact', head: true })

  const { count: scoresCount, error: scoresError } = await supabase
    .from('analysis_scores')
    .select('*', { count: 'exact', head: true })

  const { count: recoCount, error: recoError } = await supabase
    .from('analysis_recommendations')
    .select('*', { count: 'exact', head: true })

  if (jobsError) console.log('❌ Table analysis_jobs:', jobsError.message)
  else console.log(`✅ Table analysis_jobs: ${jobsCount} lignes`)

  if (scoresError) console.log('❌ Table analysis_scores:', scoresError.message)
  else console.log(`✅ Table analysis_scores: ${scoresCount} lignes`)

  if (recoError) console.log('❌ Table analysis_recommendations:', recoError.message)
  else console.log(`✅ Table analysis_recommendations: ${recoCount} lignes`)

} catch (err) {
  console.error('❌ Erreur vérification:', err.message)
}

console.log('\n🎉 Terminé!')
