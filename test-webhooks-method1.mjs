#!/usr/bin/env node
/**
 * 🧪 TEST MÉTHODE 1: Appels Directs avec Fetch
 * Tests basiques pour vérifier que les endpoints répondent
 */

const BASE_URL = 'http://localhost:3000'

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

// Test 1: GET sur VoPay webhook (vérifier qu'il est online)
async function testVoPayGET() {
  log(colors.blue, '\n📡 Test 1.1: GET /api/webhooks/vopay')
  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/vopay`)
    const data = await response.json()

    if (response.ok) {
      log(colors.green, '✅ Webhook VoPay est online')
      console.log('  Status:', data.status)
      console.log('  Endpoint:', data.endpoint)
      console.log('  Timestamp:', data.timestamp)
      return true
    } else {
      log(colors.red, '❌ Erreur:', response.status)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur de connexion:', error.message)
    return false
  }
}

// Test 2: POST minimal sur VoPay webhook (devrait échouer par manque de données)
async function testVoPayPOSTMinimal() {
  log(colors.blue, '\n📡 Test 1.2: POST /api/webhooks/vopay (minimal - devrait échouer)')
  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/vopay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await response.json()

    if (response.status === 400) {
      log(colors.green, '✅ Validation fonctionne (champs requis manquants)')
      console.log('  Erreur attendue:', data.error)
      return true
    } else {
      log(colors.yellow, '⚠️  Réponse inattendue:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 3: GET sur Debug webhook
async function testDebugWebhook() {
  log(colors.blue, '\n📡 Test 1.3: GET /api/admin/webhooks/debug')
  try {
    const response = await fetch(`${BASE_URL}/api/admin/webhooks/debug`)
    const data = await response.json()

    log(colors.green, '✅ Debug webhook accessible')
    console.log('  Supabase configuré:', data.hasSupabase ? '✅' : '❌')
    console.log('  URL configurée:', data.env.hasUrl ? '✅' : '❌')
    console.log('  Key configurée:', data.env.hasKey ? '✅' : '❌')

    if (data.query) {
      console.log('  Connexion DB:', data.query.success ? '✅' : '❌')
      console.log('  Nombre de logs:', data.query.count || 0)
    }

    return data.hasSupabase
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 4: POST sur Margill webhook (devrait échouer - auth requise)
async function testMargillPOSTNoAuth() {
  log(colors.blue, '\n📡 Test 1.4: POST /progression/api/webhook/margill (sans auth)')
  try {
    const response = await fetch(`${BASE_URL}/api/webhook/margill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossier_id: 'TEST-001',
        statut_margill: 'nouveau_dossier'
      })
    })
    const data = await response.json()

    if (response.status === 401) {
      log(colors.green, '✅ Protection auth fonctionne')
      console.log('  Erreur attendue:', data.error)
      return true
    } else {
      log(colors.yellow, '⚠️  Auth non requise? Status:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Exécuter tous les tests
async function runAllTests() {
  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.cyan, '🧪 TEST MÉTHODE 1: Appels Directs avec Fetch')
  log(colors.cyan, '='.repeat(60))

  const results = []

  results.push(await testVoPayGET())
  results.push(await testVoPayPOSTMinimal())
  results.push(await testDebugWebhook())
  results.push(await testMargillPOSTNoAuth())

  // Résumé
  const passed = results.filter(r => r).length
  const total = results.length

  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.cyan, `📊 RÉSULTATS: ${passed}/${total} tests réussis`)
  log(colors.cyan, '='.repeat(60))

  if (passed === total) {
    log(colors.green, '✅ Tous les tests de la Méthode 1 sont passés!')
  } else {
    log(colors.yellow, `⚠️  ${total - passed} test(s) échoué(s)`)
  }
}

// Vérifier que le serveur est démarré
log(colors.yellow, '⚠️  Assurez-vous que le serveur Next.js tourne sur http://localhost:3000')
log(colors.yellow, '   Commande: npm run dev\n')

runAllTests().catch(console.error)
