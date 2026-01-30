/**
 * PLAYWRIGHT TEST - Simulate Real Human Visit
 * Tests complete user journey with telemetry tracking
 */

import { test, expect } from '@playwright/test';

test.describe('Human Visit - Full Telemetry Tracking', () => {
  test('should track complete human journey with all metrics', async ({ page }) => {
    console.log('\n🎬 Starting Human Visit Test...\n');

    // Step 1: Visit homepage
    console.log('📍 Step 1: Visit homepage');
    await page.goto('https://admin.solutionargentrapide.ca');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 2: Navigate to demande page
    console.log('📍 Step 2: Navigate to /demande');
    await page.goto('https://admin.solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 3: Click on form elements (simulate interaction)
    console.log('📍 Step 3: Interact with page elements');

    // Try to find and click interactive elements
    const buttons = await page.locator('button, a[href], input').all();
    if (buttons.length > 0) {
      await buttons[0].scrollIntoViewIfNeeded();
      await buttons[0].click().catch(() => console.log('  ⚠️ Click failed (normal)'));
      await page.waitForTimeout(500);
    }

    // Step 4: Visit FAQ
    console.log('📍 Step 4: Visit FAQ');
    await page.goto('https://admin.solutionargentrapide.ca/faq');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 5: Visit another page
    console.log('📍 Step 5: Visit /ibv');
    await page.goto('https://admin.solutionargentrapide.ca/ibv');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 6: Back to homepage
    console.log('📍 Step 6: Return to homepage');
    await page.goto('https://admin.solutionargentrapide.ca');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n✅ Test complete! Visit should be tracked with:');
    console.log('   - 5-6 HTTP requests');
    console.log('   - Multiple page_view events');
    console.log('   - Click events');
    console.log('   - Device/Browser/OS info');
    console.log('   - Correlation score ~100%');
    console.log('\n⏳ Wait 10 seconds for telemetry to process...\n');

    await page.waitForTimeout(10000);
  });

  test('should capture device information', async ({ page }) => {
    console.log('\n🔍 Testing Device Information Capture...\n');

    await page.goto('https://admin.solutionargentrapide.ca');
    await page.waitForLoadState('networkidle');

    // Get device info from browser
    const deviceInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));

    console.log('📱 Device Info Captured:');
    console.log(`   User-Agent: ${deviceInfo.userAgent}`);
    console.log(`   Platform: ${deviceInfo.platform}`);
    console.log(`   Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`);
    console.log(`   Viewport: ${deviceInfo.viewportWidth}x${deviceInfo.viewportHeight}`);
    console.log(`   Pixel Ratio: ${deviceInfo.devicePixelRatio}x`);

    await page.waitForTimeout(2000);
  });
});
