/**
 * Backup Critical Tables Before RPC Migration
 * Date: 2026-01-23
 * Purpose: Backup vopay_webhook_logs and webhook_logs before updating RPC function
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BACKUP_DIR = path.join(__dirname, '../backups/2026-01-23-rpc-migration')

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
}

async function backupTable(tableName) {
  console.log(`📦 Backing up ${tableName}...`)

  let allData = []
  let from = 0
  const batchSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1)

    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error.message)
      throw error
    }

    if (!data || data.length === 0) break

    allData = allData.concat(data)
    from += batchSize

    process.stdout.write(`\r   Fetched ${allData.length} rows...`)

    if (data.length < batchSize) break
  }

  const filePath = path.join(BACKUP_DIR, `${tableName}.json`)
  await fs.writeFile(filePath, JSON.stringify(allData, null, 2))

  const fileSize = (await fs.stat(filePath)).size
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

  console.log(`\n   ✅ Saved ${allData.length} rows (${fileSizeMB} MB)`)

  return { table: tableName, rows: allData.length, size: fileSizeMB }
}

async function main() {
  console.log('🔒 SAFETY BACKUP - Before RPC Migration')
  console.log('=' .repeat(60))
  console.log('Date:', new Date().toISOString())
  console.log('Purpose: Backup before updating process_vopay_webhook RPC')
  console.log('')

  await ensureDir(BACKUP_DIR)

  const tables = [
    'vopay_webhook_logs',
    'webhook_logs',
    'vopay_objects'
  ]

  const results = []

  for (const table of tables) {
    try {
      const result = await backupTable(table)
      results.push(result)
    } catch (error) {
      console.error(`❌ Failed to backup ${table}:`, error.message)
      results.push({ table, error: error.message })
    }
  }

  // Save backup report
  const report = {
    timestamp: new Date().toISOString(),
    purpose: 'Backup before updating process_vopay_webhook RPC function',
    migration: '20260123000000_update_vopay_webhook_rpc.sql',
    tables: results,
    backupDir: BACKUP_DIR
  }

  await fs.writeFile(
    path.join(BACKUP_DIR, 'backup-report.json'),
    JSON.stringify(report, null, 2)
  )

  console.log('')
  console.log('=' .repeat(60))
  console.log('📊 BACKUP SUMMARY')
  console.log('=' .repeat(60))

  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: FAILED - ${r.error}`)
    } else {
      console.log(`✅ ${r.table}: ${r.rows} rows (${r.size} MB)`)
    }
  })

  console.log('')
  console.log('📁 Backup location:', BACKUP_DIR)
  console.log('✅ Backup complete! Safe to run migration.')
  console.log('')
  console.log('To restore (if needed):')
  console.log('  node scripts/restore-backup.js 2026-01-23-rpc-migration')
}

main().catch(error => {
  console.error('❌ Backup failed:', error)
  process.exit(1)
})
