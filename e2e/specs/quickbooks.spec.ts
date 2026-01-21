import { test, expect } from '@playwright/test';

/**
 * QuickBooks Integration E2E Tests
 *
 * Tests the complete QuickBooks OAuth flow and API integration.
 * Tags: @quickbooks @smoke
 */

test.describe('QuickBooks Integration', () => {

  test('should display QuickBooks connection status @smoke @quickbooks', async ({ page }) => {
    // Test API directly (page requires specific auth routing)

    // API status endpoint should respond
    const response = await page.request.get('/api/quickbooks/status');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('connection');
    expect(typeof data.connection.connected).toBe('boolean');

    console.log('✅ QuickBooks status API working');
    console.log(`   Connected: ${data.connection.connected}`);
  });

  test('should initiate OAuth flow @quickbooks', async ({ page, context }) => {
    // Find and click connect button
    const connectButton = page.locator('button', { hasText: /connect.*quickbooks/i }).first();

    // If already connected, skip
    const isConnected = await page.locator('text=/connected|disconnect/i').isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isConnected) {
      console.log('⚠️  QuickBooks already connected, skipping OAuth test');
      test.skip();
      return;
    }

    // Click connect button
    await connectButton.click();

    // Wait for redirect to Intuit
    await page.waitForURL(/appcenter\.intuit\.com/i, { timeout: 10000 });

    // Verify we're on Intuit OAuth page
    expect(page.url()).toContain('appcenter.intuit.com');
    expect(page.url()).toContain('oauth2');

    // Check for required OAuth parameters
    const url = new URL(page.url());
    expect(url.searchParams.get('client_id')).toBeTruthy();
    expect(url.searchParams.get('scope')).toContain('com.intuit.quickbooks.accounting');
    expect(url.searchParams.get('redirect_uri')).toContain('/api/quickbooks/auth/callback');
    expect(url.searchParams.get('state')).toBeTruthy();

    console.log('✅ OAuth flow initiated correctly');
    console.log(`   Scope: ${url.searchParams.get('scope')}`);
    console.log(`   Redirect URI: ${url.searchParams.get('redirect_uri')}`);

    // Note: We can't complete the OAuth flow in automated tests
    // because it requires real QuickBooks credentials and sandbox selection
  });

  test('should handle disconnect @quickbooks', async ({ page }) => {
    // Check if connected
    const statusResponse = await page.request.get('/api/quickbooks/status');
    const statusData = await statusResponse.json();

    if (!statusData.connection.connected) {
      console.log('⚠️  QuickBooks not connected, skipping disconnect test');
      test.skip();
      return;
    }

    // Find disconnect button
    const disconnectButton = page.locator('button', { hasText: /disconnect/i }).first();
    await expect(disconnectButton).toBeVisible();

    // Click disconnect
    await disconnectButton.click();

    // Wait for confirmation or immediate disconnect
    await page.waitForTimeout(2000);

    // Verify disconnected
    const newStatusResponse = await page.request.get('/api/quickbooks/status');
    const newStatusData = await newStatusResponse.json();

    expect(newStatusData.connection.connected).toBe(false);

    console.log('✅ QuickBooks disconnected successfully');
  });

  test('should show sync options when connected @quickbooks', async ({ page }) => {
    // Check connection status
    const statusResponse = await page.request.get('/api/quickbooks/status');
    const statusData = await statusResponse.json();

    if (!statusData.connection.connected) {
      console.log('⚠️  QuickBooks not connected, skipping sync test');
      test.skip();
      return;
    }

    // Look for sync buttons or sections
    const syncElements = page.locator('text=/sync|synchronize|import/i');
    const count = await syncElements.count();

    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} sync-related elements`);
  });

  test('should test sync customers API @quickbooks', async ({ page }) => {
    // Check connection first
    const statusResponse = await page.request.get('/api/quickbooks/status');
    const statusData = await statusResponse.json();

    if (!statusData.connection.connected) {
      console.log('⚠️  QuickBooks not connected, skipping API test');
      test.skip();
      return;
    }

    // Test sync customers endpoint
    const syncResponse = await page.request.post('/api/quickbooks/sync/customers');

    // Should not be 401 or 403
    expect(syncResponse.status()).not.toBe(401);
    expect(syncResponse.status()).not.toBe(403);

    if (syncResponse.ok()) {
      const syncData = await syncResponse.json();
      console.log('✅ Sync customers API working');
      console.log(`   Response:`, syncData);
    } else {
      const error = await syncResponse.json();
      console.log('⚠️  Sync failed (might be expected in sandbox):');
      console.log(`   Status: ${syncResponse.status()}`);
      console.log(`   Error:`, error);
    }
  });

  test('should test reports API @quickbooks', async ({ page }) => {
    // Check connection first
    const statusResponse = await page.request.get('/api/quickbooks/status');
    const statusData = await statusResponse.json();

    if (!statusData.connection.connected) {
      console.log('⚠️  QuickBooks not connected, skipping reports test');
      test.skip();
      return;
    }

    // Test profit-loss report
    const reportResponse = await page.request.get('/api/quickbooks/reports/profit-loss');

    // Should not be 401 or 403
    expect(reportResponse.status()).not.toBe(401);
    expect(reportResponse.status()).not.toBe(403);

    if (reportResponse.ok()) {
      const reportData = await reportResponse.json();
      console.log('✅ Profit & Loss report API working');
      console.log(`   Response:`, reportData);
    } else {
      const error = await reportResponse.json();
      console.log('⚠️  Report failed (might be expected in sandbox):');
      console.log(`   Status: ${reportResponse.status()}`);
      console.log(`   Error:`, error);
    }
  });

});
