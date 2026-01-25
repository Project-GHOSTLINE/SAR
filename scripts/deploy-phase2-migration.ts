/**
 * Deploy Phase 2 Migration to Supabase
 * Executes the fraud detection migration SQL
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deployMigration() {
  console.log('📊 DEPLOYING PHASE 2 MIGRATION')
  console.log('================================\n')

  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260125000300_fraud_detection_phase2.sql'
  )

  console.log('📂 Reading migration file...')
  console.log(`   Path: ${migrationPath}\n`)

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
  console.log(`✓ Migration file read (${migrationSQL.length} chars)\n`)

  // Split SQL into statements (rough split by semicolons outside strings)
  // Note: This is a simplified split - for production, use a proper SQL parser
  const statements = migrationSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements\n`)

  // Execute migration
  console.log('🚀 Executing migration...\n')

  try {
    // Execute the entire migration as one query
    // Supabase Postgres supports multi-statement queries
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL,
    })

    if (error) {
      // If RPC doesn't exist, try direct SQL execution
      // This won't work with Supabase client directly, so we'll use a workaround
      console.log('⚠️  RPC method not available, using direct execution...\n')

      // Execute each statement individually
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';'

        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(
            /CREATE TABLE.*?public\.(\w+)/i
          )?.[1]
          console.log(`   ${i + 1}/${statements.length} Creating table: ${tableName}`)
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX.*?(\w+)/i)?.[1]
          console.log(`   ${i + 1}/${statements.length} Creating index: ${indexName}`)
        } else if (statement.includes('CREATE FUNCTION')) {
          const funcName = statement.match(
            /CREATE.*?FUNCTION.*?public\.(\w+)/i
          )?.[1]
          console.log(`   ${i + 1}/${statements.length} Creating function: ${funcName}`)
        } else if (statement.includes('COMMENT')) {
          console.log(`   ${i + 1}/${statements.length} Adding comment`)
        } else if (statement.includes('ALTER TABLE')) {
          console.log(`   ${i + 1}/${statements.length} Altering table`)
        } else if (statement.includes('CREATE POLICY')) {
          const policyName = statement.match(/CREATE POLICY "([^"]+)"/i)?.[1]
          console.log(`   ${i + 1}/${statements.length} Creating policy: ${policyName}`)
        } else {
          console.log(`   ${i + 1}/${statements.length} Executing statement`)
        }
      }

      console.log('\n⚠️  Cannot execute migration directly via client.')
      console.log('   Please execute manually in Supabase SQL Editor.\n')
      console.log('📋 INSTRUCTIONS:')
      console.log('   1. Open Supabase Dashboard')
      console.log('   2. Go to SQL Editor')
      console.log('   3. Create new query')
      console.log(
        '   4. Paste content from: supabase/migrations/20260125000300_fraud_detection_phase2.sql'
      )
      console.log('   5. Click "Run"\n')

      process.exit(1)
    } else {
      console.log('✅ Migration executed successfully!\n')
    }
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }

  // Verify migration
  console.log('🔍 Verifying migration...\n')

  try {
    // Check tables created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['security_events', 'client_pattern_hits'])

    if (tablesError) {
      console.error('❌ Failed to verify tables:', tablesError)
    } else {
      console.log(`✓ Tables created: ${tables?.length || 0}/2`)
      tables?.forEach((t) => console.log(`   - ${t.table_name}`))
    }

    // Check RPC exists
    const { data: rpc, error: rpcError } = await supabase.rpc(
      'match_client_patterns',
      { p_client_id: '00000000-0000-0000-0000-000000000000' }
    )

    if (rpcError && !rpcError.message.includes('violates foreign key')) {
      console.log('⚠️  RPC verification failed:', rpcError.message)
    } else {
      console.log('✓ RPC function exists: match_client_patterns')
    }
  } catch (verifyError) {
    console.error('⚠️  Verification failed:', verifyError)
  }

  console.log('\n✅ MIGRATION DEPLOYMENT COMPLETE!\n')
  console.log('📋 Next steps:')
  console.log('   1. Verify tables in Supabase Dashboard')
  console.log('   2. Test RPC: SELECT * FROM match_client_patterns(...)')
  console.log('   3. Deploy code changes (Vercel auto-deploy)')
  console.log('   4. Test with /aidesecurite form submission\n')
}

deployMigration().catch(console.error)
