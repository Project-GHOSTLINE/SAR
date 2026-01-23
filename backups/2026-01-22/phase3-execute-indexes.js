#!/usr/bin/env node

/**
 * PHASE 3: Exécuter les Indexes de Performance
 * Date: 2026-01-22
 * Risk: LOW (indexes only, no data changes)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const INDEXES = [
  {
    name: 'idx_loan_applications_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_client_id ON loan_applications(client_id)'
  },
  {
    name: 'idx_contact_messages_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_client_id ON contact_messages(client_id)'
  },
  {
    name: 'idx_vopay_objects_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_client_id ON vopay_objects(client_id)'
  },
  {
    name: 'idx_vopay_objects_loan_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_loan_id ON vopay_objects(loan_id)'
  },
  {
    name: 'idx_loan_applications_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status)'
  },
  {
    name: 'idx_contact_messages_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status)'
  },
  {
    name: 'idx_vopay_objects_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_status ON vopay_objects(status)'
  },
  {
    name: 'idx_clients_primary_email',
    sql: 'CREATE INDEX IF NOT EXISTS idx_clients_primary_email ON clients(primary_email)'
  },
  {
    name: 'idx_clients_primary_phone',
    sql: 'CREATE INDEX IF NOT EXISTS idx_clients_primary_phone ON clients(primary_phone)'
  },
  {
    name: 'idx_loan_applications_status_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_status_created ON loan_applications(status, created_at DESC)'
  },
  {
    name: 'idx_contact_messages_status_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages(status, created_at DESC)'
  },
  {
    name: 'idx_vopay_objects_type_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_type_status ON vopay_objects(object_type, status)'
  }
]

async function executeSQL(sql) {
  try {
    // Utiliser l'API REST de Supabase pour exécuter le SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

async function createIndexDirect(index) {
  try {
    console.log(`  🔨 Création: ${index.name}...`)

    // Approche alternative: utiliser l'API Supabase via HTTP
    // Note: Cela nécessite que l'endpoint exec existe

    // Pour l'instant, on va juste marquer comme "à exécuter manuellement"
    console.log(`  📝 SQL: ${index.sql}`)
    console.log(`  ⚠️  À exécuter manuellement via Supabase Dashboard`)

    return { success: true, manual: true }
  } catch (err) {
    console.log(`  ❌ Erreur: ${err.message}`)
    return { success: false, error: err.message }
  }
}

async function verifyIndexes() {
  console.log('🔍 Vérification des indexes existants...')

  try {
    // Requête pour lister les indexes
    const { data, error } = await supabase
      .from('pg_indexes')
      .select('schemaname, tablename, indexname')
      .eq('schemaname', 'public')
      .order('tablename')
      .order('indexname')

    if (error) {
      console.log('⚠️  Impossible de vérifier via Supabase JS')
      console.log('   Utilisez la requête SQL ci-dessous dans le Dashboard:')
      console.log('')
      console.log('   SELECT schemaname, tablename, indexname')
      console.log('   FROM pg_indexes')
      console.log('   WHERE schemaname = \'public\'')
      console.log('   ORDER BY tablename, indexname;')
      console.log('')
      return []
    }

    console.log(`✅ ${data.length} indexes trouvés dans la base`)

    // Vérifier quels indexes de notre liste existent déjà
    const existingNames = data.map(idx => idx.indexname)
    const ourIndexes = INDEXES.map(idx => idx.name)
    const missing = ourIndexes.filter(name => !existingNames.includes(name))
    const existing = ourIndexes.filter(name => existingNames.includes(name))

    console.log(`  - Déjà créés: ${existing.length}`)
    console.log(`  - À créer: ${missing.length}`)
    console.log('')

    return { existing, missing, allIndexes: data }
  } catch (err) {
    console.log(`⚠️  Erreur lors de la vérification: ${err.message}`)
    return { existing: [], missing: INDEXES.map(idx => idx.name), allIndexes: [] }
  }
}

async function main() {
  console.log('📈 PHASE 3: EXÉCUTER INDEXES DE PERFORMANCE')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Indexes à créer: ${INDEXES.length}`)
  console.log('')

  try {
    // Vérifier les indexes existants
    const verification = await verifyIndexes()

    console.log('📊 MÉTHODE D\'EXÉCUTION RECOMMANDÉE:')
    console.log('=========================================')
    console.log('')
    console.log('Supabase JS ne supporte pas les commandes DDL.')
    console.log('Vous devez exécuter le script SQL manuellement.')
    console.log('')
    console.log('📝 INSTRUCTIONS:')
    console.log('1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor')
    console.log('2. Créer une nouvelle query')
    console.log('3. Copier le contenu de: phase3-indexes.sql')
    console.log('4. Exécuter le script')
    console.log('5. Vérifier les résultats')
    console.log('')
    console.log('⏱️  Temps estimé: 30 secondes')
    console.log('⚠️  Impact: Aucun (indexes en background)')
    console.log('')

    // Afficher les indexes à créer
    console.log('📋 INDEXES À CRÉER:')
    console.log('=========================================')
    for (const index of INDEXES) {
      const exists = verification.existing?.includes(index.name)
      const status = exists ? '✅ Existe déjà' : '📝 À créer'
      console.log(`${status} - ${index.name}`)
    }
    console.log('')

    // Créer un rapport
    const report = {
      date: new Date().toISOString(),
      total_indexes: INDEXES.length,
      existing: verification.existing?.length || 0,
      missing: verification.missing?.length || 0,
      status: 'ready_to_execute',
      sql_file: 'phase3-indexes.sql',
      dashboard_url: 'https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor'
    }

    fs.writeFileSync(
      path.join(__dirname, 'phase3-report.json'),
      JSON.stringify(report, null, 2)
    )

    console.log('🎉 PHASE 3 PRÉPARÉE!')
    console.log('📄 Rapport: phase3-report.json')
    console.log('📄 Script SQL: phase3-indexes.sql')
    console.log('')

    if (verification.missing?.length === 0) {
      console.log('✅ Tous les indexes existent déjà!')
      process.exit(0)
    } else {
      console.log(`⚠️  ${verification.missing?.length || INDEXES.length} indexes à créer manuellement`)
      process.exit(0)
    }
  } catch (err) {
    console.error('❌ ERREUR FATALE:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
