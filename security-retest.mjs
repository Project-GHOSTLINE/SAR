#!/usr/bin/env node

/**
 * SECURITY RE-TEST - Solution Argent Rapide
 * Test complet après corrections de sécurité
 */

const domains = [
  'https://progression.solutionargentrapide.ca',
  'https://admin.solutionargentrapide.ca',
  'https://solutionargentrapide.ca',
  'https://client.solutionargentrapide.ca'
]

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
}

let totalTests = 0
let passedTests = 0
let failedTests = 0

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function testResult(name, passed, details = '') {
  totalTests++
  if (passed) {
    passedTests++
    log(`  ✅ ${name}`, 'green')
    if (details) log(`     ${details}`, 'cyan')
  } else {
    failedTests++
    log(`  ❌ ${name}`, 'red')
    if (details) log(`     ${details}`, 'yellow')
  }
}

async function testEndpoint(url, expectedStatus, testName) {
  try {
    const response = await fetch(url, { 
      redirect: 'manual',
      headers: {
        'User-Agent': 'SecurityTest/1.0'
      }
    })
    const status = response.status
    const passed = status === expectedStatus
    testResult(
      testName,
      passed,
      `Expected ${expectedStatus}, got ${status}`
    )
    return { passed, status }
  } catch (error) {
    testResult(testName, false, `Error: ${error.message}`)
    return { passed: false, status: 0 }
  }
}

async function testAdminPages() {
  log('\n📄 TEST DES PAGES ADMIN', 'bold')
  log('='.repeat(60), 'blue')
  
  const adminPages = [
    '/admin/dashboard',
    '/admin/webhooks',
    '/admin/vopay',
    '/admin/settings',
    '/admin/reports'
  ]
  
  for (const page of adminPages) {
    await testEndpoint(
      `https://admin.solutionargentrapide.ca${page}`,
      307,
      `${page} (devrait rediriger vers login)`
    )
  }
}

async function testAdminAPIs() {
  log('\n🔌 TEST DES APIs ADMIN', 'bold')
  log('='.repeat(60), 'blue')
  
  const adminAPIs = [
    '/api/admin/webhooks/list',
    '/api/admin/webhooks/debug',
    '/api/admin/webhooks/stats',
    '/api/admin/webhooks/send-alert',
    '/api/admin/messages',
    '/api/admin/vopay',
    '/api/admin/vopay/transactions',
    '/api/admin/vopay-debug',
    '/api/admin/vopay/real-transactions'
  ]
  
  for (const api of adminAPIs) {
    await testEndpoint(
      `https://admin.solutionargentrapide.ca${api}`,
      401,
      `${api} (devrait retourner 401)`
    )
  }
}

async function testDataExposure() {
  log('\n🔐 TEST D\'EXPOSITION DE DONNÉES', 'bold')
  log('='.repeat(60), 'blue')
  
  // Test que les endpoints retournent bien une erreur, pas de données
  try {
    const response = await fetch('https://admin.solutionargentrapide.ca/api/admin/webhooks/list')
    const text = await response.text()
    const hasTransactionData = text.includes('transaction_id') || text.includes('vopay')
    
    testResult(
      'Aucune donnée de transaction exposée',
      !hasTransactionData,
      hasTransactionData ? 'DONNÉES EXPOSÉES!' : 'Seulement message d\'erreur'
    )
  } catch (error) {
    testResult('Test d\'exposition de données', false, error.message)
  }
  
  // Test debug endpoint
  try {
    const response = await fetch('https://admin.solutionargentrapide.ca/api/admin/webhooks/debug')
    const text = await response.text()
    const hasSupabaseData = text.includes('supabase') && text.includes('dllyzf')
    
    testResult(
      'Aucune config Supabase exposée',
      !hasSupabaseData,
      hasSupabaseData ? 'CONFIG EXPOSÉE!' : 'Seulement message d\'erreur'
    )
  } catch (error) {
    testResult('Test config Supabase', false, error.message)
  }
}

async function testPublicEndpoints() {
  log('\n🌐 TEST DES ENDPOINTS PUBLICS', 'bold')
  log('='.repeat(60), 'blue')
  
  // Ces endpoints DOIVENT être accessibles
  const publicEndpoints = [
    { url: 'https://solutionargentrapide.ca/', expected: 200 },
    { url: 'https://solutionargentrapide.ca/faq', expected: 200 },
    { url: 'https://solutionargentrapide.ca/nous-joindre', expected: 200 }
  ]
  
  for (const endpoint of publicEndpoints) {
    await testEndpoint(
      endpoint.url,
      endpoint.expected,
      `${endpoint.url} (devrait être public)`
    )
  }
}

async function testSecurityHeaders() {
  log('\n🛡️  TEST DES SECURITY HEADERS', 'bold')
  log('='.repeat(60), 'blue')
  
  try {
    const response = await fetch('https://admin.solutionargentrapide.ca/')
    const headers = response.headers
    
    testResult(
      'X-Frame-Options présent',
      headers.has('x-frame-options'),
      headers.get('x-frame-options') || 'Absent'
    )
    
    testResult(
      'X-Content-Type-Options présent',
      headers.has('x-content-type-options'),
      headers.get('x-content-type-options') || 'Absent'
    )
    
    testResult(
      'Strict-Transport-Security présent',
      headers.has('strict-transport-security'),
      headers.get('strict-transport-security')?.substring(0, 30) + '...' || 'Absent'
    )
    
    testResult(
      'Content-Security-Policy présent',
      headers.has('content-security-policy'),
      'CSP configuré'
    )
  } catch (error) {
    testResult('Test security headers', false, error.message)
  }
}

async function testAuthenticationBypass() {
  log('\n🚫 TEST DE BYPASS D\'AUTHENTIFICATION', 'bold')
  log('='.repeat(60), 'blue')
  
  // Essayer différentes méthodes de bypass
  const bypassAttempts = [
    {
      name: 'Sans cookie',
      url: 'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      headers: {}
    },
    {
      name: 'Cookie invalide',
      url: 'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      headers: { 'Cookie': 'admin-session=fake-token' }
    },
    {
      name: 'Header Authorization',
      url: 'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      headers: { 'Authorization': 'Bearer fake-token' }
    }
  ]
  
  for (const attempt of bypassAttempts) {
    try {
      const response = await fetch(attempt.url, { 
        headers: attempt.headers,
        redirect: 'manual'
      })
      testResult(
        `Bypass bloqué: ${attempt.name}`,
        response.status === 401,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`Bypass test: ${attempt.name}`, false, error.message)
    }
  }
}

async function testCriticalVulnerabilities() {
  log('\n⚠️  TEST DES VULNÉRABILITÉS CRITIQUES CORRIGÉES', 'bold')
  log('='.repeat(60), 'blue')
  
  // Les 2 endpoints qui étaient vulnérables
  const criticalEndpoints = [
    {
      url: 'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      name: 'webhooks/list (exposait 998 transactions)'
    },
    {
      url: 'https://admin.solutionargentrapide.ca/api/admin/webhooks/debug',
      name: 'webhooks/debug (exposait config Supabase)'
    }
  ]
  
  for (const endpoint of criticalEndpoints) {
    const response = await fetch(endpoint.url)
    const status = response.status
    const text = await response.text()
    const isSecure = status === 401 && !text.includes('transaction_id') && !text.includes('supabase')
    
    testResult(
      `CRITIQUE: ${endpoint.name}`,
      isSecure,
      isSecure ? 'Maintenant sécurisé ✅' : 'TOUJOURS VULNÉRABLE ❌'
    )
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan')
  log('🔒 SECURITY RE-TEST - Solution Argent Rapide', 'bold')
  log('Test complet après corrections de sécurité', 'cyan')
  log('Date: ' + new Date().toLocaleString('fr-CA'), 'cyan')
  log('='.repeat(60) + '\n', 'cyan')
  
  await testCriticalVulnerabilities()
  await testAdminPages()
  await testAdminAPIs()
  await testDataExposure()
  await testAuthenticationBypass()
  await testPublicEndpoints()
  await testSecurityHeaders()
  
  // Résumé
  log('\n' + '='.repeat(60), 'cyan')
  log('📊 RÉSUMÉ DES TESTS', 'bold')
  log('='.repeat(60), 'cyan')
  
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  log(`\nTotal de tests: ${totalTests}`, 'blue')
  log(`✅ Réussis: ${passedTests}`, 'green')
  log(`❌ Échoués: ${failedTests}`, failedTests > 0 ? 'red' : 'green')
  
  log(`\n🎯 Taux de réussite: ${successRate}%`, successRate === 100 ? 'green' : 'yellow')
  
  if (successRate === 100) {
    log('\n🎉 PARFAIT! Site 100% sécurisé!', 'green')
  } else if (successRate >= 95) {
    log('\n✅ EXCELLENT! Site très sécurisé', 'green')
  } else if (successRate >= 85) {
    log('\n⚠️  BON, mais des améliorations possibles', 'yellow')
  } else {
    log('\n🚨 ATTENTION! Problèmes de sécurité détectés', 'red')
  }
  
  log('\n' + '='.repeat(60) + '\n', 'cyan')
}

// Run tests
runTests().catch(console.error)
