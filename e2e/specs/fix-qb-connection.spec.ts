import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';

test.describe('Fix QuickBooks Connection Issues', () => {

  test('Diagnose and fix connection issues @qb-fix', async ({ page, request }) => {
    console.log('\n🔍 DIAGNOSTIC QUICKBOOKS CONNECTION');
    console.log('='.repeat(60));

    // Step 1: Check current connection status via API
    console.log('\n1️⃣  Checking connection status...');
    const statusResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
    const statusData = await statusResponse.json();

    console.log('Status Response:', JSON.stringify(statusData, null, 2));

    const connected = statusData.connection?.connected;
    const realmId = statusData.connection?.realmId;

    if (!connected) {
      console.log('❌ QuickBooks NOT connected');
      console.log('Action: Need to connect first');
    } else {
      console.log(`✅ QuickBooks connected (Realm: ${realmId})`);
    }

    // Step 2: Test the connection API directly (the one failing with 401)
    console.log('\n2️⃣  Testing /api/quickbooks/connection/test...');
    const testResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
    const testStatus = testResponse.status();

    console.log(`Response Status: ${testStatus}`);

    if (testStatus === 401) {
      console.log('❌ 401 Unauthorized - QuickBooks not properly connected');

      // Check if we have tokens
      if (connected) {
        console.log('⚠️  Status says connected but API returns 401');
        console.log('Possible causes:');
        console.log('  - Tokens expired');
        console.log('  - Invalid tokens');
        console.log('  - Wrong realm ID');

        // Try to refresh tokens
        console.log('\n3️⃣  Attempting to refresh tokens...');
        const refreshResponse = await request.post(`${BASE_URL}/api/quickbooks/connection/refresh`);
        const refreshData = await refreshResponse.json();

        console.log('Refresh Result:', JSON.stringify(refreshData, null, 2));

        if (refreshData.success) {
          console.log('✅ Tokens refreshed!');

          // Test again
          console.log('\n4️⃣  Testing connection again after refresh...');
          const testResponse2 = await request.get(`${BASE_URL}/api/quickbooks/connection/test`);
          const testData2 = await testResponse2.json();

          console.log('Test Result:', JSON.stringify(testData2, null, 2));

          if (testData2.success) {
            console.log('✅ Connection test PASSED after refresh!');
          } else {
            console.log('❌ Still failing - need full reconnection');
          }
        } else {
          console.log('❌ Token refresh failed');
          console.log('Error:', refreshData.error);
        }
      } else {
        console.log('❌ Not connected at all - need to connect first');
      }
    } else if (testStatus === 200) {
      const testData = await testResponse.json();
      if (testData.success) {
        console.log('✅ Connection test PASSED!');
        console.log('Company:', testData.company?.companyName);
      } else {
        console.log('❌ Test failed:', testData.error);
      }
    }

    // Step 3: Try to navigate to the admin page
    console.log('\n5️⃣  Navigating to /admin/quickbooks page...');

    try {
      const response = await page.goto(`${BASE_URL}/admin/quickbooks`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      if (response) {
        console.log(`Page Status: ${response.status()}`);

        // Wait for page to load
        await page.waitForTimeout(2000);

        // Take screenshot
        const fs = require('fs');
        const path = require('path');
        const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-fix');

        if (!fs.existsSync(artifactsDir)) {
          fs.mkdirSync(artifactsDir, { recursive: true });
        }

        const screenshotPath = path.join(artifactsDir, 'qb-page-current.png');
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);

        // Check if we see the new page with buttons
        const pageContent = await page.content();

        const hasDisconnectButton = pageContent.includes('Disconnect') ||
                                     await page.locator('button:has-text("Disconnect")').count() > 0;
        const hasConnectButton = pageContent.includes('Connect to QuickBooks') ||
                                 await page.locator('button:has-text("Connect")').count() > 0;
        const hasTestButton = pageContent.includes('Test Connection') ||
                              await page.locator('button:has-text("Test")').count() > 0;

        console.log('\n📋 Page Elements Found:');
        console.log(`  Disconnect Button: ${hasDisconnectButton ? '✅' : '❌'}`);
        console.log(`  Connect Button: ${hasConnectButton ? '✅' : '❌'}`);
        console.log(`  Test Button: ${hasTestButton ? '✅' : '❌'}`);

        if (hasDisconnectButton || hasConnectButton) {
          console.log('✅ New page deployed successfully!');
        } else {
          console.log('⚠️  Old page still showing - wait for deployment');
        }

        // If we're connected but test fails, try to disconnect and reconnect
        if (connected && testStatus === 401 && hasDisconnectButton) {
          console.log('\n6️⃣  Attempting to fix via UI disconnect/reconnect...');
          console.log('⚠️  Manual action needed:');
          console.log('  1. Click "Disconnect" button on the page');
          console.log('  2. Click "Connect to QuickBooks" button');
          console.log('  3. Authorize on Intuit with new scopes');
        }
      }
    } catch (error: any) {
      console.log(`❌ Page navigation failed: ${error.message}`);
    }

    // Step 4: Generate recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 RECOMMENDATIONS:');
    console.log('='.repeat(60));

    if (!connected) {
      console.log('\n🎯 ACTION: Initial Connection Needed');
      console.log('  1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('  2. Click "Connect to QuickBooks"');
      console.log('  3. Authorize on Intuit');
    } else if (testStatus === 401) {
      console.log('\n🎯 ACTION: Reconnection Required (Error 3100/401)');
      console.log('  This is the OAuth scopes issue - tokens are invalid');
      console.log('  ');
      console.log('  Steps to fix:');
      console.log('  1. Go to: https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('  2. Click "Disconnect" button');
      console.log('  3. Confirm disconnection');
      console.log('  4. Click "Connect to QuickBooks" button');
      console.log('  5. On Intuit page, you\'ll see NEW scopes:');
      console.log('     - QuickBooks Accounting ✅');
      console.log('     - OpenID (NEW) ✅');
      console.log('     - Profile (NEW) ✅');
      console.log('     - Email (NEW) ✅');
      console.log('  6. Click "Authorize"');
      console.log('  7. You\'ll be redirected back');
      console.log('  ');
      console.log('  After this, the 401 error will be gone!');
    } else {
      console.log('\n🎉 All Good!');
      console.log('  Connection is working properly');
    }

    console.log('\n' + '='.repeat(60));

    // Save diagnostic report
    const report = {
      timestamp: new Date().toISOString(),
      status: {
        connected,
        realmId,
        testApiStatus: testStatus,
        testApiPassed: testStatus === 200
      },
      issues: [],
      recommendations: []
    };

    if (!connected) {
      report.issues.push('Not connected to QuickBooks');
      report.recommendations.push('Connect via /admin/quickbooks page');
    }

    if (testStatus === 401) {
      report.issues.push('401 Unauthorized on connection test');
      report.issues.push('Likely OAuth scopes issue (Error 3100)');
      report.recommendations.push('Disconnect and reconnect with new OAuth scopes');
    }

    const fs = require('fs');
    const path = require('path');
    const artifactsDir = path.join(process.cwd(), '../test-artifacts', 'qb-fix');

    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(artifactsDir, 'diagnostic-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Report saved: test-artifacts/qb-fix/diagnostic-report.json');
  });

  test('Try automatic reconnection via API @qb-auto-reconnect', async ({ request }) => {
    console.log('\n🔧 ATTEMPTING AUTOMATIC RECONNECTION');
    console.log('='.repeat(60));

    // Step 1: Check if connected
    console.log('\n1️⃣  Checking current status...');
    const statusResponse = await request.get(`${BASE_URL}/api/quickbooks/connection/status`);
    const statusData = await statusResponse.json();
    const connected = statusData.connection?.connected;

    if (!connected) {
      console.log('❌ Not connected - cannot auto-reconnect');
      console.log('Manual connection required via UI');
      return;
    }

    console.log('✅ Currently connected');

    // Step 2: Disconnect
    console.log('\n2️⃣  Disconnecting...');
    const disconnectResponse = await request.post(`${BASE_URL}/api/quickbooks/connection/disconnect`);
    const disconnectData = await disconnectResponse.json();

    if (disconnectData.success) {
      console.log('✅ Disconnected successfully');
    } else {
      console.log('❌ Disconnect failed:', disconnectData.error);
      return;
    }

    // Step 3: Get new OAuth URL
    console.log('\n3️⃣  Getting new OAuth URL with updated scopes...');
    const connectResponse = await request.get(`${BASE_URL}/api/quickbooks/auth/connect`);
    const connectData = await connectResponse.json();

    if (connectData.authUrl) {
      console.log('✅ OAuth URL generated');

      // Check for new scopes
      const hasNewScopes = connectData.authUrl.includes('openid') &&
                          connectData.authUrl.includes('profile') &&
                          connectData.authUrl.includes('email');

      if (hasNewScopes) {
        console.log('✅ New scopes detected in OAuth URL');
      } else {
        console.log('⚠️  New scopes not detected - deployment may not be complete');
      }

      console.log('\n🎯 MANUAL STEP REQUIRED:');
      console.log('  Open this URL in your browser to complete reconnection:');
      console.log('  ' + connectData.authUrl.substring(0, 100) + '...');
      console.log('');
      console.log('  Or simply go to:');
      console.log('  https://admin.solutionargentrapide.ca/admin/quickbooks');
      console.log('  and click "Connect to QuickBooks"');
    } else {
      console.log('❌ Failed to generate OAuth URL');
    }

    console.log('\n' + '='.repeat(60));
  });
});
