#!/usr/bin/env tsx

import { chromium } from 'playwright';

const adminPages = [
  '/admin/dashboard',
  '/admin/analytics',
  '/admin/downloads',
  '/admin/contrats-clients',
  '/admin/contrats-signature',
  '/admin/webhooks',
  '/admin/blacklist',
  '/admin/data-explorer',
  '/admin/performance',
  '/admin/seo-hub',
  '/admin/dataflow',
  '/admin/api-explorer',

  // SEO Hub pages
  '/admin/seo',
  '/admin/seo/performance',
  '/admin/seo/realtime',
  '/admin/seo/semrush',
  '/admin/seo/command-center',
  '/admin/seo/ip-explorer',
  '/admin/seo/gsc',
  '/admin/seo/ga4',
  '/admin/seo/fraud',
  '/admin/seo/analytics',
  '/admin/seo/network',

  // Dataflow pages
  '/admin/dataflow-health',
  '/admin/dataflow/kpis',
  '/admin/dataflow/traces',
  '/admin/dataflow/alerts',
  '/admin/dataflow/telemetry-debug',
  '/admin/dataflow/telemetry-health',
  '/admin/dataflow/network-trace',
  '/admin/dataflow/device-intelligence',
  '/admin/dataflow/analytics-timeline',
  '/admin/dataflow/page-flow',
  '/admin/dataflow/journeys',
  '/admin/dataflow/active-recon',
  '/admin/dataflow/packet-capture',
];

async function check404() {
  console.log('🔍 Checking for 404 errors on admin pages...\n');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = {
    ok: [] as string[],
    notFound: [] as string[],
    error: [] as string[]
  };

  for (const path of adminPages) {
    const url = `https://admin.solutionargentrapide.ca${path}`;

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const status = response?.status() || 0;

      if (status === 404) {
        console.log(`❌ 404: ${path}`);
        results.notFound.push(path);
      } else if (status >= 200 && status < 400) {
        console.log(`✅ ${status}: ${path}`);
        results.ok.push(path);
      } else {
        console.log(`⚠️  ${status}: ${path}`);
        results.error.push(path);
      }
    } catch (error: any) {
      console.log(`💥 Error: ${path} - ${error.message}`);
      results.error.push(path);
    }

    // Small delay to avoid hammering
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  await browser.close();

  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(80));
  console.log(`✅ Pages OK: ${results.ok.length}/${adminPages.length}`);
  console.log(`❌ Pages 404: ${results.notFound.length}/${adminPages.length}`);
  console.log(`⚠️  Pages erreur: ${results.error.length}/${adminPages.length}`);

  if (results.notFound.length > 0) {
    console.log('\n🚨 Pages 404:');
    results.notFound.forEach(p => console.log(`   - ${p}`));
  }

  if (results.error.length > 0) {
    console.log('\n⚠️  Pages avec erreur:');
    results.error.forEach(p => console.log(`   - ${p}`));
  }
}

check404().catch(console.error);
