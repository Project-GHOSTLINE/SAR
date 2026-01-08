#!/usr/bin/env node
/**
 * 🔍 DIAGNOSTIC: Volume Aujourd'hui - Breakdown par type
 * Montre exactement ce que le dropdown devrait afficher
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

console.log('🔍 DIAGNOSTIC: Volume Aujourd\'hui - Breakdown par type\n')
console.log('='.repeat(80))

async function fetchTodayTransactions() {
  try {
    const signature = generateSignature()

    // Récupérer les 100 dernières transactions
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const params = new URLSearchParams({
      AccountID: VOPAY_ACCOUNT_ID,
      Key: VOPAY_API_KEY,
      Signature: signature,
      StartDateTime: startDate.toISOString().split('T')[0],
      EndDateTime: endDate,
      NumberOfTransactions: '100'
    })

    const url = `${VOPAY_API_URL}account/transactions?${params.toString()}`

    console.log(`\n📡 Récupération des transactions VoPay...`)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })

    const data = await response.json()

    if (!response.ok || !data.Success) {
      console.error('❌ Erreur VoPay:', data.ErrorMessage)
      process.exit(1)
    }

    // Extraire les transactions
    const allTransactions = Object.values(data.Transactions || {})

    console.log(`✅ ${allTransactions.length} transactions récupérées`)

    // Filtrer les transactions d'aujourd'hui
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayTransactions = allTransactions.filter(tx => {
      const txDate = new Date(tx.TransactionDateTime)
      return txDate >= today
    })

    console.log(`\n📅 Date d'aujourd'hui: ${today.toLocaleDateString('fr-CA')}`)
    console.log(`📊 Transactions aujourd'hui: ${todayTransactions.length}`)

    if (todayTransactions.length === 0) {
      console.log('\n⚠️  Aucune transaction aujourd\'hui')
      return
    }

    // Grouper par type
    const volumeByType = {}

    todayTransactions.forEach(tx => {
      const type = tx.TransactionType || 'Autre'
      if (!volumeByType[type]) {
        volumeByType[type] = { credit: 0, debit: 0, count: 0, transactions: [] }
      }

      const credit = parseFloat(tx.CreditAmount || '0')
      const debit = parseFloat(tx.DebitAmount || '0')

      volumeByType[type].credit += credit
      volumeByType[type].debit += debit
      volumeByType[type].count += 1
      volumeByType[type].transactions.push({
        id: tx.TransactionID,
        name: tx.FullName,
        credit,
        debit,
        status: tx.TransactionStatus
      })
    })

    // Calculer le volume total
    let totalCredit = 0
    let totalDebit = 0

    Object.values(volumeByType).forEach(data => {
      totalCredit += data.credit
      totalDebit += data.debit
    })

    const totalNet = totalCredit - totalDebit

    console.log('\n' + '='.repeat(80))
    console.log('💰 VOLUME TOTAL AUJOURD\'HUI')
    console.log('='.repeat(80))
    console.log(`  Total NET:    ${formatCurrency(totalNet)}`)
    console.log(`  ▲ Entrées:    ${formatCurrency(totalCredit)}`)
    console.log(`  ▼ Sorties:    ${formatCurrency(totalDebit)}`)

    // Trier par montant absolu
    const sortedTypes = Object.entries(volumeByType).sort(([, a], [, b]) => {
      const netA = a.credit - a.debit
      const netB = b.credit - b.debit
      return Math.abs(netB) - Math.abs(netA)
    })

    console.log('\n' + '='.repeat(80))
    console.log('📊 BREAKDOWN PAR TYPE (ce que le dropdown devrait afficher)')
    console.log('='.repeat(80))

    sortedTypes.forEach(([type, data], index) => {
      const net = data.credit - data.debit
      const isPositive = net >= 0

      console.log(`\n${index + 1}. ${isPositive ? '🟢' : '🔴'} ${type} (${data.count} tx)`)
      console.log(`   NET: ${isPositive ? '+' : ''}${formatCurrency(net)}`)

      if (data.credit > 0) {
        console.log(`   ▲ Entrée:  ${formatCurrency(data.credit)}`)
      }
      if (data.debit > 0) {
        console.log(`   ▼ Sortie:  ${formatCurrency(data.debit)}`)
      }

      // Afficher quelques transactions
      console.log(`   Transactions:`)
      data.transactions.slice(0, 3).forEach(tx => {
        const amount = tx.credit - tx.debit
        console.log(`     • ${tx.name || 'Sans nom'}: ${amount >= 0 ? '+' : ''}${formatCurrency(amount)} [${tx.status}]`)
      })

      if (data.transactions.length > 3) {
        console.log(`     ... et ${data.transactions.length - 3} autres`)
      }
    })

    console.log('\n' + '='.repeat(80))
    console.log('✅ Diagnostic terminé!')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

fetchTodayTransactions()
