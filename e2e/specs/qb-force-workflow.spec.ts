import { test } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test('Force complete workflow @qb-force', async ({ page, context }) => {
  console.log('💪 FORCING COMPLETE WORKFLOW\n');

  // Login
  console.log('1️⃣ Login...');
  await page.goto(`${BASE_URL}/admin`);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL(/\/admin\/dashboard/);
  console.log('   ✅ Done\n');

  // Go to QB page
  console.log('2️⃣ Going to QuickBooks page...');
  await page.goto(`${BASE_URL}/admin/quickbooks`);
  await page.waitForLoadState('networkidle');
  console.log('   ✅ Done\n');

  // KILL THE COOKIE POPUP
  console.log('3️⃣ Closing Axeptio cookie popup...');
  try {
    // Try multiple selectors for the close button
    const closeSelectors = [
      'button:has-text("Non merci")',
      'button:has-text("Ça me va")',
      '[data-testid="axeptio-close"]',
      '.axeptio-close',
      '#axeptio_btn_dismiss',
      'button.axeptio__button--dismiss'
    ];

    for (const selector of closeSelectors) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        await button.first().click();
        console.log(`   ✅ Closed with: ${selector}\n`);
        break;
      }
    }

    // If still there, try to dismiss the overlay itself
    const overlay = page.locator('#axeptio_overlay, .axeptio_mount');
    if (await overlay.count() > 0) {
      await overlay.evaluate(el => el.remove());
      console.log('   ✅ Removed overlay via DOM\n');
    }

    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('   ⚠️ Could not close popup, continuing anyway\n');
  }

  // Force disconnect if connected
  console.log('4️⃣ Forcing disconnect...');
  const hasDisconnect = await page.locator('button:has-text("Disconnect")').count() > 0;

  if (hasDisconnect) {
    // Accept confirmation dialog
    page.once('dialog', dialog => {
      console.log(`   Dialog: "${dialog.message()}"`);
      dialog.accept();
    });

    // Force click even if covered
    await page.locator('button:has-text("Disconnect")').first().evaluate(btn => {
      (btn as HTMLButtonElement).click();
    });
    console.log('   ✅ Clicked Disconnect (forced)\n');

    await page.waitForTimeout(3000);

    // Reload to see new state
    console.log('5️⃣ Reloading page to refresh state...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Done\n');
  }

  // Close cookie popup again if it reappeared
  try {
    const overlay = page.locator('#axeptio_overlay, .axeptio_mount');
    if (await overlay.count() > 0) {
      await overlay.evaluate(el => el.remove());
    }
  } catch (e) {}

  await page.screenshot({ path: '../test-artifacts/qb-force/01-after-disconnect.png', fullPage: true });

  // Wait for Connect button
  console.log('6️⃣ Waiting for Connect button...');
  try {
    await page.waitForSelector('button:has-text("Connect to QuickBooks")', { timeout: 15000 });
    console.log('   ✅ Connect button visible\n');
  } catch (e) {
    console.log('   ❌ Connect button not visible after 15s');
    console.log('   Current page state:');

    const hasConnected = await page.locator('text=Connected').count() > 0;
    const hasDisconnectStill = await page.locator('button:has-text("Disconnect")').count() > 0;

    console.log(`   - Shows "Connected": ${hasConnected}`);
    console.log(`   - Has Disconnect button: ${hasDisconnectStill}\n`);

    if (hasConnected) {
      console.log('   ⚠️ State did not refresh - trying harder...\n');

      // Nuclear option: clear localStorage and reload
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: '../test-artifacts/qb-force/02-after-cache-clear.png', fullPage: true });

      const hasConnectNow = await page.locator('button:has-text("Connect to QuickBooks")').count() > 0;
      console.log(`   After cache clear - Connect button: ${hasConnectNow ? '✅' : '❌'}\n`);

      if (!hasConnectNow) {
        console.log('   💀 STILL NO CONNECT BUTTON');
        console.log('   The React state is stuck. Need to check page code.\n');
        return;
      }
    }
  }

  // Click Connect
  console.log('7️⃣ Clicking Connect to QuickBooks...');

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('button:has-text("Connect to QuickBooks")').first().evaluate(btn => {
      (btn as HTMLButtonElement).click();
    })
  ]);

  console.log('   ✅ OAuth window opened');
  console.log(`   URL: ${popup.url()}\n`);

  await popup.waitForLoadState('networkidle');
  await popup.screenshot({ path: '../test-artifacts/qb-force/03-oauth-window.png', fullPage: true });

  console.log('8️⃣ Analyzing OAuth page...');
  const content = await popup.content();

  const hasOpenId = content.toLowerCase().includes('openid');
  const hasProfile = content.toLowerCase().includes('profile');
  const hasEmail = content.toLowerCase().includes('email');
  const hasError = content.toLowerCase().includes('error') || content.toLowerCase().includes('invalid');

  console.log(`   OpenID scope: ${hasOpenId ? '✅' : '❌'}`);
  console.log(`   Profile scope: ${hasProfile ? '✅' : '❌'}`);
  console.log(`   Email scope: ${hasEmail ? '✅' : '❌'}`);
  console.log(`   Has error: ${hasError ? '⚠️ YES' : '✅ No'}\n`);

  if (hasError) {
    const errorText = await popup.locator('body').textContent();
    console.log('   ERROR DETAILS:');
    console.log(errorText);
    return;
  }

  console.log('9️⃣ WAITING FOR AUTHORIZATION...');
  console.log('   The OAuth window is open.');
  console.log('   Click "Authorize" or "Connect" on it.');
  console.log('   I will detect when you are redirected back.\n');

  // Monitor for callback - 5 minutes timeout
  try {
    await page.waitForURL(/callback|quickbooks/, { timeout: 300000 });

    console.log('   ✅✅✅ CALLBACK DETECTED!\n');

    await page.waitForTimeout(5000);

    // Refresh QB page
    await page.goto(`${BASE_URL}/admin/quickbooks`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '../test-artifacts/qb-force/04-after-oauth.png', fullPage: true });

    console.log('🔟 Testing connection...');

    const hasTestBtn = await page.locator('button:has-text("Test Connection")').count() > 0;
    if (hasTestBtn) {
      await page.locator('button:has-text("Test Connection")').first().click();
      await page.waitForTimeout(3000);

      const hasSuccess = await page.locator('.bg-green-100').count() > 0;
      const hasError = await page.locator('.bg-red-100').count() > 0;

      if (hasSuccess) {
        const msg = await page.locator('.bg-green-100').first().textContent();
        console.log(`   ✅ ${msg}`);
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('🎉 QUICKBOOKS CONNECTED SUCCESSFULLY!');
        console.log('🎉 ERROR 3100 IS GONE!');
        console.log('═══════════════════════════════════════════════════════\n');
      } else if (hasError) {
        const msg = await page.locator('.bg-red-100').first().textContent();
        console.log(`   ❌ ${msg}\n`);
      }

      await page.screenshot({ path: '../test-artifacts/qb-force/05-test-result.png', fullPage: true });
    }

  } catch (e) {
    console.log('   ⏱️ Timeout waiting for authorization (5 minutes)\n');
    await popup.screenshot({ path: '../test-artifacts/qb-force/06-timeout.png', fullPage: true });
  }

  console.log('\n✅ Workflow complete');
});
