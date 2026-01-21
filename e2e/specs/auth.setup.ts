import { test as setup, expect } from '@playwright/test';

/**
 * Setup: Admin Authentication
 *
 * This runs before all tests to establish authenticated session.
 * Storage state is saved to e2e/storage/state.json for reuse.
 */

const STORAGE_STATE = './storage/state.json';

setup('authenticate as admin', async ({ page }) => {
  console.log('🔐 Setting up admin authentication...');

  // Navigate to admin login
  await page.goto('/admin', { waitUntil: 'networkidle' });

  // Check if already logged in
  const isLoggedIn = await page.locator('text=Dashboard').isVisible({ timeout: 2000 })
    .catch(() => false);

  if (isLoggedIn) {
    console.log('✅ Already authenticated');
    await page.context().storageState({ path: STORAGE_STATE });
    return;
  }

  // Wait for page to be fully loaded and hydrated
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');

  // Wait for form to be hydrated (increased timeout for dev mode)
  await page.waitForSelector('form[data-hydrated="true"]', { timeout: 10000 });

  // Login form should be visible
  const passwordInput = page.getByTestId('admin-password');
  await expect(passwordInput).toBeVisible({ timeout: 5000 });

  // Fill password
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD not set in environment');
  }

  await passwordInput.fill(password);

  // Submit login and wait for API response
  const submitButton = page.getByTestId('admin-submit');
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/admin/login') && resp.status() === 200, { timeout: 10000 }),
    submitButton.click()
  ]);

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

  // Verify dashboard is loaded
  await expect(page.locator('h1').first()).toBeVisible();

  console.log('✅ Admin authentication successful');

  // Save authenticated state
  await page.context().storageState({ path: STORAGE_STATE });
});
