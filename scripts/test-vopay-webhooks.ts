/**
 * Script pour tester tous les endpoints webhook VoPay
 * Usage: npx tsx scripts/test-vopay-webhooks.ts [local|prod]
 */

const env = process.argv[2] || 'local'
const BASE_URL = env === 'prod'
  ? 'https://api.solutionargentrapide.ca'
  : 'http://localhost:3001'

const WEBHOOKS = [
  { name: 'Transaction Status', url: `${BASE_URL}/api/webhooks/vopay` },
  { name: 'eLinx Status', url: `${BASE_URL}/api/webhooks/vopay/elinx` },
  { name: 'Account Status', url: `${BASE_URL}/api/webhooks/vopay/account-status` },
  { name: 'Batch Requests', url: `${BASE_URL}/api/webhooks/vopay/batch` },
  { name: 'Bank Account Creation', url: `${BASE_URL}/api/webhooks/vopay/bank-account` },
  { name: 'Batch Detail', url: `${BASE_URL}/api/webhooks/vopay/batch-detail` },
  { name: 'Scheduled Transaction', url: `${BASE_URL}/api/webhooks/vopay/scheduled` },
  { name: 'Account Verification', url: `${BASE_URL}/api/webhooks/vopay/account-verification` },
  { name: 'Transaction Group', url: `${BASE_URL}/api/webhooks/vopay/transaction-group` },
  { name: 'Account Balance', url: `${BASE_URL}/api/webhooks/vopay/account-balance` },
  { name: 'Client Account Balance', url: `${BASE_URL}/api/webhooks/vopay/client-account-balance` },
  { name: 'Payment Received', url: `${BASE_URL}/api/webhooks/vopay/payment-received` },
  { name: 'Account Limit', url: `${BASE_URL}/api/webhooks/vopay/account-limit` },
  { name: 'Virtual Accounts', url: `${BASE_URL}/api/webhooks/vopay/virtual-accounts` },
  { name: 'Credit Card Connection', url: `${BASE_URL}/api/webhooks/vopay/credit-card` },
  { name: 'Debit Card Connection', url: `${BASE_URL}/api/webhooks/vopay/debit-card` }
]

async function testWebhook(webhook: typeof WEBHOOKS[0]) {
  try {
    const startTime = Date.now()
    const response = await fetch(webhook.url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    const duration = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        duration
      }
    }

    const data = await response.json()

    if (data.status === 'online') {
      return {
        success: true,
        duration,
        endpoint: data.endpoint
      }
    }

    return {
      success: false,
      error: 'Invalid response format',
      duration
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: 0
    }
  }
}

async function main() {
  console.log('🧪 Test des endpoints webhook VoPay\n')
  console.log('Base URL:', BASE_URL)
  console.log('Total endpoints:', WEBHOOKS.length)
  console.log('='.repeat(80) + '\n')

  let successCount = 0
  let errorCount = 0

  for (const webhook of WEBHOOKS) {
    process.stdout.write(`Testing ${webhook.name}... `)

    const result = await testWebhook(webhook)

    if (result.success) {
      console.log(`✅ Online (${result.duration}ms)`)
      successCount++
    } else {
      console.log(`❌ Failed: ${result.error}`)
      console.log(`   URL: ${webhook.url}`)
      errorCount++
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(80))
  console.log('📊 Résumé des tests')
  console.log('='.repeat(80))
  console.log(`✅ En ligne: ${successCount}/${WEBHOOKS.length}`)
  console.log(`❌ Hors ligne: ${errorCount}/${WEBHOOKS.length}`)
  console.log(`📈 Taux de réussite: ${Math.round((successCount / WEBHOOKS.length) * 100)}%`)

  if (errorCount === 0) {
    console.log('\n🎉 Tous les webhooks sont opérationnels!')
  } else {
    console.log('\n⚠️  Certains webhooks ne répondent pas.')
    console.log('   Vérifiez les erreurs ci-dessus.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
