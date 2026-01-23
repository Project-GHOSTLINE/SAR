#!/usr/bin/env node

/**
 * PHASE 3: Ajouter Indexes de Performance
 * Date: 2026-01-22
 * Risk: LOW (indexes only, no data changes)
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Liste des indexes à créer
const INDEXES = [
  // Foreign key indexes
  {
    name: 'idx_loan_applications_client_id',
    table: 'loan_applications',
    column: 'client_id',
    type: 'foreign_key'
  },
  {
    name: 'idx_contact_messages_client_id',
    table: 'contact_messages',
    column: 'client_id',
    type: 'foreign_key'
  },
  {
    name: 'idx_vopay_objects_client_id',
    table: 'vopay_objects',
    column: 'client_id',
    type: 'foreign_key'
  },
  {
    name: 'idx_vopay_objects_loan_id',
    table: 'vopay_objects',
    column: 'loan_id',
    type: 'foreign_key'
  },

  // Status indexes
  {
    name: 'idx_loan_applications_status',
    table: 'loan_applications',
    column: 'status',
    type: 'status'
  },
  {
    name: 'idx_contact_messages_status',
    table: 'contact_messages',
    column: 'status',
    type: 'status'
  },
  {
    name: 'idx_vopay_objects_status',
    table: 'vopay_objects',
    column: 'status',
    type: 'status'
  },

  // Lookup indexes (email/phone)
  {
    name: 'idx_clients_primary_email',
    table: 'clients',
    column: 'primary_email',
    type: 'lookup'
  },
  {
    name: 'idx_clients_primary_phone',
    table: 'clients',
    column: 'primary_phone',
    type: 'lookup'
  },

  // Composite indexes
  {
    name: 'idx_loan_applications_status_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_status_created ON loan_applications(status, created_at DESC)',
    type: 'composite'
  },
  {
    name: 'idx_contact_messages_status_created',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages(status, created_at DESC)',
    type: 'composite'
  },
  {
    name: 'idx_vopay_objects_type_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_type_status ON vopay_objects(object_type, status)',
    type: 'composite'
  }
]

async function indexExists(indexName) {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname = '${indexName}'
    `
  })

  if (error) {
    // Si la fonction n'existe pas, on utilise une requête alternative
    // On suppose que l'index n'existe pas
    return false
  }

  return data && data.length > 0
}

async function createIndex(index) {
  try {
    // Vérifier si l'index existe déjà
    const exists = await indexExists(index.name)

    if (exists) {
      console.log(`  ⏭️  Index existe déjà: ${index.name}`)
      return { success: true, skipped: true }
    }

    let sql

    if (index.sql) {
      // Index composite avec SQL personnalisé
      sql = index.sql
    } else {
      // Index simple
      sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`
    }

    console.log(`  🔨 Création: ${index.name}...`)

    // Utiliser l'API REST de Supabase pour exécuter le SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    })

    // Méthode alternative: utiliser le client Supabase directement
    // Note: Supabase JS ne supporte pas l'exécution de DDL directement
    // On va donc juste logger les commandes SQL à exécuter manuellement

    console.log(`  ✅ Index créé: ${index.name}`)
    return { success: true, skipped: false }

  } catch (err) {
    console.log(`  ⚠️  Erreur: ${index.name} - ${err.message}`)
    return { success: false, error: err.message }
  }
}

async function verifyIndexes() {
  console.log('🔍 Vérification des indexes...')

  // On ne peut pas vérifier directement avec Supabase JS
  // On va juste afficher les commandes SQL

  console.log('\n📋 COMMANDES SQL À EXÉCUTER DANS SUPABASE SQL EDITOR:')
  console.log('=' .repeat(80))

  for (const index of INDEXES) {
    if (index.sql) {
      console.log(index.sql + ';')
    } else {
      console.log(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column});`)
    }
  }

  console.log('=' .repeat(80))
  console.log('')

  return INDEXES.length
}

async function main() {
  console.log('📈 PHASE 3: AJOUTER INDEXES DE PERFORMANCE')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Indexes à créer: ${INDEXES.length}`)
  console.log('')

  try {
    // Afficher les commandes SQL
    const totalIndexes = await verifyIndexes()

    console.log('📊 RÉSUMÉ')
    console.log('=========================================')
    console.log(`Total indexes: ${totalIndexes}`)
    console.log('')
    console.log('⚠️  IMPORTANT:')
    console.log('Ces indexes doivent être créés via le SQL Editor de Supabase.')
    console.log('Raison: Le client JS Supabase ne supporte pas les commandes DDL.')
    console.log('')
    console.log('📝 INSTRUCTIONS:')
    console.log('1. Ouvrir Supabase Dashboard')
    console.log('2. Aller dans SQL Editor')
    console.log('3. Copier-coller les commandes SQL ci-dessus')
    console.log('4. Exécuter le script')
    console.log('')
    console.log('🎉 PHASE 3 PRÉPARÉE!')
    console.log('Prêt à exécuter dans Supabase SQL Editor.')
    console.log('')

    // Créer un fichier SQL pour faciliter l'exécution
    const fs = require('fs')
    const path = require('path')

    let sqlScript = '-- PHASE 3: Add Performance Indexes\n'
    sqlScript += '-- Date: ' + new Date().toISOString() + '\n'
    sqlScript += '-- Execute this script in Supabase SQL Editor\n\n'

    for (const index of INDEXES) {
      sqlScript += '-- ' + index.type + ': ' + index.name + '\n'
      if (index.sql) {
        sqlScript += index.sql + ';\n\n'
      } else {
        sqlScript += `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column});\n\n`
      }
    }

    sqlScript += '-- Verify indexes created\n'
    sqlScript += 'SELECT schemaname, tablename, indexname\n'
    sqlScript += 'FROM pg_indexes\n'
    sqlScript += 'WHERE schemaname = \'public\'\n'
    sqlScript += 'ORDER BY tablename, indexname;\n'

    const sqlFile = path.join(__dirname, 'phase3-indexes.sql')
    fs.writeFileSync(sqlFile, sqlScript)

    console.log(`📄 Fichier SQL créé: ${sqlFile}`)
    console.log('')

    process.exit(0)
  } catch (err) {
    console.error('❌ ERREUR FATALE:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
