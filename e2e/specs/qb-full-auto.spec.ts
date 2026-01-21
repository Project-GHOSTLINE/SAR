import { test } from '@playwright/test';

const BASE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test('Full automated QB connection @qb-full-auto', async ({ page, context }) => {
  console.log('🚀 Starting FULL automation...\n');

  // Login
  console.log('1️⃣ Logging in...');
  await page.goto(`${BASE_URL}/admin`);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
  console.log('   ✅ Logged in\n');

  // Go to QuickBooks page
  console.log('2️⃣ Going to QuickBooks page...');
  await page.goto(`${BASE_URL}/admin/quickbooks`);
  await page.waitForLoadState('networkidle');
  console.log('   ✅ On QB page\n');

  // Screenshot before
  await page.screenshot({ path: '../test-artifacts/qb-full-auto/01-before.png', fullPage: true });

  // Check if need to disconnect first
  const hasDisconnect = await page.locator('button:has-text("Disconnect")').count() > 0;
  if (hasDisconnect) {
    console.log('3️⃣ Disconnecting old connection...');
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Disconnect")');
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Disconnected\n');
  }

  // Click Connect
  console.log('4️⃣ Clicking Connect to QuickBooks...');
  await page.waitForSelector('button:has-text("Connect to QuickBooks")', { timeout: 10000 });

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click('button:has-text("Connect to QuickBooks")')
  ]);

  console.log('   ✅ OAuth popup opened');
  console.log(`   URL: ${popup.url()}\n`);

  // Screenshot of OAuth page
  await popup.waitForLoadState('networkidle');
  await popup.screenshot({ path: '../test-artifacts/qb-full-auto/02-oauth-page.png', fullPage: true });

  console.log('5️⃣ Analyzing OAuth page...');
  const title = await popup.title();
  const url = popup.url();
  console.log(`   Title: ${title}`);
  console.log(`   URL: ${url}`);

  // Check for scopes
  const content = await popup.content();
  const hasOpenId = content.includes('openid') || content.includes('OpenID');
  const hasProfile = content.includes('profile') || content.includes('Profile');
  const hasEmail = content.includes('email') || content.includes('Email');

  console.log(`\n   Scopes visible:`);
  console.log(`   - OpenID: ${hasOpenId ? '✅' : '❌'}`);
  console.log(`   - Profile: ${hasProfile ? '✅' : '❌'}`);
  console.log(`   - Email: ${hasEmail ? '✅' : '❌'}\n`);

  // Monitor for callback
  console.log('6️⃣ Monitoring for authorization...');
  console.log('   (Waiting for you to click Authorize on the OAuth page)\n');

  // Wait for redirect to callback
  try {
    await page.waitForURL(/callback|quickbooks/, { timeout: 180000 }); // 3 minutes
    console.log('   ✅ DETECTED CALLBACK!\n');

    await page.waitForTimeout(3000);

    // Test connection
    console.log('7️⃣ Testing connection...');
    await page.goto(`${BASE_URL}/admin/quickbooks`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: '../test-artifacts/qb-full-auto/03-after-auth.png', fullPage: true });

    const hasSuccess = await page.locator('text=Connected').count() > 0;
    console.log(`   Connected status: ${hasSuccess ? '✅' : '❌'}\n`);

    // Click Test Connection
    const hasTestButton = await page.locator('button:has-text("Test Connection")').count() > 0;
    if (hasTestButton) {
      console.log('8️⃣ Testing API connection...');
      await page.click('button:has-text("Test Connection")');
      await page.waitForTimeout(3000);

      const hasError = await page.locator('.bg-red-100').count() > 0;
      const hasSuccessMsg = await page.locator('.bg-green-100').count() > 0;

      if (hasSuccessMsg) {
        const msg = await page.locator('.bg-green-100').first().textContent();
        console.log(`   ✅ SUCCESS: ${msg}\n`);
        console.log('════════════════════════════════════════════════════════');
        console.log('🎉 ERROR 3100 IS FIXED!');
        console.log('════════════════════════════════════════════════════════\n');
      } else if (hasError) {
        const msg = await page.locator('.bg-red-100').first().textContent();
        console.log(`   ❌ ERROR: ${msg}\n`);
      }

      await page.screenshot({ path: '../test-artifacts/qb-full-auto/04-test-result.png', fullPage: true });
    }

  } catch (error) {
    console.log('   ⏱️ Timeout - authorization not completed within 3 minutes\n');
    console.log('   Did you click "Authorize" on the Intuit page?');
    await popup.screenshot({ path: '../test-artifacts/qb-full-auto/05-timeout.png', fullPage: true });
  }

  console.log('\n✅ Automation complete');
  console.log('Screenshots saved in: test-artifacts/qb-full-auto/\n');
});
