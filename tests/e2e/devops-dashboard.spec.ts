import { test, expect } from '@playwright/test'

test.describe('DevOps Dashboard - Tests Complets', () => {

  // Note: Ces tests nécessitent d'être authentifié comme admin
  // Pour l'instant, on teste juste que les pages chargent sans erreurs

  test('DevOps dashboard accessible depuis admin', async ({ page }) => {
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')

    // Page should load (might show login or dashboard)
    await expect(page.locator('body')).toBeVisible()

    // Check URL contains devops tab
    expect(page.url()).toContain('tab=devops')
  })

  test('Aucune erreur console sur DevOps tab', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Zustand') && !msg.text().includes('DEPRECATED')) {
        errors.push(msg.text())
      }
    })

    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')
    await page.waitForLoadState('networkidle')

    // Should have no critical console errors
    expect(errors.filter(e => !e.includes('401') && !e.includes('403'))).toHaveLength(0)
  })

  test('DevOps API stats endpoint répond', async ({ request }) => {
    const response = await request.get('https://admin.solutionargentrapide.ca/api/admin/devops/stats')

    // Should return 200 (with auth) or 401 (without auth), but not 404 or 500
    expect([200, 401]).toContain(response.status())
  })

  test('DevOps API tasks endpoint répond', async ({ request }) => {
    const response = await request.get('https://admin.solutionargentrapide.ca/api/admin/devops/tasks')

    // Should return 200 (with auth) or 401 (without auth), but not 404 or 500
    expect([200, 401]).toContain(response.status())
  })

  test('DevOps API tasks POST endpoint existe', async ({ request }) => {
    const response = await request.post('https://admin.solutionargentrapide.ca/api/admin/devops/tasks', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        title: 'Test task',
        task_type: 'todo',
        department: 'infrastructure',
        priority: 'low'
      }
    })

    // Should return 401 (no auth) or 200/201 (success), but not 404 or 405
    expect([200, 201, 401, 400]).toContain(response.status())
    expect(response.status()).not.toBe(404)
    expect(response.status()).not.toBe(405)
  })

  test('Navigation entre onglets admin fonctionne', async ({ page }) => {
    // Start at dashboard
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Try to navigate to devops (might be blocked by auth, but URL should change)
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')
    expect(page.url()).toContain('tab=devops')

    // Try messages tab
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=messages')
    expect(page.url()).toContain('tab=messages')

    // Back to devops
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')
    expect(page.url()).toContain('tab=devops')
  })

  test('Performance: DevOps tab charge rapidement', async ({ page }) => {
    const start = Date.now()
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops', {
      waitUntil: 'domcontentloaded'
    })
    const loadTime = Date.now() - start

    expect(loadTime).toBeLessThan(5000)
    console.log(`DevOps dashboard load time: ${loadTime}ms`)
  })
})

test.describe('DevOps Dashboard - Avec Authentification', () => {
  // Ces tests nécessitent d'être connecté
  // On vérifie juste la structure sans données sensibles

  test.skip('Stats cards visibles (requires auth)', async ({ page }) => {
    // Skip for now - requires authentication
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')

    // If authenticated, should see stats cards
    const statsCards = page.locator('[data-testid="stats-card"]')
    // await expect(statsCards).toBeVisible()
  })

  test.skip('Task list visible (requires auth)', async ({ page }) => {
    // Skip for now - requires authentication
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')

    // If authenticated, should see task list
    const taskList = page.locator('[data-testid="task-list"]')
    // await expect(taskList).toBeVisible()
  })

  test.skip('Charts visible (requires auth)', async ({ page }) => {
    // Skip for now - requires authentication
    await page.goto('https://admin.solutionargentrapide.ca/admin/dashboard?tab=devops')

    // If authenticated, should see charts
    const charts = page.locator('canvas, svg')
    // await expect(charts.first()).toBeVisible()
  })
})
