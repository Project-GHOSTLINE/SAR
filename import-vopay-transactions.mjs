#!/usr/bin/env node

/**
 * Import VoPay Transactions to Webhook Logs
 * Récupère les vraies transactions VoPay et les importe dans la table vopay_webhook_logs
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Configuration
const config = {
  vopay: {
    accountId: process.env.VOPAY_ACCOUNT_ID || 'solutionargentrapideinc',
    apiKey: process.env.VOPAY_API_KEY || 'bUXExKVc0sLyNS9zjfGq6AJukdDB1pvCR5ihHF78',
    sharedSecret: process.env.VOPAY_SHARED_SECRET || 'ToDqaRRl4nmwnAYVc+==',
    apiUrl: process.env.VOPAY_API_URL || 'https://earthnode.vopay.com/api/v2/'
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dllyzfuqjzuhvshrlmuq.supabase.co',
    key: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHl6ZnVxanp1aHZzaHJsbXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NTk4MSwiZXhwIjoyMDgxNTcxOTgxfQ.Qg5eQwDxeAtTDXplNkQZa4hOp_dSMBIu_DKbuquryFo'
  }
}

// Génère la signature VoPay
function generateSignature() {
  const today = new Date().toISOString().split('T')[0]
  const signatureString = config.vopay.apiKey + config.vopay.sharedSecret + today
  return crypto.createHash('sha1').update(signatureString).digest('hex')
}

// Récupère les transactions VoPay
async function fetchVoPayTransactions(limit = 50) {
  const params = new URLSearchParams()
  params.set('AccountID', config.vopay.accountId)
  params.set('Key', config.vopay.apiKey)
  params.set('Signature', generateSignature())

  // Dates obligatoires (30 derniers jours)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  params.set('StartDateTime', startDate)
  params.set('EndDateTime', endDate)
  params.set('NumberOfTransactions', limit.toString())

  const url = `${config.vopay.apiUrl}account/transactions?${params.toString()}`

  console.log('🔄 Récupération des transactions VoPay...')
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`VoPay API error: ${response.status}`)
  }

  const data = await response.json()

  if (!data.Success) {
    throw new Error(`VoPay error: ${data.ErrorMessage}`)
  }

  // VoPay retourne Transactions comme un objet avec des clés numériques
  // On doit le convertir en array
  const transactions = data.Transactions || {}
  return Object.values(transactions)
}

// Convertit une transaction VoPay en format webhook log
function transactionToWebhookLog(transaction) {
  const debit = parseFloat(transaction.DebitAmount || '0')
  const credit = parseFloat(transaction.CreditAmount || '0')
  const amount = credit > 0 ? credit : debit

  // Générer une validation_key factice pour les imports manuels
  const validationKey = crypto.randomBytes(32).toString('hex')

  return {
    transaction_id: transaction.TransactionID,
    transaction_type: transaction.TransactionType,
    transaction_amount: amount,
    currency: transaction.Currency || 'CAD',
    status: transaction.TransactionStatus.toLowerCase(),
    failure_reason: transaction.TransactionFailureReason || null,
    environment: 'production',
    is_validated: true,
    validation_key: validationKey,
    raw_payload: transaction,
    received_at: transaction.TransactionDateTime || new Date().toISOString()
  }
}

// Importe les transactions dans Supabase
async function importTransactions(limit = 50) {
  try {
    console.log('🚀 Début de l\'importation...\n')

    // Connexion Supabase
    const supabase = createClient(config.supabase.url, config.supabase.key)
    console.log('✅ Connecté à Supabase')

    // Récupérer transactions VoPay
    const transactions = await fetchVoPayTransactions(limit)
    console.log(`✅ ${transactions.length} transactions récupérées de VoPay\n`)

    if (transactions.length === 0) {
      console.log('⚠️  Aucune transaction à importer')
      return
    }

    // Supprimer les données de test d'abord
    console.log('🧹 Suppression des données de test...')
    const { error: deleteError } = await supabase
      .from('vopay_webhook_logs')
      .delete()
      .like('transaction_id', 'TEST_%')

    if (deleteError) {
      console.warn('⚠️  Erreur lors de la suppression des tests:', deleteError.message)
    } else {
      console.log('✅ Données de test supprimées\n')
    }

    // Importer les vraies transactions
    console.log('💾 Importation des transactions...')
    let imported = 0
    let skipped = 0

    for (const transaction of transactions) {
      const webhookLog = transactionToWebhookLog(transaction)

      // Vérifier si la transaction existe déjà
      const { data: existing } = await supabase
        .from('vopay_webhook_logs')
        .select('id')
        .eq('transaction_id', webhookLog.transaction_id)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insérer la transaction
      const { error } = await supabase
        .from('vopay_webhook_logs')
        .insert(webhookLog)

      if (error) {
        console.error(`❌ Erreur pour ${webhookLog.transaction_id}:`, error.message)
      } else {
        imported++
        if (imported % 10 === 0) {
          console.log(`   ${imported} transactions importées...`)
        }
      }
    }

    console.log('\n✅ Importation terminée!')
    console.log(`   Importées: ${imported}`)
    console.log(`   Ignorées (déjà présentes): ${skipped}`)
    console.log(`\n🌐 Voir les résultats: https://admin.solutionargentrapide.ca/webhooks`)

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

// Exécution
const limit = parseInt(process.argv[2]) || 50
console.log(`\n${'='.repeat(60)}`)
console.log(`Import de transactions VoPay → Dashboard Admin`)
console.log(`Limite: ${limit} transactions`)
console.log(`${'='.repeat(60)}\n`)

importTransactions(limit)
