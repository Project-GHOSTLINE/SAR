import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SAR - Admin QuickBooks Section Analyzer
 * Teste tous les liens et fonctionnalités QuickBooks
 */

interface TestResult {
  name: string;
  url?: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  screenshot?: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
  const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
  console.log(`  ${icon} ${result.name}: ${result.message}`);
}

test.describe('Admin QuickBooks Section Analysis', () => {
  test.use({ storageState: './storage/state.json' });

  test('Analyze all QuickBooks links and features @quickbooks-analysis', async ({ page }) => {
    console.log('\n🔍 Admin QuickBooks Section Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
    const screenshotDir = path.join(process.cwd(), '../test-artifacts/quickbooks-analysis');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1. Test Dashboard QuickBooks Section
    console.log('📊 Step 1: Checking Dashboard for QuickBooks widgets...');
    try {
      await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });

      // Check for QuickBooks status widget
      const qbStatusWidget = page.locator('text=/QuickBooks/i').first();
      const hasQBWidget = await qbStatusWidget.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasQBWidget) {
        addResult({
          name: 'Dashboard QuickBooks Widget',
          status: 'success',
          message: 'QuickBooks widget found on dashboard'
        });

        // Screenshot the widget
        const screenshotPath = path.join(screenshotDir, 'dashboard-qb-widget.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        addResult({
          name: 'Dashboard Screenshot',
          status: 'success',
          message: 'Screenshot captured',
          screenshot: screenshotPath
        });
      } else {
        addResult({
          name: 'Dashboard QuickBooks Widget',
          status: 'warning',
          message: 'No QuickBooks widget visible on dashboard'
        });
      }
    } catch (error: any) {
      addResult({
        name: 'Dashboard Access',
        status: 'error',
        message: `Failed to access dashboard: ${error.message}`
      });
    }

    // 2. Test Direct QuickBooks Page
    console.log('\n📄 Step 2: Testing /admin/quickbooks page...');
    try {
      const response = await page.goto(`${baseUrl}/admin/quickbooks`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      if (response?.status() === 404) {
        addResult({
          name: '/admin/quickbooks Page',
          url: `${baseUrl}/admin/quickbooks`,
          status: 'error',
          message: 'Page does not exist (404)'
        });

        const screenshotPath = path.join(screenshotDir, 'quickbooks-page-404.png');
        await page.screenshot({ path: screenshotPath });
        addResult({
          name: '404 Screenshot',
          status: 'error',
          message: 'Screenshot of 404 page captured',
          screenshot: screenshotPath
        });
      } else if (response?.status() === 200) {
        addResult({
          name: '/admin/quickbooks Page',
          url: `${baseUrl}/admin/quickbooks`,
          status: 'success',
          message: 'Page exists and loaded successfully'
        });

        // Take screenshot
        const screenshotPath = path.join(screenshotDir, 'quickbooks-page.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // Find all buttons and links on the page
        const buttons = await page.locator('button').all();
        const links = await page.locator('a').all();

        addResult({
          name: 'QuickBooks Page Elements',
          status: 'success',
          message: `Found ${buttons.length} buttons and ${links.length} links`,
          screenshot: screenshotPath
        });

        // Test each button
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          const text = await button.textContent();
          const isVisible = await button.isVisible();

          addResult({
            name: `Button: ${text?.trim() || `Button ${i + 1}`}`,
            status: isVisible ? 'success' : 'warning',
            message: isVisible ? 'Visible' : 'Hidden'
          });
        }
      }
    } catch (error: any) {
      addResult({
        name: '/admin/quickbooks Page',
        status: 'error',
        message: `Error accessing page: ${error.message}`
      });
    }

    // 3. Test QuickBooks Status API
    console.log('\n🔌 Step 3: Testing QuickBooks API endpoints...');

    const apiTests = [
      {
        name: 'GET /api/quickbooks/status',
        url: '/api/quickbooks/status',
        method: 'GET',
        expectedProps: ['connection']
      },
      {
        name: 'GET /api/quickbooks/auth/connect',
        url: '/api/quickbooks/auth/connect',
        method: 'GET',
        expectedProps: ['authUrl']
      }
    ];

    for (const apiTest of apiTests) {
      try {
        const response = await page.request.get(`${baseUrl}${apiTest.url}`);
        const status = response.status();
        const data = await response.json().catch(() => null);

        if (status === 200) {
          let allPropsFound = true;
          for (const prop of apiTest.expectedProps) {
            if (!data || !(prop in data)) {
              allPropsFound = false;
              addResult({
                name: `${apiTest.name} - Property '${prop}'`,
                url: `${baseUrl}${apiTest.url}`,
                status: 'error',
                message: `Missing expected property: ${prop}`,
                details: data
              });
            }
          }

          if (allPropsFound) {
            addResult({
              name: apiTest.name,
              url: `${baseUrl}${apiTest.url}`,
              status: 'success',
              message: 'API responds correctly with expected data',
              details: data
            });
          }
        } else {
          addResult({
            name: apiTest.name,
            url: `${baseUrl}${apiTest.url}`,
            status: 'error',
            message: `HTTP ${status}`,
            details: data
          });
        }
      } catch (error: any) {
        addResult({
          name: apiTest.name,
          url: `${baseUrl}${apiTest.url}`,
          status: 'error',
          message: `Request failed: ${error.message}`
        });
      }
    }

    // 4. Test QuickBooks Sync Endpoints (expect 401 if not connected)
    console.log('\n🔄 Step 4: Testing QuickBooks sync endpoints...');

    const syncEndpoints = [
      '/api/quickbooks/sync/customers',
      '/api/quickbooks/sync/invoices',
      '/api/quickbooks/sync/payments'
    ];

    for (const endpoint of syncEndpoints) {
      try {
        const response = await page.request.post(`${baseUrl}${endpoint}`);
        const status = response.status();

        if (status === 401) {
          addResult({
            name: `POST ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'success',
            message: '401 Unauthorized (expected - QuickBooks not connected)'
          });
        } else if (status === 200) {
          const data = await response.json().catch(() => null);
          addResult({
            name: `POST ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'success',
            message: 'Sync successful (QuickBooks connected)',
            details: data
          });
        } else {
          addResult({
            name: `POST ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'error',
            message: `Unexpected status: HTTP ${status}`
          });
        }
      } catch (error: any) {
        addResult({
          name: `POST ${endpoint}`,
          url: `${baseUrl}${endpoint}`,
          status: 'error',
          message: `Request failed: ${error.message}`
        });
      }
    }

    // 5. Test QuickBooks Reports Endpoints
    console.log('\n📊 Step 5: Testing QuickBooks reports endpoints...');

    const reportEndpoints = [
      '/api/quickbooks/reports/profit-loss',
      '/api/quickbooks/reports/balance-sheet',
      '/api/quickbooks/reports/cash-flow'
    ];

    for (const endpoint of reportEndpoints) {
      try {
        const response = await page.request.get(`${baseUrl}${endpoint}`);
        const status = response.status();

        if (status === 401) {
          addResult({
            name: `GET ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'success',
            message: '401 Unauthorized (expected - QuickBooks not connected)'
          });
        } else if (status === 200) {
          const data = await response.json().catch(() => null);
          addResult({
            name: `GET ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'success',
            message: 'Report generated successfully (QuickBooks connected)',
            details: data
          });
        } else {
          addResult({
            name: `GET ${endpoint}`,
            url: `${baseUrl}${endpoint}`,
            status: 'error',
            message: `Unexpected status: HTTP ${status}`
          });
        }
      } catch (error: any) {
        addResult({
          name: `GET ${endpoint}`,
          url: `${baseUrl}${endpoint}`,
          status: 'error',
          message: `Request failed: ${error.message}`
        });
      }
    }

    // 6. Test OAuth Flow (if possible)
    console.log('\n🔐 Step 6: Testing OAuth flow...');

    try {
      const response = await page.request.get(`${baseUrl}/api/quickbooks/auth/connect`);
      const data = await response.json();

      if (data.authUrl && data.authUrl.includes('appcenter.intuit.com')) {
        addResult({
          name: 'OAuth URL Generation',
          status: 'success',
          message: 'Valid Intuit OAuth URL generated',
          details: { authUrl: data.authUrl }
        });

        // Check if URL contains required scopes
        if (data.authUrl.includes('com.intuit.quickbooks.accounting')) {
          addResult({
            name: 'OAuth Scopes',
            status: 'success',
            message: 'Correct scopes included in OAuth URL'
          });
        } else {
          addResult({
            name: 'OAuth Scopes',
            status: 'warning',
            message: 'OAuth URL may be missing required scopes'
          });
        }
      } else {
        addResult({
          name: 'OAuth URL Generation',
          status: 'error',
          message: 'Invalid or missing authUrl',
          details: data
        });
      }
    } catch (error: any) {
      addResult({
        name: 'OAuth Flow Test',
        status: 'error',
        message: `Failed: ${error.message}`
      });
    }

    // 7. Search for QuickBooks-related links in navigation
    console.log('\n🔗 Step 7: Checking navigation for QuickBooks links...');

    await page.goto(`${baseUrl}/admin/dashboard`);

    const navLinks = await page.locator('a, button').allTextContents();
    const qbRelatedLinks = navLinks.filter(text =>
      text.toLowerCase().includes('quickbooks') ||
      text.toLowerCase().includes('comptabilité') ||
      text.toLowerCase().includes('sync')
    );

    if (qbRelatedLinks.length > 0) {
      addResult({
        name: 'QuickBooks Navigation Links',
        status: 'success',
        message: `Found ${qbRelatedLinks.length} QuickBooks-related links in navigation`,
        details: qbRelatedLinks
      });
    } else {
      addResult({
        name: 'QuickBooks Navigation Links',
        status: 'warning',
        message: 'No QuickBooks-related links found in navigation'
      });
    }

    // Generate Report
    console.log('\n📊 Generating Analysis Report...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl,
      totalTests: results.length,
      successCount: results.filter(r => r.status === 'success').length,
      errorCount: results.filter(r => r.status === 'error').length,
      warningCount: results.filter(r => r.status === 'warning').length,
      results
    };

    // Save JSON report
    const reportPath = path.join(screenshotDir, 'quickbooks-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ JSON Report: ${reportPath}`);

    // Generate HTML report
    const htmlReport = generateHTMLReport(report);
    const htmlPath = path.join(screenshotDir, 'quickbooks-analysis.html');
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`✅ HTML Report: ${htmlPath}`);

    // Print summary
    printSummary(report);

    // Don't fail the test, just report findings
    console.log('\n📝 Analysis complete. Check reports for details.\n');
  });
});

function printSummary(report: any) {
  console.log('\n📈 QUICKBOOKS SECTION ANALYSIS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`✅ Success: ${report.successCount}`);
  console.log(`❌ Errors: ${report.errorCount}`);
  console.log(`⚠️  Warnings: ${report.warningCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const errors = report.results.filter((r: any) => r.status === 'error');
  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:');
    errors.forEach((err: any) => {
      console.log(`  - ${err.name}: ${err.message}`);
    });
    console.log('');
  }

  const warnings = report.results.filter((r: any) => r.status === 'warning');
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((warn: any) => {
      console.log(`  - ${warn.name}: ${warn.message}`);
    });
    console.log('');
  }
}

function generateHTMLReport(report: any): string {
  const successRate = ((report.successCount / report.totalTests) * 100).toFixed(1);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickBooks Section Analysis - SAR</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #94a3b8; margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #667eea; }
    .stat-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
    .stat-label { color: #94a3b8; font-size: 0.9rem; }
    .stat-card.success { border-left-color: #10b981; }
    .stat-card.error { border-left-color: #ef4444; }
    .stat-card.warning { border-left-color: #f59e0b; }
    .section { background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
    .section h2 { font-size: 1.5rem; margin-bottom: 20px; color: #f1f5f9; }
    .test-list { list-style: none; }
    .test-item { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #10b981; }
    .test-item.error { border-left-color: #ef4444; }
    .test-item.warning { border-left-color: #f59e0b; }
    .test-name { font-weight: 600; color: #f1f5f9; margin-bottom: 5px; }
    .test-message { color: #cbd5e1; font-size: 0.9rem; }
    .test-url { color: #94a3b8; font-size: 0.85rem; font-family: monospace; margin-top: 5px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-right: 8px; }
    .badge.success { background: #065f46; color: #a7f3d0; }
    .badge.error { background: #991b1b; color: #fecaca; }
    .badge.warning { background: #92400e; color: #fde68a; }
    pre { background: #0f172a; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 QuickBooks Section Analysis</h1>
    <div class="meta">
      Generated: ${new Date(report.timestamp).toLocaleString('fr-CA')}<br>
      Base URL: <code>${report.baseUrl}</code>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${report.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${report.successCount}</div>
        <div class="stat-label">Success</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${report.errorCount}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${report.warningCount}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${successRate}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>

    <div class="section">
      <h2>📋 All Test Results</h2>
      <ul class="test-list">
        ${report.results.map((result: any) => `
          <li class="test-item ${result.status}">
            <div class="test-name">
              <span class="badge ${result.status}">${result.status.toUpperCase()}</span>
              ${result.name}
            </div>
            <div class="test-message">${result.message}</div>
            ${result.url ? `<div class="test-url">${result.url}</div>` : ''}
            ${result.screenshot ? `<div class="test-url">📸 Screenshot: ${result.screenshot}</div>` : ''}
            ${result.details ? `<pre>${JSON.stringify(result.details, null, 2)}</pre>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>

  </div>
</body>
</html>`;
}
