import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Critical Path Validation
 *
 * Quick tests to verify the app is working.
 * Should run in < 2 minutes.
 *
 * Tags: @smoke
 */

test.describe('Smoke Tests', () => {

  test('app should be accessible @smoke', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    console.log('✅ App is accessible');
  });

  test('admin dashboard should load @smoke', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    // Dashboard should have some content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(0);

    console.log('✅ Admin dashboard loads');
  });

  test('API health check @smoke', async ({ page }) => {
    // Test QuickBooks status API (doesn't require auth)
    const response = await page.request.get('/api/quickbooks/status');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('connection');

    console.log('✅ API endpoints responding');
  });

  test('QuickBooks API should respond @smoke @quickbooks', async ({ page }) => {
    // Test QuickBooks status API
    const response = await page.request.get('/api/quickbooks/status');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('connection');
    expect(typeof data.connection.connected).toBe('boolean');

    console.log('✅ QuickBooks API responds');
    console.log(`   Connected: ${data.connection.connected}`);
  });

});
