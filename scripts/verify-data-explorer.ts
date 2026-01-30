#!/usr/bin/env tsx
/**
 * Script de vérification du Data Explorer
 * Teste les deux tabs: Metric Inspector et Database Explorer
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

const PROD_URL = 'https://admin.solutionargentrapide.ca'

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

const results: TestResult[] = []

function logTest(result: TestResult) {
  results.push(result)
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌'
  console.log(`${icon} ${result.name}: ${result.message}`)
  if (result.details) {
    console.log(`   Details:`, result.details)
  }
}

async function testMetricInspectorAPI() {
  console.log('\n🔍 Test 1: Metric Inspector API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Check if admin_sections table exists
    const { data: sections, error: sectionsError } = await supabase
      .from('admin_sections')
      .select('*')
      .limit(1)

    if (sectionsError) {
      logTest({
        name: 'Admin Sections Table',
        status: 'FAIL',
        message: 'Table admin_sections not found',
        details: sectionsError.message
      })
      return
    }

    logTest({
      name: 'Admin Sections Table',
      status: 'PASS',
      message: `Table exists with ${sections?.length || 0} sections`
    })

    // Check metric_registry table
    const { data: metrics, error: metricsError } = await supabase
      .from('metric_registry')
      .select('*')
      .limit(1)

    if (metricsError) {
      logTest({
        name: 'Metric Registry Table',
        status: 'FAIL',
        message: 'Table metric_registry not found',
        details: metricsError.message
      })
      return
    }

    logTest({
      name: 'Metric Registry Table',
      status: 'PASS',
      message: `Table exists with metrics defined`
    })

    // Check metric_values table
    const { count: valuesCount, error: valuesError } = await supabase
      .from('metric_values')
      .select('*', { count: 'exact', head: true })

    if (valuesError) {
      logTest({
        name: 'Metric Values Table',
        status: 'FAIL',
        message: 'Table metric_values not found',
        details: valuesError.message
      })
      return
    }

    logTest({
      name: 'Metric Values Table',
      status: 'PASS',
      message: `Table exists with ${valuesCount || 0} computed values`
    })

    // Check source data counts
    const sourceChecks = [
      'client_analyses',
      'client_transactions',
      'client_accounts',
      'fraud_cases',
      'contact_messages',
      'support_tickets',
      'vopay_webhook_logs'
    ]

    for (const tableName of sourceChecks) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        logTest({
          name: `Source Table: ${tableName}`,
          status: 'WARN',
          message: `Table not found or no access`,
          details: error.message
        })
      } else {
        logTest({
          name: `Source Table: ${tableName}`,
          status: 'PASS',
          message: `${count || 0} rows`
        })
      }
    }

  } catch (error: any) {
    logTest({
      name: 'Metric Inspector API',
      status: 'FAIL',
      message: 'Unexpected error',
      details: error.message
    })
  }
}

async function testDatabaseExplorerAPI() {
  console.log('\n🗄️  Test 2: Database Explorer API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Check if RPC function get_all_tables_with_info exists
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables_with_info')

    if (tablesError) {
      logTest({
        name: 'RPC: get_all_tables_with_info',
        status: 'FAIL',
        message: 'Function not found - needs migration',
        details: {
          error: tablesError.message,
          hint: 'Run migration: supabase/migrations/create_database_explorer_function.sql'
        }
      })
      return
    }

    logTest({
      name: 'RPC: get_all_tables_with_info',
      status: 'PASS',
      message: `Function exists, found ${tables?.length || 0} tables`
    })

    // Check if RPC function get_table_columns exists
    const testTableName = tables?.[0]?.table_name || 'client_accounts'
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { p_table_name: testTableName })

    if (columnsError) {
      logTest({
        name: 'RPC: get_table_columns',
        status: 'FAIL',
        message: 'Function not found - needs migration',
        details: {
          error: columnsError.message,
          hint: 'Run migration: supabase/migrations/create_database_explorer_function.sql'
        }
      })
      return
    }

    logTest({
      name: 'RPC: get_table_columns',
      status: 'PASS',
      message: `Function exists, found ${columns?.length || 0} columns for ${testTableName}`
    })

    // Aggregate stats
    const tablesWithData = tables?.filter((t: any) => t.row_count > 0) || []
    const totalRows = tables?.reduce((sum: number, t: any) => sum + (t.row_count || 0), 0) || 0

    logTest({
      name: 'Database Statistics',
      status: 'PASS',
      message: 'Database stats computed',
      details: {
        total_tables: tables?.length || 0,
        tables_with_data: tablesWithData.length,
        total_rows: totalRows.toLocaleString()
      }
    })

  } catch (error: any) {
    logTest({
      name: 'Database Explorer API',
      status: 'FAIL',
      message: 'Unexpected error',
      details: error.message
    })
  }
}

async function testDataExplorerPage() {
  console.log('\n🌐 Test 3: Data Explorer Page Access')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const response = await fetch(`${PROD_URL}/admin/data-explorer`, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'DataExplorerVerification/1.0'
      }
    })

    if (response.ok) {
      logTest({
        name: 'Data Explorer Page',
        status: 'PASS',
        message: `Page accessible (${response.status})`
      })
    } else {
      logTest({
        name: 'Data Explorer Page',
        status: 'WARN',
        message: `Page returned ${response.status}`,
        details: 'May require authentication'
      })
    }
  } catch (error: any) {
    logTest({
      name: 'Data Explorer Page',
      status: 'FAIL',
      message: 'Cannot reach page',
      details: error.message
    })
  }
}

async function checkMetricEngineIntegrity() {
  console.log('\n⚙️  Test 4: Metric Engine Integrity')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Check if all sections have metrics
    const { data: sections } = await supabase
      .from('admin_sections')
      .select('section_key, label')

    const { data: metrics } = await supabase
      .from('metric_registry')
      .select('section_key, metric_key')

    if (!sections || !metrics) {
      logTest({
        name: 'Metric Engine Data',
        status: 'FAIL',
        message: 'Cannot fetch sections or metrics'
      })
      return
    }

    const sectionsWithoutMetrics = sections.filter(s =>
      !metrics.some(m => m.section_key === s.section_key)
    )

    if (sectionsWithoutMetrics.length > 0) {
      logTest({
        name: 'Section Coverage',
        status: 'WARN',
        message: `${sectionsWithoutMetrics.length} sections have no metrics`,
        details: sectionsWithoutMetrics.map(s => s.label)
      })
    } else {
      logTest({
        name: 'Section Coverage',
        status: 'PASS',
        message: 'All sections have at least one metric'
      })
    }

    // Check for duplicate metric keys
    const metricKeys = metrics.map(m => m.metric_key)
    const duplicates = metricKeys.filter((key, index) =>
      metricKeys.indexOf(key) !== index
    )

    if (duplicates.length > 0) {
      logTest({
        name: 'Metric Key Uniqueness',
        status: 'FAIL',
        message: 'Duplicate metric keys found',
        details: [...new Set(duplicates)]
      })
    } else {
      logTest({
        name: 'Metric Key Uniqueness',
        status: 'PASS',
        message: `All ${metricKeys.length} metric keys are unique`
      })
    }

  } catch (error: any) {
    logTest({
      name: 'Metric Engine Integrity',
      status: 'FAIL',
      message: 'Unexpected error',
      details: error.message
    })
  }
}

async function generateReport() {
  console.log('\n📊 RAPPORT FINAL')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const passed = results.filter(r => r.status === 'PASS').length
  const warned = results.filter(r => r.status === 'WARN').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const total = results.length

  console.log(`\n✅ PASS:  ${passed}/${total}`)
  console.log(`⚠️  WARN:  ${warned}/${total}`)
  console.log(`❌ FAIL:  ${failed}/${total}`)

  const score = Math.round((passed / total) * 100)
  console.log(`\n📈 Score: ${score}%`)

  if (failed > 0) {
    console.log('\n❌ PROBLÈMES CRITIQUES:')
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   • ${r.name}: ${r.message}`)
        if (r.details) {
          console.log(`     ${JSON.stringify(r.details, null, 2)}`)
        }
      })
  }

  if (warned > 0) {
    console.log('\n⚠️  AVERTISSEMENTS:')
    results
      .filter(r => r.status === 'WARN')
      .forEach(r => {
        console.log(`   • ${r.name}: ${r.message}`)
      })
  }

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 STATUT: PARFAIT - Tous les systèmes opérationnels!')
  } else if (failed === 0) {
    console.log('\n✅ STATUT: BON - Système fonctionnel avec avertissements mineurs')
  } else {
    console.log('\n❌ STATUT: PROBLÈMES - Corrections nécessaires')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

async function main() {
  console.log('🔍 AUDIT DU DATA EXPLORER')
  console.log('URL: https://admin.solutionargentrapide.ca/admin/data-explorer')
  console.log('Date:', new Date().toLocaleString('fr-CA'))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await testMetricInspectorAPI()
  await testDatabaseExplorerAPI()
  await testDataExplorerPage()
  await checkMetricEngineIntegrity()
  await generateReport()
}

main().catch(console.error)
