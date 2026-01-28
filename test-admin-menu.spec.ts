import { test, expect } from '@playwright/test'

test.describe('Admin Menu Navigation Tests', () => {
  const baseUrl = 'https://admin.solutionargentrapide.ca'

  // Liste de tous les liens du menu AdminNav
  const menuLinks = [
    { name: 'Dashboard', url: '/admin/dashboard' },
    { name: 'Messages', url: '/admin/dashboard?tab=messages' },
    { name: 'Analyses', url: '/admin/dashboard?tab=analyses' },
    { name: 'Télémétrie', url: '/admin/analytics' },
    { name: 'Downloads', url: '/admin/downloads' },
    { name: 'VoPay', url: '/admin/dashboard?tab=vopay' },
    { name: 'Contrats Clients', url: '/admin/contrats-clients' },
    { name: 'Templates', url: '/admin/contrats-signature' },
    { name: 'Support', url: '/admin/dashboard?tab=support' },
    { name: 'Webhooks', url: '/admin/webhooks' },
    { name: 'Blacklist', url: '/admin/blacklist' },
    { name: 'Explorer', url: '/admin/data-explorer' },
    { name: 'Performance', url: '/admin/performance' },
    { name: 'SEO', url: '/admin/seo' }
  ]

  test.beforeEach(async ({ page }) => {
    // Skip login for now, just test public access
    await page.goto(baseUrl)
  })

  for (const link of menuLinks) {
    test(`Should load ${link.name} without 404`, async ({ page }) => {
      const fullUrl = `${baseUrl}${link.url}`
      console.log(`Testing: ${link.name} - ${fullUrl}`)

      const response = await page.goto(fullUrl)

      // Check status code
      expect(response?.status()).not.toBe(404)

      // Check for common error indicators
      const bodyText = await page.textContent('body')
      expect(bodyText).not.toContain('404')
      expect(bodyText).not.toContain('Not Found')
      expect(bodyText).not.toContain('Page not found')

      // Check for local file references
      const html = await page.content()
      expect(html).not.toContain('file://')
      expect(html).not.toContain('/Users/')
      expect(html).not.toContain('Desktop')
      expect(html).not.toContain('Margiil Files')
      expect(html).not.toContain('margill')
      expect(html).not.toContain('Margill')

      // Take screenshot for visual verification
      await page.screenshot({
        path: `test-results/${link.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true
      })
    })
  }

  test('Should check for null values in visible text', async ({ page }) => {
    for (const link of menuLinks) {
      await page.goto(`${baseUrl}${link.url}`)

      const bodyText = await page.textContent('body')

      // Check for "null" appearing in user-visible text
      if (bodyText?.includes('null')) {
        console.error(`❌ Found "null" in ${link.name}: ${link.url}`)
        const nullElements = await page.locator(':text("null")').all()
        for (const el of nullElements) {
          const text = await el.textContent()
          console.error(`  - Element text: ${text}`)
        }
      }
    }
  })
})
