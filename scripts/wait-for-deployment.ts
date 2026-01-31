/**
 * Wait for Vercel deployment to complete
 * Test GSC API until it returns real data
 */

const GSC_API = 'https://solutionargentrapide.ca/api/seo/gsc?range=7d';
const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 10000; // 10 seconds

async function testGscApi() {
  try {
    const response = await fetch(GSC_API, {
      headers: { 'User-Agent': 'Deployment-Monitor' },
      cache: 'no-store',
    });
    const data = await response.json();

    return {
      success: response.status === 200 && data.success === true,
      status: response.status,
      dataSource: data.meta?.dataSource,
      hasData: !!data.data?.overview,
      error: data.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

async function waitForDeployment() {
  console.log('🚀 Monitoring Vercel deployment...');
  console.log(`📍 Testing: ${GSC_API}\n`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await testGscApi();

    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Attempt ${attempt}/${MAX_ATTEMPTS}:`);

    if (result.success) {
      console.log(`✅ SUCCESS! GSC API is live with real data`);
      console.log(`   Data Source: ${result.dataSource}`);
      console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
      console.log(`\n📱 Go to: https://solutionargentrapide.ca/admin/seo/gsc`);
      console.log(`🔄 Hard refresh: Cmd + Shift + R`);
      return;
    }

    if (result.status === 200 && result.error) {
      console.log(`⚠️  API returned 200 but with error: ${result.error}`);
    } else if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else {
      console.log(`⏳ Not deployed yet (status ${result.status})`);
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`   Waiting ${INTERVAL_MS / 1000}s before next check...\n`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }
  }

  console.log(`\n⚠️  Timeout after ${MAX_ATTEMPTS} attempts`);
  console.log(`   The deployment might take longer than expected.`);
  console.log(`   Check manually: https://vercel.com/deployments`);
}

waitForDeployment().catch(console.error);
