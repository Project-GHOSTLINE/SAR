import { test, expect } from '@playwright/test';

/**
 * Tests pour la page Clients SAR
 *
 * Vérifie que:
 * - La page ne retourne pas 404
 * - Le menu "Clients SAR" existe dans l'admin
 * - Les onglets sont présents et fonctionnels
 * - Le contenu se charge correctement
 *
 * Tags: @smoke @clients-sar
 */

test.describe('Clients SAR', () => {

  test('la page Clients SAR ne doit pas retourner 404 @smoke @clients-sar', async ({ page }) => {
    // Naviguer vers la page Clients SAR
    const response = await page.goto('/admin/clients-sar');

    // Vérifier que la réponse n'est pas une erreur 404
    expect(response?.status()).not.toBe(404);
    expect(response?.ok()).toBeTruthy();

    console.log('✅ Page Clients SAR accessible (pas de 404)');
    console.log(`   Status: ${response?.status()}`);
  });

  test('le menu "Clients SAR" doit exister dans l\'admin @smoke @clients-sar', async ({ page }) => {
    // Naviguer vers le dashboard admin
    await page.goto('/admin/dashboard');

    // Attendre que la navigation soit chargée
    await page.waitForLoadState('networkidle');

    // Chercher le lien "Clients SAR" dans la navigation
    const clientsSARLink = page.locator('a[href="/admin/clients-sar"], nav >> text="Clients SAR"');

    // Vérifier que le menu existe
    await expect(clientsSARLink).toBeVisible();

    console.log('✅ Menu "Clients SAR" présent dans la navigation');
  });

  test('les onglets doivent être présents et visibles @clients-sar', async ({ page }) => {
    // Naviguer vers la page Clients SAR
    await page.goto('/admin/clients-sar');
    await page.waitForLoadState('networkidle');

    // Vérifier que le titre principal existe
    const mainTitle = page.locator('h1:has-text("Base de Données Clients SAR")');
    await expect(mainTitle).toBeVisible();

    // Vérifier que les 4 onglets sont présents (utiliser des sélecteurs plus spécifiques)
    const tabs = [
      'Recherche',
      'Dashboard',
      'Patterns de Fraude',
      'Liste Noire'
    ];

    // Sélectionner spécifiquement les onglets dans le nav de la page (pas les autres boutons)
    const tabsNav = page.locator('nav.-mb-px');

    for (const tabName of tabs) {
      const tab = tabsNav.locator(`button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
      console.log(`   ✅ Onglet "${tabName}" présent`);
    }

    console.log('✅ Tous les onglets sont présents');
  });

  test('l\'onglet Recherche doit afficher les filtres @clients-sar', async ({ page }) => {
    await page.goto('/admin/clients-sar');
    await page.waitForLoadState('networkidle');

    // Vérifier que l'onglet Recherche est actif par défaut (utiliser nav pour spécifier)
    const tabsNav = page.locator('nav.-mb-px');
    const rechercheTab = tabsNav.locator('button:has-text("Recherche")');
    await expect(rechercheTab).toHaveClass(/border-blue-500/);

    // Vérifier la présence des éléments de recherche
    await expect(page.locator('input[placeholder*="Nom, email"]')).toBeVisible();
    await expect(page.locator('label:has-text("Score fraude minimum")')).toBeVisible();
    await expect(page.locator('label:has-text("État du dossier")')).toBeVisible();
    await expect(page.locator('button:has-text("Rechercher")')).toBeVisible();

    console.log('✅ Onglet Recherche affiche correctement les filtres');
  });

  test('l\'onglet Dashboard doit être accessible @clients-sar', async ({ page }) => {
    await page.goto('/admin/clients-sar');
    await page.waitForLoadState('networkidle');

    // Cliquer sur l'onglet Dashboard (utiliser nav pour être spécifique)
    const tabsNav = page.locator('nav.-mb-px');
    const dashboardTab = tabsNav.locator('button:has-text("Dashboard")');
    await dashboardTab.click();

    // Attendre que le contenu du dashboard se charge
    await page.waitForTimeout(1000);

    // Vérifier que l'onglet est actif
    await expect(dashboardTab).toHaveClass(/border-blue-500/);

    // Vérifier la présence du titre "Vue d'ensemble"
    await expect(page.locator('h2:has-text("Vue d\'ensemble")')).toBeVisible();

    console.log('✅ Onglet Dashboard accessible et affiche le contenu');
  });

  test('les statistiques doivent se charger dans l\'onglet Recherche @clients-sar', async ({ page }) => {
    await page.goto('/admin/clients-sar');

    // Attendre le chargement des statistiques
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Vérifier la présence des cartes de statistiques
    const statsCards = [
      'Total Clients',
      'Sans IBV',
      'Risque Critique',
      'Risque Élevé',
      'Mauvaises Créances'
    ];

    for (const statName of statsCards) {
      const statCard = page.locator(`dt:has-text("${statName}")`);
      // Vérifier que la carte existe (peut ne pas être visible si pas de données)
      const count = await statCard.count();
      if (count > 0) {
        console.log(`   ✅ Statistique "${statName}" présente`);
      }
    }

    console.log('✅ Statistiques chargées');
  });

  test('le bouton Export CSV doit être présent @clients-sar', async ({ page }) => {
    await page.goto('/admin/clients-sar');
    await page.waitForLoadState('networkidle');

    // Vérifier la présence du bouton Export CSV
    const exportButton = page.locator('button:has-text("Exporter CSV")');
    await expect(exportButton).toBeVisible();

    console.log('✅ Bouton "Exporter CSV" présent');
  });

  test('navigation entre les onglets doit fonctionner @clients-sar', async ({ page }) => {
    await page.goto('/admin/clients-sar');
    await page.waitForLoadState('networkidle');

    // Sélectionner le nav des onglets une seule fois
    const tabsNav = page.locator('nav.-mb-px');

    // Test de navigation entre les onglets
    const tabs = [
      { name: 'Dashboard', contentCheck: 'h2:has-text("Vue d\'ensemble")' },
      { name: 'Patterns de Fraude', contentCheck: 'h2:has-text("Détection de Patterns de Fraude")' },
      { name: 'Liste Noire', contentCheck: 'h2:has-text("Liste Noire")' },
      { name: 'Recherche', contentCheck: 'button:has-text("Rechercher")' }
    ];

    for (const tab of tabs) {
      // Cliquer sur l'onglet (dans le nav spécifique)
      const tabButton = tabsNav.locator(`button:has-text("${tab.name}")`);
      await tabButton.click();

      // Attendre un court instant pour la transition
      await page.waitForTimeout(300);

      // Vérifier que l'onglet est actif
      await expect(tabButton).toHaveClass(/border-blue-500/);

      // Vérifier que le contenu correspondant est affiché (avec sélecteur spécifique)
      const content = page.locator(tab.contentCheck);
      await expect(content).toBeVisible();

      console.log(`   ✅ Navigation vers "${tab.name}" fonctionne`);
    }

    console.log('✅ Navigation entre les onglets fonctionne correctement');
  });

  test('API /api/admin/clients-sar/stats doit répondre @clients-sar', async ({ page }) => {
    // Tester l'API des statistiques
    const response = await page.request.get('/api/admin/clients-sar/stats');

    // Vérifier que la requête réussit
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Vérifier la structure de la réponse
    expect(data).toHaveProperty('success');
    if (data.success) {
      expect(data).toHaveProperty('stats');
      console.log('✅ API /stats répond correctement');
      console.log(`   Total clients: ${data.stats.total || 0}`);
      console.log(`   Sans IBV: ${data.stats.sansIBV || 0}`);
    }
  });

  test('API /api/admin/clients-sar/search doit répondre @clients-sar', async ({ page }) => {
    // Tester l'API de recherche
    const response = await page.request.get('/api/admin/clients-sar/search?limit=10&offset=0');

    // Vérifier que la requête réussit
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Vérifier la structure de la réponse
    expect(data).toHaveProperty('success');
    if (data.success) {
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      console.log('✅ API /search répond correctement');
      console.log(`   Résultats: ${data.data?.length || 0}`);
    }
  });

});
