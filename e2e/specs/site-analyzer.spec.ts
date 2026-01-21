import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SAR - Site Analyzer
 * Crawle tout le site et détecte les erreurs
 */

interface PageError {
  url: string;
  type: 'console' | 'network' | 'exception' | 'broken-link' | 'slow-response';
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  details?: any;
}

interface AnalysisReport {
  timestamp: string;
  baseUrl: string;
  totalPages: number;
  totalErrors: number;
  totalWarnings: number;
  pages: {
    [url: string]: {
      status: 'success' | 'error' | 'warning';
      loadTime: number;
      errors: PageError[];
      links: string[];
      screenshots?: string;
    }
  };
  summary: {
    brokenLinks: string[];
    slowPages: string[];
    jsErrors: PageError[];
    networkErrors: PageError[];
  };
}

const report: AnalysisReport = {
  timestamp: new Date().toISOString(),
  baseUrl: '',
  totalPages: 0,
  totalErrors: 0,
  totalWarnings: 0,
  pages: {},
  summary: {
    brokenLinks: [],
    slowPages: [],
    jsErrors: [],
    networkErrors: []
  }
};

const visitedUrls = new Set<string>();
const toVisit: string[] = [];

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    const urlObj = new URL(url, baseUrl);
    // Ignore external links, anchors, mailto, tel
    if (
      urlObj.origin !== new URL(baseUrl).origin ||
      urlObj.protocol === 'mailto:' ||
      urlObj.protocol === 'tel:' ||
      url.startsWith('#')
    ) {
      return null;
    }
    // Remove hash
    urlObj.hash = '';
    return urlObj.href;
  } catch {
    return null;
  }
}

function addError(url: string, error: Omit<PageError, 'url' | 'timestamp'>) {
  const fullError: PageError = {
    ...error,
    url,
    timestamp: new Date().toISOString()
  };

  if (!report.pages[url]) {
    report.pages[url] = {
      status: 'success',
      loadTime: 0,
      errors: [],
      links: []
    };
  }

  report.pages[url].errors.push(fullError);

  if (error.severity === 'error') {
    report.totalErrors++;
    report.pages[url].status = 'error';
  } else if (error.severity === 'warning') {
    report.totalWarnings++;
    if (report.pages[url].status !== 'error') {
      report.pages[url].status = 'warning';
    }
  }

  // Add to summary
  if (error.type === 'console' && error.severity === 'error') {
    report.summary.jsErrors.push(fullError);
  } else if (error.type === 'network') {
    report.summary.networkErrors.push(fullError);
  } else if (error.type === 'broken-link') {
    report.summary.brokenLinks.push(url);
  }
}

async function analyzePage(page: Page, url: string, baseUrl: string) {
  console.log(`\n🔍 Analyzing: ${url}`);

  visitedUrls.add(url);

  // Setup error listeners
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') {
      addError(url, {
        type: 'console',
        severity: 'error',
        message: `Console Error: ${msg.text()}`
      });
    } else if (type === 'warning') {
      addError(url, {
        type: 'console',
        severity: 'warning',
        message: `Console Warning: ${msg.text()}`
      });
    }
  });

  page.on('pageerror', (error) => {
    addError(url, {
      type: 'exception',
      severity: 'error',
      message: `Uncaught Exception: ${error.message}`,
      details: { stack: error.stack }
    });
  });

  page.on('requestfailed', (request) => {
    // Ignore Axept.io analytics errors (external service)
    if (request.url().includes('api.axept.io')) {
      return;
    }

    addError(url, {
      type: 'network',
      severity: 'error',
      message: `Network Failed: ${request.url()}`,
      details: { failure: request.failure() }
    });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      // Ignore Axept.io analytics errors (external service)
      if (response.url().includes('api.axept.io')) {
        return;
      }

      const severity = response.status() >= 500 ? 'error' : 'warning';
      addError(url, {
        type: 'network',
        severity,
        message: `HTTP ${response.status()}: ${response.url()}`
      });
    }
  });

  try {
    const startTime = Date.now();

    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const loadTime = Date.now() - startTime;

    if (!response) {
      addError(url, {
        type: 'network',
        severity: 'error',
        message: 'Failed to load page (no response)'
      });
      return;
    }

    // Check response status
    if (response.status() >= 400) {
      addError(url, {
        type: 'broken-link',
        severity: 'error',
        message: `HTTP ${response.status()}`
      });
      return;
    }

    // Check load time
    if (loadTime > 3000) {
      addError(url, {
        type: 'slow-response',
        severity: 'warning',
        message: `Slow page load: ${loadTime}ms`
      });
      report.summary.slowPages.push(url);
    }

    // Initialize page report
    if (!report.pages[url]) {
      report.pages[url] = {
        status: 'success',
        loadTime,
        errors: [],
        links: []
      };
    } else {
      report.pages[url].loadTime = loadTime;
    }

    console.log(`  ✅ Loaded in ${loadTime}ms`);

    // Extract all links on the page
    const links = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href)
    );

    report.pages[url].links = links;

    // Add new internal links to visit queue
    for (const link of links) {
      const normalized = normalizeUrl(link, baseUrl);
      if (normalized && !visitedUrls.has(normalized) && !toVisit.includes(normalized)) {
        toVisit.push(normalized);
      }
    }

    // Take screenshot if there are errors
    if (report.pages[url].errors.length > 0) {
      const screenshotDir = path.join(process.cwd(), '../test-artifacts/site-analysis');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(
        screenshotDir,
        `${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.pages[url].screenshots = screenshotPath;
      console.log(`  📸 Screenshot saved: ${screenshotPath}`);
    }

    console.log(`  📊 Found ${links.length} links, ${report.pages[url].errors.length} errors`);

  } catch (error: any) {
    addError(url, {
      type: 'exception',
      severity: 'error',
      message: `Page analysis failed: ${error.message}`,
      details: { stack: error.stack }
    });
    console.log(`  ❌ Error: ${error.message}`);
  }
}

test.describe('SAR Site Analyzer', () => {
  test('Crawl and analyze entire site @analyzer', async ({ page, baseURL }) => {
    const startUrl = baseURL || 'http://localhost:4000';
    report.baseUrl = startUrl;

    console.log('🕷️  Starting Site Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Base URL: ${startUrl}`);
    console.log('');

    // Start with homepage
    toVisit.push(startUrl);

    // Also add known pages
    const knownPages = [
      '/',
      '/admin',
      '/admin/dashboard',
      '/api/quickbooks/status'
    ];

    for (const pagePath of knownPages) {
      const url = new URL(pagePath, startUrl).href;
      if (!toVisit.includes(url)) {
        toVisit.push(url);
      }
    }

    // Crawl all pages
    while (toVisit.length > 0) {
      const url = toVisit.shift()!;
      if (visitedUrls.has(url)) continue;

      report.totalPages++;
      await analyzePage(page, url, startUrl);

      // Limit to 50 pages to avoid infinite loops
      if (report.totalPages >= 50) {
        console.log('\n⚠️  Reached maximum page limit (50)');
        break;
      }
    }

    // Generate report
    console.log('\n📊 Generating Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const reportPath = path.join(process.cwd(), '../test-artifacts/site-analysis/report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ JSON Report saved: ${reportPath}`);

    // Generate HTML report
    const htmlReport = generateHTMLReport(report);
    const htmlPath = path.join(reportDir, 'report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`✅ HTML Report saved: ${htmlPath}`);

    // Print summary to console
    printSummary(report);

    // Fail test if there are critical errors
    expect(report.totalErrors, `Found ${report.totalErrors} errors on the site`).toBe(0);
  });
});

function printSummary(report: AnalysisReport) {
  console.log('\n📈 ANALYSIS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Pages Analyzed: ${report.totalPages}`);
  console.log(`Total Errors: ${report.totalErrors} ❌`);
  console.log(`Total Warnings: ${report.totalWarnings} ⚠️`);
  console.log('');

  if (report.summary.brokenLinks.length > 0) {
    console.log(`🔗 Broken Links (${report.summary.brokenLinks.length}):`);
    report.summary.brokenLinks.slice(0, 10).forEach(link => console.log(`  - ${link}`));
    if (report.summary.brokenLinks.length > 10) {
      console.log(`  ... and ${report.summary.brokenLinks.length - 10} more`);
    }
    console.log('');
  }

  if (report.summary.jsErrors.length > 0) {
    console.log(`🐛 JavaScript Errors (${report.summary.jsErrors.length}):`);
    report.summary.jsErrors.slice(0, 5).forEach(err => {
      console.log(`  - [${err.url}] ${err.message}`);
    });
    if (report.summary.jsErrors.length > 5) {
      console.log(`  ... and ${report.summary.jsErrors.length - 5} more`);
    }
    console.log('');
  }

  if (report.summary.networkErrors.length > 0) {
    console.log(`🌐 Network Errors (${report.summary.networkErrors.length}):`);
    report.summary.networkErrors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.message}`);
    });
    if (report.summary.networkErrors.length > 5) {
      console.log(`  ... and ${report.summary.networkErrors.length - 5} more`);
    }
    console.log('');
  }

  if (report.summary.slowPages.length > 0) {
    console.log(`🐌 Slow Pages (${report.summary.slowPages.length}):`);
    report.summary.slowPages.slice(0, 5).forEach(url => console.log(`  - ${url}`));
    if (report.summary.slowPages.length > 5) {
      console.log(`  ... and ${report.summary.slowPages.length - 5} more`);
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

function generateHTMLReport(report: AnalysisReport): string {
  const errorPages = Object.entries(report.pages).filter(([_, data]) => data.status === 'error');
  const warningPages = Object.entries(report.pages).filter(([_, data]) => data.status === 'warning');
  const successPages = Object.entries(report.pages).filter(([_, data]) => data.status === 'success');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAR - Site Analysis Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .meta { color: #94a3b8; margin-bottom: 30px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #1e293b; padding: 20px; border-radius: 12px; border-left: 4px solid #667eea; }
    .stat-value { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
    .stat-label { color: #94a3b8; font-size: 0.9rem; }
    .stat-card.error { border-left-color: #ef4444; }
    .stat-card.warning { border-left-color: #f59e0b; }
    .stat-card.success { border-left-color: #10b981; }
    .section { background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
    .section h2 { font-size: 1.5rem; margin-bottom: 20px; color: #f1f5f9; }
    .error-list { list-style: none; }
    .error-item { background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #ef4444; }
    .warning-item { border-left-color: #f59e0b; }
    .error-item strong { color: #f87171; }
    .warning-item strong { color: #fbbf24; }
    .error-message { color: #cbd5e1; margin-top: 5px; }
    .url { color: #94a3b8; font-size: 0.85rem; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #0f172a; color: #f1f5f9; font-weight: 600; }
    tr:hover { background: #0f172a; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .badge.error { background: #991b1b; color: #fecaca; }
    .badge.warning { background: #92400e; color: #fde68a; }
    .badge.success { background: #065f46; color: #a7f3d0; }
    .load-time { color: #94a3b8; font-size: 0.85rem; }
    .fast { color: #10b981; }
    .slow { color: #f59e0b; }
    .very-slow { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🕷️ SAR - Site Analysis Report</h1>
    <div class="meta">
      Generated: ${new Date(report.timestamp).toLocaleString('fr-CA')}<br>
      Base URL: <code>${report.baseUrl}</code>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${report.totalPages}</div>
        <div class="stat-label">Pages Analyzed</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${report.totalErrors}</div>
        <div class="stat-label">Errors Found</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${report.totalWarnings}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${successPages.length}</div>
        <div class="stat-label">Pages OK</div>
      </div>
    </div>

    ${report.summary.brokenLinks.length > 0 ? `
    <div class="section">
      <h2>🔗 Broken Links (${report.summary.brokenLinks.length})</h2>
      <ul class="error-list">
        ${report.summary.brokenLinks.map(link => `
          <li class="error-item">
            <div class="url">${link}</div>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.summary.jsErrors.length > 0 ? `
    <div class="section">
      <h2>🐛 JavaScript Errors (${report.summary.jsErrors.length})</h2>
      <ul class="error-list">
        ${report.summary.jsErrors.map(err => `
          <li class="error-item">
            <strong>${err.type.toUpperCase()}</strong>
            <div class="error-message">${err.message}</div>
            <div class="url">${err.url}</div>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.summary.networkErrors.length > 0 ? `
    <div class="section">
      <h2>🌐 Network Errors (${report.summary.networkErrors.length})</h2>
      <ul class="error-list">
        ${report.summary.networkErrors.map(err => `
          <li class="error-item">
            <strong>${err.severity.toUpperCase()}</strong>
            <div class="error-message">${err.message}</div>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h2>📄 All Pages</h2>
      <table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Load Time</th>
            <th>Errors</th>
            <th>Links Found</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(report.pages).map(([url, data]) => {
            let loadTimeClass = 'fast';
            if (data.loadTime > 3000) loadTimeClass = 'very-slow';
            else if (data.loadTime > 1000) loadTimeClass = 'slow';

            return `
            <tr>
              <td><div class="url">${url}</div></td>
              <td><span class="badge ${data.status}">${data.status}</span></td>
              <td class="load-time ${loadTimeClass}">${data.loadTime}ms</td>
              <td>${data.errors.length}</td>
              <td>${data.links.length}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

  </div>
</body>
</html>`;
}
