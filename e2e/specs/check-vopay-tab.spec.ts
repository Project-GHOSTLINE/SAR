import { test, expect } from '@playwright/test'

test('Check VoPay Relevés Bancaires tab', async ({ page }) => {
  // Aller sur la page VoPay admin
  await page.goto('https://solutionargentrapide.ca/admin/vopay')

  // Attendre le chargement de la page
  await page.waitForTimeout(3000)

  // Prendre un screenshot de la page complète
  await page.screenshot({ path: 'vopay-page-full.png', fullPage: true })
  console.log('Screenshot complet sauvegardé: vopay-page-full.png')

  // Chercher l'onglet "Relevés Bancaires"
  const relevesTab = page.getByText('Relevés Bancaires')
  const isVisible = await relevesTab.isVisible().catch(() => false)

  console.log(`Onglet "Relevés Bancaires" visible: ${isVisible}`)

  if (isVisible) {
    // Cliquer sur l'onglet
    await relevesTab.click()
    await page.waitForTimeout(2000)

    // Prendre un screenshot après le clic
    await page.screenshot({ path: 'vopay-releves-tab.png', fullPage: true })
    console.log('Screenshot de l\'onglet Relevés Bancaires sauvegardé: vopay-releves-tab.png')

    // Vérifier la présence de l'iframe
    const iframe = page.locator('iframe[title="Relevés Bancaires 2025"]')
    const iframeVisible = await iframe.isVisible().catch(() => false)
    console.log(`Iframe visible: ${iframeVisible}`)
  } else {
    console.log('❌ Onglet "Relevés Bancaires" NON TROUVÉ')

    // Lister tous les boutons visibles
    const buttons = await page.locator('button').allTextContents()
    console.log('Boutons trouvés sur la page:', buttons)
  }
})
