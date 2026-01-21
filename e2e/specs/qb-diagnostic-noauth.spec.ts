import { test } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';

test.describe('QuickBooks Diagnostic (No Auth)', () => {

  test.use({ storageState: { cookies: [], origins: [] } }); // No auth

  test('Complete QuickBooks diagnostic @qb-diagnostic', async ({ request, page, browser }) => {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 DIAGNOSTIC QUICKBOOKS - COMPLET');
    console.log('='.repeat(70));

    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Test 1: Connection Status API
    console.log('\n📋 Test 1: Connection Status API');
    try {
      const response = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
      const data = await response.json();

      console.log(`   Status: ${response.status()}`);
      console.log(`   Connected: ${data.connection?.connected}`);
      console.log(`   Realm ID: ${data.connection?.realmId}`);
      console.log(`   Auto-Refresh: ${data.connection?.autoRefreshEnabled}`);

      results.tests.push({
        name: 'Connection Status API',
        status: response.ok() ? 'pass' : 'fail',
        data
      });

      if (!data.connection?.connected) {
        results.issues.push('QuickBooks not connected');
        results.recommendations.push('Connect via /admin/quickbooks page');
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.tests.push({
        name: 'Connection Status API',
        status: 'error',
        error: error.message
      });
    }

    // Test 2: Connection Test API (the failing one)
    console.log('\n📋 Test 2: Connection Test API (CompanyInfo)');
    try {
      const response = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
      const data = await response.json();

      console.log(`   Status: ${response.status()}`);

      if (response.status() === 401) {
        console.log('   ❌ 401 Unauthorized - QuickBooks auth issue');
        results.issues.push('401 Unauthorized on connection test');
        results.issues.push('Likely Error 3100 (OAuth scopes issue)');
        results.recommendations.push('Disconnect and reconnect with new OAuth scopes');
      } else if (response.status() === 200) {
        if (data.success) {
          console.log(`   ✅ Success! Company: ${data.company?.companyName}`);
        } else {
          console.log(`   ❌ Failed: ${data.error}`);
          results.issues.push(`Connection test failed: ${data.error}`);
        }
      }

      results.tests.push({
        name: 'Connection Test API',
        status: response.status() === 200 && data.success ? 'pass' : 'fail',
        httpStatus: response.status(),
        data
      });
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.tests.push({
        name: 'Connection Test API',
        status: 'error',
        error: error.message
      });
    }

    // Test 3: Try to refresh tokens
    console.log('\n📋 Test 3: Token Refresh API');
    try {
      const response = await request.post(`${BASE_URL}/api/quickbooks/connection/refresh`);
      const data = await response.json();

      console.log(`   Status: ${response.status()}`);
      console.log(`   Success: ${data.success}`);

      if (data.success) {
        console.log(`   ✅ Tokens refreshed`);
      } else {
        console.log(`   ❌ Refresh failed: ${data.error}`);
      }

      results.tests.push({
        name: 'Token Refresh',
        status: data.success ? 'pass' : 'fail',
        data
      });
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Check OAuth URL has new scopes
    console.log('\n📋 Test 4: OAuth URL Scopes');
    try {
      const response = await request.get(`${BASE_URL}/api/quickbooks/auth/connect`);
      const data = await response.json();

      const authUrl = data.authUrl || '';
      const hasOpenId = authUrl.includes('openid');
      const hasProfile = authUrl.includes('profile');
      const hasEmail = authUrl.includes('email');

      console.log(`   OpenID scope: ${hasOpenId ? '✅' : '❌'}`);
      console.log(`   Profile scope: ${hasProfile ? '✅' : '❌'}`);
      console.log(`   Email scope: ${hasEmail ? '✅' : '❌'}`);

      const allScopesPresent = hasOpenId && hasProfile && hasEmail;

      if (!allScopesPresent) {
        results.issues.push('New OAuth scopes not deployed yet');
        results.recommendations.push('Wait for Vercel deployment to complete');
      } else {
        console.log('   ✅ All new scopes present');
      }

      results.tests.push({
        name: 'OAuth Scopes',
        status: allScopesPresent ? 'pass' : 'fail',
        scopes: { hasOpenId, hasProfile, hasEmail }
      });
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Screenshot the admin page
    console.log('\n📋 Test 5: Admin Page Screenshot');
    try {
      // Create new context without auth
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 }
      });
      const newPage = await context.newPage();

      const response = await newPage.goto(`${BASE_URL}/admin/quickbooks`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      console.log(`   HTTP Status: ${response?.status()}`);

      await newPage.waitForTimeout(2000);

      // Take screenshot
      const fs = require('fs');
      const path = require('path');
      const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-diagnostic');

      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }

      const screenshotPath = path.join(artifactsDir, `qb-page-${Date.now()}.png`);
      await newPage.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      console.log(`   📸 Screenshot: ${screenshotPath}`);

      // Check page content
      const content = await newPage.content();
      const hasDisconnect = content.includes('Disconnect') || content.includes('disconnect');
      const hasConnect = content.includes('Connect to QuickBooks') || content.includes('Connect');
      const hasTest = content.includes('Test Connection') || content.includes('Test');

      console.log(`   Disconnect button: ${hasDisconnect ? '✅' : '❌'}`);
      console.log(`   Connect button: ${hasConnect ? '✅' : '❌'}`);
      console.log(`   Test button: ${hasTest ? '✅' : '❌'}`);

      if (!hasDisconnect && !hasConnect) {
        results.issues.push('Admin page missing buttons - old version deployed');
        results.recommendations.push('Wait for new page deployment');
      }

      results.tests.push({
        name: 'Admin Page',
        status: (hasDisconnect || hasConnect) ? 'pass' : 'fail',
        screenshot: screenshotPath,
        elements: { hasDisconnect, hasConnect, hasTest }
      });

      await context.close();
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.tests.push({
        name: 'Admin Page',
        status: 'error',
        error: error.message
      });
    }

    // Generate summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));

    const passedTests = results.tests.filter(t => t.status === 'pass').length;
    const totalTests = results.tests.length;

    console.log(`\nTests: ${passedTests}/${totalTests} passed`);

    if (results.issues.length > 0) {
      console.log('\n🔴 ISSUES FOUND:');
      results.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

    if (results.recommendations.length > 0) {
      console.log('\n🎯 RECOMMENDATIONS:');
      results.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    // Generate action plan
    console.log('\n' + '='.repeat(70));
    console.log('🎬 ACTION PLAN');
    console.log('='.repeat(70));

    const hasAuthIssue = results.issues.some(i => i.includes('401') || i.includes('3100'));
    const hasScopesDeployed = results.tests.find(t => t.name === 'OAuth Scopes')?.status === 'pass';

    if (hasAuthIssue && hasScopesDeployed) {
      console.log('\n✅ OAuth scopes are deployed');
      console.log('❌ But connection has auth issue (401/Error 3100)');
      console.log('\n📋 FIX STEPS:');
      console.log('  1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('  2. Click "Disconnect" button');
      console.log('  3. Click "Connect to QuickBooks" button');
      console.log('  4. On Intuit page, authorize with NEW scopes:');
      console.log('     - QuickBooks Accounting ✅');
      console.log('     - OpenID (NEW) ✅');
      console.log('     - Profile (NEW) ✅');
      console.log('     - Email (NEW) ✅');
      console.log('  5. After redirect back, test again');
      console.log('\nEstimated time: 2 minutes');
    } else if (!hasScopesDeployed) {
      console.log('\n⏳ Deployment still in progress');
      console.log('   Wait 1-2 minutes for Vercel to complete deployment');
      console.log('   Then run this test again');
    } else {
      console.log('\n✅ Everything looks good!');
    }

    // Save report
    const fs = require('fs');
    const path = require('path');
    const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-diagnostic');

    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const reportPath = path.join(artifactsDir, 'diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\n📄 Report saved: ${reportPath}`);
    console.log('='.repeat(70));
    console.log('');
  });
});
