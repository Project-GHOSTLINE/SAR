import { chromium } from 'playwright';

async function inspectCreditSecoursIframe() {
  console.log('🔍 Inspection de la page creditsecours.com...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Aller sur la page du formulaire
    console.log('📄 Navigation vers la page du formulaire...');
    await page.goto('https://www.creditsecours.com/demande-de-pret-en-ligne-formulaire/', {
      waitUntil: 'load',
      timeout: 60000
    });

    // Attendre un peu pour laisser le temps aux scripts de s'exécuter
    await page.waitForTimeout(3000);

    // Chercher tous les iframes
    const iframes = await page.$$('iframe');
    console.log(`\n📊 Nombre d'iframes trouvés: ${iframes.length}\n`);

    if (iframes.length === 0) {
      console.log('❌ Aucun iframe trouvé sur la page');

      // Afficher le HTML de la page pour debug
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.log('\n📝 Extrait du HTML du body (premiers 2000 caractères):');
      console.log(bodyHTML.substring(0, 2000));

      return;
    }

    // Pour chaque iframe trouvé
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i];

      const iframeDetails = await page.evaluate((element) => {
        return {
          src: element.getAttribute('src'),
          width: element.getAttribute('width'),
          height: element.getAttribute('height'),
          style: element.getAttribute('style'),
          class: element.getAttribute('class'),
          id: element.getAttribute('id'),
          name: element.getAttribute('name'),
          frameborder: element.getAttribute('frameborder'),
          scrolling: element.getAttribute('scrolling'),
          allow: element.getAttribute('allow'),
          outerHTML: element.outerHTML.substring(0, 500)
        };
      }, iframe);

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 IFRAME #${i + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔗 SRC: ${iframeDetails.src || 'N/A'}`);
      console.log(`📐 WIDTH: ${iframeDetails.width || 'N/A'}`);
      console.log(`📐 HEIGHT: ${iframeDetails.height || 'N/A'}`);
      console.log(`🎨 STYLE: ${iframeDetails.style || 'N/A'}`);
      console.log(`🏷️  CLASS: ${iframeDetails.class || 'N/A'}`);
      console.log(`🆔 ID: ${iframeDetails.id || 'N/A'}`);
      console.log(`📛 NAME: ${iframeDetails.name || 'N/A'}`);
      console.log(`🖼️  FRAMEBORDER: ${iframeDetails.frameborder || 'N/A'}`);
      console.log(`📜 SCROLLING: ${iframeDetails.scrolling || 'N/A'}`);
      console.log(`🔐 ALLOW: ${iframeDetails.allow || 'N/A'}`);
      console.log(`\n📄 HTML (extrait):`);
      console.log(iframeDetails.outerHTML);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    // Chercher des scripts qui pourraient créer l'iframe dynamiquement
    console.log('\n🔎 Recherche de scripts créant des iframes...\n');
    const scripts = await page.evaluate(() => {
      const allScripts = Array.from(document.querySelectorAll('script'));
      return allScripts
        .map(script => script.textContent || script.innerHTML)
        .filter(content => content && (
          content.includes('iframe') ||
          content.includes('margill') ||
          content.includes('creditsecours.margill.com')
        ))
        .map(content => content.substring(0, 500));
    });

    if (scripts.length > 0) {
      console.log(`📜 Scripts trouvés (${scripts.length}):`);
      scripts.forEach((script, index) => {
        console.log(`\n--- Script #${index + 1} ---`);
        console.log(script);
      });
    }

    // Attendre 10 secondes pour inspection manuelle
    console.log('\n⏳ Attente de 10 secondes pour inspection visuelle...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
  }
}

inspectCreditSecoursIframe();
