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
  await page.goto('/admin');

  // Check if already logged in
  const isLoggedIn = await page.locator('text=Dashboard').isVisible({ timeout: 2000 })
    .catch(() => false);

  if (isLoggedIn) {
    console.log('✅ Already authenticated');
    await page.context().storageState({ path: STORAGE_STATE });
    return;
  }

  // Login form should be visible
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });

  // Fill password
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD not set in environment');
  }

  await page.fill('input[type="password"]', password);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

  // Verify dashboard is loaded
  await expect(page.locator('h1').first()).toBeVisible();

  console.log('✅ Admin authentication successful');

  // Save authenticated state
  await page.context().storageState({ path: STORAGE_STATE });
});
