import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';

test.describe('QuickBooks Fix Verification - Complete Test', () => {

  test('Full QuickBooks verification after OAuth fix @qb-fix-verification', async ({ page, request }) => {
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };

    const addResult = (name: string, status: 'pass' | 'fail', details: any) => {
      results.tests.push({ name, status, details, timestamp: new Date().toISOString() });
      results.summary.total++;
      if (status === 'pass') results.summary.passed++;
      else results.summary.failed++;
    };

    // ============================================
    // Test 1: Check OAuth URL has new scopes
    // ============================================
    console.log('\n🔍 Test 1: OAuth URL Scopes');
    try {
      const oauthResponse = await request.get(`${BASE_URL}/api/quickbooks/auth/connect`);
      const oauthData = await oauthResponse.json();
      const authUrl = oauthData.authUrl;

      const hasAccountingScope = authUrl.includes('com.intuit.quickbooks.accounting');
      const hasOpenIdScope = authUrl.includes('openid');
      const hasProfileScope = authUrl.includes('profile');
      const hasEmailScope = authUrl.includes('email');

      if (hasAccountingScope && hasOpenIdScope && hasProfileScope && hasEmailScope) {
        console.log('✅ All required scopes present');
        addResult('OAuth URL Scopes', 'pass', {
          scopes: ['accounting', 'openid', 'profile', 'email'],
          authUrl: authUrl.substring(0, 100) + '...'
        });
      } else {
        console.log('❌ Missing scopes');
        addResult('OAuth URL Scopes', 'fail', {
          hasAccountingScope,
          hasOpenIdScope,
          hasProfileScope,
          hasEmailScope
        });
      }
    } catch (error: any) {
      console.log('❌ OAuth URL test failed:', error.message);
      addResult('OAuth URL Scopes', 'fail', { error: error.message });
    }

    // ============================================
    // Test 2: Connection Status
    // ============================================
    console.log('\n🔍 Test 2: Connection Status');
    try {
      const statusResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
      const statusData = await statusResponse.json();

      const connected = statusData.connection?.connected;
      const realmId = statusData.connection?.realmId;
      const autoRefresh = statusData.connection?.autoRefreshEnabled;

      console.log(`   Connected: ${connected}`);
      console.log(`   Realm ID: ${realmId}`);
      console.log(`   Auto-Refresh: ${autoRefresh}`);

      addResult('Connection Status', 'pass', {
        connected,
        realmId,
        autoRefresh,
        company: statusData.company || 'Unknown'
      });
    } catch (error: any) {
      console.log('❌ Status check failed:', error.message);
      addResult('Connection Status', 'fail', { error: error.message });
    }

    // ============================================
    // Test 3: Connection Test (CompanyInfo API)
    // ============================================
    console.log('\n🔍 Test 3: Connection Test (CompanyInfo)');
    try {
      const testResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
      const testData = await testResponse.json();

      if (testData.success === true) {
        console.log('✅ Connection test PASSED');
        console.log(`   Company: ${testData.company?.companyName || 'Unknown'}`);
        addResult('Connection Test', 'pass', {
          companyName: testData.company?.companyName,
          legalName: testData.company?.legalName,
          email: testData.company?.email
        });
      } else {
        const errorCode = testData.error?.code || 'unknown';
        const errorMsg = testData.error?.message || 'unknown';

        if (errorCode === '3100') {
          console.log('❌ Error 3100 still present - reconnection needed');
        } else {
          console.log(`❌ Test failed: ${errorMsg} (Code: ${errorCode})`);
        }

        addResult('Connection Test', 'fail', {
          error: testData.error || testData,
          needsReconnection: errorCode === '3100'
        });
      }
    } catch (error: any) {
      console.log('❌ Connection test failed:', error.message);
      addResult('Connection Test', 'fail', { error: error.message });
    }

    // ============================================
    // Test 4: Sync Customers Endpoint
    // ============================================
    console.log('\n🔍 Test 4: Sync Customers');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/customers`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`✅ Customer sync working (${syncData.count || 0} customers)`);
        addResult('Sync Customers', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0,
          skipped: syncData.skipped || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        if (error.includes('3100')) {
          console.log('❌ Error 3100 - reconnection needed');
        } else {
          console.log(`❌ Sync failed: ${error}`);
        }
        addResult('Sync Customers', 'fail', {
          error,
          needsReconnection: error.includes('3100')
        });
      }
    } catch (error: any) {
      console.log('❌ Sync customers failed:', error.message);
      addResult('Sync Customers', 'fail', { error: error.message });
    }

    // ============================================
    // Test 5: Sync Invoices Endpoint
    // ============================================
    console.log('\n🔍 Test 5: Sync Invoices');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/invoices`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`✅ Invoice sync working (${syncData.count || 0} invoices)`);
        addResult('Sync Invoices', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        console.log(`❌ Sync failed: ${error}`);
        addResult('Sync Invoices', 'fail', {
          error,
          needsReconnection: error.includes('3100')
        });
      }
    } catch (error: any) {
      console.log('❌ Sync invoices failed:', error.message);
      addResult('Sync Invoices', 'fail', { error: error.message });
    }

    // ============================================
    // Test 6: Sync Payments Endpoint
    // ============================================
    console.log('\n🔍 Test 6: Sync Payments');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/payments`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`✅ Payment sync working (${syncData.count || 0} payments)`);
        addResult('Sync Payments', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        console.log(`❌ Sync failed: ${error}`);
        addResult('Sync Payments', 'fail', {
          error,
          needsReconnection: error.includes('3100')
        });
      }
    } catch (error: any) {
      console.log('❌ Sync payments failed:', error.message);
      addResult('Sync Payments', 'fail', { error: error.message });
    }

    // ============================================
    // Test 7: Admin QuickBooks Page
    // ============================================
    console.log('\n🔍 Test 7: /admin/quickbooks Page');
    try {
      const response = await page.goto(`${BASE_URL}/admin/quickbooks`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      if (response && response.ok()) {
        console.log('✅ Page loaded successfully');

        // Take screenshot
        await page.screenshot({
          path: 'test-artifacts/qb-fix-verification/admin-quickbooks-page.png',
          fullPage: true
        });

        // Check for key elements
        const hasConnectButton = await page.locator('text=/Connect.*QuickBooks/i').isVisible({ timeout: 2000 }).catch(() => false);
        const hasDisconnectButton = await page.locator('text=/Disconnect/i').isVisible({ timeout: 2000 }).catch(() => false);
        const hasStatusSection = await page.locator('text=/Status|Connection/i').isVisible({ timeout: 2000 }).catch(() => false);

        addResult('Admin QuickBooks Page', 'pass', {
          pageLoaded: true,
          hasConnectButton,
          hasDisconnectButton,
          hasStatusSection,
          screenshot: 'test-artifacts/qb-fix-verification/admin-quickbooks-page.png'
        });
      } else {
        console.log('❌ Page returned error status');
        addResult('Admin QuickBooks Page', 'fail', {
          status: response?.status(),
          statusText: response?.statusText()
        });
      }
    } catch (error: any) {
      console.log('❌ Page load failed:', error.message);
      addResult('Admin QuickBooks Page', 'fail', { error: error.message });
    }

    // ============================================
    // Test 8: Dashboard Widget
    // ============================================
    console.log('\n🔍 Test 8: Dashboard QuickBooks Widget');
    try {
      await page.goto(`${BASE_URL}/admin/dashboard`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      const qbWidget = page.locator('text=/QuickBooks/i').first();
      const hasWidget = await qbWidget.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasWidget) {
        console.log('✅ QuickBooks widget found on dashboard');

        // Take screenshot of widget area
        await page.screenshot({
          path: 'test-artifacts/qb-fix-verification/dashboard-widget.png',
          fullPage: true
        });

        addResult('Dashboard Widget', 'pass', {
          widgetVisible: true,
          screenshot: 'test-artifacts/qb-fix-verification/dashboard-widget.png'
        });
      } else {
        console.log('⚠️  QuickBooks widget not found');
        addResult('Dashboard Widget', 'fail', {
          widgetVisible: false
        });
      }
    } catch (error: any) {
      console.log('❌ Dashboard check failed:', error.message);
      addResult('Dashboard Widget', 'fail', { error: error.message });
    }

    // ============================================
    // Generate Summary Report
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed} ✅`);
    console.log(`Failed: ${results.summary.failed} ❌`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    // Determine overall status
    const oauthScopesOk = results.tests.find(t => t.name === 'OAuth URL Scopes')?.status === 'pass';
    const connectionTestPassed = results.tests.find(t => t.name === 'Connection Test')?.status === 'pass';
    const syncsPassed = results.tests.filter(t => t.name.startsWith('Sync')).every(t => t.status === 'pass');

    console.log('\n📋 DIAGNOSTIC:');
    console.log(`   OAuth Scopes: ${oauthScopesOk ? '✅' : '❌'} ${oauthScopesOk ? 'Updated' : 'Not deployed yet'}`);
    console.log(`   Connection: ${connectionTestPassed ? '✅' : '⚠️'} ${connectionTestPassed ? 'Working' : 'Needs reconnection'}`);
    console.log(`   Sync Operations: ${syncsPassed ? '✅' : '❌'} ${syncsPassed ? 'All working' : 'Need reconnection'}`);

    if (oauthScopesOk && !connectionTestPassed) {
      console.log('\n🎯 NEXT ACTION: Reconnect QuickBooks with new scopes');
      console.log('   1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('   2. Click "Disconnect"');
      console.log('   3. Click "Connect to QuickBooks"');
      console.log('   4. Authorize with NEW scopes');
    } else if (!oauthScopesOk) {
      console.log('\n⏳ DEPLOYMENT IN PROGRESS: Wait 1-2 minutes for Vercel deployment');
    } else if (connectionTestPassed && syncsPassed) {
      console.log('\n🎉 SUCCESS! Everything is working perfectly!');
    }

    // Save JSON report
    const fs = require('fs');
    const path = require('path');
    const artifactsDir = path.join(process.cwd(), 'test-artifacts', 'qb-fix-verification');

    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(artifactsDir, 'verification-report.json'),
      JSON.stringify(results, null, 2)
    );

    // Generate HTML report
    const htmlReport = generateHTMLReport(results);
    fs.writeFileSync(
      path.join(artifactsDir, 'verification-report.html'),
      htmlReport
    );

    console.log('\n📁 Reports saved:');
    console.log('   - test-artifacts/qb-fix-verification/verification-report.json');
    console.log('   - test-artifacts/qb-fix-verification/verification-report.html');
    console.log('   - test-artifacts/qb-fix-verification/*.png (screenshots)');

    // Assert that critical tests passed
    expect(oauthScopesOk, 'OAuth scopes should be updated').toBe(true);
  });
});

function generateHTMLReport(results: any): string {
  const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
  const statusColor = results.summary.passed === results.summary.total ? '#10b981' :
                      results.summary.passed > results.summary.failed ? '#f59e0b' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickBooks Fix Verification Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #94a3b8; margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid ${statusColor}; }
    .stat-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
    .stat-label { color: #94a3b8; font-size: 0.9rem; }
    .section { background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
    .section h2 { font-size: 1.5rem; margin-bottom: 20px; color: #f1f5f9; }
    .test-list { list-style: none; }
    .test-item { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #10b981; }
    .test-item.fail { border-left-color: #ef4444; }
    .test-name { font-weight: 600; color: #f1f5f9; margin-bottom: 5px; }
    .test-details { color: #cbd5e1; font-size: 0.9rem; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-right: 8px; }
    .badge.pass { background: #065f46; color: #a7f3d0; }
    .badge.fail { background: #991b1b; color: #fecaca; }
    pre { background: #0f172a; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; margin-top: 8px; }
    .action-box { background: #1e3a5f; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .action-box h3 { color: #60a5fa; margin-bottom: 10px; }
    .action-box ol { margin-left: 20px; color: #cbd5e1; }
    .action-box li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 QuickBooks Fix Verification</h1>
    <div class="meta">
      Generated: ${new Date(results.timestamp).toLocaleString('fr-CA')}<br>
      Base URL: <code>https://admin.solutionargentrapide.ca</code>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${results.summary.total}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${results.summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${results.summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${successRate}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>

    <div class="section">
      <h2>📋 Test Results</h2>
      <ul class="test-list">
        ${results.tests.map((test: any) => `
          <li class="test-item ${test.status}">
            <div class="test-name">
              <span class="badge ${test.status}">${test.status.toUpperCase()}</span>
              ${test.name}
            </div>
            <div class="test-details">
              <pre>${JSON.stringify(test.details, null, 2)}</pre>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    ${results.summary.failed > 0 ? `
    <div class="action-box">
      <h3>🎯 Action Requise</h3>
      <p>Des tests ont échoué. Voici les étapes à suivre:</p>
      <ol>
        <li>Aller sur: <a href="https://admin.solutionargentrapide.ca/admin/quickbooks" style="color: #60a5fa;">https://admin.solutionargentrapide.ca/admin/quickbooks</a></li>
        <li>Cliquer sur "Disconnect QuickBooks"</li>
        <li>Cliquer sur "Connect to QuickBooks"</li>
        <li>Autoriser avec les NOUVEAUX scopes (openid, profile, email)</li>
        <li>Relancer ce test pour vérifier</li>
      </ol>
    </div>
    ` : `
    <div class="action-box" style="background: #1e3a2f; border-color: #10b981;">
      <h3 style="color: #4ade80;">🎉 Succès!</h3>
      <p style="color: #cbd5e1;">Tous les tests sont passés. QuickBooks est 100% opérationnel!</p>
    </div>
    `}

  </div>
</body>
</html>`;
}
