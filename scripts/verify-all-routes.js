#!/usr/bin/env node
/**
 * 🧪 ROUTE VERIFICATION TEST
 * Vérifie toutes les routes et génère un rapport
 * - Test GET/POST sur toutes les routes
 * - Vérifie status 200/401/403 (attendus)
 * - Temps de réponse
 * - Génère rapport HTML
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const BASE_URL = 'http://localhost:3000'
const REPORT_FILE = path.join(ROOT, 'public', 'route-test-report.html')

console.log('🧪 VÉRIFICATION DE TOUTES LES ROUTES')
console.log('=' .repeat(60))
console.log('')

const results = {
  timestamp: new Date().toISOString(),
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  routes: []
}

// Liste complète des routes à tester
const ROUTES_TO_TEST = [
  // Admin routes (nécessitent auth)
  { path: '/api/admin/login', method: 'POST', needsAuth: false, needsBody: true },
  { path: '/api/admin/logout', method: 'POST', needsAuth: true },
  { path: '/api/admin/messages', method: 'GET', needsAuth: true },
  { path: '/api/admin/messages/assign', method: 'POST', needsAuth: true, needsBody: true },
  { path: '/api/admin/analytics', method: 'GET', needsAuth: true },
  { path: '/api/admin/analytics/dashboard', method: 'GET', needsAuth: true },
  { path: '/api/admin/support/tickets', method: 'GET', needsAuth: true },
  { path: '/api/admin/support/stats', method: 'GET', needsAuth: true },
  { path: '/api/admin/vopay', method: 'GET', needsAuth: true },
  { path: '/api/admin/vopay/transactions', method: 'GET', needsAuth: true },
  { path: '/api/admin/webhooks/list', method: 'GET', needsAuth: true },
  { path: '/api/admin/webhooks/stats', method: 'GET', needsAuth: true },
  { path: '/api/admin/downloads/stats', method: 'GET', needsAuth: true },

  // Public routes
  { path: '/api/activity/log', method: 'POST', needsAuth: false, needsBody: true },
  { path: '/api/activity/stats', method: 'GET', needsAuth: false },
  { path: '/api/activity/recent', method: 'GET', needsAuth: false },
  { path: '/api/contact', method: 'POST', needsAuth: false, needsBody: true },
  { path: '/api/test/demo', method: 'GET', needsAuth: false },

  // Applications
  { path: '/api/applications/submit', method: 'POST', needsAuth: false, needsBody: true },

  // Memory
  { path: '/api/memory/store', method: 'POST', needsAuth: false, needsBody: true },
  { path: '/api/memory/recall', method: 'GET', needsAuth: false },
  { path: '/api/memory/context', method: 'GET', needsAuth: false },

  // Sentinel
  { path: '/api/sentinel/fleet', method: 'GET', needsAuth: false },
  { path: '/api/sentinel/scoring', method: 'POST', needsAuth: false, needsBody: true },

  // OSINT
  { path: '/api/osint/scan', method: 'POST', needsAuth: false, needsBody: true },

  // Network
  { path: '/api/network/trace', method: 'GET', needsAuth: false }
]

// Test une route
async function testRoute(route) {
  const startTime = Date.now()

  try {
    const options = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    // Add body for POST requests
    if (route.needsBody && route.method === 'POST') {
      options.body = JSON.stringify({
        test: true,
        timestamp: Date.now()
      })
    }

    const response = await fetch(BASE_URL + route.path, options)
    const duration = Date.now() - startTime

    let status = 'success'
    let message = `OK (${response.status})`

    // Check expected status codes
    if (route.needsAuth && response.status === 401) {
      status = 'success'
      message = 'Correctement protégé (401)'
    } else if (response.status === 200) {
      status = 'success'
      message = 'OK (200)'
    } else if (response.status === 400 && route.needsBody) {
      status = 'success'
      message = 'Validation fonctionne (400)'
    } else if (response.status >= 500) {
      status = 'failed'
      message = `Erreur serveur (${response.status})`
    } else if (response.status === 404) {
      status = 'failed'
      message = 'Route non trouvée (404)'
    } else {
      status = 'warning'
      message = `Status inattendu (${response.status})`
    }

    return {
      path: route.path,
      method: route.method,
      status,
      statusCode: response.status,
      message,
      duration,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      path: route.path,
      method: route.method,
      status: 'failed',
      statusCode: 0,
      message: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }
  }
}

// Génère le rapport HTML
function generateReport() {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🧪 Route Verification Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Consolas', monospace;
      background: #000;
      color: #0f0;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0f0;
    }
    h1 {
      font-size: 32px;
      text-shadow: 0 0 10px #0f0;
      margin-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-box {
      background: rgba(0, 255, 0, 0.05);
      border: 2px solid #0f0;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 48px;
      font-weight: bold;
      color: #0f0;
      text-shadow: 0 0 10px #0f0;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-top: 10px;
    }
    .stat-box.success .stat-value { color: #0f0; }
    .stat-box.failed .stat-value { color: #f00; }
    .stat-box.warning .stat-value { color: #ff0; }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .results-table th {
      background: rgba(0, 255, 0, 0.1);
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #0f0;
      font-size: 11px;
      text-transform: uppercase;
    }
    .results-table td {
      padding: 12px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.1);
      font-size: 11px;
    }
    .results-table tr:hover {
      background: rgba(0, 255, 0, 0.05);
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-badge.success {
      background: rgba(0, 255, 0, 0.2);
      color: #0f0;
      border: 1px solid #0f0;
    }
    .status-badge.failed {
      background: rgba(255, 0, 0, 0.2);
      color: #f00;
      border: 1px solid #f00;
    }
    .status-badge.warning {
      background: rgba(255, 255, 0, 0.2);
      color: #ff0;
      border: 1px solid #ff0;
    }
    .method-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    .method-badge.GET { background: rgba(0, 255, 0, 0.3); color: #0f0; }
    .method-badge.POST { background: rgba(0, 150, 255, 0.3); color: #09f; }
    .duration { color: #888; font-size: 10px; }
    .duration.fast { color: #0f0; }
    .duration.slow { color: #ff0; }
    .duration.veryslow { color: #f00; }
    .refresh-btn {
      background: #0f0;
      color: #000;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 20px auto;
      display: block;
    }
    .refresh-btn:hover {
      box-shadow: 0 0 20px #0f0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 ROUTE VERIFICATION REPORT</h1>
    <div style="color: #666; font-size: 12px; margin-top: 10px;">
      Generated: ${results.timestamp}
    </div>
  </div>

  <div class="summary">
    <div class="stat-box">
      <div class="stat-value">${results.total}</div>
      <div class="stat-label">Total Tests</div>
    </div>
    <div class="stat-box success">
      <div class="stat-value">${results.success}</div>
      <div class="stat-label">Success</div>
    </div>
    <div class="stat-box failed">
      <div class="stat-value">${results.failed}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat-box warning">
      <div class="stat-value">${results.skipped}</div>
      <div class="stat-label">Warnings</div>
    </div>
  </div>

  <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Report</button>

  <table class="results-table">
    <thead>
      <tr>
        <th>Status</th>
        <th>Method</th>
        <th>Route</th>
        <th>Status Code</th>
        <th>Message</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>
      ${results.routes.map(route => {
        const durationClass = route.duration < 100 ? 'fast' : route.duration < 500 ? '' : route.duration < 1000 ? 'slow' : 'veryslow'
        return `
          <tr>
            <td><span class="status-badge ${route.status}">${route.status}</span></td>
            <td><span class="method-badge ${route.method}">${route.method}</span></td>
            <td>${route.path}</td>
            <td>${route.statusCode}</td>
            <td>${route.message}</td>
            <td><span class="duration ${durationClass}">${route.duration}ms</span></td>
          </tr>
        `
      }).join('')}
    </tbody>
  </table>
</body>
</html>
  `

  fs.writeFileSync(REPORT_FILE, html)
  console.log(`\n✅ Rapport sauvegardé: ${REPORT_FILE}`)
}

// Exécution principale
async function runTests() {
  console.log(`Testing ${ROUTES_TO_TEST.length} routes...\n`)

  for (const route of ROUTES_TO_TEST) {
    console.log(`Testing ${route.method} ${route.path}...`)

    const result = await testRoute(route)
    results.routes.push(result)
    results.total++

    if (result.status === 'success') {
      results.success++
      console.log(`  ✓ ${result.message} (${result.duration}ms)`)
    } else if (result.status === 'failed') {
      results.failed++
      console.log(`  ✗ ${result.message} (${result.duration}ms)`)
    } else {
      results.skipped++
      console.log(`  ⚠ ${result.message} (${result.duration}ms)`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('RÉSULTATS FINAUX')
  console.log('='.repeat(60))
  console.log(`Total:    ${results.total}`)
  console.log(`✓ Success: ${results.success}`)
  console.log(`✗ Failed:  ${results.failed}`)
  console.log(`⚠ Warning: ${results.skipped}`)
  console.log('='.repeat(60))

  generateReport()

  console.log('\n📊 Ouvrez le rapport: npm run test:view')
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL)
    return true
  } catch (error) {
    console.error('❌ ERREUR: Le serveur n\'est pas démarré!')
    console.error('   Lancez le serveur avec: npm run dev')
    console.error('')
    process.exit(1)
  }
}

// Start
checkServer().then(() => {
  runTests().catch(error => {
    console.error('Erreur:', error)
    process.exit(1)
  })
})
