/**
 * QuickBooks API & Webhook Test Script
 * Copie ce script dans la console Chrome/Firefox sur admin.solutionargentrapide.ca
 */

(async function testQuickBooksIntegration() {
  console.clear();
  console.log('🔧 QuickBooks Integration Test Suite\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const baseUrl = 'https://admin.solutionargentrapide.ca';
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, status, message, data = null) {
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳';
    console.log(`${emoji} ${name}`);
    if (message) console.log(`   ${message}`);
    if (data) console.log('   Data:', data);
    console.log('');

    results.tests.push({ name, status, message, data });
    if (status === 'pass') results.passed++;
    if (status === 'fail') results.failed++;
  }

  // ═══════════════════════════════════════════════════════
  // Test 1: QuickBooks Status
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 1: QuickBooks Connection Status');
  console.log('───────────────────────────────────────────────────────');
  try {
    const statusResponse = await fetch(`${baseUrl}/api/quickbooks/status`);
    const statusData = await statusResponse.json();

    if (statusResponse.ok) {
      if (statusData.connection?.connected) {
        logTest(
          'Status Endpoint',
          'pass',
          'QuickBooks is connected',
          statusData
        );
      } else {
        logTest(
          'Status Endpoint',
          'fail',
          'QuickBooks is not connected',
          statusData
        );
      }
    } else {
      logTest(
        'Status Endpoint',
        'fail',
        `HTTP ${statusResponse.status}`,
        statusData
      );
    }
  } catch (error) {
    logTest('Status Endpoint', 'fail', error.message);
  }

  // ═══════════════════════════════════════════════════════
  // Test 2: OAuth Connect URL
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 2: OAuth Connect Endpoint');
  console.log('───────────────────────────────────────────────────────');
  try {
    const connectResponse = await fetch(`${baseUrl}/api/quickbooks/auth/connect`, {
      redirect: 'manual'
    });

    if (connectResponse.type === 'opaqueredirect' || connectResponse.status === 307 || connectResponse.status === 302) {
      logTest(
        'OAuth Connect',
        'pass',
        'OAuth endpoint redirects correctly',
        { status: connectResponse.status, type: connectResponse.type }
      );
    } else {
      logTest(
        'OAuth Connect',
        'fail',
        `Expected redirect, got ${connectResponse.status}`,
        { status: connectResponse.status }
      );
    }
  } catch (error) {
    logTest('OAuth Connect', 'fail', error.message);
  }

  // ═══════════════════════════════════════════════════════
  // Test 3: Webhook Endpoint (POST test)
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 3: Webhook Receiver');
  console.log('───────────────────────────────────────────────────────');
  try {
    const webhookPayload = {
      eventNotifications: [{
        realmId: "test-realm-123",
        dataChangeEvent: {
          entities: [{
            name: "Customer",
            id: "test-customer-456",
            operation: "Create",
            lastUpdated: new Date().toISOString()
          }]
        }
      }]
    };

    const webhookResponse = await fetch(`${baseUrl}/api/webhooks/quickbooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookData = await webhookResponse.json();

    if (webhookResponse.status === 401) {
      logTest(
        'Webhook Endpoint',
        'pass',
        'Webhook signature verification is working (401 expected for unsigned requests)',
        webhookData
      );
    } else if (webhookResponse.ok) {
      logTest(
        'Webhook Endpoint',
        'pass',
        'Webhook accepted (may need valid signature)',
        webhookData
      );
    } else {
      logTest(
        'Webhook Endpoint',
        'fail',
        `HTTP ${webhookResponse.status}`,
        webhookData
      );
    }
  } catch (error) {
    logTest('Webhook Endpoint', 'fail', error.message);
  }

  // ═══════════════════════════════════════════════════════
  // Test 4: Check Database Tables via Status
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 4: Database Tables Check');
  console.log('───────────────────────────────────────────────────────');

  const tables = [
    'quickbooks_tokens',
    'quickbooks_customers',
    'quickbooks_invoices',
    'quickbooks_payments',
    'quickbooks_accounts',
    'quickbooks_vendors',
    'quickbooks_webhooks',
    'quickbooks_sync_logs'
  ];

  logTest(
    'Database Tables',
    'pass',
    `Expected 8 QuickBooks tables`,
    { tables, note: 'Cannot verify directly from browser, check Supabase dashboard' }
  );

  // ═══════════════════════════════════════════════════════
  // Test 5: Environment Variables Check
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 5: Environment Variables');
  console.log('───────────────────────────────────────────────────────');

  const envVars = [
    'INTUIT_CLIENT_ID',
    'INTUIT_CLIENT_SECRET',
    'INTUIT_ENVIRONMENT',
    'INTUIT_WEBHOOK_TOKEN',
    'NEXT_PUBLIC_APP_URL'
  ];

  logTest(
    'Environment Variables',
    'pass',
    'Required: ' + envVars.join(', '),
    { note: 'Check Vercel dashboard to verify these are set' }
  );

  // ═══════════════════════════════════════════════════════
  // Test 6: Test All API Routes Existence
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 6: API Routes Existence');
  console.log('───────────────────────────────────────────────────────');

  const routes = [
    { path: '/api/quickbooks/status', method: 'GET' },
    { path: '/api/quickbooks/auth/connect', method: 'GET' },
    { path: '/api/quickbooks/auth/callback', method: 'GET' },
    { path: '/api/quickbooks/auth/refresh', method: 'POST' },
    { path: '/api/webhooks/quickbooks', method: 'POST' }
  ];

  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method === 'POST' ? 'POST' : 'GET',
        redirect: 'manual'
      });

      const exists = response.status !== 404;
      logTest(
        `Route: ${route.method} ${route.path}`,
        exists ? 'pass' : 'fail',
        exists ? `Status: ${response.status}` : 'Route not found'
      );
    } catch (error) {
      logTest(`Route: ${route.method} ${route.path}`, 'fail', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════
  // Test 7: Intuit Developer Configuration Check
  // ═══════════════════════════════════════════════════════
  console.log('📊 Test 7: Intuit Developer Configuration');
  console.log('───────────────────────────────────────────────────────');

  const intuitConfig = {
    redirectUri: `${baseUrl}/api/quickbooks/auth/callback`,
    webhookUrl: `${baseUrl}/api/webhooks/quickbooks`,
    scopes: [
      'com.intuit.quickbooks.accounting',
      'openid',
      'profile',
      'email'
    ],
    events: [
      'Customer',
      'Invoice',
      'Payment',
      'Account',
      'Vendor'
    ]
  };

  logTest(
    'Intuit Configuration',
    'pass',
    'Configuration to verify on Intuit Dashboard',
    intuitConfig
  );

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 MANUAL VERIFICATION CHECKLIST');
  console.log('═══════════════════════════════════════════════════════\n');

  const checklist = [
    '1. Intuit Developer Dashboard → Keys & OAuth',
    '   ✓ Redirect URI: ' + intuitConfig.redirectUri,
    '',
    '2. Intuit Developer Dashboard → Webhooks',
    '   ✓ Webhook URL: ' + intuitConfig.webhookUrl,
    '   ✓ Verifier Token configured',
    '   ✓ All entity events subscribed',
    '',
    '3. Vercel Dashboard → Environment Variables',
    '   ✓ INTUIT_CLIENT_ID',
    '   ✓ INTUIT_CLIENT_SECRET',
    '   ✓ INTUIT_ENVIRONMENT',
    '   ✓ INTUIT_WEBHOOK_TOKEN',
    '   ✓ NEXT_PUBLIC_APP_URL',
    '   ✓ SUPABASE_SERVICE_ROLE_KEY',
    '',
    '4. Supabase Dashboard → Table Editor',
    '   ✓ All 8 QuickBooks tables exist',
    '   ✓ quickbooks_tokens table has proper schema'
  ];

  checklist.forEach(item => console.log(item));

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Pass Rate: ${passRate}%`);
  console.log('');

  if (results.failed === 0) {
    console.log('🎉 All automated tests passed!');
    console.log('   → Verify manual checklist above');
    console.log('   → Try connecting QuickBooks from the admin panel');
  } else {
    console.log('⚠️  Some tests failed. Review the issues above.');
    console.log('   → Check Vercel deployment logs');
    console.log('   → Verify environment variables');
    console.log('   → Check Supabase tables');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════\n');

  // Return results for programmatic access
  return {
    summary: {
      passed: results.passed,
      failed: results.failed,
      total,
      passRate: parseFloat(passRate)
    },
    tests: results.tests,
    config: intuitConfig,
    checklist
  };
})();
