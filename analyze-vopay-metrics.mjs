#!/usr/bin/env node
/**
 * 🔬 ANALYSE COMPLÈTE DES MÉTRIQUES VOPAY - MODE INGÉNIEUR
 *
 * Ce script teste TOUS les endpoints VoPay disponibles et identifie:
 * ✅ Métriques fonctionnelles
 * ❌ Métriques non-fonctionnelles
 * 📊 Données disponibles
 * ⚠️  Limitations et erreurs
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '.env.local') })

const VOPAY_ACCOUNT_ID = process.env.VOPAY_ACCOUNT_ID
const VOPAY_API_KEY = process.env.VOPAY_API_KEY
const VOPAY_SHARED_SECRET = process.env.VOPAY_SHARED_SECRET
const VOPAY_API_URL = process.env.VOPAY_API_URL || 'https://earthnode-api.vopay.com/api/v2/'

if (!VOPAY_ACCOUNT_ID || !VOPAY_API_KEY || !VOPAY_SHARED_SECRET) {
  console.error('❌ Credentials VoPay manquantes!')
  process.exit(1)
}

console.log('🔬 ANALYSE COMPLÈTE DES MÉTRIQUES VOPAY\n')
console.log('='.repeat(80))

// Générer signature VoPay
function generateSignature() {
  const today = new Date().toISOString().split('T')[0]
  const signatureString = VOPAY_API_KEY + VOPAY_SHARED_SECRET + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

// Métriques à tester
const metrics = {
  balance: {
    name: 'Account Balance',
    endpoint: 'account/balance',
    fields: [
      'AccountBalance', 'PendingFunds', 'SecurityDeposit', 'Reserve',
      'AvailableImmediately', 'AvailableFunds', 'OffbookBalance',
      'Currency', 'AsOfDate'
    ]
  },
  transactions: {
    name: 'Transaction History',
    endpoint: 'account/transactions',
    fields: [
      'TransactionID', 'AccountName', 'TransactionDateTime', 'SettlementDate',
      'TransactionType', 'TransactionStatus', 'DebitAmount', 'CreditAmount',
      'HoldAmount', 'ConvenienceFeeAmount', 'FullName', 'WalletName1',
      'WalletName2', 'ClientAccountID', 'ParentTransactionID',
      'ChildTransactionIDs', 'TransactionErrorCode', 'TransactionFailureReason'
    ]
  },
  accountInfo: {
    name: 'Account Information',
    endpoint: 'account/info',
    fields: ['CompanyName', 'AccountStatus', 'AccountType', 'CreatedDate']
  },
  transactionDetails: {
    name: 'Transaction Details',
    endpoint: 'account/transaction-details',
    fields: ['Detailed transaction info']
  },
  dailyLimits: {
    name: 'Daily Limits',
    endpoint: 'account/limits',
    fields: ['DailyLimit', 'RemainingLimit', 'UsedAmount']
  },
  scheduledTransactions: {
    name: 'Scheduled Transactions',
    endpoint: 'account/scheduled-transactions',
    fields: ['ScheduledTransactionID', 'NextRunDate', 'Frequency']
  },
  webhookLogs: {
    name: 'Webhook Logs',
    endpoint: 'webhooks/logs',
    fields: ['WebhookID', 'Status', 'RetryCount']
  }
}

const results = {
  functional: [],
  nonFunctional: [],
  partial: []
}

// Test endpoint
async function testEndpoint(name, endpoint, requireParams = false) {
  try {
    const signature = generateSignature()
    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature
    })

    // Pour transactions, ajouter dates
    if (endpoint === 'account/transactions') {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      params.set('StartDateTime', startDate.toISOString().split('T')[0])
      params.set('EndDateTime', endDate)
      params.set('NumberOfTransactions', '5')
    }

    const url = `${VOPAY_API_URL}${endpoint}?${params.toString()}`

    console.log(`\n📡 Testing: ${name}`)
    console.log(`   Endpoint: /${endpoint}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    const data = await response.json()

    if (response.ok && data.Success) {
      console.log(`   ✅ SUCCESS`)

      // Analyser les champs disponibles
      const availableFields = []
      const sampleData = endpoint === 'account/transactions'
        ? Object.values(data.Transactions || {})[0]
        : data

      if (sampleData) {
        Object.keys(sampleData).forEach(key => {
          if (key !== 'Success' && key !== 'ErrorMessage') {
            const value = sampleData[key]
            if (value !== null && value !== undefined && value !== '') {
              availableFields.push(`${key}: ${value}`)
            }
          }
        })
      }

      results.functional.push({
        name,
        endpoint,
        status: 'operational',
        fields: availableFields
      })

      console.log(`   📊 Fields disponibles: ${availableFields.length}`)
      if (availableFields.length > 0) {
        availableFields.slice(0, 3).forEach(field => {
          console.log(`      - ${field}`)
        })
        if (availableFields.length > 3) {
          console.log(`      ... et ${availableFields.length - 3} autres`)
        }
      }

      return { success: true, data, fields: availableFields }
    } else {
      console.log(`   ❌ FAILED: ${data.ErrorMessage || 'Unknown error'}`)
      results.nonFunctional.push({
        name,
        endpoint,
        status: 'non-operational',
        error: data.ErrorMessage || response.statusText
      })

      return { success: false, error: data.ErrorMessage }
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`)
    results.nonFunctional.push({
      name,
      endpoint,
      status: 'error',
      error: error.message
    })

    return { success: false, error: error.message }
  }
}

// Test tous les endpoints
async function testAllMetrics() {
  console.log('\n\n🧪 PHASE 1: TEST DES ENDPOINTS PRINCIPAUX\n')
  console.log('-'.repeat(80))

  // Test Balance
  await testEndpoint(metrics.balance.name, metrics.balance.endpoint)

  // Test Transactions
  await testEndpoint(metrics.transactions.name, metrics.transactions.endpoint, true)

  console.log('\n\n🧪 PHASE 2: TEST DES ENDPOINTS SECONDAIRES\n')
  console.log('-'.repeat(80))

  // Test Account Info
  await testEndpoint(metrics.accountInfo.name, metrics.accountInfo.endpoint)

  // Test Daily Limits
  await testEndpoint(metrics.dailyLimits.name, metrics.dailyLimits.endpoint)

  // Test Scheduled Transactions
  await testEndpoint(metrics.scheduledTransactions.name, metrics.scheduledTransactions.endpoint)

  // Test Webhook Logs
  await testEndpoint(metrics.webhookLogs.name, metrics.webhookLogs.endpoint)
}

// Générer rapport final
function generateReport() {
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RAPPORT FINAL - MÉTRIQUES VOPAY')
  console.log('='.repeat(80))

  console.log(`\n✅ MÉTRIQUES FONCTIONNELLES (${results.functional.length}):`)
  console.log('-'.repeat(80))
  results.functional.forEach(metric => {
    console.log(`\n📌 ${metric.name}`)
    console.log(`   Endpoint: /${metric.endpoint}`)
    console.log(`   Status: ${metric.status.toUpperCase()}`)
    console.log(`   Fields: ${metric.fields.length} disponibles`)
    if (metric.fields.length > 0) {
      console.log(`   Exemples:`)
      metric.fields.slice(0, 5).forEach(field => {
        console.log(`      • ${field}`)
      })
    }
  })

  if (results.nonFunctional.length > 0) {
    console.log(`\n\n❌ MÉTRIQUES NON-FONCTIONNELLES (${results.nonFunctional.length}):`)
    console.log('-'.repeat(80))
    results.nonFunctional.forEach(metric => {
      console.log(`\n📌 ${metric.name}`)
      console.log(`   Endpoint: /${metric.endpoint}`)
      console.log(`   Status: ${metric.status.toUpperCase()}`)
      console.log(`   Erreur: ${metric.error}`)
    })
  }

  console.log('\n\n' + '='.repeat(80))
  console.log('🎯 RECOMMANDATIONS')
  console.log('='.repeat(80))

  console.log(`\n1. MÉTRIQUES À IMPLÉMENTER DANS L'ADMIN:`)
  results.functional.forEach(metric => {
    console.log(`   ✅ ${metric.name} (${metric.fields.length} fields)`)
  })

  console.log(`\n2. MÉTRIQUES À EXCLURE (NON DISPONIBLES):`)
  results.nonFunctional.forEach(metric => {
    console.log(`   ❌ ${metric.name} (${metric.error})`)
  })

  console.log(`\n3. MÉTRIQUES CALCULÉES POSSIBLES:`)
  console.log(`   📊 Volume quotidien (via transactions)`)
  console.log(`   📊 Taux de succès (via transaction status)`)
  console.log(`   📊 Fonds gelés (AccountBalance - AvailableFunds)`)
  console.log(`   📊 Transactions en attente (PendingFunds)`)
  console.log(`   📊 Réserve de sécurité (SecurityDeposit + Reserve)`)

  console.log('\n' + '='.repeat(80))
  console.log('✅ Analyse terminée!')
  console.log('='.repeat(80) + '\n')
}

// Exécuter l'analyse
async function run() {
  await testAllMetrics()
  generateReport()
}

run()
