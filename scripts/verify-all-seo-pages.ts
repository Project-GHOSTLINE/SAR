/**
 * Comprehensive check of ALL 12 SEO pages
 * Test APIs + verify data structure
 */

const BASE = 'https://solutionargentrapide.ca';

interface PageTest {
  name: string;
  apiPath: string;
  uiPath: string;
  expectedFields: string[];
}

const pages: PageTest[] = [
  {
    name: '1. SEO Overview',
    apiPath: '/api/seo/overview?range=7d',
    uiPath: '/admin/seo',
    expectedFields: ['kpis', 'timeline', 'topPages'],
  },
  {
    name: '2. Performance',
    apiPath: '/api/seo/performance?days=7',
    uiPath: '/admin/seo/performance',
    expectedFields: ['overall', 'pages'],
  },
  {
    name: '3. Realtime',
    apiPath: '/api/seo/realtime',
    uiPath: '/admin/seo/realtime',
    expectedFields: ['active_visitors', 'page_views_5min', 'top_pages'],
  },
  {
    name: '4. Semrush',
    apiPath: '/api/seo/semrush',
    uiPath: '/admin/seo/semrush',
    expectedFields: ['overview', 'backlinks', 'top_keywords'],
  },
  {
    name: '5. Command Center',
    apiPath: '/api/admin/telemetry/command-center?window=1h',
    uiPath: '/admin/seo/command-center',
    expectedFields: ['metrics', 'requestTraces', 'timeSeries'],
  },
  {
    name: '6. IP Explorer',
    apiPath: '/api/seo/ip/142.127.223.188',
    uiPath: '/admin/seo/ip-explorer',
    expectedFields: ['intelligence', 'timeline', 'topPaths'],
  },
  {
    name: '7. Visitor Dossier',
    apiPath: '/api/seo/visitor/1d5e7072-4a46-4bef-bcba-e075140e9b6b',
    uiPath: '/admin/seo/visitor/1d5e7072-4a46-4bef-bcba-e075140e9b6b',
    expectedFields: ['visitor_id', 'identity', 'metrics'],
  },
  {
    name: '8. GSC',
    apiPath: '/api/seo/gsc?range=7d',
    uiPath: '/admin/seo/gsc',
    expectedFields: ['overview', 'topQueries', 'topPages', 'timeSeries'],
  },
  {
    name: '9. Analytics',
    apiPath: '/api/seo/analytics/detailed?range=7d',
    uiPath: '/admin/seo/analytics',
    expectedFields: ['metrics', 'segments'],
  },
  {
    name: '10. GA4',
    apiPath: '/api/seo/ga4-status',
    uiPath: '/admin/seo/ga4',
    expectedFields: ['status', 'metrics'],
  },
  {
    name: '11. Fraud',
    apiPath: '/api/fraud/live',
    uiPath: '/admin/seo/fraud',
    expectedFields: ['fraud_score', 'bots_detected', 'suspicious_ips'],
  },
  {
    name: '12. Network',
    apiPath: '/api/seo/metrics',
    uiPath: '/admin/seo/network',
    expectedFields: ['nodes', 'edges'],
  },
];

async function verifyPage(page: PageTest) {
  try {
    const res = await fetch(`${BASE}${page.apiPath}`, {
      headers: { 'User-Agent': 'SEO-Verification' },
      cache: 'no-store',
    });

    const data = await res.json();

    // Check if all expected fields exist
    const hasAllFields = page.expectedFields.every(field => {
      const keys = Object.keys(data);
      return keys.includes(field) || keys.includes('data') && data.data?.[field] !== undefined;
    });

    // Check for placeholder/error messages
    const isPlaceholder =
      data.message?.toLowerCase().includes('développement') ||
      data.message?.toLowerCase().includes('placeholder') ||
      data.error?.toLowerCase().includes('not configured') ||
      res.status >= 400;

    const status = res.status === 200 ? '✅' : '❌';
    const dataType = isPlaceholder ? '🚧 PLACEHOLDER' : hasAllFields ? '📊 REAL DATA' : '⚠️ PARTIAL';

    console.log(`${status} ${page.name.padEnd(25)} ${dataType}`);

    if (res.status === 200 && !isPlaceholder) {
      // Show sample of data
      const sampleData: any = {};
      page.expectedFields.forEach(field => {
        if (data[field] !== undefined) {
          sampleData[field] = typeof data[field] === 'object'
            ? Object.keys(data[field]).length + ' keys'
            : data[field];
        } else if (data.data?.[field] !== undefined) {
          sampleData[field] = typeof data.data[field] === 'object'
            ? Object.keys(data.data[field]).length + ' keys'
            : data.data[field];
        }
      });
      console.log(`   └─ ${JSON.stringify(sampleData).substring(0, 120)}`);
    } else if (data.error) {
      console.log(`   └─ Error: ${data.error.substring(0, 80)}`);
    } else if (data.message) {
      console.log(`   └─ Message: ${data.message.substring(0, 80)}`);
    }

    return {
      name: page.name,
      working: res.status === 200 && !isPlaceholder && hasAllFields,
      hasData: !isPlaceholder,
      status: res.status,
    };

  } catch (err: any) {
    console.log(`❌ ${page.name.padEnd(25)} Exception: ${err.message}`);
    return {
      name: page.name,
      working: false,
      hasData: false,
      status: 0,
    };
  }
}

async function main() {
  console.log('🔍 VÉRIFICATION COMPLÈTE - 12 Pages SEO\n');
  console.log('=' .repeat(80));

  const results = [];
  for (const page of pages) {
    const result = await verifyPage(page);
    results.push(result);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RÉSUMÉ:\n');

  const working = results.filter(r => r.working).length;
  const partial = results.filter(r => r.hasData && !r.working).length;
  const broken = results.filter(r => !r.hasData).length;

  console.log(`✅ Fonctionnelles avec données complètes: ${working}/12`);
  console.log(`⚠️  Données partielles: ${partial}/12`);
  console.log(`❌ Placeholders ou erreurs: ${broken}/12`);

  console.log('\n🛠️  PAGES À CORRIGER:\n');
  results.filter(r => !r.working).forEach(r => {
    console.log(`   - ${r.name}`);
  });
}

main().catch(console.error);
