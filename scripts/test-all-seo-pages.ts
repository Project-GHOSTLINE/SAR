/**
 * Test all 12 SEO pages in production
 */

const BASE_URL = 'https://solutionargentrapide.ca';

const pages = [
  { name: 'SEO Overview', path: '/api/seo/overview?range=7d' },
  { name: 'Performance', path: '/api/seo/performance?days=7' },
  { name: 'Realtime', path: '/api/seo/realtime' },
  { name: 'Semrush', path: '/api/seo/semrush' },
  { name: 'Command Center', path: '/api/admin/telemetry/command-center?window=1h' },
  { name: 'IP Explorer', path: '/api/seo/ip/142.127.223.188?range=7d' },
  { name: 'Analytics', path: '/api/seo/analytics/detailed?range=7d' },
  { name: 'GSC', path: '/api/seo/gsc' },
  { name: 'GA4', path: '/api/seo/ga4-status' },
  { name: 'Fraud', path: '/api/fraud/live' },
  { name: 'Network', path: '/api/seo/metrics' },
  { name: 'Visitor Dossier', path: '/api/seo/visitor/1d5e7072-4a46-4bef-bcba-e075140e9b6b' },
];

async function testPage(page: typeof pages[0]) {
  try {
    const response = await fetch(`${BASE_URL}${page.path}`, {
      headers: { 'User-Agent': 'SEO-Test-Script' }
    });
    const data = await response.json();

    const status = response.status === 200 ? '✅' : '❌';

    // Check if it's real data or placeholder
    let dataType = '';
    if (response.status !== 200) {
      dataType = '(ERROR)';
    } else if (data.error) {
      dataType = `(ERROR: ${data.error})`;
    } else if (data._meta?.source?.includes('FALLBACK')) {
      dataType = '(Fallback data)';
    } else if (data.meta?.dataSource) {
      dataType = `(${data.meta.dataSource})`;
    } else if (data.message?.includes('development') || data.message?.includes('placeholder')) {
      dataType = '(Placeholder)';
    } else {
      dataType = '(Real data)';
    }

    console.log(`${status} ${page.name.padEnd(20)} ${dataType}`);

    // Show key metrics if available
    if (response.status === 200 && !data.error) {
      if (data.metrics) {
        console.log(`   └─ Metrics: ${JSON.stringify(data.metrics).substring(0, 100)}...`);
      } else if (data.kpis) {
        console.log(`   └─ KPIs: ${JSON.stringify(data.kpis).substring(0, 100)}...`);
      } else if (data.overall) {
        console.log(`   └─ Overall: ${JSON.stringify(data.overall).substring(0, 100)}...`);
      }
    }

  } catch (err: any) {
    console.log(`❌ ${page.name.padEnd(20)} (Exception: ${err.message})`);
  }
}

async function testAll() {
  console.log('🔍 Testing all 12 SEO pages in PRODUCTION...\n');

  for (const page of pages) {
    await testPage(page);
  }

  console.log('\n✅ = Working with data');
  console.log('❌ = Error or not working');
}

testAll().catch(console.error);
