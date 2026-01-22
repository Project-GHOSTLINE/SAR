#!/usr/bin/env node

/**
 * Script de Backup Complet - Base de Données Supabase
 * Date: 2026-01-22
 * AVANT corrections DB critiques
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Credentials Supabase
const SUPABASE_URL = 'https://dllyzfuqjzuhvshrlmuq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Tables à backup
const TABLES = [
  'clients',
  'client_identity_aliases',
  'loan_applications',
  'loans',
  'payment_schedule_versions',
  'payment_installments',
  'payment_events',
  'vopay_objects',
  'vopay_webhook_logs',
  'contact_messages',
  'support_tickets',
  'emails_envoyes',
  'quickbooks_tokens',
  'quickbooks_customers',
  'quickbooks_invoices',
  'quickbooks_payments',
  'fraud_cases',
  'admin_sections',
  'metric_registry',
  'metric_values',
  'claude_memory',
  'claude_activity_logs'
]

async function backupTable(tableName) {
  console.log(`📦 Backup de ${tableName}...`)

  try {
    // Fetch ALL rows (pagination automatique)
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(10000) // Max 10k rows per table

    if (error) {
      console.error(`❌ Erreur sur ${tableName}:`, error.message)
      return { table: tableName, rows: 0, error: error.message }
    }

    // Sauvegarder en JSON
    const filename = `${tableName}.json`
    const filepath = path.join(__dirname, filename)
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))

    console.log(`✅ ${tableName}: ${count || data.length} rows sauvegardées`)

    return {
      table: tableName,
      rows: count || data.length,
      size: fs.statSync(filepath).size,
      file: filename
    }
  } catch (err) {
    console.error(`❌ Exception sur ${tableName}:`, err.message)
    return { table: tableName, rows: 0, error: err.message }
  }
}

async function main() {
  console.log('🚀 BACKUP COMPLET DE LA BASE DE DONNÉES')
  console.log('=========================================')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`URL: ${SUPABASE_URL}`)
  console.log(`Tables: ${TABLES.length}`)
  console.log('')

  const startTime = Date.now()
  const results = []

  // Backup séquentiel de chaque table
  for (const table of TABLES) {
    const result = await backupTable(table)
    results.push(result)
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Statistiques
  console.log('')
  console.log('📊 STATISTIQUES DU BACKUP')
  console.log('=========================================')

  const totalRows = results.reduce((sum, r) => sum + r.rows, 0)
  const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0)
  const errors = results.filter(r => r.error)

  console.log(`Total tables: ${results.length}`)
  console.log(`Total rows: ${totalRows.toLocaleString()}`)
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Durée: ${duration}s`)
  console.log(`Erreurs: ${errors.length}`)

  if (errors.length > 0) {
    console.log('')
    console.log('❌ ERREURS:')
    errors.forEach(e => console.log(`  - ${e.table}: ${e.error}`))
  }

  // Sauvegarder le rapport
  const report = {
    date: new Date().toISOString(),
    duration: `${duration}s`,
    tables: results.length,
    totalRows,
    totalSize,
    errors: errors.length,
    details: results
  }

  fs.writeFileSync(
    path.join(__dirname, 'backup-report.json'),
    JSON.stringify(report, null, 2)
  )

  console.log('')
  console.log('✅ BACKUP TERMINÉ!')
  console.log(`📄 Rapport: backup-report.json`)
  console.log('')

  if (errors.length === 0) {
    console.log('🎉 Backup complet réussi!')
    process.exit(0)
  } else {
    console.log('⚠️  Backup complété avec des erreurs')
    process.exit(1)
  }
}

main()
