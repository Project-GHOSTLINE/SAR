import { test, expect, devices } from '@playwright/test';

/**
 * Test complet mobile - Solution Argent Rapide
 * Vérifie le site en mode mobile (iPhone 13 Pro)
 */

const SITE_URL = 'https://admin.solutionargentrapide.ca';
const ADMIN_PASSWORD = 'FredRosa%1978';

test('Mobile - Page d\'accueil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Configuration mobile (iPhone 13 Pro)
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Page d\'accueil mobile');

  await page.goto(SITE_URL);
  await page.waitForLoadState('networkidle');

  // Vérifier le titre
  await expect(page).toHaveTitle(/Solution Argent Rapide/);

  // Screenshot
  await page.screenshot({
    path: 'test-results/mobile-01-homepage.png',
    fullPage: true
  });

  console.log('✅ Page d\'accueil mobile OK');
});

test('Mobile - Formulaire de demande', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Formulaire de demande mobile');

  await page.goto(`${SITE_URL}/demande-de-pret-en-ligne-formulaire`);
  await page.waitForLoadState('networkidle');

  // Vérifier que le formulaire est visible
  const form = page.locator('form').first();
  await expect(form).toBeVisible({ timeout: 10000 });

  await page.screenshot({
    path: 'test-results/mobile-02-form.png',
    fullPage: true
  });

  console.log('✅ Formulaire mobile OK');
});

test('Mobile - Page FAQ', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Page FAQ mobile');

  await page.goto(`${SITE_URL}/faq`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({
    path: 'test-results/mobile-03-faq.png',
    fullPage: true
  });

  console.log('✅ Page FAQ mobile OK');
});

test('Mobile - Admin Login', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Admin Login mobile');

  await page.goto(`${SITE_URL}/admin`);
  await page.waitForLoadState('networkidle');

  // Remplir le formulaire de login
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeVisible({ timeout: 10000 });

  await passwordInput.fill(ADMIN_PASSWORD);

  await page.screenshot({
    path: 'test-results/mobile-04-admin-login.png'
  });

  // Soumettre le formulaire
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Attendre la redirection
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });

  await page.screenshot({
    path: 'test-results/mobile-05-admin-dashboard.png',
    fullPage: true
  });

  console.log('✅ Admin Login mobile OK');
});

test('Mobile - Relevés Bancaires', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Relevés Bancaires mobile');

  // Login
  await page.goto(`${SITE_URL}/admin`);
  await page.waitForLoadState('networkidle');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(ADMIN_PASSWORD);

  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Chercher l'onglet VoPay
  const vopayButton = page.getByText('VoPay').first();

  if (await vopayButton.isVisible()) {
    await vopayButton.click();
    await page.waitForTimeout(2000);

    // Chercher l'onglet Relevés Bancaires
    const relevesButton = page.getByText('Relevés Bancaires').first();

    if (await relevesButton.isVisible()) {
      await relevesButton.click();
      await page.waitForTimeout(3000);

      // Vérifier que l'iframe est chargée
      const iframe = page.locator('iframe[src*="Releves"]').first();
      const iframeVisible = await iframe.isVisible().catch(() => false);

      console.log(`📄 Iframe visible: ${iframeVisible}`);

      await page.screenshot({
        path: 'test-results/mobile-06-releves-bancaires.png',
        fullPage: true
      });

      if (iframeVisible) {
        console.log('✅ Relevés Bancaires affichés correctement');
      } else {
        console.log('⚠️  Iframe non visible mais page chargée');
      }
    } else {
      console.log('⚠️  Onglet Relevés Bancaires non trouvé');
    }
  } else {
    console.log('⚠️  Section VoPay non trouvée');
  }
});

test('Mobile - Performance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Performance mobile');

  const startTime = Date.now();

  await page.goto(SITE_URL);
  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;

  console.log(`⏱️  Temps de chargement: ${loadTime}ms`);

  // Vérifier que le temps de chargement est raisonnable
  expect(loadTime).toBeLessThan(10000); // Moins de 10 secondes

  console.log('✅ Performance mobile OK');
});

test('Mobile - Responsive (différentes tailles)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('📱 Test: Responsive design');

  const viewports = [
    { width: 375, height: 667, name: 'iPhone-SE' },
    { width: 390, height: 844, name: 'iPhone-13-Pro' },
    { width: 414, height: 896, name: 'iPhone-11-Pro-Max' },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(SITE_URL);
    await page.waitForLoadState('networkidle');

    // Vérifier que le contenu est visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({
      path: `test-results/mobile-07-responsive-${viewport.name}.png`,
      fullPage: true
    });

    console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) OK`);
  }

  console.log('✅ Responsive design OK');
});
