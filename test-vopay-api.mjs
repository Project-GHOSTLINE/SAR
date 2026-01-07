#!/usr/bin/env node
/**
 * Test direct de l'API VoPay
 * Vérifie les credentials et la connexion
 */

import crypto from 'crypto'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '.env.local') })

const VOPAY_ACCOUNT_ID = process.env.VOPAY_ACCOUNT_ID
const VOPAY_API_KEY = process.env.VOPAY_API_KEY
const VOPAY_SHARED_SECRET = process.env.VOPAY_SHARED_SECRET
const VOPAY_API_URL = process.env.VOPAY_API_URL || 'https://earthnode.vopay.com/api/v2/'

console.log('\n🔍 Test de l\'API VoPay\n')
console.log('Configuration:')
console.log('  Account ID:', VOPAY_ACCOUNT_ID ? '✓' : '✗')
console.log('  API Key:', VOPAY_API_KEY ? '✓' : '✗')
console.log('  Shared Secret:', VOPAY_SHARED_SECRET ? '✓' : '✗')
console.log('  API URL:', VOPAY_API_URL)
console.log('')

if (!VOPAY_ACCOUNT_ID || !VOPAY_API_KEY || !VOPAY_SHARED_SECRET) {
  console.error('❌ Credentials VoPay manquants!')
  process.exit(1)
}

/**
 * Génère la signature SHA1 pour l'authentification VoPay
 */
function generateSignature() {
  const today = new Date().toISOString().split('T')[0]
  const signatureString = VOPAY_API_KEY + VOPAY_SHARED_SECRET + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

/**
 * Test 1: Vérifier le solde
 */
async function testBalance() {
  console.log('📊 Test 1: Récupération du solde...')

  try {
    const signature = generateSignature()
    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature
    })

    const url = `${VOPAY_API_URL}account/balance?${params.toString()}`

    console.log('  URL:', url.replace(VOPAY_API_KEY, 'API_KEY_HIDDEN'))

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('  Status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error('  ❌ Erreur:', error)
      return false
    }

    const data = await response.json()

    if (data.Success === false) {
      console.error('  ❌ VoPay Error:', data.ErrorMessage)
      return false
    }

    console.log('  ✅ Succès!')
    console.log('  Solde disponible:', data.AvailableFunds, data.Currency)
    console.log('  Solde total:', data.AccountBalance, data.Currency)
    console.log('  Fonds en attente:', data.PendingFunds, data.Currency)
    return true

  } catch (error) {
    console.error('  ❌ Exception:', error.message)
    return false
  }
}

/**
 * Test 2: Vérifier les transactions récentes
 */
async function testTransactions() {
  console.log('\n📜 Test 2: Récupération des transactions...')

  try {
    const signature = generateSignature()

    // Calculer les dates (30 derniers jours)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const startDateStr = startDate.toISOString().split('T')[0]

    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature,
      NumberOfTransactions: '5',
      StartDateTime: startDateStr,
      EndDateTime: endDate
    })

    const url = `${VOPAY_API_URL}account/transactions?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('  Status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error('  ❌ Erreur:', error)
      return false
    }

    const data = await response.json()

    if (data.Success === false) {
      console.error('  ❌ VoPay Error:', data.ErrorMessage)
      return false
    }

    const transactions = data.Transactions || {}
    const transactionArray = Object.values(transactions)

    console.log('  ✅ Succès!')
    console.log('  Nombre de transactions:', transactionArray.length)

    if (transactionArray.length > 0) {
      console.log('\n  Dernières transactions:')
      transactionArray.slice(0, 3).forEach((tx, i) => {
        console.log(`    ${i + 1}. ${tx.TransactionID || tx.transaction_id}`)
        console.log(`       Montant: ${tx.Amount || tx.amount}`)
        console.log(`       Statut: ${tx.Status || tx.status}`)
      })
    }

    return true

  } catch (error) {
    console.error('  ❌ Exception:', error.message)
    return false
  }
}

/**
 * Exécution des tests
 */
async function runTests() {
  const test1 = await testBalance()
  const test2 = await testTransactions()

  console.log('\n' + '='.repeat(50))
  console.log('Résultat des tests:')
  console.log('  Balance:', test1 ? '✅' : '❌')
  console.log('  Transactions:', test2 ? '✅' : '❌')
  console.log('='.repeat(50))

  if (test1 && test2) {
    console.log('\n✅ Tous les tests réussis! L\'API VoPay fonctionne correctement.')
    process.exit(0)
  } else {
    console.log('\n❌ Certains tests ont échoué. Vérifiez les credentials et l\'API URL.')
    process.exit(1)
  }
}

runTests()
