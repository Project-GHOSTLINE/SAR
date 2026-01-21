#!/usr/bin/env node

/**
 * Script Playwright pour activer automatiquement Google Analytics Data API
 * dans le projet Google Cloud
 */

const { chromium } = require('playwright');

async function activateGA4API() {
  console.log('🚀 Démarrage de l\'automatisation...\n');

  const browser = await chromium.launch({
    headless: false, // Mode visible pour voir ce qui se passe
    slowMo: 500 // Ralentir pour voir les actions
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Projet ID à activer
    const projectId = '1059974911454';

    console.log(`📡 Navigation vers Google Cloud Console (Project: ${projectId})...`);

    // Aller directement sur la page de l'API
    await page.goto(`https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=${projectId}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('⏳ Attente du chargement de la page...');
    await page.waitForTimeout(3000);

    // Vérifier si l'API est déjà activée
    const isEnabled = await page.locator('text=/API activée|API enabled/i').count() > 0;

    if (isEnabled) {
      console.log('✅ L\'API est déjà activée!');
      return true;
    }

    // Chercher le bouton "Enable" ou "Activer"
    console.log('🔍 Recherche du bouton d\'activation...');

    const enableButton = page.locator('button:has-text("ENABLE"), button:has-text("Activer"), button:has-text("Enable API"), button:has-text("Activer l\'API")').first();

    const buttonExists = await enableButton.count() > 0;

    if (!buttonExists) {
      console.log('⚠️  Bouton d\'activation non trouvé.');
      console.log('📸 Prenez une capture d\'écran pour vérifier l\'état de la page.');
      await page.screenshot({ path: '/Users/xunit/Desktop/ga4-api-page.png', fullPage: true });
      console.log('✅ Capture d\'écran sauvegardée: /Users/xunit/Desktop/ga4-api-page.png');
      return false;
    }

    console.log('✅ Bouton d\'activation trouvé!');
    console.log('🖱️  Clic sur le bouton...');

    await enableButton.click();

    console.log('⏳ Attente de l\'activation (30 secondes)...');
    await page.waitForTimeout(30000);

    // Vérifier l'activation
    const nowEnabled = await page.locator('text=/API activée|API enabled/i').count() > 0;

    if (nowEnabled) {
      console.log('✅ API activée avec succès!');
      return true;
    } else {
      console.log('⚠️  L\'activation n\'est pas confirmée. Veuillez vérifier manuellement.');
      await page.screenshot({ path: '/Users/xunit/Desktop/ga4-api-activated.png', fullPage: true });
      console.log('✅ Capture d\'écran sauvegardée: /Users/xunit/Desktop/ga4-api-activated.png');
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  } finally {
    console.log('\n⏳ Fermeture du navigateur dans 5 secondes...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Exécuter
activateGA4API().then(success => {
  if (success) {
    console.log('\n✅ SUCCÈS! L\'API Google Analytics Data API est maintenant activée.');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Attendez 2-3 minutes pour la propagation');
    console.log('   2. Testez la collecte: curl -X POST http://localhost:3002/api/seo/collect/ga4 -H "x-api-key: FredRosa%1978"');
    process.exit(0);
  } else {
    console.log('\n⚠️  L\'activation automatique n\'a pas pu être complétée.');
    console.log('   Veuillez activer manuellement l\'API sur:');
    console.log('   https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=1059974911454');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
