/**
 * Script pour configurer automatiquement tous les webhooks VoPay
 * Usage: npx tsx scripts/configure-vopay-webhooks.ts
 */

import 'dotenv/config'

const VOPAY_API_KEY = process.env.VOPAY_API_KEY
const VOPAY_API_SECRET = process.env.VOPAY_SECRET_KEY
const VOPAY_ACCOUNT_ID = process.env.VOPAY_ACCOUNT_ID
const BASE_URL = 'https://api.solutionargentrapide.ca'

// Liste complète des webhooks à configurer
const WEBHOOKS = [
  {
    type: 'transaction',
    url: `${BASE_URL}/api/webhooks/vopay`,
    description: 'Transaction Status'
  },
  {
    type: 'elinx',
    url: `${BASE_URL}/api/webhooks/vopay/elinx`,
    description: 'eLinx Status'
  },
  {
    type: 'accountstatus',
    url: `${BASE_URL}/api/webhooks/vopay/account-status`,
    description: 'Account Status'
  },
  {
    type: 'batchrequest',
    url: `${BASE_URL}/api/webhooks/vopay/batch`,
    description: 'Batch Requests'
  },
  {
    type: 'bankaccount',
    url: `${BASE_URL}/api/webhooks/vopay/bank-account`,
    description: 'Bank Account Creation'
  },
  {
    type: 'batchdetail',
    url: `${BASE_URL}/api/webhooks/vopay/batch-detail`,
    description: 'Batch Detail'
  },
  {
    type: 'scheduledtransaction',
    url: `${BASE_URL}/api/webhooks/vopay/scheduled`,
    description: 'Scheduled Transaction'
  },
  {
    type: 'accountverification',
    url: `${BASE_URL}/api/webhooks/vopay/account-verification`,
    description: 'Account Verification'
  },
  {
    type: 'transactiongroup',
    url: `${BASE_URL}/api/webhooks/vopay/transaction-group`,
    description: 'Transaction Group'
  },
  {
    type: 'accountbalance',
    url: `${BASE_URL}/api/webhooks/vopay/account-balance`,
    description: 'Account Balance'
  },
  {
    type: 'clientaccountbalance',
    url: `${BASE_URL}/api/webhooks/vopay/client-account-balance`,
    description: 'Client Account Balance'
  },
  {
    type: 'paymentreceived',
    url: `${BASE_URL}/api/webhooks/vopay/payment-received`,
    description: 'Payment Received'
  },
  {
    type: 'accountlimit',
    url: `${BASE_URL}/api/webhooks/vopay/account-limit`,
    description: 'Account Limit'
  },
  {
    type: 'virtualaccount',
    url: `${BASE_URL}/api/webhooks/vopay/virtual-accounts`,
    description: 'Virtual Accounts'
  },
  {
    type: 'creditcard',
    url: `${BASE_URL}/api/webhooks/vopay/credit-card`,
    description: 'Credit Card Connection'
  },
  {
    type: 'debitcard',
    url: `${BASE_URL}/api/webhooks/vopay/debit-card`,
    description: 'Debit Card Connection'
  }
]

async function configureWebhook(webhook: typeof WEBHOOKS[0]) {
  const url = 'https://earthnode-sandbox.vopay.com/api/v2/account/webhook-url'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': VOPAY_API_KEY!,
      'X-API-Secret': VOPAY_API_SECRET!
    },
    body: JSON.stringify({
      AccountID: VOPAY_ACCOUNT_ID,
      WebHookUrl: webhook.url,
      Type: webhook.type,
      Disabled: false
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to configure ${webhook.description}: ${error}`)
  }

  return await response.json()
}

async function main() {
  console.log('🚀 Configuration des webhooks VoPay...\n')

  // Vérifier les credentials
  if (!VOPAY_API_KEY || !VOPAY_API_SECRET || !VOPAY_ACCOUNT_ID) {
    console.error('❌ Erreur: Variables d\'environnement VoPay manquantes')
    console.error('   Vérifiez: VOPAY_API_KEY, VOPAY_SECRET_KEY, VOPAY_ACCOUNT_ID')
    process.exit(1)
  }

  let successCount = 0
  let errorCount = 0

  // Configurer chaque webhook
  for (const webhook of WEBHOOKS) {
    try {
      console.log(`⏳ Configuration: ${webhook.description}...`)
      await configureWebhook(webhook)
      console.log(`✅ ${webhook.description} configuré`)
      console.log(`   URL: ${webhook.url}\n`)
      successCount++
    } catch (error) {
      console.error(`❌ ${webhook.description} échoué`)
      console.error(`   ${error instanceof Error ? error.message : error}\n`)
      errorCount++
    }

    // Pause entre les requêtes pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Résumé
  console.log('\n' + '='.repeat(60))
  console.log('📊 Résumé de la configuration')
  console.log('='.repeat(60))
  console.log(`✅ Réussis: ${successCount}/${WEBHOOKS.length}`)
  console.log(`❌ Échoués: ${errorCount}/${WEBHOOKS.length}`)

  if (errorCount === 0) {
    console.log('\n🎉 Tous les webhooks ont été configurés avec succès!')
  } else {
    console.log('\n⚠️  Certains webhooks n\'ont pas pu être configurés.')
    console.log('   Vérifiez les erreurs ci-dessus.')
  }
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
