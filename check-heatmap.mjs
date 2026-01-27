import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('https://admin.solutionargentrapide.ca/admin/analytics', {
  waitUntil: 'networkidle',
  timeout: 30000
});

// Scroll to heatmap
await page.evaluate(() => {
  const heatmap = document.querySelector('h2:has-text("Heatmap d\'Activité")');
  if (heatmap) heatmap.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

await page.waitForTimeout(2000);

// Count colored cells
const cells = await page.$$eval('[class*="bg-green"]', (elements) => {
  return elements.map(el => ({
    class: el.className,
    text: el.textContent.trim(),
    visible: el.offsetWidth > 0 && el.offsetHeight > 0
  }));
});

console.log('Total green cells found:', cells.length);
console.log('Cells with text (events):', cells.filter(c => c.text).length);
console.log('\nCells by color:');
console.log('  bg-green-100 (très pâle):', cells.filter(c => c.class.includes('bg-green-100')).length);
console.log('  bg-green-200 (pâle):', cells.filter(c => c.class.includes('bg-green-200')).length);
console.log('  bg-green-400 (moyen):', cells.filter(c => c.class.includes('bg-green-400')).length);
console.log('  bg-green-600 (foncé):', cells.filter(c => c.class.includes('bg-green-600')).length);

// Take screenshot
await page.screenshot({ path: '/Users/xunit/Desktop/heatmap-debug.png', fullPage: true });
console.log('\nScreenshot saved to Desktop/heatmap-debug.png');

await browser.close();
