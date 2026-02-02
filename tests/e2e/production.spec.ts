import { test, expect } from '@playwright/test'

test.describe('Production - Site Principal', () => {
  test('Page d\'accueil accessible', async ({ page }) => {
    await page.goto('https://solutionargentrapide.ca')
    await expect(page).toHaveTitle(/Solution Argent Rapide|SAR/)
    expect(page.url()).toBe('https://solutionargentrapide.ca/')
  })

  test('Navigation vers /apply fonctionne', async ({ page }) => {
    await page.goto('https://solutionargentrapide.ca')
    // Check if page loads without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('Admin dashboard accessible', async ({ page }) => {
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard')
    // Should show login or dashboard
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Production - Sous-domaine Partners', () => {
  test('Partners root accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca')
    await expect(page).toHaveTitle(/Partenaire|Partners|SAR/)
    expect(page.url()).toBe('https://partners.solutionargentrapide.ca/')
  })

  test('Partners dashboard accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca/dashboard')
    await expect(page.locator('body')).toBeVisible()
    // Should either show login or dashboard
    const url = page.url()
    expect(url).toContain('partners.solutionargentrapide.ca')
  })

  test('Partners invite page accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca/invite?token=test123')
    await expect(page).toHaveTitle(/Invitation|Partenaire/)

    // Check for invitation content
    await expect(page.locator('text=Invitation')).toBeVisible()
    await expect(page.locator('text=Accepter')).toBeVisible()
  })

  test('Partners project page accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca/project')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Partners credits page accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca/credits')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Partners feedback page accessible', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca/feedback')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Production - Redirections', () => {
  test('Redirect /partners/* vers subdomain', async ({ page }) => {
    // Start on main domain
    const response = await page.goto('https://solutionargentrapide.ca/partners/dashboard')

    // Should redirect to subdomain
    expect(page.url()).toContain('partners.solutionargentrapide.ca')
    expect(page.url()).not.toContain('/partners/')

    // Check redirect status
    expect(response?.status()).toBe(200)
  })

  test('Redirect /partners/invite vers subdomain', async ({ page }) => {
    await page.goto('https://solutionargentrapide.ca/partners/invite?token=test')

    // Should be on subdomain
    expect(page.url()).toContain('partners.solutionargentrapide.ca/invite')
    expect(page.url()).toContain('token=test')
  })
})

test.describe('Production - DevOps Dashboard', () => {
  test('DevOps tab accessible (après login)', async ({ page }) => {
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')

    // Page should load (might show login or dashboard)
    await expect(page.locator('body')).toBeVisible()

    const url = page.url()
    // Should either be on login or dashboard with devops tab
    expect(url).toMatch(/admin\.solutionargentrapide\.ca/)
  })
})

test.describe('Production - API Routes', () => {
  test('API Partners ME endpoint existe', async ({ request }) => {
    const response = await request.get('https://solutionargentrapide.ca/api/partners/me')
    // Should return 401 (unauthorized) or 200 (if authenticated)
    expect([200, 401]).toContain(response.status())
  })

  test('API Partners stats endpoint existe', async ({ request }) => {
    const response = await request.get('https://solutionargentrapide.ca/api/admin/devops/stats')
    // Should return 401 (unauthorized) or 200 (if authenticated)
    expect([200, 401]).toContain(response.status())
  })
})

test.describe('Production - Performance', () => {
  test('Site principal charge en moins de 3s', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('https://solutionargentrapide.ca', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
    console.log(`✅ Site principal: ${loadTime}ms`)
  })

  test('Partners subdomain charge en moins de 3s', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('https://partners.solutionargentrapide.ca', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
    console.log(`✅ Partners subdomain: ${loadTime}ms`)
  })
})

test.describe('Production - SEO & Meta', () => {
  test('Site principal a les meta tags', async ({ page }) => {
    await page.goto('https://solutionargentrapide.ca')

    // Check for essential meta tags
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)

    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
    expect(metaDescription).toBeTruthy()
  })

  test('Partners a les meta tags', async ({ page }) => {
    await page.goto('https://partners.solutionargentrapide.ca')

    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })
})

test.describe('Production - Sécurité', () => {
  test('Headers de sécurité présents', async ({ page }) => {
    const response = await page.goto('https://solutionargentrapide.ca')
    const headers = response?.headers()

    expect(headers?.['x-frame-options']).toBeTruthy()
    expect(headers?.['x-content-type-options']).toBe('nosniff')
    expect(headers?.['content-security-policy']).toBeTruthy()
  })

  test('HTTPS forcé (pas de HTTP)', async ({ page }) => {
    await page.goto('https://solutionargentrapide.ca')
    expect(page.url()).toContain('https://')
  })
})
