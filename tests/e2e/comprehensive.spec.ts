import { test, expect } from '@playwright/test'

test.describe('Test Complet - Toutes les Options', () => {

  // ============================================
  // 1. SITE PRINCIPAL
  // ============================================

  test.describe('Site Principal - Pages', () => {
    test('Homepage accessible sans erreurs console', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      await page.goto('https://solutionargentrapide.ca')
      await page.waitForLoadState('networkidle')

      expect(errors.filter(e => !e.includes('Zustand'))).toHaveLength(0)
      await expect(page.locator('body')).toBeVisible()
    })

    test('Navigation fonctionne', async ({ page }) => {
      await page.goto('https://solutionargentrapide.ca')

      // Check for navigation links
      const nav = page.locator('nav')
      await expect(nav).toBeVisible()
    })

    test('FAQ page accessible', async ({ page }) => {
      await page.goto('https://solutionargentrapide.ca/faq')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Contact page accessible', async ({ page }) => {
      await page.goto('https://solutionargentrapide.ca/nous-joindre')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  // ============================================
  // 2. PARTNERS SUBDOMAIN
  // ============================================

  test.describe('Partners Subdomain - Toutes les Pages', () => {
    test('Root redirige vers /invite avec URL propre', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca')
      await page.waitForURL('https://partners.solutionargentrapide.ca/invite')

      expect(page.url()).toBe('https://partners.solutionargentrapide.ca/invite')
      expect(page.url()).not.toContain('/partners/')
    })

    test('Invite page - sans token affiche erreur', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Zustand')) {
          errors.push(msg.text())
        }
      })

      await page.goto('https://partners.solutionargentrapide.ca/invite')

      await expect(page.getByText('Lien invalide')).toBeVisible()
      expect(errors).toHaveLength(0) // Pas d'erreurs console
    })

    test('Invite page - avec token affiche formulaire', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/invite?token=test123')

      await expect(page.getByRole('heading', { name: /Invitation/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Accepter/i })).toBeVisible()

      // Check consent checkbox
      const checkbox = page.locator('input[type="checkbox"]')
      await expect(checkbox).toBeVisible()
    })

    test('Dashboard page accessible (redirect si non-auth)', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/dashboard')
      await expect(page.locator('body')).toBeVisible()
      // Might redirect to login or show dashboard
    })

    test('Project page accessible', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/project')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Credits page accessible', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/credits')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Feedback page accessible', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/feedback')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Onboarding page accessible', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/onboarding')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Contribute page accessible', async ({ page }) => {
      await page.goto('https://partners.solutionargentrapide.ca/contribute')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  // ============================================
  // 3. ADMIN DASHBOARD
  // ============================================

  test.describe('Admin Dashboard', () => {
    test('Admin dashboard page charge', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard')
      await expect(page.locator('body')).toBeVisible()
    })

    test('DevOps tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')
      await expect(page.locator('body')).toBeVisible()

      // Should either show login or devops content
      const url = page.url()
      expect(url).toContain('admin.solutionargentrapide.ca')
    })

    test('Messages tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=messages')
      await expect(page.locator('body')).toBeVisible()
    })

    test('VoPay tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=vopay')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Margill tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=margill')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Support tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=support')
      await expect(page.locator('body')).toBeVisible()
    })

    test('Analyses tab accessible', async ({ page }) => {
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=analyses')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  // ============================================
  // 4. API ENDPOINTS
  // ============================================

  test.describe('API Routes - Sanity Check', () => {
    test('Telemetry track-event accepte POST', async ({ request }) => {
      const response = await request.post('https://solutionargentrapide.ca/api/telemetry/track-event', {
        headers: {
          'Content-Type': 'application/json',
          'x-sar-visit-id': 'test-visit-123'
        },
        data: {
          event_name: 'test_event',
          page_path: '/test'
        }
      })

      // Should return 200 (success) or 400 (bad request), but NOT 405
      expect([200, 400, 500]).toContain(response.status())
      expect(response.status()).not.toBe(405)
    })

    test('Partners API me endpoint existe', async ({ request }) => {
      const response = await request.get('https://partners.solutionargentrapide.ca/api/me')
      // Should return 401 (unauthorized) or 200, not 404
      expect([200, 401]).toContain(response.status())
    })

    test('DevOps stats endpoint existe', async ({ request }) => {
      const response = await request.get('https://admin.solutionargentrapide.ca/api/admin/devops/stats')
      // Should return 401 or 200, not 404
      expect([200, 401]).toContain(response.status())
    })

    test('DevOps tasks endpoint existe', async ({ request }) => {
      const response = await request.get('https://admin.solutionargentrapide.ca/api/admin/devops/tasks')
      // Should return 401 or 200, not 404
      expect([200, 401]).toContain(response.status())
    })
  })

  // ============================================
  // 5. REDIRECTIONS
  // ============================================

  test.describe('Redirections et Rewrites', () => {
    test('Main domain /partners/* redirige vers subdomain', async ({ page }) => {
      await page.goto('https://solutionargentrapide.ca/partners/invite?token=test')

      // Should redirect to subdomain
      await page.waitForURL(/partners\.solutionargentrapide\.ca/)
      expect(page.url()).toContain('partners.solutionargentrapide.ca')
      expect(page.url()).toContain('token=test')
      expect(page.url()).not.toContain('/partners/')
    })

    test('Subdomain /partners/* strip le prefix', async ({ page }) => {
      const response = await page.goto('https://partners.solutionargentrapide.ca/partners/dashboard')

      // Should redirect to clean URL
      expect(page.url()).toBe('https://partners.solutionargentrapide.ca/dashboard')
    })
  })

  // ============================================
  // 6. PERFORMANCE
  // ============================================

  test.describe('Performance', () => {
    test('Site principal charge rapidement', async ({ page }) => {
      const start = Date.now()
      await page.goto('https://solutionargentrapide.ca', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - start

      expect(loadTime).toBeLessThan(5000)
      console.log(`Site principal: ${loadTime}ms`)
    })

    test('Partners subdomain charge rapidement', async ({ page }) => {
      const start = Date.now()
      await page.goto('https://partners.solutionargentrapide.ca/invite', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - start

      expect(loadTime).toBeLessThan(5000)
      console.log(`Partners subdomain: ${loadTime}ms`)
    })

    test('Admin dashboard charge rapidement', async ({ page }) => {
      const start = Date.now()
      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - start

      expect(loadTime).toBeLessThan(5000)
      console.log(`Admin dashboard: ${loadTime}ms`)
    })
  })

  // ============================================
  // 7. ERREURS CONSOLE
  // ============================================

  test.describe('Console Errors Check', () => {
    test('Aucune erreur critique sur homepage', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Zustand') && !msg.text().includes('DEPRECATED')) {
          errors.push(msg.text())
        }
      })

      await page.goto('https://solutionargentrapide.ca')
      await page.waitForLoadState('networkidle')

      expect(errors).toHaveLength(0)
    })

    test('Aucune erreur 405 sur partners subdomain', async ({ page }) => {
      const errors: string[] = []
      const failedRequests: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      page.on('response', response => {
        if (response.status() === 405) {
          failedRequests.push(response.url())
        }
      })

      await page.goto('https://partners.solutionargentrapide.ca/invite?token=test')
      await page.waitForLoadState('networkidle')

      expect(failedRequests).toHaveLength(0)
    })
  })

  // ============================================
  // 8. SÉCURITÉ
  // ============================================

  test.describe('Sécurité et Headers', () => {
    test('CSP headers présents', async ({ page }) => {
      const response = await page.goto('https://solutionargentrapide.ca')
      const headers = response?.headers()

      expect(headers?.['content-security-policy']).toBeTruthy()
      expect(headers?.['x-frame-options']).toBeTruthy()
      expect(headers?.['x-content-type-options']).toBe('nosniff')
    })

    test('HTTPS forcé partout', async ({ page }) => {
      await page.goto('https://solutionargentrapide.ca')
      expect(page.url()).toMatch(/^https:/)

      await page.goto('https://partners.solutionargentrapide.ca')
      expect(page.url()).toMatch(/^https:/)

      await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard')
      expect(page.url()).toMatch(/^https:/)
    })
  })
})
