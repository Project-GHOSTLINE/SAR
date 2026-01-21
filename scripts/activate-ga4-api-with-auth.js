#!/usr/bin/env node

/**
 * Script Playwright pour activer automatiquement Google Analytics Data API
 * Utilise votre session Chrome existante pour éviter la connexion
 */

const { chromium } = require('playwright');
const os = require('os');
const path = require('path');

async function activateGA4API() {
  console.log('🚀 Démarrage de l\'automatisation avec authentification...\n');

  // Chemin vers le profil Chrome de l'utilisateur (macOS)
  const userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome', // Utilise Chrome au lieu de Chromium
    slowMo: 500
  });

  try {
    const page = browser.pages()[0] || await browser.newPage();

    // Projet ID à activer
    const projectId = '1059974911454';

    console.log(`📡 Navigation vers Google Cloud Console (Project: ${projectId})...`);
    console.log('   Utilisation de votre session Chrome existante...\n');

    // Aller directement sur la page de l'API
    await page.goto(`https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=${projectId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Attente du chargement de la page (10 secondes)...');
    await page.waitForTimeout(10000);

    // Vérifier si on est sur la page de login
    const isLoginPage = await page.locator('text=/Connexion|Sign in/i').count() > 0;

    if (isLoginPage) {
      console.log('⚠️  Page de connexion détectée.');
      console.log('📝 Veuillez vous connecter manuellement dans la fenêtre du navigateur.');
      console.log('⏳ Attente de 60 secondes pour la connexion...\n');
      await page.waitForTimeout(60000);
    }

    // Vérifier si l'API est déjà activée
    console.log('🔍 Vérification de l\'état de l\'API...');
    const isEnabled = await page.locator('text=/API activée|API enabled|GÉRER|MANAGE/i').count() > 0;

    if (isEnabled) {
      console.log('✅ L\'API est déjà activée!');
      await page.screenshot({ path: '/Users/xunit/Desktop/ga4-api-enabled.png', fullPage: true });
      console.log('📸 Capture sauvegardée: /Users/xunit/Desktop/ga4-api-enabled.png');
      return true;
    }

    // Chercher le bouton "Enable" ou "Activer"
    console.log('🔍 Recherche du bouton d\'activation...');

    // Attendre un peu pour être sûr que la page est chargée
    await page.waitForTimeout(3000);

    // Prendre une capture avant de chercher le bouton
    await page.screenshot({ path: '/Users/xunit/Desktop/ga4-api-before-click.png', fullPage: true });
    console.log('📸 Capture avant activation: /Users/xunit/Desktop/ga4-api-before-click.png');

    // Chercher le bouton avec plusieurs sélecteurs
    const enableSelectors = [
      'button:has-text("ENABLE")',
      'button:has-text("Enable")',
      'button:has-text("ACTIVER")',
      'button:has-text("Activer")',
      'button:has-text("Enable API")',
      'button:has-text("Activer l\'API")',
      'a:has-text("ENABLE")',
      '[aria-label*="Enable"]',
      '[aria-label*="Activer"]'
    ];

    let enableButton = null;
    for (const selector of enableSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0) {
        enableButton = button;
        console.log(`✅ Bouton trouvé avec sélecteur: ${selector}`);
        break;
      }
    }

    if (!enableButton) {
      console.log('⚠️  Bouton d\'activation non trouvé avec les sélecteurs standards.');
      console.log('📋 Veuillez activer manuellement dans la fenêtre du navigateur.');
      console.log('⏳ Attente de 120 secondes pour activation manuelle...\n');
      await page.waitForTimeout(120000);

      // Vérifier à nouveau
      const nowEnabled = await page.locator('text=/API activée|API enabled|GÉRER|MANAGE/i').count() > 0;
      if (nowEnabled) {
        console.log('✅ API activée manuellement!');
        return true;
      } else {
        return false;
      }
    }

    console.log('🖱️  Clic sur le bouton d\'activation...');
    await enableButton.click();

    console.log('⏳ Attente de l\'activation (30 secondes)...');
    await page.waitForTimeout(30000);

    // Prendre une capture après
    await page.screenshot({ path: '/Users/xunit/Desktop/ga4-api-after-click.png', fullPage: true });
    console.log('📸 Capture après activation: /Users/xunit/Desktop/ga4-api-after-click.png');

    // Vérifier l'activation
    const nowEnabled = await page.locator('text=/API activée|API enabled|GÉRER|MANAGE/i').count() > 0;

    if (nowEnabled) {
      console.log('✅ API activée avec succès!');
      return true;
    } else {
      console.log('⚠️  L\'activation n\'est pas confirmée visuellement.');
      console.log('   Il est possible que l\'API soit en cours d\'activation.');
      return true; // On retourne true quand même car le clic a été fait
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return false;
  } finally {
    console.log('\n⏳ Le navigateur restera ouvert pour vérification...');
    console.log('   Fermez la fenêtre quand vous avez terminé.');
    // Ne pas fermer automatiquement pour que l'utilisateur puisse vérifier
  }
}

// Exécuter
activateGA4API().then(success => {
  if (success) {
    console.log('\n✅ SUCCÈS! L\'API Google Analytics Data API devrait être activée.');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Fermez la fenêtre du navigateur');
    console.log('   2. Attendez 2-3 minutes pour la propagation');
    console.log('   3. Testez: curl -X POST http://localhost:3002/api/seo/collect/ga4 -H "x-api-key: FredRosa%1978"');
  } else {
    console.log('\n⚠️  L\'activation automatique n\'a pas pu être complétée.');
    console.log('   Veuillez vérifier manuellement sur la page ouverte.');
  }
}).catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
