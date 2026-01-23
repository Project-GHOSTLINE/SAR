/**
 * Restore Database Backup
 * Usage: node scripts/restore-backup.js <backup-folder-name>
 * Example: node scripts/restore-backup.js 2026-01-23-rpc-migration
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const backupFolder = process.argv[2]

if (!backupFolder) {
  console.error('❌ Usage: node scripts/restore-backup.js <backup-folder-name>')
  console.error('   Example: node scripts/restore-backup.js 2026-01-23-rpc-migration')
  process.exit(1)
}

const BACKUP_DIR = path.join(__dirname, '../backups', backupFolder)

async function restoreTable(tableName) {
  console.log(`\n📥 Restoring ${tableName}...`)

  const filePath = path.join(BACKUP_DIR, `${tableName}.json`)

  try {
    const fileContent = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileContent)

    if (!data || data.length === 0) {
      console.log(`   ⚠️  No data to restore for ${tableName}`)
      return { table: tableName, rows: 0 }
    }

    console.log(`   Found ${data.length} rows to restore`)

    // Confirm before deleting existing data
    console.log(`   ⚠️  WARNING: This will DELETE all existing data in ${tableName}!`)
    console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...`)
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Delete existing data
    console.log(`   🗑️  Deleting existing data...`)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.error(`   ❌ Error deleting data:`, deleteError.message)
      throw deleteError
    }

    // Insert backup data in batches
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch)

      if (insertError) {
        console.error(`   ❌ Error inserting batch:`, insertError.message)
        throw insertError
      }

      inserted += batch.length
      process.stdout.write(`\r   Restored ${inserted}/${data.length} rows...`)
    }

    console.log(`\n   ✅ Restored ${inserted} rows`)

    return { table: tableName, rows: inserted }
  } catch (error) {
    console.error(`   ❌ Failed:`, error.message)
    return { table: tableName, error: error.message }
  }
}

async function main() {
  console.log('🔄 DATABASE RESTORE')
  console.log('=' .repeat(60))
  console.log('Backup folder:', backupFolder)
  console.log('Backup path:', BACKUP_DIR)
  console.log('')

  // Check if backup exists
  try {
    await fs.access(BACKUP_DIR)
  } catch {
    console.error('❌ Backup folder not found:', BACKUP_DIR)
    process.exit(1)
  }

  // Read backup report
  try {
    const reportPath = path.join(BACKUP_DIR, 'backup-report.json')
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))

    console.log('📊 Backup Info:')
    console.log('   Date:', report.timestamp)
    console.log('   Purpose:', report.purpose)
    console.log('   Tables:', report.tables.map(t => t.table).join(', '))
    console.log('')
  } catch {
    console.log('⚠️  No backup report found, continuing anyway...\n')
  }

  // Get all JSON files in backup
  const files = await fs.readdir(BACKUP_DIR)
  const tableFiles = files.filter(f => f.endsWith('.json') && f !== 'backup-report.json')

  if (tableFiles.length === 0) {
    console.error('❌ No backup files found!')
    process.exit(1)
  }

  console.log(`Found ${tableFiles.length} tables to restore:`)
  tableFiles.forEach(f => console.log(`   - ${f.replace('.json', '')}`))
  console.log('')

  // Final confirmation
  console.log('⚠️  FINAL WARNING: This will overwrite your database!')
  console.log('   Press Ctrl+C NOW to cancel, or wait 10 seconds...')
  await new Promise(resolve => setTimeout(resolve, 10000))

  const results = []

  for (const file of tableFiles) {
    const tableName = file.replace('.json', '')
    const result = await restoreTable(tableName)
    results.push(result)
  }

  console.log('')
  console.log('=' .repeat(60))
  console.log('📊 RESTORE SUMMARY')
  console.log('=' .repeat(60))

  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: FAILED - ${r.error}`)
    } else {
      console.log(`✅ ${r.table}: ${r.rows} rows restored`)
    }
  })

  console.log('')
  console.log('✅ Restore complete!')
}

main().catch(error => {
  console.error('❌ Restore failed:', error)
  process.exit(1)
})
