// Test de l'API de production pour voir les données réelles affichées

const PROD_URL = 'https://admin.solutionargentrapide.ca';
const API_KEY = 'FredRosa%1978';

async function testProductionAPI() {
  console.log('=== TEST DE L\'API DE PRODUCTION ===\n');

  try {
    // 1. Test /api/seo/analytics/detailed
    console.log('1. Test /api/seo/analytics/detailed');
    const detailedRes = await fetch(`${PROD_URL}/api/seo/analytics/detailed?days=30`, {
      headers: { 'x-api-key': API_KEY }
    });

    if (detailedRes.ok) {
      const detailedData = await detailedRes.json();
      console.log('   ✅ Endpoint accessible');
      console.log(`   - Total records: ${detailedData.total_records}`);
      console.log(`   - Dernière date: ${detailedData.data?.[0]?.date}`);
      console.log(`   - Utilisateurs dernière date: ${detailedData.data?.[0]?.users}`);
      console.log(`   - Nouveaux utilisateurs: ${detailedData.data?.[0]?.new_users}`);

      // Afficher les 5 derniers jours
      console.log('\n   Derniers 5 jours:');
      detailedData.data?.slice(0, 5).forEach((day: any) => {
        console.log(`     ${day.date}: ${day.users} users, ${day.new_users} new`);
      });
    } else {
      console.log(`   ❌ Erreur HTTP ${detailedRes.status}`);
      const errorText = await detailedRes.text();
      console.log(`   ${errorText.substring(0, 200)}`);
    }

    // 2. Test /api/seo/metrics
    console.log('\n2. Test /api/seo/metrics');
    const metricsRes = await fetch(`${PROD_URL}/api/seo/metrics?source=ga4&detailed=true`, {
      headers: { 'x-api-key': API_KEY }
    });

    if (metricsRes.ok) {
      const metricsData = await metricsRes.json();
      console.log('   ✅ Endpoint accessible');
      console.log(`   - GA4 last_month records: ${metricsData.ga4?.last_month?.records}`);
      console.log(`   - GA4 last_month total_users: ${metricsData.ga4?.last_month?.summary?.total_users}`);
      console.log(`   - GA4 last_month total_sessions: ${metricsData.ga4?.last_month?.summary?.total_sessions}`);
    } else {
      console.log(`   ❌ Erreur HTTP ${metricsRes.status}`);
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

testProductionAPI().catch(console.error);
