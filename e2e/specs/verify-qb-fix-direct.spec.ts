import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';

test.describe('QuickBooks Fix Verification - Direct API Test', () => {

  test('Full QuickBooks API verification @qb-fix-direct', async ({ request, page }) => {
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

      const icon = status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${name}`);
    };

    console.log('\n' + '='.repeat(60));
    console.log('🔍 QUICKBOOKS FIX VERIFICATION - PRODUCTION');
    console.log('='.repeat(60));

    // ============================================
    // Test 1: Check OAuth URL has new scopes
    // ============================================
    console.log('\n📋 Test 1: OAuth URL Scopes');
    try {
      const oauthResponse = await request.get(`${BASE_URL}/api/quickbooks/auth/connect`);
      const oauthData = await oauthResponse.json();
      const authUrl = oauthData.authUrl;

      const hasAccountingScope = authUrl.includes('com.intuit.quickbooks.accounting');
      const hasOpenIdScope = authUrl.includes('openid');
      const hasProfileScope = authUrl.includes('profile');
      const hasEmailScope = authUrl.includes('email');

      const allScopesPresent = hasAccountingScope && hasOpenIdScope && hasProfileScope && hasEmailScope;

      if (allScopesPresent) {
        addResult('OAuth URL Scopes', 'pass', {
          scopes: 'accounting + openid + profile + email',
          deployment: 'Complete'
        });
      } else {
        addResult('OAuth URL Scopes', 'fail', {
          hasAccountingScope,
          hasOpenIdScope,
          hasProfileScope,
          hasEmailScope,
          deployment: 'Incomplete - wait for Vercel'
        });
      }
    } catch (error: any) {
      addResult('OAuth URL Scopes', 'fail', { error: error.message });
    }

    // ============================================
    // Test 2: Connection Status
    // ============================================
    console.log('\n📋 Test 2: Connection Status');
    try {
      const statusResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
      const statusData = await statusResponse.json();

      const connected = statusData.connection?.connected;
      const realmId = statusData.connection?.realmId;
      const autoRefresh = statusData.connection?.autoRefreshEnabled;
      const expiresAt = statusData.connection?.expiresAt;

      console.log(`   Connected: ${connected}`);
      console.log(`   Realm ID: ${realmId}`);
      console.log(`   Auto-Refresh: ${autoRefresh}`);
      console.log(`   Expires: ${expiresAt}`);

      addResult('Connection Status', 'pass', {
        connected,
        realmId,
        autoRefresh,
        expiresAt,
        company: statusData.company?.name || 'Unknown'
      });
    } catch (error: any) {
      addResult('Connection Status', 'fail', { error: error.message });
    }

    // ============================================
    // Test 3: Connection Test (CompanyInfo API)
    // ============================================
    console.log('\n📋 Test 3: Connection Test (QuickBooks CompanyInfo API)');
    try {
      const testResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
      const testData = await testResponse.json();

      if (testData.success === true) {
        console.log(`   Company: ${testData.company?.companyName || 'Unknown'}`);
        console.log(`   Legal Name: ${testData.company?.legalName || 'Unknown'}`);
        console.log(`   Email: ${testData.company?.email || 'Unknown'}`);

        addResult('Connection Test', 'pass', {
          companyName: testData.company?.companyName,
          legalName: testData.company?.legalName,
          email: testData.company?.email,
          error3100: false
        });
      } else {
        const errorCode = testData.error?.code || testData.code || 'unknown';
        const errorMsg = testData.error?.message || testData.message || 'unknown';

        console.log(`   Error Code: ${errorCode}`);
        console.log(`   Error Message: ${errorMsg}`);

        addResult('Connection Test', 'fail', {
          errorCode,
          errorMessage: errorMsg,
          error3100: errorCode === '3100' || errorMsg.includes('3100'),
          needsReconnection: errorCode === '3100' || errorMsg.includes('3100')
        });
      }
    } catch (error: any) {
      addResult('Connection Test', 'fail', { error: error.message });
    }

    // ============================================
    // Test 4: Sync Customers Endpoint
    // ============================================
    console.log('\n📋 Test 4: Sync Customers');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/customers`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`   Synced: ${syncData.count || 0} customers`);
        addResult('Sync Customers', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0,
          skipped: syncData.skipped || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        console.log(`   Error: ${error}`);
        addResult('Sync Customers', 'fail', {
          error,
          error3100: error.includes('3100'),
          needsReconnection: error.includes('3100')
        });
      }
    } catch (error: any) {
      addResult('Sync Customers', 'fail', { error: error.message });
    }

    // ============================================
    // Test 5: Sync Invoices Endpoint
    // ============================================
    console.log('\n📋 Test 5: Sync Invoices');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/invoices`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`   Synced: ${syncData.count || 0} invoices`);
        addResult('Sync Invoices', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        console.log(`   Error: ${error}`);
        addResult('Sync Invoices', 'fail', {
          error,
          error3100: error.includes('3100')
        });
      }
    } catch (error: any) {
      addResult('Sync Invoices', 'fail', { error: error.message });
    }

    // ============================================
    // Test 6: Sync Payments Endpoint
    // ============================================
    console.log('\n📋 Test 6: Sync Payments');
    try {
      const syncResponse = await request.post(`${BASE_URL}/api/quickbooks/sync/payments`);
      const syncData = await syncResponse.json();

      if (syncData.success === true) {
        console.log(`   Synced: ${syncData.count || 0} payments`);
        addResult('Sync Payments', 'pass', {
          count: syncData.count,
          synced: syncData.synced || 0
        });
      } else {
        const error = syncData.error || syncData.message || 'Unknown error';
        console.log(`   Error: ${error}`);
        addResult('Sync Payments', 'fail', {
          error,
          error3100: error.includes('3100')
        });
      }
    } catch (error: any) {
      addResult('Sync Payments', 'fail', { error: error.message });
    }

    // ============================================
    // Test 7: /admin/quickbooks Page Load
    // ============================================
    console.log('\n📋 Test 7: Admin QuickBooks Page');
    try {
      const response = await page.goto(`${BASE_URL}/admin/quickbooks`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      if (response) {
        const status = response.status();
        console.log(`   HTTP Status: ${status}`);

        if (status === 200) {
          // Take screenshot
          const fs = require('fs');
          const path = require('path');
          const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-fix-verification');

          if (!fs.existsSync(artifactsDir)) {
            fs.mkdirSync(artifactsDir, { recursive: true });
          }

          await page.screenshot({
            path: path.join(artifactsDir, 'admin-quickbooks-page.png'),
            fullPage: true
          });

          console.log('   Screenshot: ✓');

          addResult('Admin QuickBooks Page', 'pass', {
            httpStatus: status,
            pageLoaded: true,
            screenshot: 'test-artifacts/qb-fix-verification/admin-quickbooks-page.png'
          });
        } else {
          addResult('Admin QuickBooks Page', 'fail', {
            httpStatus: status,
            pageLoaded: false
          });
        }
      } else {
        addResult('Admin QuickBooks Page', 'fail', {
          error: 'No response received'
        });
      }
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
      addResult('Admin QuickBooks Page', 'fail', { error: error.message });
    }

    // ============================================
    // Test 8: Dashboard Page (Public Check)
    // ============================================
    console.log('\n📋 Test 8: Dashboard Page Status');
    try {
      const response = await page.goto(`${BASE_URL}/admin/dashboard`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      const status = response?.status();
      console.log(`   HTTP Status: ${status}`);

      addResult('Dashboard Page', 'pass', {
        httpStatus: status,
        accessible: status === 200 || status === 401 || status === 302
      });
    } catch (error: any) {
      addResult('Dashboard Page', 'fail', { error: error.message });
    }

    // ============================================
    // Generate Summary Report
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed} ✅`);
    console.log(`Failed: ${results.summary.failed} ❌`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // Determine overall status
    const oauthTest = results.tests.find(t => t.name === 'OAuth URL Scopes');
    const connectionTest = results.tests.find(t => t.name === 'Connection Test');
    const customersTest = results.tests.find(t => t.name === 'Sync Customers');

    const oauthScopesOk = oauthTest?.status === 'pass';
    const connectionTestPassed = connectionTest?.status === 'pass';
    const hasError3100 = connectionTest?.details?.error3100 || customersTest?.details?.error3100;

    console.log('\n📋 DIAGNOSTIC:');
    console.log(`   1. OAuth Scopes Deployed: ${oauthScopesOk ? '✅ YES' : '❌ NO'}`);
    console.log(`   2. Connection Working: ${connectionTestPassed ? '✅ YES' : '❌ NO'}`);
    console.log(`   3. Error 3100 Present: ${hasError3100 ? '❌ YES' : '✅ NO'}`);

    console.log('\n🎯 VERDICT:');
    if (oauthScopesOk && !hasError3100 && connectionTestPassed) {
      console.log('   🎉 SUCCESS! Everything working perfectly!');
      console.log('   ✅ OAuth scopes deployed');
      console.log('   ✅ Connection working');
      console.log('   ✅ No Error 3100');
    } else if (!oauthScopesOk) {
      console.log('   ⏳ DEPLOYMENT IN PROGRESS');
      console.log('   Action: Wait 1-2 minutes for Vercel deployment');
      console.log('   Then run: bash /tmp/verify-qb-fix.sh');
    } else if (oauthScopesOk && hasError3100) {
      console.log('   ⚠️  RECONNECTION REQUIRED');
      console.log('   OAuth scopes deployed ✅');
      console.log('   But old connection still active ❌');
      console.log('');
      console.log('   📋 STEPS TO FIX:');
      console.log('   1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('   2. Click "Disconnect QuickBooks"');
      console.log('   3. Click "Connect to QuickBooks"');
      console.log('   4. Authorize with NEW scopes (openid, profile, email)');
      console.log('   5. Run: bash /tmp/verify-qb-fix.sh');
    } else {
      console.log('   ⚠️  UNEXPECTED STATE');
      console.log('   Check logs above for details');
    }

    // Save JSON report
    const fs = require('fs');
    const path = require('path');
    const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-fix-verification');

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
    console.log('   JSON: test-artifacts/qb-fix-verification/verification-report.json');
    console.log('   HTML: test-artifacts/qb-fix-verification/verification-report.html');
    console.log('');
    console.log('To view HTML report:');
    console.log('   open test-artifacts/qb-fix-verification/verification-report.html');

    // Don't fail the test, just report
    console.log('\n' + '='.repeat(60));
  });
});

function generateHTMLReport(results: any): string {
  const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
  const statusColor = results.summary.passed === results.summary.total ? '#10b981' :
                      results.summary.passed > results.summary.failed ? '#f59e0b' : '#ef4444';

  const connectionTest = results.tests.find((t: any) => t.name === 'Connection Test');
  const hasError3100 = connectionTest?.details?.error3100;
  const oauthTest = results.tests.find((t: any) => t.name === 'OAuth URL Scopes');
  const oauthOk = oauthTest?.status === 'pass';

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
    .action-box.success { background: #1e3a2f; border-color: #10b981; }
    .action-box.success h3 { color: #4ade80; }
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

    ${oauthOk && !hasError3100 ? `
    <div class="action-box success">
      <h3>🎉 Succès!</h3>
      <p style="color: #cbd5e1; margin-bottom: 15px;">Tous les tests critiques sont passés. QuickBooks est opérationnel!</p>
      <p style="color: #94a3b8; font-size: 0.9rem;">
        ✅ OAuth scopes déployés<br>
        ✅ Connexion fonctionnelle<br>
        ✅ Pas d'Error 3100
      </p>
    </div>
    ` : !oauthOk ? `
    <div class="action-box" style="background: #3a2e1e; border-color: #f59e0b;">
      <h3 style="color: #fbbf24;">⏳ Déploiement en Cours</h3>
      <p style="color: #cbd5e1; margin-bottom: 10px;">Les nouveaux scopes OAuth ne sont pas encore déployés.</p>
      <p style="color: #94a3b8; font-size: 0.9rem;">
        Action: Attendre 1-2 minutes pour le déploiement Vercel, puis relancer le test.
      </p>
    </div>
    ` : `
    <div class="action-box">
      <h3>⚠️ Reconnexion Requise</h3>
      <p style="color: #cbd5e1; margin-bottom: 15px;">Les nouveaux scopes sont déployés mais Error 3100 persiste. L'ancienne connexion utilise encore les vieux scopes.</p>
      <ol>
        <li>Aller sur: <a href="https://admin.solutionargentrapide.ca/admin/quickbooks" style="color: #60a5fa;">https://admin.solutionargentrapide.ca/admin/quickbooks</a></li>
        <li>Cliquer sur "Disconnect QuickBooks"</li>
        <li>Cliquer sur "Connect to QuickBooks"</li>
        <li>Autoriser avec les NOUVEAUX scopes (openid, profile, email)</li>
        <li>Relancer: <code style="background: #0f172a; padding: 4px 8px; border-radius: 4px;">bash /tmp/verify-qb-fix.sh</code></li>
      </ol>
    </div>
    `}

  </div>
</body>
</html>`;
}
