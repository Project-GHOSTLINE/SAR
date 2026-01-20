/**
 * 🧪 QUICKBOOKS COMPLETE TEST SUITE
 *
 * Copie ce script dans la console Chrome/Firefox sur:
 * https://admin.solutionargentrapide.ca/admin/quickbooks
 *
 * Ce script teste TOUS les endpoints QuickBooks et génère un rapport complet
 */

(async function testQuickBooksComplete() {
  console.clear();
  console.log('%c🧪 QUICKBOOKS COMPLETE TEST SUITE', 'background: #10B981; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Helper function to test endpoint
  async function testEndpoint(name, url, options = {}) {
    const method = options.method || 'GET';
    const startTime = Date.now();

    console.log(`%c🔍 Testing: ${name}`, 'background: #3B82F6; color: white; padding: 5px; font-weight: bold;');
    console.log(`   Method: ${method}`);
    console.log(`   URL: ${url}`);

    try {
      const response = await fetch(url, {
        method,
        credentials: 'include',
        ...options
      });

      const duration = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      let data = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const testResult = {
        name,
        url,
        method,
        status: response.status,
        success: response.ok,
        duration,
        data: typeof data === 'string' ? data.substring(0, 200) : data
      };

      report.tests.push(testResult);
      report.summary.total++;

      if (response.ok) {
        report.summary.passed++;
        console.log(`   %c✅ PASSED`, 'color: green; font-weight: bold;');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        if (data && typeof data === 'object') {
          console.log(`   Response:`, data);
        }
      } else {
        report.summary.failed++;
        console.log(`   %c❌ FAILED`, 'color: red; font-weight: bold;');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error:`, data);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = {
        name,
        url,
        method,
        status: 0,
        success: false,
        duration,
        error: error.message
      };

      report.tests.push(testResult);
      report.summary.total++;
      report.summary.failed++;

      console.log(`   %c❌ EXCEPTION`, 'color: red; font-weight: bold;');
      console.log(`   Error:`, error.message);
    }

    console.log('');
  }

  // ═══════════════════════════════════════════════════════
  // 1. CONNECTION STATUS
  // ═══════════════════════════════════════════════════════
  console.log('%c📡 1. CONNECTION STATUS', 'background: #8B5CF6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  await testEndpoint(
    'QuickBooks Connection Status',
    '/api/quickbooks/status'
  );

  // ═══════════════════════════════════════════════════════
  // 2. SYNC ENDPOINTS (require connection)
  // ═══════════════════════════════════════════════════════
  console.log('%c🔄 2. SYNC ENDPOINTS', 'background: #8B5CF6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  const statusTest = report.tests[0];
  const isConnected = statusTest.success && statusTest.data?.connection?.connected;

  if (isConnected) {
    console.log('%c✅ QuickBooks is connected, testing sync endpoints...', 'color: green;');
    console.log('');

    await testEndpoint(
      'Sync Customers',
      '/api/quickbooks/sync/customers',
      { method: 'POST' }
    );

    await testEndpoint(
      'Sync Invoices',
      '/api/quickbooks/sync/invoices',
      { method: 'POST' }
    );

    await testEndpoint(
      'Sync Payments',
      '/api/quickbooks/sync/payments',
      { method: 'POST' }
    );

    await testEndpoint(
      'Sync Accounts',
      '/api/quickbooks/sync/accounts',
      { method: 'POST' }
    );

    await testEndpoint(
      'Sync Vendors',
      '/api/quickbooks/sync/vendors',
      { method: 'POST' }
    );

    // Test full sync last (takes longer)
    console.log('%c⏳ Testing Full Sync (this may take 30+ seconds)...', 'color: orange;');
    await testEndpoint(
      'Full Sync',
      '/api/quickbooks/sync/all',
      { method: 'POST' }
    );

  } else {
    console.log('%c⚠️  QuickBooks NOT connected, skipping sync tests', 'color: orange; font-weight: bold;');
    console.log('   Connect QuickBooks first to test sync endpoints');
    console.log('');
  }

  // ═══════════════════════════════════════════════════════
  // 3. REPORT ENDPOINTS (require connection)
  // ═══════════════════════════════════════════════════════
  console.log('%c📊 3. REPORT ENDPOINTS', 'background: #8B5CF6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  if (isConnected) {
    console.log('%c✅ QuickBooks is connected, testing report endpoints...', 'color: green;');
    console.log('');

    await testEndpoint(
      'Profit & Loss Report',
      '/api/quickbooks/reports/profit-loss?start_date=2026-01-01&end_date=2026-01-20'
    );

    await testEndpoint(
      'Balance Sheet Report',
      '/api/quickbooks/reports/balance-sheet?date=2026-01-20'
    );

    await testEndpoint(
      'Cash Flow Report',
      '/api/quickbooks/reports/cash-flow?start_date=2026-01-01&end_date=2026-01-20'
    );

    await testEndpoint(
      'Aged Receivables Report',
      '/api/quickbooks/reports/aged-receivables?report_date=2026-01-20'
    );

  } else {
    console.log('%c⚠️  QuickBooks NOT connected, skipping report tests', 'color: orange; font-weight: bold;');
    console.log('   Connect QuickBooks first to test report endpoints');
    console.log('');
  }

  // ═══════════════════════════════════════════════════════
  // 4. AUTHENTICATION ENDPOINTS
  // ═══════════════════════════════════════════════════════
  console.log('%c🔐 4. AUTHENTICATION ENDPOINTS', 'background: #8B5CF6; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  await testEndpoint(
    'Get Connect URL',
    '/api/quickbooks/auth/connect'
  );

  // ═══════════════════════════════════════════════════════
  // 5. FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📋 TEST SUMMARY', 'background: #EF4444; color: white; font-size: 18px; padding: 10px; font-weight: bold;');
  console.log('');

  const successRate = Math.round((report.summary.passed / report.summary.total) * 100);

  const summaryTable = {
    'Total Tests': report.summary.total,
    'Passed ✅': report.summary.passed,
    'Failed ❌': report.summary.failed,
    'Success Rate': `${successRate}%`
  };

  console.table(summaryTable);

  // Detailed results
  console.log('');
  console.log('%cDetailed Results:', 'font-weight: bold; font-size: 14px;');
  console.log('');

  const resultsTable = report.tests.map(test => ({
    'Test': test.name,
    'Method': test.method,
    'Status': test.status,
    'Result': test.success ? '✅ PASS' : '❌ FAIL',
    'Duration': `${test.duration}ms`
  }));

  console.table(resultsTable);

  // ═══════════════════════════════════════════════════════
  // 6. DIAGNOSTICS
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c🔧 DIAGNOSTICS', 'background: #F59E0B; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  const diagnostics = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    cookiesEnabled: navigator.cookieEnabled,
    quickbooksConnected: isConnected,
    allTestsPassed: report.summary.failed === 0
  };

  console.table(diagnostics);

  // ═══════════════════════════════════════════════════════
  // 7. RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c💡 RECOMMENDATIONS', 'background: #10B981; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  if (!isConnected) {
    console.log('%c⚠️  QuickBooks NOT CONNECTED', 'color: red; font-weight: bold; font-size: 14px;');
    console.log('');
    console.log('Actions required:');
    console.log('1. Click "Connecter QuickBooks" button on this page');
    console.log('2. Authorize ALL permissions (accounting, openid, profile, email)');
    console.log('3. Re-run this test script after connecting');
  } else if (report.summary.failed > 0) {
    console.log('%c⚠️  SOME TESTS FAILED', 'color: orange; font-weight: bold; font-size: 14px;');
    console.log('');
    console.log('Failed tests:');
    report.tests.filter(t => !t.success).forEach(test => {
      console.log(`- ${test.name}: Status ${test.status}`);
      if (test.data?.error) {
        console.log(`  Error: ${test.data.error}`);
      }
    });
    console.log('');
    console.log('Possible causes:');
    console.log('1. Token expired - Reconnect QuickBooks');
    console.log('2. Insufficient scopes - Check Intuit Developer Dashboard');
    console.log('3. API rate limit - Wait a few minutes and retry');
    console.log('4. Sandbox data missing - Some entities may not exist in sandbox');
  } else {
    console.log('%c✅ ALL TESTS PASSED!', 'color: green; font-weight: bold; font-size: 14px;');
    console.log('');
    console.log('QuickBooks integration is working perfectly! 🎉');
    console.log('');
    console.log('You can now:');
    console.log('- Sync data using the sync endpoints');
    console.log('- View real-time reports');
    console.log('- Receive webhook events from QuickBooks');
  }

  // ═══════════════════════════════════════════════════════
  // 8. EXPORT REPORT
  // ═══════════════════════════════════════════════════════
  console.log('');
  console.log('%c📤 EXPORT REPORT', 'background: #6366F1; color: white; font-size: 16px; padding: 5px; font-weight: bold;');
  console.log('');

  const reportJSON = JSON.stringify(report, null, 2);

  try {
    await navigator.clipboard.writeText(reportJSON);
    console.log('%c✅ Full report copied to clipboard!', 'background: green; color: white; padding: 5px;');
  } catch (err) {
    console.log('%c⚠️  Could not copy to clipboard automatically', 'color: orange;');
    console.log('');
    console.log('Copy the report manually below:');
    console.log(reportJSON);
  }

  console.log('');
  console.log('%c═══════════════════════════════════════════════════════', 'color: gray;');
  console.log('');

  return report;
})();
