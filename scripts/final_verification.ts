// Vérification finale: Est-ce que ce sont de VRAIES données GA4 ou du MOCK?

const PROD_URL = 'https://admin.solutionargentrapide.ca';
const API_KEY = 'FredRosa%1978';

interface VerificationResult {
  test: string;
  passed: boolean;
  details: string;
}

async function finalVerification() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION FINALE: DONNEES GA4 REELLES vs MOCK             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results: VerificationResult[] = [];

  // TEST 1: Endpoint /api/seo/analytics/detailed existe
  try {
    const res = await fetch(`${PROD_URL}/api/seo/analytics/detailed?days=30`, {
      headers: { 'x-api-key': API_KEY }
    });

    if (res.ok) {
      const data = await res.json();
      results.push({
        test: 'Endpoint /api/seo/analytics/detailed accessible',
        passed: true,
        details: `${data.total_records} records disponibles`
      });

      // Vérifier nombre de jours
      if (data.total_records >= 20) {
        results.push({
          test: 'Au moins 20 jours de données',
          passed: true,
          details: `${data.total_records} jours`
        });
      } else {
        results.push({
          test: 'Au moins 20 jours de données',
          passed: false,
          details: `Seulement ${data.total_records} jours`
        });
      }

      // Vérifier variation des données
      const newUsersValues = data.data.map((d: any) => d.new_users);
      const uniqueValues = new Set(newUsersValues);

      if (uniqueValues.size >= 10) {
        results.push({
          test: 'Les données varient (pas toutes identiques)',
          passed: true,
          details: `${uniqueValues.size} valeurs uniques de new_users`
        });
      } else {
        results.push({
          test: 'Les données varient (pas toutes identiques)',
          passed: false,
          details: `Seulement ${uniqueValues.size} valeurs uniques`
        });
      }

      // Vérifier absence de mock 377
      const mockCount = newUsersValues.filter((v: number) => v === 377).length;
      const mockPercentage = (mockCount / newUsersValues.length) * 100;

      if (mockPercentage < 10) {
        results.push({
          test: 'Pas de valeur mock 377 en masse',
          passed: true,
          details: `${mockPercentage.toFixed(1)}% de valeurs 377`
        });
      } else {
        results.push({
          test: 'Pas de valeur mock 377 en masse',
          passed: false,
          details: `${mockPercentage.toFixed(1)}% de valeurs 377 - SUSPECT!`
        });
      }

      // Vérifier les stats
      if (data.stats) {
        const totalUsers = data.stats.total_users;
        if (totalUsers > 100) {
          results.push({
            test: 'Total users cohérent (> 100 sur 30 jours)',
            passed: true,
            details: `${totalUsers} users au total`
          });
        } else {
          results.push({
            test: 'Total users cohérent (> 100 sur 30 jours)',
            passed: false,
            details: `Seulement ${totalUsers} users - SUSPECT!`
          });
        }
      }

    } else {
      results.push({
        test: 'Endpoint /api/seo/analytics/detailed accessible',
        passed: false,
        details: `HTTP ${res.status} - Endpoint non déployé`
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Endpoint /api/seo/analytics/detailed accessible',
      passed: false,
      details: `Erreur: ${error.message}`
    });
  }

  // TEST 2: /api/seo/metrics retourne plus d'1 record
  try {
    const res = await fetch(`${PROD_URL}/api/seo/metrics?source=ga4&detailed=true`, {
      headers: { 'x-api-key': API_KEY }
    });

    if (res.ok) {
      const data = await res.json();
      const records = data.ga4?.last_month?.records || 0;
      const totalUsers = data.ga4?.last_month?.summary?.total_users || 0;

      if (records >= 20) {
        results.push({
          test: '/api/seo/metrics retourne au moins 20 jours',
          passed: true,
          details: `${records} records`
        });
      } else {
        results.push({
          test: '/api/seo/metrics retourne au moins 20 jours',
          passed: false,
          details: `Seulement ${records} record(s) - ${totalUsers} users`
        });
      }

      // Vérifier que le total n'est pas 377
      if (totalUsers !== 377) {
        results.push({
          test: 'Total users n\'est pas 377 (mock)',
          passed: true,
          details: `${totalUsers} users`
        });
      } else {
        results.push({
          test: 'Total users n\'est pas 377 (mock)',
          passed: false,
          details: `377 users - C'EST DU MOCK!`
        });
      }
    }
  } catch (error: any) {
    results.push({
      test: '/api/seo/metrics accessible',
      passed: false,
      details: `Erreur: ${error.message}`
    });
  }

  // Afficher les résultats
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTATS DES TESTS                                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const icon = result.passed ? '✓' : '✗';

    console.log(`${index + 1}. [${status}] ${result.test}`);
    console.log(`   ${icon} ${result.details}\n`);

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  // Verdict final
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  VERDICT FINAL                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const successRate = (passedCount / results.length) * 100;

  if (successRate === 100) {
    console.log('🎉 SUCCÈS TOTAL: 100% des tests passent!');
    console.log('✅ Ce sont de VRAIES données GA4, pas du mock.');
    console.log('✅ L\'interface affiche des données réelles et variables.\n');
  } else if (successRate >= 80) {
    console.log('⚠️  SUCCÈS PARTIEL: La plupart des tests passent');
    console.log(`   ${passedCount}/${results.length} tests réussis (${successRate.toFixed(0)}%)`);
    console.log('   Quelques problèmes mineurs détectés.\n');
  } else if (successRate >= 50) {
    console.log('❌ ÉCHEC PARTIEL: Plusieurs problèmes détectés');
    console.log(`   ${passedCount}/${results.length} tests réussis (${successRate.toFixed(0)}%)`);
    console.log('   Les données semblent partiellement mock.\n');
  } else {
    console.log('❌ ÉCHEC TOTAL: Les données sont du MOCK!');
    console.log(`   ${passedCount}/${results.length} tests réussis (${successRate.toFixed(0)}%)`);
    console.log('   L\'utilisateur voit toujours du mock.\n');
  }

  console.log(`Tests réussis: ${passedCount}`);
  console.log(`Tests échoués: ${failedCount}`);
  console.log(`Taux de réussite: ${successRate.toFixed(1)}%\n`);

  process.exit(successRate === 100 ? 0 : 1);
}

finalVerification().catch(console.error);
