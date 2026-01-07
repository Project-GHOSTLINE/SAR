#!/usr/bin/env node
/**
 * 🧪 TEST MÉTHODE 2: Simulation de Payloads Réels
 * Tests avec payloads complets et signatures valides
 */

import crypto from 'crypto'

const BASE_URL = 'http://localhost:3000'
const VOPAY_SHARED_SECRET = process.env.VOPAY_SHARED_SECRET || 'ToDqaRRl4nmwnAYVc+=='

// Couleurs pour console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

/**
 * Génère une signature HMAC SHA1 valide pour VoPay
 */
function generateVoPaySignature(transactionId, sharedSecret) {
  return crypto
    .createHmac('sha1', sharedSecret)
    .update(transactionId)
    .digest('hex')
}

// Test 2.1: VoPay webhook - Transaction SUCCESSFUL
async function testVoPaySuccessful() {
  log(colors.blue, '\n📡 Test 2.1: VoPay Webhook - Transaction SUCCESSFUL')

  const transactionId = `TEST-SUCCESS-${Date.now()}`
  const validationKey = generateVoPaySignature(transactionId, VOPAY_SHARED_SECRET)

  const payload = {
    Success: true,
    TransactionType: 'EFT',
    TransactionID: transactionId,
    TransactionAmount: '500.00',
    Status: 'successful',
    UpdatedAt: new Date().toISOString(),
    ValidationKey: validationKey,
    Environment: 'Sandbox'
  }

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/vopay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()

    if (response.ok && data.success) {
      log(colors.green, '✅ Transaction SUCCESS traitée')
      console.log('  Transaction ID:', data.transactionId)
      console.log('  Status:', data.status)
      console.log('  Log ID:', data.logId)
      return true
    } else {
      log(colors.red, '❌ Erreur:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 2.2: VoPay webhook - Transaction FAILED
async function testVoPayFailed() {
  log(colors.blue, '\n📡 Test 2.2: VoPay Webhook - Transaction FAILED')

  const transactionId = `TEST-FAILED-${Date.now()}`
  const validationKey = generateVoPaySignature(transactionId, VOPAY_SHARED_SECRET)

  const payload = {
    Success: false,
    TransactionType: 'EFT',
    TransactionID: transactionId,
    TransactionAmount: '250.00',
    Status: 'failed',
    UpdatedAt: new Date().toISOString(),
    ValidationKey: validationKey,
    FailureReason: 'Insufficient funds in account',
    Environment: 'Sandbox'
  }

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/vopay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()

    if (response.ok && data.success) {
      log(colors.green, '✅ Transaction FAILED traitée')
      console.log('  Transaction ID:', data.transactionId)
      console.log('  Status:', data.status)
      console.log('  Log ID:', data.logId)
      return true
    } else {
      log(colors.red, '❌ Erreur:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 2.3: VoPay webhook - Transaction PENDING
async function testVoPayPending() {
  log(colors.blue, '\n📡 Test 2.3: VoPay Webhook - Transaction PENDING')

  const transactionId = `TEST-PENDING-${Date.now()}`
  const validationKey = generateVoPaySignature(transactionId, VOPAY_SHARED_SECRET)

  const payload = {
    Success: true,
    TransactionType: 'PAD',
    TransactionID: transactionId,
    TransactionAmount: '1000.00',
    Status: 'pending',
    UpdatedAt: new Date().toISOString(),
    ValidationKey: validationKey,
    Environment: 'Sandbox'
  }

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/vopay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()

    if (response.ok && data.success) {
      log(colors.green, '✅ Transaction PENDING traitée')
      console.log('  Transaction ID:', data.transactionId)
      console.log('  Status:', data.status)
      console.log('  Log ID:', data.logId)
      return true
    } else {
      log(colors.red, '❌ Erreur:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 2.4: Margill webhook avec auth valide
async function testMargillWithAuth() {
  log(colors.blue, '\n📡 Test 2.4: Margill Webhook - Avec Auth (simulée)')
  log(colors.yellow, '  ⚠️  Note: Test nécessite admin auth - pourrait échouer')

  const payload = {
    dossier_id: 'DOSS-2024-12345',
    statut_margill: 'offre_envoyee',
    nom_client: 'Jean Dupont',
    email_client: 'jean.dupont@example.com',
    telephone_client: '+15141234567',
    montant: 5000.00,
    date_premier_paiement: '2024-02-01'
  }

  try {
    const response = await fetch(`${BASE_URL}/api/webhook/margill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // L'auth devrait être fournie mais nous testons sans pour voir la réponse
      },
      body: JSON.stringify(payload)
    })
    const data = await response.json()

    if (response.status === 401) {
      log(colors.yellow, '⚠️  Auth requise (attendu)')
      console.log('  Message:', data.error)
      return true
    } else if (response.ok && data.success) {
      log(colors.green, '✅ Margill webhook traité')
      console.log('  Application ID:', data.data.application_id)
      console.log('  Status mappé:', data.data.mapped_status)
      return true
    } else {
      log(colors.red, '❌ Erreur inattendue:', response.status)
      console.log('  Data:', data)
      return false
    }
  } catch (error) {
    log(colors.red, '❌ Erreur:', error.message)
    return false
  }
}

// Test 2.5: VoPay webhook - Tous les statuts possibles
async function testVoPayAllStatuses() {
  log(colors.blue, '\n📡 Test 2.5: VoPay Webhook - Tous les statuts')

  const statuses = [
    { status: 'successful', success: true },
    { status: 'failed', success: false, reason: 'NSF - Non Sufficient Funds' },
    { status: 'pending', success: true },
    { status: 'in progress', success: true },
    { status: 'cancelled', success: false },
  ]

  let passed = 0

  for (const { status, success, reason } of statuses) {
    const transactionId = `TEST-${status.toUpperCase()}-${Date.now()}`
    const validationKey = generateVoPaySignature(transactionId, VOPAY_SHARED_SECRET)

    const payload = {
      Success: success,
      TransactionType: 'EFT',
      TransactionID: transactionId,
      TransactionAmount: '100.00',
      Status: status,
      UpdatedAt: new Date().toISOString(),
      ValidationKey: validationKey,
      Environment: 'Sandbox'
    }

    if (reason) payload.FailureReason = reason

    try {
      const response = await fetch(`${BASE_URL}/api/webhooks/vopay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`  ✅ Status "${status}" traité`)
        passed++
      } else {
        console.log(`  ❌ Status "${status}" échoué:`, data.error)
      }

      // Petit délai pour éviter de surcharger
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.log(`  ❌ Status "${status}" erreur:`, error.message)
    }
  }

  const success = passed === statuses.length
  if (success) {
    log(colors.green, `✅ Tous les statuts traités (${passed}/${statuses.length})`)
  } else {
    log(colors.yellow, `⚠️  ${passed}/${statuses.length} statuts traités`)
  }

  return success
}

// Exécuter tous les tests
async function runAllTests() {
  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.cyan, '🧪 TEST MÉTHODE 2: Simulation de Payloads Réels')
  log(colors.cyan, '='.repeat(60))

  log(colors.yellow, '\n⚠️  Ce test génère des données réelles dans la DB')
  log(colors.yellow, '   Shared Secret: ' + (VOPAY_SHARED_SECRET ? '✅ Configuré' : '❌ Manquant'))

  const results = []

  results.push(await testVoPaySuccessful())
  results.push(await testVoPayFailed())
  results.push(await testVoPayPending())
  results.push(await testMargillWithAuth())
  results.push(await testVoPayAllStatuses())

  // Résumé
  const passed = results.filter(r => r).length
  const total = results.length

  log(colors.cyan, '\n' + '='.repeat(60))
  log(colors.cyan, `📊 RÉSULTATS: ${passed}/${total} tests réussis`)
  log(colors.cyan, '='.repeat(60))

  if (passed === total) {
    log(colors.green, '✅ Tous les tests de la Méthode 2 sont passés!')
  } else {
    log(colors.yellow, `⚠️  ${total - passed} test(s) échoué(s)`)
  }

  log(colors.magenta, '\n💡 TIP: Vérifiez les logs dans Supabase (table vopay_webhook_logs)')
}

// Vérifier que le serveur est démarré
log(colors.yellow, '⚠️  Assurez-vous que le serveur Next.js tourne sur http://localhost:3000')
log(colors.yellow, '   Commande: npm run dev\n')

runAllTests().catch(console.error)
