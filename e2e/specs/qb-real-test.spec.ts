import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test.describe('QuickBooks - Real Test with Login', () => {

  test.use({ storageState: { cookies: [], origins: [] } }); // Start fresh

  test('Complete QuickBooks test with real login @qb-real', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('🔥 QUICKBOOKS - TEST RÉEL AVEC LOGIN');
    console.log('='.repeat(70));

    // Step 1: Login to admin
    console.log('\n1️⃣  Logging in to admin...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Enter password
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    console.log('   Password entered');

    // Click login button
    await page.click('button:has-text("Se connecter")');
    console.log('   Clicked login button');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
    console.log('   ✅ Logged in successfully!');

    // Take screenshot of dashboard
    await page.screenshot({
      path: '../test-artifacts/qb-real/01-dashboard.png',
      fullPage: true
    });
    console.log('   📸 Dashboard screenshot saved');

    // Step 2: Navigate to QuickBooks page
    console.log('\n2️⃣  Navigating to QuickBooks page...');
    await page.goto(`${BASE_URL}/admin/quickbooks`, { waitUntil: 'networkidle' });
    console.log('   ✅ On QuickBooks page');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: '../test-artifacts/qb-real/02-qb-page-initial.png',
      fullPage: true
    });
    console.log('   📸 Initial QuickBooks page screenshot');

    // Step 3: Check what's on the page
    console.log('\n3️⃣  Analyzing page content...');

    const pageContent = await page.content();

    // Check for buttons
    const hasDisconnectButton = await page.locator('button:has-text("Disconnect")').count() > 0;
    const hasTestButton = await page.locator('button:has-text("Test Connection")').count() > 0;
    const hasRefreshButton = await page.locator('button:has-text("Refresh Tokens")').count() > 0;
    const hasConnectButton = await page.locator('button:has-text("Connect to QuickBooks")').count() > 0;

    console.log(`   Disconnect button: ${hasDisconnectButton ? '✅' : '❌'}`);
    console.log(`   Test Connection button: ${hasTestButton ? '✅' : '❌'}`);
    console.log(`   Refresh Tokens button: ${hasRefreshButton ? '✅' : '❌'}`);
    console.log(`   Connect button: ${hasConnectButton ? '✅' : '❌'}`);

    // Check for status text
    const hasConnected = pageContent.includes('Connected') || pageContent.includes('connected');
    const hasRealmId = pageContent.includes('9341454351188646');
    const hasAutoRefresh = pageContent.includes('Auto-Refresh');

    console.log(`   Shows "Connected": ${hasConnected ? '✅' : '❌'}`);
    console.log(`   Shows Realm ID: ${hasRealmId ? '✅' : '❌'}`);
    console.log(`   Shows Auto-Refresh: ${hasAutoRefresh ? '✅' : '❌'}`);

    // Step 4: Try Test Connection button if it exists
    if (hasTestButton) {
      console.log('\n4️⃣  Testing connection...');

      // Listen for API response
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/quickbooks/connection/test'),
        { timeout: 10000 }
      );

      // Click Test Connection
      await page.click('button:has-text("Test Connection")');
      console.log('   Clicked "Test Connection" button');

      try {
        const response = await responsePromise;
        const responseData = await response.json();

        console.log(`   Response Status: ${response.status()}`);
        console.log(`   Response Data:`, JSON.stringify(responseData, null, 2));

        if (response.status() === 200 && responseData.success) {
          console.log('   ✅ Connection test PASSED!');
          console.log(`   Company: ${responseData.company?.companyName || 'Unknown'}`);
        } else {
          console.log('   ❌ Connection test FAILED');
          console.log(`   Error: ${responseData.error || 'Unknown'}`);
        }

        // Wait for UI to update
        await page.waitForTimeout(2000);

        // Check for success/error message
        const successMessage = await page.locator('.bg-green-100').count();
        const errorMessage = await page.locator('.bg-red-100').count();

        if (successMessage > 0) {
          const msgText = await page.locator('.bg-green-100').first().textContent();
          console.log(`   ✅ Success message: "${msgText}"`);
        } else if (errorMessage > 0) {
          const msgText = await page.locator('.bg-red-100').first().textContent();
          console.log(`   ❌ Error message: "${msgText}"`);
        }

        // Screenshot after test
        await page.screenshot({
          path: '../test-artifacts/qb-real/03-after-test.png',
          fullPage: true
        });
        console.log('   📸 Screenshot after test');

      } catch (error: any) {
        console.log(`   ❌ Error during test: ${error.message}`);
      }
    }

    // Step 5: Try Refresh Tokens button if it exists
    if (hasRefreshButton) {
      console.log('\n5️⃣  Refreshing tokens...');

      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/quickbooks/connection/refresh'),
        { timeout: 10000 }
      );

      await page.click('button:has-text("Refresh Tokens")');
      console.log('   Clicked "Refresh Tokens" button');

      try {
        const response = await responsePromise;
        const responseData = await response.json();

        console.log(`   Response Status: ${response.status()}`);

        if (responseData.success) {
          console.log('   ✅ Tokens refreshed successfully!');
        } else {
          console.log('   ❌ Token refresh failed');
        }

        await page.waitForTimeout(2000);

        // Screenshot after refresh
        await page.screenshot({
          path: '../test-artifacts/qb-real/04-after-refresh.png',
          fullPage: true
        });
        console.log('   📸 Screenshot after refresh');

      } catch (error: any) {
        console.log(`   ❌ Error during refresh: ${error.message}`);
      }
    }

    // Step 6: Check if we need to reconnect
    console.log('\n6️⃣  Checking if reconnection is needed...');

    // If we saw an error, we need to reconnect
    const errorMessage = await page.locator('.bg-red-100').count();

    if (errorMessage > 0 && hasDisconnectButton) {
      console.log('   ⚠️  Error detected - need to reconnect');
      console.log('\n   RECONNECTION STEPS:');
      console.log('   1. I will click Disconnect');
      console.log('   2. Then click Connect to QuickBooks');
      console.log('   3. You\'ll need to authorize on Intuit page (new window)');
      console.log('   4. After authorization, come back and I\'ll verify');

      console.log('\n7️⃣  Disconnecting...');

      // Click Disconnect
      page.once('dialog', async dialog => {
        console.log(`   Confirmation dialog: "${dialog.message()}"`);
        await dialog.accept();
        console.log('   Accepted disconnect confirmation');
      });

      await page.click('button:has-text("Disconnect")');
      console.log('   Clicked "Disconnect" button');

      // Wait for disconnect to complete
      await page.waitForTimeout(3000);

      // Screenshot after disconnect
      await page.screenshot({
        path: '../test-artifacts/qb-real/05-after-disconnect.png',
        fullPage: true
      });
      console.log('   📸 Screenshot after disconnect');

      // Check if Connect button now appears
      const connectButtonNow = await page.locator('button:has-text("Connect to QuickBooks")').count() > 0;

      if (connectButtonNow) {
        console.log('   ✅ Disconnected successfully - Connect button now visible');

        console.log('\n8️⃣  Getting OAuth URL for reconnection...');

        // Get the OAuth URL
        const connectButton = page.locator('button:has-text("Connect to QuickBooks")').first();

        // Click Connect button (this will redirect to Intuit)
        console.log('   Clicking "Connect to QuickBooks"...');
        console.log('   ⚠️  This will open Intuit OAuth page');

        await page.screenshot({
          path: '../test-artifacts/qb-real/06-before-connect.png',
          fullPage: true
        });

        // Don't actually click - just show the URL
        console.log('\n   📋 MANUAL STEP REQUIRED:');
        console.log('   1. Go to the QuickBooks page in your browser');
        console.log('   2. Click "Connect to QuickBooks"');
        console.log('   3. You\'ll be redirected to Intuit');
        console.log('   4. Authorize with the NEW scopes (openid, profile, email)');
        console.log('   5. You\'ll be redirected back');
        console.log('   6. Run this test again to verify!');

      } else {
        console.log('   ❌ Disconnect may have failed - Connect button not visible');
      }

    } else {
      console.log('   ✅ No errors detected or already disconnected');
    }

    // Final screenshot
    await page.screenshot({
      path: '../test-artifacts/qb-real/99-final-state.png',
      fullPage: true
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETED');
    console.log('='.repeat(70));
    console.log('\nScreenshots saved in: test-artifacts/qb-real/');
    console.log('');
  });
});
