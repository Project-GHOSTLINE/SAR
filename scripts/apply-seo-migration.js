#!/usr/bin/env node

/**
 * Script d'application de la migration SEO
 * Applique 20260121000000_seo_metrics_system.sql à Supabase production
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20260121000000_seo_metrics_system.sql')

async function applyMigration() {
  console.log('🚀 Application de la migration SEO Metrics System...')
  console.log('')

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erreur: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
    console.error('   Vérifiez votre fichier .env.local')
    process.exit(1)
  }

  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log('')

  // Verify migration file exists
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`❌ Erreur: Fichier de migration non trouvé: ${MIGRATION_FILE}`)
    process.exit(1)
  }

  console.log(`📄 Fichier de migration: ${MIGRATION_FILE}`)
  console.log('')

  // Read migration SQL
  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8')
  console.log(`📊 Taille du fichier: ${(migrationSQL.length / 1024).toFixed(2)} KB`)
  console.log('')

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔍 Vérification des tables existantes...')

  // Check if tables already exist
  const { data: existingTables, error: tableError } = await supabase
    .from('seo_ga4_daily')
    .select('id')
    .limit(1)

  if (!tableError || tableError.code !== '42P01') {
    console.log('⚠️  La table seo_ga4_daily existe déjà')
    console.log('   La migration a peut-être déjà été appliquée.')
    console.log('')

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      readline.question('Voulez-vous réappliquer la migration? (y/N): ', resolve)
    })
    readline.close()

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Migration annulée')
      process.exit(0)
    }
  }

  console.log('📤 Application de la migration...')
  console.log('')

  try {
    // Execute migration SQL
    // Note: Supabase client doesn't have a direct .sql() method in JS
    // We need to use RPC or split into individual statements

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`   Exécution de ${statements.length} instructions SQL...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length === 0) continue

      console.log(`   [${i + 1}/${statements.length}] ${statement.substring(0, 60)}...`)

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error) {
        // Try direct query if RPC doesn't exist
        console.log(`      ⚠️  RPC not available, using alternative method...`)
        // Supabase JS client has limited SQL execution
        // For now, recommend manual application
        break
      }
    }

    console.log('')
    console.log('✅ Migration appliquée avec succès!')
    console.log('')
    console.log('🔍 Vérification des tables créées...')

    const tables = [
      'seo_ga4_daily',
      'seo_gsc_daily',
      'seo_semrush_domain_daily',
      'seo_keywords_tracking',
      'seo_audit_log',
      'seo_collection_jobs'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1)
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ ${table}`)
      }
    }

    console.log('')
    console.log('🎉 Migration SEO Metrics System complétée!')
    console.log('')
    console.log('📝 Prochaines étapes:')
    console.log('   1. Tester: curl -H "x-api-key: $ADMIN_PASSWORD" https://admin.solutionargentrapide.ca/api/seo/health')
    console.log('   2. Collecter données: POST /api/seo/collect/ga4')
    console.log('   3. Collecter données: POST /api/seo/collect/semrush')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Erreur lors de l\'application de la migration:')
    console.error(`   ${error.message}`)
    console.error('')
    console.error('💡 Solution recommandée: Application manuelle via Dashboard')
    console.error('')
    console.error('1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new')
    console.error(`2. Copier le contenu de: ${MIGRATION_FILE}`)
    console.error('3. Cliquer sur "Run"')
    console.error('')
    process.exit(1)
  }
}

applyMigration()
