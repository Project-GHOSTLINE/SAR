#!/usr/bin/env node

/**
 * PHASE 3: Exécuter Indexes via PostgreSQL Direct
 * Date: 2026-01-22
 * Risk: LOW (indexes only, no data changes)
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Connection string Supabase
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const CONNECTION_STRING = 'postgresql://postgres:Solution%2599@db.dllyzfuqjzuhvshrlmuq.supabase.co:5432/postgres'

const INDEXES = [
  {
    name: 'idx_loan_applications_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_client_id ON loan_applications(client_id)',
    type: 'foreign_key'
  },
  {
    name: 'idx_contact_messages_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_client_id ON contact_messages(client_id)',
    type: 'foreign_key'
  },
  {
    name: 'idx_vopay_objects_client_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_client_id ON vopay_objects(client_id)',
    type: 'foreign_key'
  },
  {
    name: 'idx_vopay_objects_loan_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_loan_id ON vopay_objects(loan_id)',
    type: 'foreign_key'
  },
  {
    name: 'idx_loan_applications_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status)',
    type: 'status'
  },
  {
    name: 'idx_contact_messages_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status)',
    type: 'status'
  },
  {
    name: 'idx_vopay_objects_status',
    sql: 'CREATE INDEX IF NOT EXISTS idx_vopay_objects_status ON vopay_objects(status)',
    type: 'status'
  },
  {
    name: 'idx_clients_primary_email',
    sql: 'CREATE INDEX IF NOT EXISTS idx_clients_primary_email ON clients(primary_email)',
    type: 'lookup'
  },
  {
    name: 'idx_clients_primary_phone',
    sql: 'CREATE INDEX IF NOT EXISTS idx_clients_primary_phone ON clients(primary_phone)',
    type: 'lookup'
  },
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

async function createIndex(client, index) {
  try {
    console.log(`  🔨 Création: ${index.name}...`)

    const startTime = Date.now()
    await client.query(index.sql)
    const duration = Date.now() - startTime

    console.log(`  ✅ Créé en ${duration}ms`)

    return {
      name: index.name,
      type: index.type,
      success: true,
      duration_ms: duration
    }
  } catch (err) {
    // Si l'index existe déjà, ce n'est pas une erreur
    if (err.message.includes('already exists')) {
      console.log(`  ⏭️  Existe déjà`)
      return {
        name: index.name,
        type: index.type,
        success: true,
        skipped: true
      }
    }

    console.log(`  ❌ Erreur: ${err.message}`)
    return {
      name: index.name,
      type: index.type,
      success: false,
      error: err.message
    }
  }
}

async function verifyIndexes(client) {
  console.log('🔍 Vérification des indexes...')

  try {
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `)

    console.log(`✅ ${result.rows.length} indexes trouvés dans la base`)

    // Vérifier nos indexes
    const existingNames = result.rows.map(row => row.indexname)
    const ourIndexNames = INDEXES.map(idx => idx.name)
    const existing = ourIndexNames.filter(name => existingNames.includes(name))
    const missing = ourIndexNames.filter(name => !existingNames.includes(name))

    console.log(`  - Déjà créés: ${existing.length}`)
    console.log(`  - À créer: ${missing.length}`)
    console.log('')

    return {
      total: result.rows.length,
      existing,
      missing,
      all: result.rows
    }
  } catch (err) {
    console.log(`⚠️  Erreur lors de la vérification: ${err.message}`)
    return {
      total: 0,
      existing: [],
      missing: INDEXES.map(idx => idx.name),
      all: []
    }
  }
}

async function main() {
  console.log('📈 PHASE 3: EXÉCUTER INDEXES VIA POSTGRESQL')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Indexes à créer: ${INDEXES.length}`)
  console.log('')

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    // Connexion
    console.log('🔌 Connexion à Supabase PostgreSQL...')
    await client.connect()
    console.log('✅ Connecté!')
    console.log('')

    // Vérification avant
    const before = await verifyIndexes(client)

    if (before.missing.length === 0) {
      console.log('🎉 Tous les indexes existent déjà!')
      await client.end()
      process.exit(0)
    }

    // Créer les indexes
    console.log(`🔨 Création de ${before.missing.length} indexes...`)
    console.log('')

    const results = []
    for (const index of INDEXES) {
      const result = await createIndex(client, index)
      results.push(result)
    }

    console.log('')

    // Vérification après
    const after = await verifyIndexes(client)

    // Statistiques
    const created = results.filter(r => r.success && !r.skipped).length
    const skipped = results.filter(r => r.skipped).length
    const failed = results.filter(r => !r.success).length

    console.log('📊 RÉSULTATS')
    console.log('=========================================')
    console.log(`Total indexes: ${INDEXES.length}`)
    console.log(`Créés: ${created}`)
    console.log(`Déjà existants: ${skipped}`)
    console.log(`Erreurs: ${failed}`)
    console.log('')

    if (failed > 0) {
      console.log('❌ ERREURS:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
      console.log('')
    }

    console.log('📊 ÉTAT FINAL')
    console.log('=========================================')
    console.log(`Total indexes dans la base: ${after.total}`)
    console.log(`Nos indexes présents: ${after.existing.length}/${INDEXES.length}`)
    console.log('')

    // Sauvegarder le rapport
    const report = {
      date: new Date().toISOString(),
      total_indexes: INDEXES.length,
      created,
      skipped,
      failed,
      total_in_database: after.total,
      our_indexes_present: after.existing.length,
      details: results
    }

    fs.writeFileSync(
      path.join(__dirname, 'phase3-execution-report.json'),
      JSON.stringify(report, null, 2)
    )

    console.log('📄 Rapport sauvegardé: phase3-execution-report.json')
    console.log('')

    if (failed === 0) {
      console.log('🎉 PHASE 3 TERMINÉE AVEC SUCCÈS!')
      console.log('')
      await client.end()
      process.exit(0)
    } else {
      console.log('⚠️  PHASE 3 TERMINÉE AVEC ERREURS')
      console.log('')
      await client.end()
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ ERREUR FATALE:', err.message)
    console.error(err.stack)
    await client.end()
    process.exit(1)
  }
}

main()
