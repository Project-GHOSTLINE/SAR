#!/usr/bin/env node

/**
 * STRESS TEST SÉCURITÉ COMPLET
 * Solution Argent Rapide INC
 *
 * Tests:
 * - Authentication bypass
 * - SQL Injection
 * - XSS
 * - CSRF
 * - Path Traversal
 * - API Security
 * - Headers Security
 * - Rate Limiting
 */

const DOMAINS = [
  'https://solutionargentrapide.ca',
  'https://admin.solutionargentrapide.ca',
  'https://client.solutionargentrapide.ca',
  'https://api.solutionargentrapide.ca'
]

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
}

let totalTests = 0
let passedTests = 0
let failedTests = 0
let warningTests = 0

function log(message, color = 'white') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function testResult(name, passed, details = '') {
  totalTests++
  if (passed) {
    passedTests++
    log(`  ✅ ${name}${details ? ` - ${details}` : ''}`, 'green')
  } else {
    failedTests++
    log(`  ❌ ${name}${details ? ` - ${details}` : ''}`, 'red')
  }
}

function testWarning(name, details = '') {
  totalTests++
  warningTests++
  log(`  ⚠️  ${name}${details ? ` - ${details}` : ''}`, 'yellow')
}

async function testSecurityHeaders(domain) {
  try {
    const response = await fetch(domain, { method: 'HEAD' })
    const headers = response.headers

    // Security headers à vérifier
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'content-security-policy': true,
      'strict-transport-security': true,
      'referrer-policy': true
    }

    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const value = headers.get(header)

      if (typeof expectedValue === 'boolean') {
        testResult(
          `Header ${header}`,
          value !== null,
          value ? `Present: ${value.substring(0, 50)}...` : 'Missing'
        )
      } else if (Array.isArray(expectedValue)) {
        testResult(
          `Header ${header}`,
          value && expectedValue.includes(value),
          value || 'Missing'
        )
      } else {
        testResult(
          `Header ${header}`,
          value === expectedValue,
          value || 'Missing'
        )
      }
    }
  } catch (error) {
    testResult(`Security Headers Test`, false, error.message)
  }
}

async function testAuthenticationBypass(domain) {
  log('\n🔐 TEST: Authentication Bypass Attempts', 'cyan')

  const adminRoutes = [
    '/admin/dashboard',
    '/admin/webhooks',
    '/dashboard',
    '/webhooks'
  ]

  for (const route of adminRoutes) {
    try {
      const response = await fetch(domain + route, {
        redirect: 'manual',
        headers: { 'Cookie': '' }
      })

      const isProtected = response.status === 307 || response.status === 302 || response.status === 401
      testResult(
        `Route ${route} protected`,
        isProtected,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`Route ${route}`, false, error.message)
    }
  }
}

async function testSQLInjection(domain) {
  log('\n💉 TEST: SQL Injection Attempts', 'cyan')

  const payloads = [
    "' OR '1'='1",
    "1' OR '1' = '1",
    "admin'--",
    "1' UNION SELECT NULL--",
    "'; DROP TABLE users--"
  ]

  const testRoutes = [
    '/api/contact',
    '/api/admin/login'
  ]

  for (const route of testRoutes) {
    for (const payload of payloads) {
      try {
        const response = await fetch(domain + route, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payload,
            password: payload,
            nom: payload
          })
        })

        // Ne devrait jamais retourner 200 avec succès
        const isSafe = response.status !== 200 ||
                       !(await response.text()).toLowerCase().includes('success')

        testResult(
          `SQL Injection blocked on ${route}`,
          isSafe,
          `Payload: ${payload.substring(0, 20)}...`
        )
      } catch (error) {
        testResult(`SQL Injection test ${route}`, true, 'Request blocked (good)')
      }
    }
  }
}

async function testXSS(domain) {
  log('\n🔓 TEST: XSS (Cross-Site Scripting) Attempts', 'cyan')

  const payloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ]

  for (const payload of payloads) {
    try {
      const response = await fetch(domain + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: payload,
          email: 'test@test.com',
          telephone: '5141234567',
          question: payload
        })
      })

      const text = await response.text()
      const hasXSS = text.includes('<script>') || text.includes('onerror=')

      testResult(
        'XSS payload sanitized',
        !hasXSS,
        `Payload: ${payload.substring(0, 30)}...`
      )
    } catch (error) {
      testResult('XSS test', true, 'Request blocked')
    }
  }
}

async function testPathTraversal(domain) {
  log('\n📁 TEST: Path Traversal Attempts', 'cyan')

  const payloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '....//....//....//etc/passwd',
    '/etc/passwd',
    'C:\\windows\\system32\\drivers\\etc\\hosts'
  ]

  for (const payload of payloads) {
    try {
      const response = await fetch(domain + '/api/admin/messages?file=' + encodeURIComponent(payload), {
        redirect: 'manual'
      })

      const isSafe = response.status === 401 || response.status === 403 || response.status === 404
      testResult(
        'Path Traversal blocked',
        isSafe,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult('Path Traversal test', true, 'Blocked')
    }
  }
}

async function testAPIEndpoints(domain) {
  log('\n🔌 TEST: API Endpoints Security', 'cyan')

  const protectedAPIs = [
    '/api/admin/vopay',
    '/api/admin/webhooks/stats',
    '/api/admin/messages',
    '/api/admin/vopay/transactions'
  ]

  for (const api of protectedAPIs) {
    try {
      const response = await fetch(domain + api, {
        headers: { 'Cookie': '' }
      })

      const isProtected = response.status === 401 || response.status === 403
      testResult(
        `API ${api} protected`,
        isProtected,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`API ${api}`, false, error.message)
    }
  }

  // Test public APIs
  const publicAPIs = [
    '/api/contact',
    '/api/contact-analyse'
  ]

  for (const api of publicAPIs) {
    try {
      const response = await fetch(domain + api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      // Should be accessible but validate input
      const isAccessible = response.status !== 500
      testResult(
        `Public API ${api} accessible`,
        isAccessible,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`Public API ${api}`, false, error.message)
    }
  }
}

async function testRateLimiting(domain) {
  log('\n⏱️  TEST: Rate Limiting', 'cyan')

  const requests = []
  const count = 20

  // Send 20 requests rapidly
  for (let i = 0; i < count; i++) {
    requests.push(
      fetch(domain + '/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: 'Test',
          email: 'test@test.com',
          telephone: '5141234567',
          question: 'Test rate limiting'
        })
      })
    )
  }

  try {
    const responses = await Promise.all(requests)
    const statuses = responses.map(r => r.status)
    const rateLimited = statuses.filter(s => s === 429).length

    if (rateLimited > 0) {
      testResult(
        'Rate limiting active',
        true,
        `${rateLimited}/${count} requests blocked`
      )
    } else {
      testWarning(
        'Rate limiting',
        `All ${count} requests accepted - Consider adding rate limiting`
      )
    }
  } catch (error) {
    testWarning('Rate limiting test', error.message)
  }
}

async function testCSRF(domain) {
  log('\n🛡️  TEST: CSRF Protection', 'cyan')

  try {
    // Test without origin/referer
    const response = await fetch(domain + '/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil-site.com'
      },
      body: JSON.stringify({
        password: 'test'
      })
    })

    // CORS should block or request should fail
    const isProtected = response.status === 401 || response.status === 403
    testResult(
      'CSRF protection on login',
      isProtected,
      `Status: ${response.status}`
    )
  } catch (error) {
    testResult('CSRF test', true, 'Cross-origin blocked')
  }
}

async function testHTTPMethods(domain) {
  log('\n🔧 TEST: HTTP Methods', 'cyan')

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']

  for (const method of methods) {
    try {
      const response = await fetch(domain + '/api/admin/vopay', {
        method: method
      })

      // Admin routes should always require auth
      const isProtected = response.status === 401 || response.status === 403 || response.status === 405
      testResult(
        `Method ${method} handled securely`,
        isProtected,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`Method ${method}`, true, 'Blocked')
    }
  }
}

async function testFileUpload(domain) {
  log('\n📤 TEST: File Upload Security', 'cyan')

  const maliciousFiles = [
    { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
    { name: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
    { name: '../../../etc/passwd', content: 'malicious' }
  ]

  for (const file of maliciousFiles) {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([file.content]), file.name)

      const response = await fetch(domain + '/api/upload', {
        method: 'POST',
        body: formData
      })

      const isBlocked = response.status === 404 || response.status === 403 || response.status === 400
      testResult(
        `Malicious file ${file.name} blocked`,
        isBlocked,
        `Status: ${response.status}`
      )
    } catch (error) {
      testResult(`File upload test ${file.name}`, true, 'Endpoint not found or blocked')
    }
  }
}

async function testCredentialStuffing(domain) {
  log('\n🔑 TEST: Credential Stuffing Protection', 'cyan')

  const commonPasswords = [
    'password123',
    'admin',
    '123456',
    'password',
    'qwerty123'
  ]

  let attempts = 0
  let blocked = false

  for (const password of commonPasswords) {
    try {
      const response = await fetch(domain + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      attempts++

      if (response.status === 429) {
        blocked = true
        break
      }
    } catch (error) {
      // OK
    }
  }

  if (blocked) {
    testResult(
      'Credential stuffing blocked',
      true,
      `After ${attempts} attempts`
    )
  } else {
    testWarning(
      'Credential stuffing protection',
      `${attempts} login attempts allowed - Consider rate limiting`
    )
  }
}

async function testSubdomainSecurity() {
  log('\n🌐 TEST: Subdomain Security', 'cyan')

  const subdomains = [
    'admin.solutionargentrapide.ca',
    'client.solutionargentrapide.ca',
    'api.solutionargentrapide.ca',
    'test.solutionargentrapide.ca',
    'dev.solutionargentrapide.ca',
    'staging.solutionargentrapide.ca'
  ]

  for (const subdomain of subdomains) {
    try {
      const response = await fetch(`https://${subdomain}`, {
        method: 'HEAD',
        redirect: 'manual'
      })

      const exists = response.status !== 404

      if (['admin', 'client', 'api'].some(s => subdomain.startsWith(s))) {
        testResult(
          `Subdomain ${subdomain}`,
          exists,
          exists ? 'Active' : 'Not found'
        )
      } else {
        testResult(
          `Test subdomain ${subdomain}`,
          !exists,
          exists ? 'EXPOSED - Should not exist!' : 'Not found (good)'
        )
      }
    } catch (error) {
      testResult(`Subdomain ${subdomain}`, true, 'Not accessible')
    }
  }
}

async function testSSL(domain) {
  log('\n🔒 TEST: SSL/TLS Configuration', 'cyan')

  try {
    // Test HTTPS redirect
    const httpUrl = domain.replace('https://', 'http://')
    const response = await fetch(httpUrl, { redirect: 'manual' })

    const redirectsToHTTPS = response.status === 301 || response.status === 308
    testResult(
      'HTTP to HTTPS redirect',
      redirectsToHTTPS,
      `Status: ${response.status}`
    )

    // Test HSTS header
    const httpsResponse = await fetch(domain)
    const hstsHeader = httpsResponse.headers.get('strict-transport-security')

    testResult(
      'HSTS header present',
      hstsHeader !== null,
      hstsHeader ? hstsHeader.substring(0, 50) : 'Missing'
    )
  } catch (error) {
    testResult('SSL/TLS test', false, error.message)
  }
}

// MAIN EXECUTION
async function runSecurityTests() {
  log('\n' + '='.repeat(80), 'cyan')
  log('🔒 STRESS TEST SÉCURITÉ COMPLET', 'bold')
  log('Solution Argent Rapide INC', 'cyan')
  log('='.repeat(80) + '\n', 'cyan')

  for (const domain of DOMAINS) {
    log(`\n${'█'.repeat(80)}`, 'blue')
    log(`🌍 TESTING: ${domain}`, 'bold')
    log('█'.repeat(80) + '\n', 'blue')

    log('\n🛡️  TEST: Security Headers', 'cyan')
    await testSecurityHeaders(domain)

    await testAuthenticationBypass(domain)
    await testSQLInjection(domain)
    await testXSS(domain)
    await testPathTraversal(domain)
    await testAPIEndpoints(domain)
    await testRateLimiting(domain)
    await testCSRF(domain)
    await testHTTPMethods(domain)
    await testFileUpload(domain)
    await testCredentialStuffing(domain)
    await testSSL(domain)

    // Wait between domains
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Test subdomains once
  await testSubdomainSecurity()

  // FINAL REPORT
  log('\n' + '='.repeat(80), 'cyan')
  log('📊 RAPPORT FINAL', 'bold')
  log('='.repeat(80), 'cyan')

  log(`\nTotal tests: ${totalTests}`, 'white')
  log(`✅ Passed: ${passedTests}`, 'green')
  log(`❌ Failed: ${failedTests}`, 'red')
  log(`⚠️  Warnings: ${warningTests}`, 'yellow')

  const successRate = Math.round((passedTests / totalTests) * 100)

  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red')

  if (failedTests > 0) {
    log('\n⚠️  ATTENTION: Des failles de sécurité ont été détectées!', 'red')
  } else if (warningTests > 0) {
    log('\n⚠️  Quelques améliorations recommandées', 'yellow')
  } else {
    log('\n✅ Tous les tests de sécurité sont passés!', 'green')
  }

  log('\n' + '='.repeat(80) + '\n', 'cyan')
}

// Run tests
runSecurityTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
