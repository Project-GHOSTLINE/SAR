#!/usr/bin/env node

/**
 * LOAD TEST - Telemetry System
 *
 * Test de charge pour vérifier performance et overhead du système telemetry
 *
 * Usage:
 *   node scripts/load-test-telemetry.js [URL] [CONCURRENT] [DURATION_SECONDS]
 *   node scripts/load-test-telemetry.js https://solutionargentrapide.ca 10 30
 */

const https = require('https')
const http = require('http')

const BASE_URL = process.argv[2] || 'https://solutionargentrapide.ca'
const CONCURRENT = parseInt(process.argv[3]) || 10
const DURATION_SECONDS = parseInt(process.argv[4]) || 30

console.log('⚡ LOAD TEST - TELEMETRY SYSTEM')
console.log('========================================')
console.log(`URL: ${BASE_URL}`)
console.log(`Concurrent users: ${CONCURRENT}`)
console.log(`Duration: ${DURATION_SECONDS}s`)
console.log('')

const stats = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  totalDuration: 0,
  minDuration: Infinity,
  maxDuration: 0,
  durations: [],
  traceIds: new Set(),
  errors: {}
}

/**
 * Make HTTP request
 */
function makeRequest(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http
    const start = Date.now()

    const req = lib.get(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        const duration = Date.now() - start

        stats.totalRequests++
        stats.totalDuration += duration
        stats.durations.push(duration)
        stats.minDuration = Math.min(stats.minDuration, duration)
        stats.maxDuration = Math.max(stats.maxDuration, duration)

        const traceId = res.headers['x-trace-id']
        if (traceId) {
          stats.traceIds.add(traceId)
        }

        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.successRequests++
        } else {
          stats.failedRequests++
        }

        resolve({ status: res.statusCode, duration, traceId })
      })
    })

    req.on('error', (err) => {
      const duration = Date.now() - start
      stats.totalRequests++
      stats.failedRequests++
      stats.totalDuration += duration

      const errorType = err.code || 'UNKNOWN'
      stats.errors[errorType] = (stats.errors[errorType] || 0) + 1

      resolve({ error: err.message, duration })
    })

    req.setTimeout(10000, () => {
      req.destroy()
    })
  })
}

/**
 * Worker: Continuously make requests
 */
async function worker(id, stopTime) {
  let workerRequests = 0

  while (Date.now() < stopTime) {
    await makeRequest(BASE_URL)
    workerRequests++

    // Small delay to avoid hammering too hard
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`  Worker ${id}: ${workerRequests} requests`)
  return workerRequests
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = arr.slice().sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('🚀 Starting load test...')
  console.log('')

  const startTime = Date.now()
  const stopTime = startTime + (DURATION_SECONDS * 1000)

  // Launch workers
  const workers = []
  for (let i = 0; i < CONCURRENT; i++) {
    workers.push(worker(i + 1, stopTime))
  }

  // Wait for all workers
  await Promise.all(workers)

  const totalTime = (Date.now() - startTime) / 1000

  console.log('')
  console.log('========================================')
  console.log('📊 RÉSULTATS')
  console.log('========================================')
  console.log(`Duration: ${totalTime.toFixed(2)}s`)
  console.log(`Total requests: ${stats.totalRequests}`)
  console.log(`Successful: ${stats.successRequests} (${((stats.successRequests / stats.totalRequests) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`)
  console.log('')

  console.log('📈 PERFORMANCE')
  console.log('========================================')
  console.log(`Requests/sec: ${(stats.totalRequests / totalTime).toFixed(2)}`)
  console.log(`Avg duration: ${(stats.totalDuration / stats.totalRequests).toFixed(2)}ms`)
  console.log(`Min duration: ${stats.minDuration}ms`)
  console.log(`Max duration: ${stats.maxDuration}ms`)
  console.log(`P50 (median): ${percentile(stats.durations, 50).toFixed(0)}ms`)
  console.log(`P95: ${percentile(stats.durations, 95).toFixed(0)}ms`)
  console.log(`P99: ${percentile(stats.durations, 99).toFixed(0)}ms`)
  console.log('')

  console.log('🔍 TELEMETRY')
  console.log('========================================')
  console.log(`Unique trace_ids: ${stats.traceIds.size}`)
  console.log(`Expected: ${stats.totalRequests}`)

  if (stats.traceIds.size === stats.totalRequests) {
    console.log(`✅ Tous les trace_ids sont uniques!`)
  } else {
    console.log(`⚠️  ${stats.totalRequests - stats.traceIds.size} trace_ids manquants ou dupliqués`)
  }
  console.log('')

  if (Object.keys(stats.errors).length > 0) {
    console.log('❌ ERREURS')
    console.log('========================================')
    for (const [errorType, count] of Object.entries(stats.errors)) {
      console.log(`${errorType}: ${count}`)
    }
    console.log('')
  }

  // Evaluation
  console.log('🎯 ÉVALUATION')
  console.log('========================================')

  const successRate = (stats.successRequests / stats.totalRequests) * 100
  const p95 = percentile(stats.durations, 95)
  const avgDuration = stats.totalDuration / stats.totalRequests

  const checks = []

  // Success rate > 95%
  if (successRate >= 95) {
    checks.push('✅ Success rate > 95%')
  } else {
    checks.push(`❌ Success rate < 95% (${successRate.toFixed(1)}%)`)
  }

  // P95 < 500ms
  if (p95 < 500) {
    checks.push('✅ P95 latency < 500ms')
  } else {
    checks.push(`⚠️  P95 latency > 500ms (${p95.toFixed(0)}ms)`)
  }

  // Avg < 200ms
  if (avgDuration < 200) {
    checks.push('✅ Avg latency < 200ms')
  } else {
    checks.push(`⚠️  Avg latency > 200ms (${avgDuration.toFixed(0)}ms)`)
  }

  // All trace_ids unique
  if (stats.traceIds.size === stats.totalRequests) {
    checks.push('✅ All trace_ids unique')
  } else {
    checks.push('❌ Some trace_ids missing/duplicated')
  }

  checks.forEach(check => console.log(check))
  console.log('')

  const allPassed = checks.every(c => c.startsWith('✅'))

  if (allPassed) {
    console.log('🎉 LOAD TEST RÉUSSI!')
    console.log('Le système de télémétrie performe bien sous charge.')
    process.exit(0)
  } else {
    console.log('⚠️  CERTAINS CHECKS ONT ÉCHOUÉ')
    console.log('Optimisation recommandée.')
    process.exit(1)
  }
}

// Run
runLoadTest().catch(err => {
  console.error('❌ ERREUR FATALE:', err)
  process.exit(1)
})
