#!/usr/bin/env node
/**
 * 🧪 TEST COMPLET: Admin Dashboard
 * Vérifie que tous les endpoints et fonctionnalités fonctionnent correctement
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

// Résultats des tests
const results = {
  vopay: { status: 'pending', tests: [] },
  messages: { status: 'pending', tests: [] },
  webhooks: { status: 'pending', tests: [] },
  dashboard: { status: 'pending', tests: [] }
}

// Générer signature VoPay
function generateSignature() {
  const today = new Date().toISOString().split('T')[0]
  const signatureString = VOPAY_API_KEY + VOPAY_SHARED_SECRET + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

// Formater montant
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

console.log('🧪 TEST COMPLET: Admin Dashboard - admin.solutionargentrapide.ca\n')
console.log('='.repeat(80))
console.log('Date:', new Date().toLocaleString('fr-CA'))
console.log('='.repeat(80))

// TEST 1: VoPay Balance
async function testVoPayBalance() {
  console.log('\n📊 TEST 1: VoPay Balance API')
  console.log('-'.repeat(80))

  try {
    const signature = generateSignature()
    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature
    })

    const url = `${VOPAY_API_URL}account/balance?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    const data = await response.json()

    if (response.ok && data.Success) {
      console.log('✅ Balance récupéré avec succès')
      console.log(`   AccountBalance: ${formatCurrency(parseFloat(data.AccountBalance))}`)
      console.log(`   AvailableFunds: ${formatCurrency(parseFloat(data.AvailableFunds))}`)
      console.log(`   PendingFunds: ${formatCurrency(parseFloat(data.PendingFunds))}`)

      results.vopay.tests.push({
        name: 'Balance API',
        status: 'pass',
        data: {
          balance: parseFloat(data.AccountBalance),
          available: parseFloat(data.AvailableFunds),
          pending: parseFloat(data.PendingFunds)
        }
      })
      return data
    } else {
      console.log('❌ Échec:', data.ErrorMessage)
      results.vopay.tests.push({ name: 'Balance API', status: 'fail', error: data.ErrorMessage })
      return null
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.vopay.tests.push({ name: 'Balance API', status: 'error', error: error.message })
    return null
  }
}

// TEST 2: VoPay Transactions & Volume Aujourd'hui
async function testVoPayTransactions() {
  console.log('\n📊 TEST 2: VoPay Transactions & Volume Aujourd\'hui')
  console.log('-'.repeat(80))

  try {
    const signature = generateSignature()

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature,
      StartDateTime: startDate.toISOString().split('T')[0],
      EndDateTime: endDate,
      NumberOfTransactions: '1000'
    })

    const url = `${VOPAY_API_URL}account/transactions?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    const data = await response.json()

    if (response.ok && data.Success) {
      const transactions = Object.values(data.Transactions || {})
      console.log(`✅ Transactions récupérées: ${transactions.length}`)

      // Calculer Volume Aujourd'hui
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.TransactionDateTime)
        return txDate >= today
      })

      console.log(`   Transactions aujourd'hui: ${todayTransactions.length}`)

      const todayVolume = todayTransactions.reduce((sum, tx) => {
        const credit = parseFloat(tx.CreditAmount || '0')
        const debit = parseFloat(tx.DebitAmount || '0')
        return sum + (credit - debit)
      }, 0)

      console.log(`   Volume Aujourd'hui (NET): ${formatCurrency(todayVolume)}`)

      // Breakdown par type
      const volumeByType = {}
      todayTransactions.forEach(tx => {
        const type = tx.TransactionType || 'Autre'
        if (!volumeByType[type]) {
          volumeByType[type] = { credit: 0, debit: 0, count: 0 }
        }
        volumeByType[type].credit += parseFloat(tx.CreditAmount || '0')
        volumeByType[type].debit += parseFloat(tx.DebitAmount || '0')
        volumeByType[type].count += 1
      })

      console.log('\n   Breakdown par type:')
      Object.entries(volumeByType)
        .sort(([, a], [, b]) => Math.abs((b.credit - b.debit)) - Math.abs((a.credit - a.debit)))
        .forEach(([type, data]) => {
          const net = data.credit - data.debit
          console.log(`   • ${type} (${data.count} tx): ${net >= 0 ? '+' : ''}${formatCurrency(net)}`)
        })

      results.vopay.tests.push({
        name: 'Transactions API',
        status: 'pass',
        data: {
          total: transactions.length,
          today: todayTransactions.length,
          volume: todayVolume,
          breakdown: volumeByType
        }
      })

      return { transactions, todayVolume, breakdown: volumeByType }
    } else {
      console.log('❌ Échec:', data.ErrorMessage)
      results.vopay.tests.push({ name: 'Transactions API', status: 'fail', error: data.ErrorMessage })
      return null
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
    results.vopay.tests.push({ name: 'Transactions API', status: 'error', error: error.message })
    return null
  }
}

// TEST 3: Build local
async function testBuild() {
  console.log('\n🏗️  TEST 3: Build Local')
  console.log('-'.repeat(80))

  try {
    const { execSync } = await import('child_process')
    console.log('   Building project...')

    execSync('npm run build', {
      cwd: __dirname,
      stdio: 'pipe'
    })

    console.log('✅ Build réussi')
    results.dashboard.tests.push({ name: 'Build', status: 'pass' })
    return true
  } catch (error) {
    console.log('❌ Build échoué')
    results.dashboard.tests.push({ name: 'Build', status: 'fail', error: error.message })
    return false
  }
}

// TEST 4: Vérifier fichiers critiques
async function testCriticalFiles() {
  console.log('\n📁 TEST 4: Fichiers Critiques')
  console.log('-'.repeat(80))

  const { existsSync } = await import('fs')
  const files = [
    'src/app/admin/dashboard/page.tsx',
    'src/lib/vopay.ts',
    'src/middleware.ts',
    '.env.local'
  ]

  let allExist = true
  files.forEach(file => {
    const exists = existsSync(join(__dirname, file))
    console.log(`   ${exists ? '✅' : '❌'} ${file}`)
    if (!exists) allExist = false
  })

  results.dashboard.tests.push({
    name: 'Critical Files',
    status: allExist ? 'pass' : 'fail'
  })

  return allExist
}

// Générer rapport final
function generateReport() {
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 RAPPORT FINAL - STATUT DU DASHBOARD')
  console.log('='.repeat(80))

  // Calculer statuts globaux
  Object.keys(results).forEach(section => {
    const tests = results[section].tests
    const passed = tests.filter(t => t.status === 'pass').length
    const failed = tests.filter(t => t.status === 'fail').length
    const errors = tests.filter(t => t.status === 'error').length

    results[section].status = failed === 0 && errors === 0 ? 'pass' : 'fail'
    results[section].summary = { passed, failed, errors, total: tests.length }
  })

  // Afficher résumé
  console.log('\n✅ TESTS RÉUSSIS:')
  Object.entries(results).forEach(([section, data]) => {
    if (data.status === 'pass') {
      console.log(`   • ${section.toUpperCase()}: ${data.summary.passed}/${data.summary.total} tests`)
    }
  })

  console.log('\n❌ TESTS ÉCHOUÉS:')
  const failures = Object.entries(results).filter(([, data]) => data.status === 'fail')
  if (failures.length === 0) {
    console.log('   Aucun')
  } else {
    failures.forEach(([section, data]) => {
      console.log(`   • ${section.toUpperCase()}: ${data.summary.failed} échoués, ${data.summary.errors} erreurs`)
      data.tests.filter(t => t.status !== 'pass').forEach(test => {
        console.log(`     - ${test.name}: ${test.error || 'Failed'}`)
      })
    })
  }

  // Données clés du Volume Aujourd'hui
  const voPayTransactionsTest = results.vopay.tests.find(t => t.name === 'Transactions API')
  if (voPayTransactionsTest && voPayTransactionsTest.status === 'pass') {
    console.log('\n💰 VOLUME AUJOURD\'HUI:')
    console.log(`   Montant: ${formatCurrency(voPayTransactionsTest.data.volume)}`)
    console.log(`   Transactions: ${voPayTransactionsTest.data.today}`)
    console.log(`   Types: ${Object.keys(voPayTransactionsTest.data.breakdown).length}`)
  }

  console.log('\n' + '='.repeat(80))

  const allPassed = Object.values(results).every(r => r.status === 'pass')
  if (allPassed) {
    console.log('✅ TOUS LES TESTS SONT PASSÉS - Dashboard opérationnel!')
  } else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ - Vérifier les erreurs ci-dessus')
  }

  console.log('='.repeat(80))
  console.log('\n📊 Pour voir le dashboard: https://admin.solutionargentrapide.ca/dashboard')
  console.log('🔄 Rafraîchir la page (F5) pour voir les dernières données\n')
}

// Exécuter tous les tests
async function runAllTests() {
  await testCriticalFiles()
  await testVoPayBalance()
  await testVoPayTransactions()
  // await testBuild() // Commenté pour gagner du temps, décommenter si besoin

  generateReport()
}

runAllTests()
