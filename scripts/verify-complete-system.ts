#!/usr/bin/env tsx
/**
 * Complete System Verification
 * Tests: Pages, APIs, Database, Metrics with Evidence
 * Goal: 0 errors, 0 404s, all metrics proven
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const BASE_URL = 'https://admin.solutionargentrapide.ca'

interface TestResult {
  category: string
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  evidence?: any
}

const results: TestResult[] = []

function log(result: TestResult) {
  results.push(result)
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌'
  console.log(`${icon} [${result.category}] ${result.name}: ${result.message}`)
  if (result.evidence) {
    console.log('   Evidence:', JSON.stringify(result.evidence, null, 2).substring(0, 200))
  }
}

// ========================================================================
// 1. DATABASE STRUCTURE VERIFICATION
// ========================================================================

async function verifyDatabaseStructure() {
  console.log('\n🗄️  1. DATABASE STRUCTURE VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Check visitor_id columns
  const tables = ['telemetry_requests', 'telemetry_events', 'applications', 'client_accounts']

  for (const table of tables) {
    const { data, error } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name, data_type')
      .eq('table_name', table)
      .eq('column_name', 'visitor_id')
      .single()

    if (error || !data) {
      log({
        category: 'DB Structure',
        name: `${table}.visitor_id`,
        status: 'FAIL',
        message: 'Column not found',
        evidence: { error: error?.message }
      })
    } else {
      log({
        category: 'DB Structure',
        name: `${table}.visitor_id`,
        status: 'PASS',
        message: `Column exists (${data.data_type})`,
        evidence: { table, column: data.column_name, type: data.data_type }
      })
    }
  }

  // Check indexes
  const { data: indexes, error: idxError } = await supabase.rpc('pg_indexes' as any, {})

  if (!idxError && indexes) {
    const visitorIdxCount = indexes.filter((idx: any) =>
      idx.indexname && idx.indexname.includes('visitor_id')
    ).length

    log({
      category: 'DB Structure',
      name: 'visitor_id indexes',
      status: visitorIdxCount >= 4 ? 'PASS' : 'WARN',
      message: `Found ${visitorIdxCount} indexes`,
      evidence: { expected: 4, found: visitorIdxCount }
    })
  }
}

// ========================================================================
// 2. DATABASE VIEWS VERIFICATION
// ========================================================================

async function verifyDatabaseViews() {
  console.log('\n👁️  2. DATABASE VIEWS VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Check visitor_identity_graph view
  const { data: viewExists, error: viewError } = await supabase
    .from('visitor_identity_graph' as any)
    .select('visitor_id')
    .limit(1)

  if (viewError) {
    log({
      category: 'DB Views',
      name: 'visitor_identity_graph',
      status: 'FAIL',
      message: 'View not found or not working',
      evidence: { error: viewError.message }
    })
  } else {
    log({
      category: 'DB Views',
      name: 'visitor_identity_graph',
      status: 'PASS',
      message: 'View exists and queryable',
      evidence: { sample_count: viewExists?.length || 0 }
    })
  }

  // Check other critical views
  const views = [
    'ip_to_seo_segment',
    'fraud_detection_live',
    'network_correlation',
    'device_profiles'
  ]

  for (const view of views) {
    const { data, error } = await supabase
      .from(view as any)
      .select('*')
      .limit(1)

    log({
      category: 'DB Views',
      name: view,
      status: error ? 'FAIL' : 'PASS',
      message: error ? 'View not accessible' : 'View working',
      evidence: error ? { error: error.message } : { rows: data?.length || 0 }
    })
  }
}

// ========================================================================
// 3. RPC FUNCTIONS VERIFICATION
// ========================================================================

async function verifyRPCFunctions() {
  console.log('\n⚙️  3. RPC FUNCTIONS VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Test get_visitor_timeline
  const { data: timeline, error: timelineError } = await supabase
    .rpc('get_visitor_timeline', {
      p_visitor_id: '00000000-0000-0000-0000-000000000000',
      p_limit: 10
    })

  log({
    category: 'RPC Functions',
    name: 'get_visitor_timeline',
    status: timelineError ? 'FAIL' : 'PASS',
    message: timelineError ? 'Function not found' : 'Function exists',
    evidence: timelineError ? { error: timelineError.message } : { returns: 'timeline' }
  })

  // Test get_visitor_ips_with_metrics
  const { data: ips, error: ipsError } = await supabase
    .rpc('get_visitor_ips_with_metrics', {
      p_visitor_id: '00000000-0000-0000-0000-000000000000'
    })

  log({
    category: 'RPC Functions',
    name: 'get_visitor_ips_with_metrics',
    status: ipsError ? 'FAIL' : 'PASS',
    message: ipsError ? 'Function not found' : 'Function exists',
    evidence: ipsError ? { error: ipsError.message } : { returns: 'ips_with_metrics' }
  })

  // Test find_visitor_by_ip
  const { data: visitors, error: visitorsError } = await supabase
    .rpc('find_visitor_by_ip', { p_ip: '192.0.2.44' })

  log({
    category: 'RPC Functions',
    name: 'find_visitor_by_ip',
    status: visitorsError ? 'FAIL' : 'PASS',
    message: visitorsError ? 'Function not found' : 'Function exists',
    evidence: visitorsError ? { error: visitorsError.message } : { found: visitors?.length || 0 }
  })
}

// ========================================================================
// 4. API ROUTES VERIFICATION
// ========================================================================

async function verifyAPIRoutes() {
  console.log('\n🌐 4. API ROUTES VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const apis = [
    '/api/seo/overview',
    '/api/seo/perf',
    '/api/seo/ip/142.127.223.188',
    '/api/admin/telemetry/command-center',
    '/api/admin/metrics/inspect',
    '/api/admin/database/explore'
  ]

  for (const api of apis) {
    try {
      const res = await fetch(`${BASE_URL}${api}`, {
        method: 'GET',
        headers: { 'User-Agent': 'SystemVerification/1.0' }
      })

      log({
        category: 'API Routes',
        name: api,
        status: res.ok ? 'PASS' : res.status === 401 ? 'WARN' : 'FAIL',
        message: res.ok ? `200 OK` : `${res.status} ${res.statusText}`,
        evidence: { status: res.status, url: api }
      })
    } catch (error: any) {
      log({
        category: 'API Routes',
        name: api,
        status: 'FAIL',
        message: 'Network error',
        evidence: { error: error.message }
      })
    }
  }
}

// ========================================================================
// 5. PAGES VERIFICATION (No 404s)
// ========================================================================

async function verifyPages() {
  console.log('\n📄 5. PAGES VERIFICATION (No 404s)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const pages = [
    '/admin/seo-hub',
    '/admin/seo',
    '/admin/seo/analytics',
    '/admin/seo/command-center',
    '/admin/seo/ip-explorer',
    '/admin/seo/ip/142.127.223.188',
    '/admin/data-explorer'
  ]

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page}`, {
        method: 'HEAD',
        headers: { 'User-Agent': 'SystemVerification/1.0' },
        redirect: 'manual'
      })

      const status = res.status
      log({
        category: 'Pages',
        name: page,
        status: status === 200 ? 'PASS' :
                status === 302 || status === 307 ? 'WARN' :
                'FAIL',
        message: status === 200 ? '200 OK' :
                 status === 302 || status === 307 ? `${status} Redirect (auth)` :
                 `${status} ${res.statusText}`,
        evidence: { status, url: page }
      })
    } catch (error: any) {
      log({
        category: 'Pages',
        name: page,
        status: 'FAIL',
        message: 'Network error',
        evidence: { error: error.message }
      })
    }
  }
}

// ========================================================================
// 6. METRICS WITH EVIDENCE VERIFICATION
// ========================================================================

async function verifyMetricsWithEvidence() {
  console.log('\n📊 6. METRICS WITH EVIDENCE VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Get a real IP from telemetry_requests
  const { data: requests } = await supabase
    .from('telemetry_requests')
    .select('ip, trace_id, created_at')
    .not('ip', 'is', null)
    .limit(1)
    .single()

  if (!requests) {
    log({
      category: 'Metrics Evidence',
      name: 'Sample Data',
      status: 'WARN',
      message: 'No telemetry data found',
      evidence: { note: 'Need live traffic to test' }
    })
    return
  }

  const testIP = requests.ip

  // Test IP metrics
  const { data: ipMetrics } = await supabase
    .from('ip_to_seo_segment')
    .select('*')
    .eq('ip', testIP)
    .single()

  if (ipMetrics) {
    log({
      category: 'Metrics Evidence',
      name: 'IP Metrics',
      status: 'PASS',
      message: `Metrics exist for ${testIP}`,
      evidence: {
        ip: testIP,
        total_requests: ipMetrics.total_requests,
        first_seen: ipMetrics.first_seen,
        evidence_row: requests.trace_id
      }
    })
  } else {
    log({
      category: 'Metrics Evidence',
      name: 'IP Metrics',
      status: 'WARN',
      message: `No metrics for ${testIP}`,
      evidence: { ip: testIP }
    })
  }

  // Test visitor_id tracking
  const { data: visitorRequests, count } = await supabase
    .from('telemetry_requests')
    .select('visitor_id', { count: 'exact' })
    .not('visitor_id', 'is', null)
    .limit(1)

  log({
    category: 'Metrics Evidence',
    name: 'visitor_id Tracking',
    status: (count || 0) > 0 ? 'PASS' : 'WARN',
    message: (count || 0) > 0 ? `${count} requests with visitor_id` : 'No visitor_id data yet',
    evidence: {
      visitor_id_requests: count || 0,
      note: count === 0 ? 'Normal if migrations just run' : 'Working'
    }
  })

  // Test evidence chain
  const { data: evidence } = await supabase
    .from('telemetry_requests')
    .select('trace_id, ip, path, status, duration_ms, created_at')
    .eq('ip', testIP)
    .order('created_at', { ascending: true })
    .limit(3)

  if (evidence && evidence.length > 0) {
    log({
      category: 'Metrics Evidence',
      name: 'Evidence Chain',
      status: 'PASS',
      message: `${evidence.length} evidence rows found`,
      evidence: {
        ip: testIP,
        first_request: {
          trace_id: evidence[0].trace_id,
          path: evidence[0].path,
          timestamp: evidence[0].created_at
        }
      }
    })
  }
}

// ========================================================================
// 7. MIDDLEWARE & TRACKING VERIFICATION
// ========================================================================

async function verifyMiddlewareTracking() {
  console.log('\n🔍 7. MIDDLEWARE & TRACKING VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Check recent telemetry requests (last 5 min)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: recentRequests, count } = await supabase
    .from('telemetry_requests')
    .select('*', { count: 'exact' })
    .gte('created_at', fiveMinAgo)
    .limit(5)

  log({
    category: 'Middleware',
    name: 'Recent Requests',
    status: (count || 0) > 0 ? 'PASS' : 'WARN',
    message: `${count || 0} requests in last 5 minutes`,
    evidence: {
      count: count || 0,
      sample: recentRequests?.[0] ? {
        trace_id: recentRequests[0].trace_id,
        ip: recentRequests[0].ip,
        has_visitor_id: !!recentRequests[0].visitor_id
      } : null
    }
  })

  // Check device detection
  const { data: deviceRequests } = await supabase
    .from('telemetry_requests')
    .select('meta_redacted')
    .not('meta_redacted', 'is', null)
    .limit(1)
    .single()

  log({
    category: 'Middleware',
    name: 'Device Detection',
    status: deviceRequests ? 'PASS' : 'WARN',
    message: deviceRequests ? 'Device info captured' : 'No device info',
    evidence: deviceRequests ? {
      device: deviceRequests.meta_redacted?.device,
      browser: deviceRequests.meta_redacted?.browser,
      os: deviceRequests.meta_redacted?.os
    } : null
  })
}

// ========================================================================
// 8. GENERATE REPORT
// ========================================================================

function generateReport() {
  console.log('\n📋 FINAL REPORT')
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
    console.log('\n❌ CRITICAL ISSUES:')
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   • [${r.category}] ${r.name}: ${r.message}`)
      })
  }

  if (warned > 0) {
    console.log('\n⚠️  WARNINGS:')
    results
      .filter(r => r.status === 'WARN')
      .forEach(r => {
        console.log(`   • [${r.category}] ${r.name}: ${r.message}`)
      })
  }

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 STATUS: PERFECT - All systems operational!')
  } else if (failed === 0) {
    console.log('\n✅ STATUS: GOOD - Functional with minor warnings')
  } else {
    console.log('\n❌ STATUS: ISSUES - Action required')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Summary by category
  const categories = [...new Set(results.map(r => r.category))]
  console.log('📊 SUMMARY BY CATEGORY:\n')
  categories.forEach(cat => {
    const catResults = results.filter(r => r.category === cat)
    const catPassed = catResults.filter(r => r.status === 'PASS').length
    const catTotal = catResults.length
    const catScore = Math.round((catPassed / catTotal) * 100)
    console.log(`   ${cat}: ${catPassed}/${catTotal} (${catScore}%)`)
  })
}

// ========================================================================
// MAIN
// ========================================================================

async function main() {
  console.log('🔍 COMPLETE SYSTEM VERIFICATION')
  console.log('Goal: 0 Errors, 0 404s, All Metrics with Evidence')
  console.log('Date:', new Date().toLocaleString('fr-CA'))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await verifyDatabaseStructure()
  await verifyDatabaseViews()
  await verifyRPCFunctions()
  await verifyAPIRoutes()
  await verifyPages()
  await verifyMetricsWithEvidence()
  await verifyMiddlewareTracking()

  generateReport()
}

main().catch(console.error)
