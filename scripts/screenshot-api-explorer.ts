#!/usr/bin/env tsx

import { chromium } from 'playwright';
import path from 'path';

const scratchpad = '/private/tmp/claude-501/-Users-xunit-Desktop----Projets-sar/5a6b3ae4-3112-4a97-9ce5-5b90d24714f1/scratchpad';

async function captureScreenshots() {
  console.log('📸 Capturing API Explorer screenshots...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    // Navigate to API Explorer
    console.log('🌐 Loading API Explorer...');
    await page.goto('https://admin.solutionargentrapide.ca/admin/api-explorer', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Screenshot 1: Routes Tab (default view)
    console.log('📸 Screenshot 1: Routes Explorer tab');
    await page.screenshot({
      path: path.join(scratchpad, 'api-explorer-1-routes.png'),
      fullPage: true
    });

    // Click DB Impact tab
    console.log('📸 Screenshot 2: Clicking DB Impact tab...');
    await page.click('text=DB Impact');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(scratchpad, 'api-explorer-2-db-impact.png'),
      fullPage: true
    });

    // Scroll down to see Heavy APIs
    console.log('📸 Screenshot 3: Heavy APIs section...');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(scratchpad, 'api-explorer-3-heavy-apis.png'),
      fullPage: false
    });

    console.log('\n✅ Screenshots captured!');
    console.log(`📂 Location: ${scratchpad}/`);
    console.log('   1. api-explorer-1-routes.png');
    console.log('   2. api-explorer-2-db-impact.png');
    console.log('   3. api-explorer-3-heavy-apis.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
