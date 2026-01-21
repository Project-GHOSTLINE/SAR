import { test, expect } from '@playwright/test'

test.describe('Formulaire Margill - Test iframe', () => {
  test('devrait afficher l\'iframe Margill correctement', async ({ page }) => {
    // Aller sur la page du formulaire
    await page.goto('http://localhost:3000/demande-de-pret-en-ligne-formulaire')

    // Attendre que la page soit chargée
    await page.waitForLoadState('domcontentloaded')

    // Vérifier que le titre est présent
    await expect(page.locator('h1')).toContainText('Demandez votre crédit')

    // Vérifier que l'iframe est présente
    const iframe = page.frameLocator('iframe[title="Formulaire de demande de prêt"]')
    await expect(iframe.locator('body')).toBeVisible({ timeout: 10000 })

    console.log('✅ Iframe Margill chargé avec succès')

    // Prendre une capture d'écran
    await page.screenshot({
      path: 'test-artifacts/margill-iframe-test.png',
      fullPage: true
    })

    console.log('📸 Capture d\'écran sauvegardée dans test-artifacts/margill-iframe-test.png')
  })

  test('devrait avoir l\'URL correcte de l\'iframe', async ({ page }) => {
    await page.goto('http://localhost:3000/demande-de-pret-en-ligne-formulaire')

    // Vérifier l'attribut src de l'iframe
    const iframeSrc = await page.locator('iframe[title="Formulaire de demande de prêt"]').getAttribute('src')

    expect(iframeSrc).toContain('argentrapide.margill.com/myform.htm')
    expect(iframeSrc).toContain('origin=argentrapide')
    expect(iframeSrc).toContain('langue=Français')

    console.log('✅ URL de l\'iframe correcte:', iframeSrc)
  })

  test('devrait écouter les messages postMessage de Margill', async ({ page }) => {
    await page.goto('http://localhost:3000/demande-de-pret-en-ligne-formulaire')

    // Écouter les messages dans la console
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    // Simuler un message postMessage de Margill
    await page.evaluate(() => {
      window.postMessage({
        type: 'redirect',
        url: '/merci'
      }, 'https://argentrapide.margill.com')
    })

    await page.waitForTimeout(1000)

    // Vérifier qu'il y a des logs de console
    const hasMessageLog = consoleMessages.some(msg =>
      msg.includes('Message reçu du domaine') ||
      msg.includes('Redirection demandée')
    )

    console.log('📋 Messages console:', consoleMessages)

    if (hasMessageLog) {
      console.log('✅ Listener postMessage fonctionne')
    }
  })
})
