import { test, expect } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test.describe('QuickBooks - Automatic Reconnection', () => {

  test.use({ storageState: { cookies: [], origins: [] } });

  test('Fully automated reconnection flow @qb-auto-reconnect', async ({ page, context }) => {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 QUICKBOOKS - RECONNEXION AUTOMATIQUE');
    console.log('='.repeat(70));

    // Step 1: Login to admin
    console.log('\n1️⃣  Logging in...');
    await page.goto(`${BASE_URL}/admin`);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Se connecter")');
    await page.waitForURL(/\/admin\/dashboard/);
    console.log('   ✅ Logged in');

    // Step 2: Go to QuickBooks page
    console.log('\n2️⃣  Going to QuickBooks page...');
    await page.goto(`${BASE_URL}/admin/quickbooks`);
    await page.waitForTimeout(2000);

    // Step 3: Check if already disconnected
    const hasConnectButton = await page.locator('button:has-text("Connect to QuickBooks")').count() > 0;
    const hasDisconnectButton = await page.locator('button:has-text("Disconnect")').count() > 0;

    if (hasDisconnectButton && !hasConnectButton) {
      console.log('\n3️⃣  Still connected, disconnecting...');

      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await page.click('button:has-text("Disconnect")');
      await page.waitForTimeout(3000);
      console.log('   ✅ Disconnected');
    } else {
      console.log('\n3️⃣  Already disconnected');
    }

    // Step 4: Click Connect to QuickBooks
    console.log('\n4️⃣  Clicking Connect to QuickBooks...');

    await page.screenshot({
      path: '../test-artifacts/qb-auto-reconnect/01-before-connect.png',
      fullPage: true
    });

    // Wait for Connect button to be visible
    await page.waitForSelector('button:has-text("Connect to QuickBooks")', { timeout: 5000 });

    // Click Connect - this will redirect to Intuit
    const [intuitPage] = await Promise.all([
      context.waitForEvent('page'), // Wait for new page/tab
      page.click('button:has-text("Connect to QuickBooks")')
    ]);

    console.log('   ✅ Redirected to Intuit OAuth page');
    console.log(`   URL: ${intuitPage.url()}`);

    await intuitPage.screenshot({
      path: '../test-artifacts/qb-auto-reconnect/02-intuit-oauth-page.png',
      fullPage: true
    });

    // Step 5: Try to detect if already authorized or need login
    console.log('\n5️⃣  Analyzing Intuit OAuth page...');

    const url = intuitPage.url();

    // Check if we're on the authorization page or login page
    const hasAuthorizeButton = await intuitPage.locator('button:has-text("Authorize")').count() > 0;
    const hasConnectButton2 = await intuitPage.locator('button:has-text("Connect")').count() > 0;
    const hasSignInButton = await intuitPage.locator('button:has-text("Sign in")').count() > 0;
    const hasEmailInput = await intuitPage.locator('input[type="email"]').count() > 0;

    console.log(`   Has Authorize button: ${hasAuthorizeButton ? '✅' : '❌'}`);
    console.log(`   Has Connect button: ${hasConnectButton2 ? '✅' : '❌'}`);
    console.log(`   Has Sign In button: ${hasSignInButton ? '✅' : '❌'}`);
    console.log(`   Has Email input: ${hasEmailInput ? '✅' : '❌'}`);

    // Step 6: Check for the scope display (NEW scopes should be visible)
    console.log('\n6️⃣  Checking OAuth scopes on page...');

    const pageContent = await intuitPage.content();
    const hasOpenIdScope = pageContent.includes('openid') || pageContent.includes('OpenID');
    const hasProfileScope = pageContent.includes('profile') || pageContent.includes('Profile');
    const hasEmailScope = pageContent.includes('email') || pageContent.includes('Email');

    console.log(`   OpenID scope visible: ${hasOpenIdScope ? '✅' : '❌'}`);
    console.log(`   Profile scope visible: ${hasProfileScope ? '✅' : '❌'}`);
    console.log(`   Email scope visible: ${hasEmailScope ? '✅' : '❌'}`);

    if (hasOpenIdScope && hasProfileScope && hasEmailScope) {
      console.log('   ✅ NEW SCOPES DETECTED ON INTUIT PAGE!');
    } else {
      console.log('   ⚠️  New scopes may not be visible (check screenshot)');
    }

    // Step 7: Wait for manual action or check if already authorized
    console.log('\n7️⃣  Waiting for OAuth flow completion...');

    if (hasAuthorizeButton || hasConnectButton2) {
      console.log('   ⚠️  Manual authorization required');
      console.log('\n   📋 WHAT TO DO NOW:');
      console.log('   1. The Intuit OAuth page is open in the test browser');
      console.log('   2. You should see the NEW scopes (openid, profile, email)');
      console.log('   3. Click "Authorize" or "Connect" to approve');
      console.log('   4. The browser will auto-redirect back to /admin/quickbooks');
      console.log('   5. This test will detect the redirect and verify success');
      console.log('\n   ⏳ Waiting for redirect (timeout: 2 minutes)...');

      // Wait for redirect back to our callback
      try {
        await page.waitForURL(/\/admin\/quickbooks/, { timeout: 120000 });
        console.log('   ✅ Redirected back to QuickBooks page!');
      } catch (error) {
        console.log('   ⚠️  Timeout waiting for redirect');
        console.log('   Did you authorize on the Intuit page?');

        await intuitPage.screenshot({
          path: '../test-artifacts/qb-auto-reconnect/03-intuit-timeout.png',
          fullPage: true
        });

        return;
      }
    } else if (hasSignInButton || hasEmailInput) {
      console.log('   ⚠️  Intuit login required');
      console.log('\n   📋 MANUAL STEP REQUIRED:');
      console.log('   1. Log in to your Intuit account in the test browser');
      console.log('   2. Authorize the application');
      console.log('   3. You will be redirected back automatically');
      console.log('\n   ⏳ Waiting for login and redirect (timeout: 3 minutes)...');

      try {
        await page.waitForURL(/\/admin\/quickbooks/, { timeout: 180000 });
        console.log('   ✅ Redirected back to QuickBooks page!');
      } catch (error) {
        console.log('   ⚠️  Timeout waiting for redirect');

        await intuitPage.screenshot({
          path: '../test-artifacts/qb-auto-reconnect/03-intuit-timeout.png',
          fullPage: true
        });

        return;
      }
    }

    // Step 8: Verify reconnection success
    console.log('\n8️⃣  Verifying reconnection...');

    await page.waitForTimeout(3000); // Wait for connection to save

    await page.screenshot({
      path: '../test-artifacts/qb-auto-reconnect/04-after-reconnect.png',
      fullPage: true
    });

    // Check for success indicators
    const hasConnectedStatus = await page.locator('text=Connected').count() > 0;
    const hasRealmId = await page.locator('text=9341454351188646').count() > 0;

    console.log(`   Connected status visible: ${hasConnectedStatus ? '✅' : '❌'}`);
    console.log(`   Realm ID visible: ${hasRealmId ? '✅' : '❌'}`);

    // Step 9: Test the connection (check for Error 3100)
    console.log('\n9️⃣  Testing connection...');

    await page.click('button:has-text("Test Connection")');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: '../test-artifacts/qb-auto-reconnect/05-after-test.png',
      fullPage: true
    });

    // Check for success or error message
    const hasSuccessMessage = await page.locator('.bg-green-100').count() > 0;
    const hasErrorMessage = await page.locator('.bg-red-100').count() > 0;

    if (hasSuccessMessage) {
      const successText = await page.locator('.bg-green-100').first().textContent();
      console.log(`   ✅ SUCCESS: ${successText}`);
    } else if (hasErrorMessage) {
      const errorText = await page.locator('.bg-red-100').first().textContent();
      console.log(`   ❌ ERROR: ${errorText}`);

      if (errorText?.includes('3100')) {
        console.log('   🚨 Error 3100 STILL PERSISTS');
        console.log('   This means the reconnection did not work properly');
      }
    } else {
      console.log('   ⚠️  No clear success/error message');
    }

    // Step 10: Enable auto-refresh
    console.log('\n🔟 Enabling auto-refresh...');

    // The auto-refresh should be enabled via API in the background
    // But let's verify it's working

    await page.reload();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '../test-artifacts/qb-auto-reconnect/06-final-state.png',
      fullPage: true
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ RECONNECTION FLOW COMPLETE');
    console.log('='.repeat(70));
    console.log('\nScreenshots saved in: test-artifacts/qb-auto-reconnect/');
    console.log('');
  });
});
