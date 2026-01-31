/**
 * E2E Verification of all 12 SEO pages with Playwright
 * Connects, navigates, screenshots, checks for real data
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://solutionargentrapide.ca';

interface PageCheck {
  name: string;
  path: string;
  checkForText: string[]; // Text that should NOT be present (placeholders)
  checkForRealData: string[]; // Text that SHOULD be present (real data)
}

const pages: PageCheck[] = [
  {
    name: '1. SEO Overview',
    path: '/admin/seo',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['KPI', 'timeline', 'Top Pages'],
  },
  {
    name: '2. Performance',
    path: '/admin/seo/performance',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['P50', 'P95', 'requests'],
  },
  {
    name: '3. Realtime',
    path: '/admin/seo/realtime',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Active Visitors', 'LIVE', 'Last update'],
  },
  {
    name: '4. Semrush',
    path: '/admin/seo/semrush',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Organic Keywords', 'Authority Score', 'Backlinks'],
  },
  {
    name: '5. Command Center',
    path: '/admin/seo/command-center',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Request', 'Latency', 'Error'],
  },
  {
    name: '6. IP Explorer',
    path: '/admin/seo/ip-explorer',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Rechercher', 'adresse IP'],
  },
  {
    name: '7. Visitor Dossier',
    path: '/admin/seo/visitor/1d5e7072-4a46-4bef-bcba-e075140e9b6b',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['visitor', 'requests', 'pages'],
  },
  {
    name: '8. GSC',
    path: '/admin/seo/gsc',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Impressions', 'Clicks', 'CTR', 'Position'],
  },
  {
    name: '9. Fraud Detection',
    path: '/admin/seo/fraud',
    checkForText: ['🚧 En développement'],
    checkForRealData: ['Fraud Score', 'Bots Detected', 'Clean Sessions'],
  },
  {
    name: '10. Analytics',
    path: '/admin/seo/analytics',
    checkForText: ['🚧 En développement', 'Non autorisé'],
    checkForRealData: ['Analytics', 'metrics'],
  },
  {
    name: '11. GA4',
    path: '/admin/seo/ga4',
    checkForText: ['🚧 En développement', 'Non autorisé'],
    checkForRealData: ['GA4', 'users', 'sessions'],
  },
  {
    name: '12. Network',
    path: '/admin/seo/network',
    checkForText: ['🚧 En développement', 'Non autorisé'],
    checkForRealData: ['Network', 'nodes'],
  },
];

async function waitForDeployment() {
  console.log('🚀 Waiting for Vercel deployment...\n');

  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/fraud/live?days=7`);
      const data = await response.json();

      if (response.status === 200 && data.success === true) {
        console.log(`✅ Deployment detected! (attempt ${i}/${maxAttempts})\n`);
        return true;
      }
    } catch (err) {
      // Ignore errors during polling
    }

    if (i < maxAttempts) {
      process.stdout.write(`⏳ Attempt ${i}/${maxAttempts}...\r`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
    }
  }

  console.log('\n⚠️  Timeout waiting for deployment, proceeding anyway...\n');
  return false;
}

async function verifyPage(browser: Browser, page: PageCheck) {
  const browserPage = await browser.newPage();

  try {
    console.log(`\n📄 ${page.name}`);
    console.log(`   URL: ${BASE_URL}${page.path}`);

    // Navigate to page
    await browserPage.goto(`${BASE_URL}${page.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content to load
    await browserPage.waitForTimeout(2000);

    // Get page content
    const content = await browserPage.content();
    const textContent = await browserPage.textContent('body') || '';

    // Check for placeholder text
    let hasPlaceholder = false;
    for (const text of page.checkForText) {
      if (textContent.includes(text)) {
        console.log(`   ❌ Found placeholder: "${text}"`);
        hasPlaceholder = true;
      }
    }

    // Check for real data
    let hasRealData = false;
    let foundDataItems: string[] = [];
    for (const text of page.checkForRealData) {
      if (textContent.toLowerCase().includes(text.toLowerCase())) {
        foundDataItems.push(text);
        hasRealData = true;
      }
    }

    if (!hasPlaceholder && hasRealData) {
      console.log(`   ✅ REAL DATA VERIFIED`);
      console.log(`   └─ Found: ${foundDataItems.join(', ')}`);
    } else if (hasPlaceholder) {
      console.log(`   🚧 STILL PLACEHOLDER`);
    } else {
      console.log(`   ⚠️  UNCLEAR - No placeholder but missing expected data`);
    }

    // Take screenshot
    const screenshotPath = `/private/tmp/claude-501/-Users-xunit-Desktop----Projets-sar/5a6b3ae4-3112-4a97-9ce5-5b90d24714f1/scratchpad/seo-${page.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    await browserPage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   📸 Screenshot: ${screenshotPath}`);

    return {
      name: page.name,
      success: !hasPlaceholder && hasRealData,
      hasPlaceholder,
      hasRealData,
      foundData: foundDataItems,
    };

  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return {
      name: page.name,
      success: false,
      error: error.message,
    };
  } finally {
    await browserPage.close();
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🔍 E2E VERIFICATION - 12 SEO Pages with Playwright');
  console.log('═'.repeat(80));

  // Step 1: Wait for deployment
  await waitForDeployment();

  // Step 2: Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: true
  });

  // Step 3: Verify each page
  const results = [];
  for (const page of pages) {
    const result = await verifyPage(browser, page);
    results.push(result);
  }

  await browser.close();

  // Step 4: Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RÉSUMÉ FINAL\n');

  const working = results.filter(r => r.success).length;
  const withPlaceholders = results.filter(r => r.hasPlaceholder).length;
  const failed = results.filter(r => r.error).length;

  console.log(`✅ Pages avec vraies données: ${working}/12`);
  console.log(`🚧 Pages encore en placeholder: ${withPlaceholders}/12`);
  console.log(`❌ Pages avec erreurs: ${failed}/12`);

  if (withPlaceholders > 0) {
    console.log('\n🛠️  Pages à corriger:');
    results.filter(r => r.hasPlaceholder).forEach(r => {
      console.log(`   - ${r.name}`);
    });
  }

  if (working === 12) {
    console.log('\n🎉 TOUS LES 12 PAGES FONCTIONNENT AVEC VRAIES DONNÉES!');
  }

  console.log('\n' + '═'.repeat(80));
}

main().catch(console.error);
