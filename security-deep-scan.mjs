#!/usr/bin/env node

/**
 * DEEP SECURITY SCAN - Solution Argent Rapide
 * Recherche approfondie de portes ouvertes
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m'
}

let totalTests = 0
let passedTests = 0
let failedTests = 0
let criticalIssues = []

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function testResult(name, passed, details = '', critical = false) {
  totalTests++
  if (passed) {
    passedTests++
    log(`  ✅ ${name}`, 'green')
    if (details) log(`     ${details}`, 'cyan')
  } else {
    failedTests++
    log(`  ❌ ${name}`, 'red')
    if (details) log(`     ${details}`, 'yellow')
    if (critical) {
      criticalIssues.push({ name, details })
    }
  }
}

async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, { 
      redirect: 'manual',
      ...options
    })
    return {
      status: response.status,
      headers: response.headers,
      body: await response.text()
    }
  } catch (error) {
    return { status: 0, error: error.message, headers: new Headers(), body: '' }
  }
}

// ========================================
// TEST 1: Tous les endpoints admin
// ========================================
async function testAllAdminEndpoints() {
  log('\n🔍 TEST APPROFONDI DES ENDPOINTS ADMIN', 'bold')
  log('='.repeat(60), 'blue')
  
  const endpoints = [
    '/api/admin/login',
    '/api/admin/logout',
    '/api/admin/messages',
    '/api/admin/send',
    '/api/admin/vopay',
    '/api/admin/vopay/transactions',
    '/api/admin/vopay-debug',
    '/api/admin/vopay/real-transactions',
    '/api/admin/webhooks/list',
    '/api/admin/webhooks/debug',
    '/api/admin/webhooks/stats',
    '/api/admin/webhooks/send-alert'
  ]
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(`https://admin.solutionargentrapide.ca${endpoint}`)
    
    // Vérifier qu'aucune donnée sensible n'est retournée
    const hasData = result.body.includes('transaction') || 
                    result.body.includes('supabase') ||
                    result.body.includes('dllyzf') ||
                    result.body.includes('password') ||
                    result.body.includes('secret')
    
    const isSecure = (result.status === 401 || result.status === 405 || result.status === 404) && !hasData
    
    testResult(
      `${endpoint}`,
      isSecure,
      `Status: ${result.status}, Données: ${hasData ? 'EXPOSÉES!' : 'Sécurisées'}`,
      !isSecure && hasData
    )
  }
}

// ========================================
// TEST 2: Tentatives de bypass avancées
// ========================================
async function testAdvancedBypass() {
  log('\n🎯 TEST DE BYPASS AVANCÉS', 'bold')
  log('='.repeat(60), 'blue')
  
  const bypassAttempts = [
    {
      name: 'Double encoding cookie',
      headers: { 'Cookie': 'admin-session=%2561%2564%256d%2569%256e' }
    },
    {
      name: 'SQL Injection dans cookie',
      headers: { 'Cookie': "admin-session=' OR '1'='1" }
    },
    {
      name: 'Cookie avec null bytes',
      headers: { 'Cookie': 'admin-session=fake%00admin' }
    },
    {
      name: 'Multiple cookies',
      headers: { 'Cookie': 'admin-session=fake; admin-session=real' }
    },
    {
      name: 'Cookie case variation',
      headers: { 'Cookie': 'Admin-Session=fake' }
    },
    {
      name: 'Header injection',
      headers: { 
        'Cookie': 'admin-session=fake',
        'X-Original-URL': '/api/public',
        'X-Rewrite-URL': '/api/public'
      }
    },
    {
      name: 'Host header manipulation',
      headers: { 
        'Host': 'localhost',
        'X-Forwarded-Host': 'admin.solutionargentrapide.ca'
      }
    },
    {
      name: 'Method override',
      headers: { 
        'X-HTTP-Method-Override': 'GET',
        'X-Method-Override': 'GET'
      }
    }
  ]
  
  for (const attempt of bypassAttempts) {
    const result = await testEndpoint(
      'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      { headers: attempt.headers }
    )
    
    const hasData = result.body.includes('transaction_id') || 
                    result.body.includes('webhooks')
    
    testResult(
      `Bypass bloqué: ${attempt.name}`,
      result.status === 401 && !hasData,
      `Status: ${result.status}${hasData ? ' - DONNÉES EXPOSÉES!' : ''}`,
      hasData
    )
  }
}

// ========================================
// TEST 3: Information leakage
// ========================================
async function testInformationLeakage() {
  log('\n💧 TEST DE FUITE D\'INFORMATIONS', 'bold')
  log('='.repeat(60), 'blue')
  
  // Test erreurs détaillées
  const result = await testEndpoint(
    'https://admin.solutionargentrapide.ca/api/admin/webhooks/list?id=\'; DROP TABLE users;--'
  )
  
  const leaksInfo = result.body.includes('stack') ||
                    result.body.includes('Error:') ||
                    result.body.includes('at ') ||
                    result.body.includes('node_modules') ||
                    result.body.includes('supabase') ||
                    result.body.includes('DATABASE_URL')
  
  testResult(
    'Messages d\'erreur ne fuient pas d\'info',
    !leaksInfo,
    leaksInfo ? 'Stack trace ou info sensible exposée!' : 'Erreurs génériques uniquement',
    leaksInfo
  )
  
  // Test headers qui fuient
  const headers = result.headers
  const serverInfo = headers.get('server') || ''
  const xPoweredBy = headers.get('x-powered-by') || ''
  
  testResult(
    'Headers ne révèlent pas trop d\'info',
    !xPoweredBy.includes('Express') && !serverInfo.includes('nginx/'),
    `Server: ${serverInfo}, X-Powered-By: ${xPoweredBy || 'None'}`
  )
}

// ========================================
// TEST 4: Path traversal dans routes
// ========================================
async function testPathTraversal() {
  log('\n📂 TEST PATH TRAVERSAL', 'bold')
  log('='.repeat(60), 'blue')
  
  const traversalAttempts = [
    '/api/admin/../api/public',
    '/api/admin/../../etc/passwd',
    '/api/admin/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '/api/admin/....//....//etc/passwd',
    '/api/./admin/./../api/admin/webhooks/list'
  ]
  
  for (const path of traversalAttempts) {
    const result = await testEndpoint(`https://admin.solutionargentrapide.ca${path}`)
    
    const isSecure = result.status === 404 || result.status === 401
    
    testResult(
      `Path traversal bloqué: ${path}`,
      isSecure,
      `Status: ${result.status}`
    )
  }
}

// ========================================
// TEST 5: Vérification pages publiques
// ========================================
async function testPublicEndpointsSecurity() {
  log('\n🌐 TEST SÉCURITÉ ENDPOINTS PUBLICS', 'bold')
  log('='.repeat(60), 'blue')
  
  // Test que les endpoints publics n'exposent pas de données sensibles
  const publicEndpoints = [
    '/api/contact',
    '/api/webhooks/vopay',
    '/',
    '/faq',
    '/nous-joindre'
  ]
  
  for (const endpoint of publicEndpoints) {
    const result = await testEndpoint(`https://solutionargentrapide.ca${endpoint}`)
    
    const leaksAdminData = result.body.includes('admin-session') ||
                           result.body.includes('JWT_SECRET') ||
                           result.body.includes('SUPABASE_SERVICE_KEY')
    
    testResult(
      `${endpoint} ne fuit pas de données admin`,
      !leaksAdminData,
      leaksAdminData ? 'DONNÉES ADMIN EXPOSÉES!' : 'OK'
    )
  }
}

// ========================================
// TEST 6: CORS et CSRF
// ========================================
async function testCORSandCSRF() {
  log('\n🛡️  TEST CORS ET CSRF', 'bold')
  log('='.repeat(60), 'blue')
  
  const result = await testEndpoint(
    'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
    {
      headers: {
        'Origin': 'https://evil.com',
        'Referer': 'https://evil.com'
      }
    }
  )
  
  const corsHeader = result.headers.get('access-control-allow-origin')
  
  testResult(
    'CORS ne permet pas n\'importe quelle origine',
    !corsHeader || corsHeader !== '*',
    `CORS: ${corsHeader || 'None (sécurisé)'}`
  )
  
  // Test CSRF avec POST
  const postResult = await testEndpoint(
    'https://admin.solutionargentrapide.ca/api/admin/send',
    {
      method: 'POST',
      headers: {
        'Origin': 'https://evil.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'test' })
    }
  )
  
  testResult(
    'Requêtes cross-origin bloquées',
    postResult.status === 401 || postResult.status === 403,
    `Status: ${postResult.status}`
  )
}

// ========================================
// TEST 7: Rate limiting (vérification)
// ========================================
async function testRateLimiting() {
  log('\n⏱️  TEST RATE LIMITING', 'bold')
  log('='.repeat(60), 'blue')
  
  log('  🔄 Envoi de 10 requêtes rapides...', 'cyan')
  
  const results = []
  for (let i = 0; i < 10; i++) {
    const result = await testEndpoint('https://admin.solutionargentrapide.ca/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    })
    results.push(result.status)
  }
  
  const hasRateLimit = results.includes(429)
  
  testResult(
    'Rate limiting actif',
    hasRateLimit,
    hasRateLimit ? 'Bloqué après plusieurs tentatives' : 'AUCUN RATE LIMITING (Recommandé)',
    false // Pas critique mais recommandé
  )
}

// ========================================
// TEST 8: JWT Token manipulation
// ========================================
async function testJWTSecurity() {
  log('\n🔑 TEST SÉCURITÉ JWT', 'bold')
  log('='.repeat(60), 'blue')
  
  const fakeTokens = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid',
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.',
    'null',
    'undefined',
    '{}',
    'Bearer eyJhbGciOiJIUzI1NiJ9.e30.invalid'
  ]
  
  for (const token of fakeTokens) {
    const result = await testEndpoint(
      'https://admin.solutionargentrapide.ca/api/admin/webhooks/list',
      {
        headers: { 'Cookie': `admin-session=${token}` }
      }
    )
    
    const isSecure = result.status === 401
    
    testResult(
      `JWT invalide rejeté: ${token.substring(0, 20)}...`,
      isSecure,
      `Status: ${result.status}`,
      !isSecure
    )
  }
}

// ========================================
// TEST 9: Enumération d'endpoints
// ========================================
async function testEndpointEnumeration() {
  log('\n🔎 TEST ÉNUMÉRATION D\'ENDPOINTS', 'bold')
  log('='.repeat(60), 'blue')
  
  const potentialEndpoints = [
    '/api/admin/users',
    '/api/admin/config',
    '/api/admin/settings',
    '/api/admin/backup',
    '/api/admin/logs',
    '/api/admin/database',
    '/api/admin/phpinfo',
    '/api/admin/.env',
    '/api/admin/debug',
    '/api/admin/console'
  ]
  
  for (const endpoint of potentialEndpoints) {
    const result = await testEndpoint(`https://admin.solutionargentrapide.ca${endpoint}`)
    
    const isSecure = result.status === 404 || result.status === 401
    const hasData = result.status === 200 && result.body.length > 50
    
    testResult(
      `Endpoint caché protégé: ${endpoint}`,
      isSecure || !hasData,
      `Status: ${result.status}${hasData ? ' - ENDPOINT TROUVÉ!' : ''}`,
      hasData
    )
  }
}

// ========================================
// TEST 10: Session fixation
// ========================================
async function testSessionSecurity() {
  log('\n🔐 TEST SÉCURITÉ DE SESSION', 'bold')
  log('='.repeat(60), 'blue')
  
  // Test 1: Cookie httpOnly
  const result = await testEndpoint('https://admin.solutionargentrapide.ca/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'test' })
  })
  
  const setCookie = result.headers.get('set-cookie') || ''
  const hasHttpOnly = setCookie.includes('HttpOnly')
  const hasSecure = setCookie.includes('Secure')
  const hasSameSite = setCookie.includes('SameSite')
  
  testResult(
    'Cookie session a HttpOnly flag',
    hasHttpOnly || !setCookie, // OK si pas de cookie (échec login) ou si HttpOnly
    `Cookie flags: ${setCookie.substring(0, 100) || 'None'}`
  )
  
  testResult(
    'Cookie session a Secure flag',
    hasSecure || !setCookie,
    `Secure: ${hasSecure}`
  )
  
  testResult(
    'Cookie session a SameSite',
    hasSameSite || !setCookie,
    `SameSite: ${hasSameSite}`
  )
}

// ========================================
// MAIN
// ========================================
async function runDeepScan() {
  log('\n' + '='.repeat(60), 'cyan')
  log('🔍 DEEP SECURITY SCAN - Solution Argent Rapide', 'bold')
  log('Recherche approfondie de portes ouvertes', 'cyan')
  log('Date: ' + new Date().toLocaleString('fr-CA'), 'cyan')
  log('='.repeat(60) + '\n', 'cyan')
  
  await testAllAdminEndpoints()
  await testAdvancedBypass()
  await testInformationLeakage()
  await testPathTraversal()
  await testPublicEndpointsSecurity()
  await testCORSandCSRF()
  await testRateLimiting()
  await testJWTSecurity()
  await testEndpointEnumeration()
  await testSessionSecurity()
  
  // Résumé
  log('\n' + '='.repeat(60), 'cyan')
  log('📊 RÉSUMÉ DU SCAN APPROFONDI', 'bold')
  log('='.repeat(60), 'cyan')
  
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  log(`\nTotal de tests: ${totalTests}`, 'blue')
  log(`✅ Réussis: ${passedTests}`, 'green')
  log(`❌ Échoués: ${failedTests}`, failedTests > 0 ? 'red' : 'green')
  log(`\n🎯 Taux de sécurité: ${successRate}%`, successRate >= 95 ? 'green' : successRate >= 85 ? 'yellow' : 'red')
  
  if (criticalIssues.length > 0) {
    log('\n🚨 PROBLÈMES CRITIQUES TROUVÉS:', 'red')
    criticalIssues.forEach((issue, i) => {
      log(`\n${i + 1}. ${issue.name}`, 'red')
      log(`   ${issue.details}`, 'yellow')
    })
  } else {
    log('\n✅ Aucun problème critique trouvé!', 'green')
  }
  
  if (successRate === 100) {
    log('\n🎉 PARFAIT! Aucune porte ouverte détectée!', 'green')
  } else if (successRate >= 95) {
    log('\n✅ EXCELLENT! Site très sécurisé', 'green')
  } else if (successRate >= 85) {
    log('\n⚠️  BON, quelques améliorations recommandées', 'yellow')
  } else {
    log('\n🚨 ATTENTION! Problèmes de sécurité détectés', 'red')
  }
  
  log('\n' + '='.repeat(60) + '\n', 'cyan')
}

runDeepScan().catch(console.error)
