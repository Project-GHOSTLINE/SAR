import puppeteer from 'puppeteer'

async function checkVoPayTab() {
  console.log('🚀 Lancement du navigateur...')
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.setViewport({ width: 1920, height: 1080 })

  console.log('📄 Navigation vers /admin/vopay...')
  await page.goto('https://solutionargentrapide.ca/admin/vopay', {
    waitUntil: 'networkidle0',
    timeout: 30000
  })

  // Attendre un peu
  await page.waitForTimeout(3000)

  // Prendre un screenshot
  await page.screenshot({ path: 'vopay-check.png', fullPage: true })
  console.log('📸 Screenshot sauvegardé: vopay-check.png')

  // Chercher le texte "Relevés Bancaires"
  const pageContent = await page.content()
  const hasRelevesTab = pageContent.includes('Relevés Bancaires')

  console.log(`\n✅ Résultat: ${hasRelevesTab ? 'Onglet "Relevés Bancaires" TROUVÉ ✅' : 'Onglet "Relevés Bancaires" NON TROUVÉ ❌'}`)

  // Chercher tous les boutons
  const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()).filter(Boolean))
  console.log('\n📋 Boutons trouvés sur la page:')
  buttons.forEach((btn, i) => console.log(`  ${i + 1}. ${btn}`))

  // Garder le navigateur ouvert 10 secondes pour inspection
  console.log('\n⏳ Navigateur restera ouvert 10 secondes...')
  await page.waitForTimeout(10000)

  await browser.close()
  console.log('✅ Test terminé!')
}

checkVoPayTab().catch(console.error)
