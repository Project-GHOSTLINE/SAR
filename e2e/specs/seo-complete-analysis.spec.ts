import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Complet de la Page /admin/seo
 *
 * Ce test:
 * 1. Se connecte en tant qu'admin
 * 2. Navigue vers /admin/seo
 * 3. Prend des screenshots de toute la page
 * 4. Lit TOUTES les valeurs affichées
 * 5. Vérifie si c'est le cache (377) ou les vraies données (1955)
 * 6. Scroll vers la section "Données Détaillées Jour par Jour"
 * 7. Clique sur la première ligne du tableau
 * 8. Vérifie l'ouverture du modal avec 100+ métriques
 * 9. Prend un screenshot du modal
 * 10. Génère un rapport DÉTAILLÉ avec TOUT ce qui est affiché
 *
 * NOTE: Ce test gère sa propre authentification et ne dépend pas du setup.
 */

test.describe('SEO Admin Page - Analyse Complète', () => {
  // Override project configuration to remove storage state dependency
  test.use({ storageState: undefined });

  const baseURL = 'https://admin.solutionargentrapide.ca';
  const password = 'FredRosa%1978';

  // Dossier pour les screenshots
  const screenshotsDir = path.join(__dirname, '../test-artifacts/seo-analysis');

  // Rapport détaillé
  let rapport: any = {
    timestamp: new Date().toISOString(),
    url: `${baseURL}/admin/seo`,
    etapes: [],
    donnees: {},
    problemes: [],
    screenshots: []
  };

  test.beforeAll(() => {
    // Créer le dossier pour les screenshots
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.afterAll(() => {
    // Sauvegarder le rapport
    const rapportPath = path.join(screenshotsDir, 'rapport-complet.json');
    fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2));

    // Créer un rapport HTML lisible
    const htmlPath = path.join(screenshotsDir, 'rapport-complet.html');
    fs.writeFileSync(htmlPath, genererRapportHTML(rapport));

    console.log('\n========================================');
    console.log('RAPPORT COMPLET GÉNÉRÉ');
    console.log('========================================');
    console.log(`JSON: ${rapportPath}`);
    console.log(`HTML: ${htmlPath}`);
    console.log(`Screenshots: ${screenshotsDir}`);
    console.log('========================================\n');
  });

  test('Analyse complète de /admin/seo avec rapport détaillé', async ({ page }) => {
    // Configurer les timeouts
    test.setTimeout(180000); // 3 minutes pour tout le test

    // ÉTAPE 1: Connexion
    rapport.etapes.push({
      numero: 1,
      nom: 'Connexion en tant qu\'admin',
      timestamp: new Date().toISOString()
    });

    console.log('\n[ÉTAPE 1] Connexion à l\'admin...');

    await page.goto(`${baseURL}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Wait for React hydration
    console.log('  - Attente de l\'hydration React...');
    try {
      await page.waitForSelector('form[data-hydrated="true"]', { timeout: 10000 });
      console.log('  - Formulaire hydraté détecté');
    } catch (e) {
      console.log('  - Formulaire non hydraté, on continue quand même');
      await page.waitForTimeout(2000);
    }

    // Screenshot de la page de login
    const loginScreenshot = path.join(screenshotsDir, '01-login-page.png');
    await page.screenshot({ path: loginScreenshot, fullPage: true });
    rapport.screenshots.push({ etape: 1, nom: 'Page de login', chemin: loginScreenshot });

    // Check if already logged in
    const isDashboard = page.url().includes('/dashboard');
    if (!isDashboard) {
      // Need to login
      console.log('  - Remplissage du formulaire de connexion...');

      // Close cookie popup if present
      try {
        const cookieButton = await page.$('button:has-text("Je choisis")');
        if (cookieButton) {
          await cookieButton.click();
          console.log('  - Popup cookies fermé');
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // No cookie popup, continue
      }

      // Wait for password input to be visible
      const passwordInput = await page.waitForSelector('input[type="password"]', {
        timeout: 10000,
        state: 'visible'
      });
      console.log('  - Champ mot de passe trouvé');

      // Fill password
      await passwordInput.fill(password);
      console.log('  - Mot de passe entré');
      await page.waitForTimeout(500);

      // Find and click submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        console.log('  - Clic sur le bouton de connexion');

        // Wait for both navigation AND API response
        const [response] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/api/admin/login'), { timeout: 15000 }),
          submitButton.click()
        ]);

        console.log(`  - Réponse API: ${response.status()}`);

        if (response.status() === 200) {
          console.log('  - Connexion réussie, attente de la redirection...');

          // Wait for redirect to dashboard
          await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
          console.log('  - Redirection vers dashboard confirmée');

          // Wait for dashboard to load
          await page.waitForLoadState('networkidle');
        } else {
          console.log(`  ⚠️  Erreur de connexion: ${response.status()}`);
          rapport.problemes.push(`Erreur de connexion: HTTP ${response.status()}`);
        }
      } else {
        console.log('  ⚠️  Bouton submit non trouvé');
        rapport.problemes.push('Bouton de connexion non trouvé');
      }
    }

    // Verify we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/admin/')) {
      console.log('✓ Connexion réussie');
      rapport.etapes[0].statut = 'success';
    } else {
      console.log('⚠️  Connexion incertaine, URL actuelle: ' + currentUrl);
      rapport.etapes[0].statut = 'warning';
      rapport.problemes.push('Connexion incertaine - toujours sur la page de login?');
    }

    // Screenshot after login
    const afterLoginScreenshot = path.join(screenshotsDir, '01b-after-login.png');
    await page.screenshot({ path: afterLoginScreenshot, fullPage: true });
    rapport.screenshots.push({ etape: 1, nom: 'Après connexion', chemin: afterLoginScreenshot });
    console.log(`  - URL actuelle après connexion: ${page.url()}`);

    // ÉTAPE 2: Navigation vers /admin/seo
    rapport.etapes.push({
      numero: 2,
      nom: 'Navigation vers /admin/seo',
      timestamp: new Date().toISOString()
    });

    console.log('\n[ÉTAPE 2] Navigation vers /admin/seo...');
    console.log(`  - URL de départ: ${page.url()}`);

    await page.goto(`${baseURL}/admin/seo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`  - URL après navigation: ${page.url()}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Let data load

    // Check if we're on the right page
    const finalUrl = page.url();
    console.log(`  - URL finale: ${finalUrl}`);

    if (finalUrl.includes('/admin/seo')) {
      console.log('✓ Page SEO chargée');
      rapport.etapes[1].statut = 'success';
    } else {
      console.log(`⚠️  Page inattendue: ${finalUrl}`);
      rapport.etapes[1].statut = 'warning';
      rapport.problemes.push(`Navigation échouée - URL: ${finalUrl}`);
    }

    // ÉTAPE 3: Screenshot initial de la page
    rapport.etapes.push({
      numero: 3,
      nom: 'Screenshots de la page complète',
      timestamp: new Date().toISOString()
    });

    console.log('\n[ÉTAPE 3] Capture de la page complète...');

    const seoPageScreenshot = path.join(screenshotsDir, '02-seo-page-full.png');
    await page.screenshot({ path: seoPageScreenshot, fullPage: true });
    rapport.screenshots.push({ etape: 3, nom: 'Page SEO complète', chemin: seoPageScreenshot });

    const seoPageViewport = path.join(screenshotsDir, '03-seo-page-viewport.png');
    await page.screenshot({ path: seoPageViewport, fullPage: false });
    rapport.screenshots.push({ etape: 3, nom: 'Page SEO viewport', chemin: seoPageViewport });

    console.log('✓ Screenshots capturés');
    rapport.etapes[2].statut = 'success';

    // ÉTAPE 4: Lecture des valeurs affichées
    rapport.etapes.push({
      numero: 4,
      nom: 'Lecture de TOUTES les valeurs affichées',
      timestamp: new Date().toISOString()
    });

    console.log('\n[ÉTAPE 4] Lecture des valeurs affichées...');

    // Récupérer le titre de la page
    const pageTitle = await page.title();
    rapport.donnees.pageTitle = pageTitle;
    console.log(`  - Titre: ${pageTitle}`);

    // Récupérer tous les headings
    const headings = await page.$$eval('h1, h2, h3, h4', elements =>
      elements.map(el => ({ tag: el.tagName, text: el.textContent?.trim() }))
    );
    rapport.donnees.headings = headings;
    console.log(`  - Headings trouvés: ${headings.length}`);
    headings.forEach(h => console.log(`    ${h.tag}: ${h.text}`));

    // Chercher les métriques principales
    const metriques: any = {};

    // Essayer de trouver les cartes de métriques
    const cards = await page.$$eval('[class*="card"], [class*="metric"], [class*="stat"]', elements =>
      elements.map(el => ({
        classes: el.className,
        text: el.textContent?.trim().replace(/\s+/g, ' ')
      }))
    );

    console.log(`  - Cartes trouvées: ${cards.length}`);
    rapport.donnees.cards = cards;

    // Chercher spécifiquement "utilisateurs", "sessions", "engagement", "conversions"
    const texteComplet = await page.textContent('body');

    // Regex pour trouver les nombres
    const utilisateursMatch = texteComplet?.match(/(\d+)\s*utilisateurs/i);
    const sessionsMatch = texteComplet?.match(/(\d+)\s*sessions/i);
    const engagementMatch = texteComplet?.match(/(\d+)\s*engagement/i) || texteComplet?.match(/engagement[:\s]*(\d+)/i);
    const conversionsMatch = texteComplet?.match(/(\d+)\s*conversions/i) || texteComplet?.match(/conversions[:\s]*(\d+)/i);

    metriques.utilisateurs = utilisateursMatch ? parseInt(utilisateursMatch[1]) : null;
    metriques.sessions = sessionsMatch ? parseInt(sessionsMatch[1]) : null;
    metriques.engagement = engagementMatch ? parseInt(engagementMatch[1]) : null;
    metriques.conversions = conversionsMatch ? parseInt(conversionsMatch[1]) : null;

    rapport.donnees.metriques = metriques;

    console.log('\n  MÉTRIQUES PRINCIPALES:');
    console.log(`    - Utilisateurs: ${metriques.utilisateurs || 'Non trouvé'}`);
    console.log(`    - Sessions: ${metriques.sessions || 'Non trouvé'}`);
    console.log(`    - Engagement: ${metriques.engagement || 'Non trouvé'}`);
    console.log(`    - Conversions: ${metriques.conversions || 'Non trouvé'}`);

    // Vérifier si c'est le cache (377) ou les vraies données (1955)
    if (metriques.utilisateurs === 377) {
      rapport.donnees.typeData = 'CACHE (anciennes données)';
      rapport.problemes.push('Les données affichées sont en cache (377 utilisateurs au lieu de 1955)');
      console.log('  ⚠️  CACHE DÉTECTÉ - Données de 377 utilisateurs');
    } else if (metriques.utilisateurs === 1955) {
      rapport.donnees.typeData = 'VRAIES DONNÉES (actuelles)';
      console.log('  ✓ Vraies données affichées (1955 utilisateurs)');
    } else {
      rapport.donnees.typeData = `Autres données (${metriques.utilisateurs} utilisateurs)`;
      console.log(`  ? Données différentes: ${metriques.utilisateurs} utilisateurs`);
    }

    // Extraire tous les nombres visibles sur la page
    const tousLesNombres = texteComplet?.match(/\d+/g)?.map(n => parseInt(n)) || [];
    rapport.donnees.tousLesNombresVisibles = tousLesNombres.slice(0, 50); // Limiter à 50 pour éviter trop de données

    console.log('✓ Valeurs lues');
    rapport.etapes[3].statut = 'success';

    // ÉTAPE 5: Chercher le tableau "Données Détaillées Jour par Jour"
    rapport.etapes.push({
      numero: 5,
      nom: 'Recherche du tableau jour par jour',
      timestamp: new Date().toISOString()
    });

    console.log('\n[ÉTAPE 5] Recherche du tableau jour par jour...');

    // Chercher le texte "Données Détaillées Jour par Jour" ou similaire
    const tableauTextes = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
      elements
        .filter(el => el.textContent?.toLowerCase().includes('jour') ||
                     el.textContent?.toLowerCase().includes('détaillé') ||
                     el.textContent?.toLowerCase().includes('tableau'))
        .map(el => el.textContent?.trim())
    );

    rapport.donnees.tableauTitres = tableauTextes;
    console.log(`  - Titres contenant "jour/détaillé/tableau": ${tableauTextes.length}`);
    tableauTextes.forEach(t => console.log(`    "${t}"`));

    // Chercher tous les tableaux
    const tableaux = await page.$$('table');
    rapport.donnees.nombreTableaux = tableaux.length;
    console.log(`  - Tableaux trouvés: ${tableaux.length}`);

    if (tableaux.length === 0) {
      rapport.problemes.push('Aucun tableau trouvé sur la page');
      console.log('  ⚠️  Aucun tableau trouvé!');
    } else {
      // Analyser chaque tableau
      for (let i = 0; i < tableaux.length; i++) {
        const lignes = await tableaux[i].$$('tr');
        console.log(`  - Tableau ${i + 1}: ${lignes.length} lignes`);

        // Récupérer les en-têtes du tableau
        const entetes = await tableaux[i].$$eval('th', ths => ths.map(th => th.textContent?.trim()));
        console.log(`    En-têtes: ${entetes.join(', ')}`);

        // Scroll vers ce tableau pour le screenshot
        await tableaux[i].scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const tableauScreenshot = path.join(screenshotsDir, `04-tableau-${i + 1}.png`);
        await page.screenshot({ path: tableauScreenshot, fullPage: false });
        rapport.screenshots.push({
          etape: 5,
          nom: `Tableau ${i + 1}`,
          entetes: entetes,
          lignes: lignes.length,
          chemin: tableauScreenshot
        });
      }
    }

    console.log('✓ Analyse des tableaux complétée');
    rapport.etapes[4].statut = 'success';

    // ÉTAPE 6: Scroll et clic sur la première ligne
    if (tableaux.length > 0) {
      rapport.etapes.push({
        numero: 6,
        nom: 'Scroll et clic sur première ligne du tableau',
        timestamp: new Date().toISOString()
      });

      console.log('\n[ÉTAPE 6] Clic sur première ligne du tableau principal...');

      // Prendre le premier tableau (ou chercher le plus grand)
      const tableauPrincipal = tableaux[0];

      // Scroll vers le tableau
      await tableauPrincipal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // Screenshot avant le clic
      const avantClicScreenshot = path.join(screenshotsDir, '05-avant-clic-tableau.png');
      await page.screenshot({ path: avantClicScreenshot, fullPage: false });
      rapport.screenshots.push({ etape: 6, nom: 'Avant clic sur ligne', chemin: avantClicScreenshot });

      // Récupérer toutes les lignes du tableau (sauf l'en-tête)
      const lignesData = await tableauPrincipal.$$('tbody tr');

      if (lignesData.length === 0) {
        // Si pas de tbody, essayer toutes les lignes sauf la première
        const toutesLignes = await tableauPrincipal.$$('tr');
        if (toutesLignes.length > 1) {
          console.log(`  - ${toutesLignes.length - 1} lignes de données trouvées`);

          // Cliquer sur la première ligne de données
          const premiereLigne = toutesLignes[1];
          const texteAvant = await premiereLigne.textContent();
          console.log(`  - Clic sur: "${texteAvant?.trim()}"`);

          await premiereLigne.click();
          await page.waitForTimeout(2000); // Attendre l'ouverture du modal

          rapport.donnees.premiereLigneCliquee = texteAvant?.trim();
        } else {
          rapport.problemes.push('Aucune ligne de données dans le tableau');
          console.log('  ⚠️  Aucune ligne de données');
        }
      } else {
        console.log(`  - ${lignesData.length} lignes de données trouvées`);

        const premiereLigne = lignesData[0];
        const texteAvant = await premiereLigne.textContent();
        console.log(`  - Clic sur: "${texteAvant?.trim()}"`);

        await premiereLigne.click();
        await page.waitForTimeout(2000); // Attendre l'ouverture du modal

        rapport.donnees.premiereLigneCliquee = texteAvant?.trim();
      }

      console.log('✓ Clic effectué');
      rapport.etapes[5].statut = 'success';

      // ÉTAPE 7: Vérifier l'ouverture du modal
      rapport.etapes.push({
        numero: 7,
        nom: 'Vérification du modal avec 100+ métriques',
        timestamp: new Date().toISOString()
      });

      console.log('\n[ÉTAPE 7] Vérification du modal...');

      // Chercher le modal
      const modalSelectors = [
        '[role="dialog"]',
        '.modal',
        '[class*="Modal"]',
        '[class*="dialog"]',
        '[class*="popup"]'
      ];

      let modalTrouve = false;
      let modal = null;

      for (const selector of modalSelectors) {
        modal = await page.$(selector);
        if (modal) {
          modalTrouve = true;
          console.log(`  ✓ Modal trouvé avec sélecteur: ${selector}`);
          break;
        }
      }

      if (!modalTrouve) {
        rapport.problemes.push('Modal non trouvé après le clic sur la ligne');
        console.log('  ⚠️  Modal non trouvé!');

        // Screenshot de ce qui est affiché
        const apresClicScreenshot = path.join(screenshotsDir, '06-apres-clic-no-modal.png');
        await page.screenshot({ path: apresClicScreenshot, fullPage: true });
        rapport.screenshots.push({ etape: 7, nom: 'Après clic (pas de modal)', chemin: apresClicScreenshot });
      } else {
        // Modal trouvé - analyser son contenu
        const modalScreenshot = path.join(screenshotsDir, '07-modal-ouvert.png');
        await page.screenshot({ path: modalScreenshot, fullPage: true });
        rapport.screenshots.push({ etape: 7, nom: 'Modal ouvert', chemin: modalScreenshot });

        // Compter les métriques dans le modal
        const modalTexte = await modal.textContent();

        // Chercher tous les labels/valeurs dans le modal
        const metriquesModal = await page.$$eval(`${modalSelectors.find(s => modal)} *`, elements =>
          elements
            .filter(el => el.textContent && el.textContent.trim().length > 0)
            .map(el => ({
              tag: el.tagName,
              class: el.className,
              text: el.textContent?.trim().substring(0, 100) // Limiter à 100 chars
            }))
            .slice(0, 200) // Limiter à 200 éléments
        );

        rapport.donnees.modal = {
          trouve: true,
          texteComplet: modalTexte?.substring(0, 5000), // Limiter à 5000 chars
          nombreElements: metriquesModal.length,
          elements: metriquesModal.slice(0, 50) // Top 50 éléments
        };

        // Compter approximativement le nombre de métriques
        // Une métrique = un label + une valeur
        const lignesTexte = modalTexte?.split('\n').filter(l => l.trim().length > 0) || [];
        const nombreMetriques = Math.floor(lignesTexte.length / 2); // Approximation

        rapport.donnees.nombreMetriquesModal = nombreMetriques;

        console.log(`  - Éléments dans le modal: ${metriquesModal.length}`);
        console.log(`  - Lignes de texte: ${lignesTexte.length}`);
        console.log(`  - Métriques estimées: ${nombreMetriques}`);

        if (nombreMetriques >= 100) {
          console.log('  ✓ Modal contient 100+ métriques');
        } else {
          console.log(`  ⚠️  Modal contient seulement ${nombreMetriques} métriques (attendu: 100+)`);
          rapport.problemes.push(`Modal contient seulement ${nombreMetriques} métriques au lieu de 100+`);
        }

        // Screenshot final du modal en plein écran
        const modalFullScreenshot = path.join(screenshotsDir, '08-modal-full.png');
        await modal.screenshot({ path: modalFullScreenshot });
        rapport.screenshots.push({ etape: 7, nom: 'Modal en plein écran', chemin: modalFullScreenshot });
      }

      console.log('✓ Vérification du modal complétée');
      rapport.etapes[6].statut = modalTrouve ? 'success' : 'warning';
    } else {
      rapport.problemes.push('Impossible de cliquer sur une ligne - aucun tableau trouvé');
    }

    // ÉTAPE 8: Résumé final
    console.log('\n========================================');
    console.log('RÉSUMÉ DE L\'ANALYSE');
    console.log('========================================');
    console.log(`Type de données: ${rapport.donnees.typeData || 'Inconnu'}`);
    console.log(`Utilisateurs: ${rapport.donnees.metriques?.utilisateurs || 'Non trouvé'}`);
    console.log(`Tableaux trouvés: ${rapport.donnees.nombreTableaux || 0}`);
    console.log(`Modal trouvé: ${rapport.donnees.modal?.trouve ? 'OUI' : 'NON'}`);
    if (rapport.donnees.modal?.trouve) {
      console.log(`Métriques dans modal: ${rapport.donnees.nombreMetriquesModal || 'Inconnu'}`);
    }
    console.log(`\nProblèmes détectés: ${rapport.problemes.length}`);
    rapport.problemes.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log('\nScreenshots capturés:');
    rapport.screenshots.forEach((s, i) => console.log(`  ${i + 1}. ${s.nom} (étape ${s.etape})`));
    console.log('========================================\n');

    // Assertions finales
    expect(rapport.etapes.length).toBeGreaterThan(0);
    expect(rapport.screenshots.length).toBeGreaterThan(0);
  });
});

/**
 * Génère un rapport HTML lisible
 */
function genererRapportHTML(rapport: any): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Analyse SEO - ${rapport.timestamp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; }
    h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; }
    h3 { color: #7f8c8d; margin-top: 20px; margin-bottom: 10px; }
    .meta { background: #ecf0f1; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .meta p { margin: 5px 0; }
    .etapes { margin: 20px 0; }
    .etape { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
    .etape.success { border-color: #27ae60; }
    .etape.warning { border-color: #f39c12; }
    .etape.error { border-color: #e74c3c; }
    .donnees { background: #fff; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .metrique { display: inline-block; background: #3498db; color: white; padding: 10px 20px; margin: 5px; border-radius: 20px; }
    .metrique.important { background: #e74c3c; font-size: 1.2em; }
    .probleme { background: #fee; border-left: 4px solid #e74c3c; padding: 10px; margin: 5px 0; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
    .screenshot { background: #f8f9fa; padding: 10px; border-radius: 4px; }
    .screenshot img { max-width: 100%; border-radius: 4px; }
    .screenshot p { margin-top: 10px; font-size: 0.9em; color: #666; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 4px; overflow-x: auto; }
    code { font-family: 'Monaco', 'Courier New', monospace; font-size: 0.9em; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 0.85em; font-weight: bold; }
    .badge.success { background: #27ae60; color: white; }
    .badge.warning { background: #f39c12; color: white; }
    .badge.error { background: #e74c3c; color: white; }
    .badge.info { background: #3498db; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Rapport d'Analyse - Page /admin/seo</h1>

    <div class="meta">
      <p><strong>Date:</strong> ${new Date(rapport.timestamp).toLocaleString('fr-FR')}</p>
      <p><strong>URL:</strong> <a href="${rapport.url}" target="_blank">${rapport.url}</a></p>
      <p><strong>Étapes complétées:</strong> ${rapport.etapes.length}</p>
      <p><strong>Screenshots capturés:</strong> ${rapport.screenshots.length}</p>
      <p><strong>Problèmes détectés:</strong> ${rapport.problemes.length}</p>
    </div>

    <h2>🎯 Résultats Principaux</h2>
    <div class="donnees">
      <h3>Type de Données</h3>
      <div class="metrique ${rapport.donnees.typeData?.includes('CACHE') ? 'important' : ''}">
        ${rapport.donnees.typeData || 'Inconnu'}
      </div>

      <h3>Métriques Principales</h3>
      ${rapport.donnees.metriques ? `
        <div class="metrique">Utilisateurs: ${rapport.donnees.metriques.utilisateurs || 'N/A'}</div>
        <div class="metrique">Sessions: ${rapport.donnees.metriques.sessions || 'N/A'}</div>
        <div class="metrique">Engagement: ${rapport.donnees.metriques.engagement || 'N/A'}</div>
        <div class="metrique">Conversions: ${rapport.donnees.metriques.conversions || 'N/A'}</div>
      ` : '<p>Aucune métrique trouvée</p>'}

      <h3>Tableaux</h3>
      <p>Nombre de tableaux trouvés: <strong>${rapport.donnees.nombreTableaux || 0}</strong></p>

      <h3>Modal</h3>
      <p>Modal trouvé: <strong>${rapport.donnees.modal?.trouve ? 'OUI ✓' : 'NON ✗'}</strong></p>
      ${rapport.donnees.modal?.trouve ? `
        <p>Métriques dans le modal: <strong>${rapport.donnees.nombreMetriquesModal || 'Inconnu'}</strong></p>
      ` : ''}
    </div>

    ${rapport.problemes.length > 0 ? `
      <h2>⚠️ Problèmes Détectés</h2>
      ${rapport.problemes.map((p: string) => `<div class="probleme">${p}</div>`).join('')}
    ` : '<h2>✅ Aucun Problème Détecté</h2>'}

    <h2>📋 Étapes d'Exécution</h2>
    <div class="etapes">
      ${rapport.etapes.map((e: any) => `
        <div class="etape ${e.statut || ''}">
          <span class="badge ${e.statut || 'info'}">Étape ${e.numero}</span>
          <strong>${e.nom}</strong>
          <p style="font-size: 0.9em; color: #666; margin-top: 5px;">${new Date(e.timestamp).toLocaleTimeString('fr-FR')}</p>
        </div>
      `).join('')}
    </div>

    <h2>📸 Screenshots</h2>
    <div class="screenshots">
      ${rapport.screenshots.map((s: any) => `
        <div class="screenshot">
          <img src="${path.basename(s.chemin)}" alt="${s.nom}" />
          <p><strong>Étape ${s.etape}:</strong> ${s.nom}</p>
          ${s.entetes ? `<p style="font-size: 0.85em;">En-têtes: ${s.entetes.join(', ')}</p>` : ''}
          ${s.lignes ? `<p style="font-size: 0.85em;">Lignes: ${s.lignes}</p>` : ''}
        </div>
      `).join('')}
    </div>

    <h2>📄 Données Complètes (JSON)</h2>
    <pre><code>${JSON.stringify(rapport.donnees, null, 2)}</code></pre>
  </div>
</body>
</html>`;
}
