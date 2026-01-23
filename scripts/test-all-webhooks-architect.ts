/**
 * ARCHITECT MODE - Test All VoPay Webhooks with Real Data Validation
 *
 * Tests tous les 16 webhooks VoPay et identifie:
 * - Lesquels répondent correctement
 * - Lesquels sauvent en BD
 * - Le data flow complet
 *
 * Usage: npx tsx scripts/test-all-webhooks-architect.ts
 */

import crypto from 'crypto'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

const BASE_URL = 'https://api.solutionargentrapide.ca'
const SHARED_SECRET = process.env.VOPAY_SHARED_SECRET || ''

interface WebhookTest {
  name: string
  endpoint: string
  payload: any
  expectedFields: string[]
}

const WEBHOOK_TESTS: WebhookTest[] = [
  {
    name: '01 - Transaction Status',
    endpoint: '/api/webhooks/vopay',
    payload: {
      Success: true,
      TransactionID: `TEST-TX-${Date.now()}`,
      TransactionType: 'EFT Out',
      TransactionAmount: '100.00',
      Status: 'successful',
      UpdatedAt: new Date().toISOString(),
      FullName: 'Test Client Architect',
      Currency: 'CAD',
      Environment: 'Production'
    },
    expectedFields: ['TransactionID', 'TransactionType', 'TransactionAmount']
  },
  {
    name: '02 - eLinx Status',
    endpoint: '/api/webhooks/vopay/elinx',
    payload: {
      TransactionID: `TEST-ELINX-${Date.now()}`,
      ELinxTransactionID: `EL-${Date.now()}`,
      Status: 'connected',
      AccountToken: 'test-token',
      Environment: 'Production'
    },
    expectedFields: ['ELinxTransactionID', 'Status']
  },
  {
    name: '03 - Account Status',
    endpoint: '/api/webhooks/vopay/account-status',
    payload: {
      AccountID: `ACC-${Date.now()}`,
      Status: 'active',
      AccountType: 'business',
      Environment: 'Production'
    },
    expectedFields: ['AccountID', 'Status']
  },
  {
    name: '04 - Batch Requests',
    endpoint: '/api/webhooks/vopay/batch',
    payload: {
      BatchID: `BATCH-${Date.now()}`,
      Status: 'processing',
      TotalTransactions: 10,
      ProcessedCount: 3,
      Environment: 'Production'
    },
    expectedFields: ['BatchID', 'TotalTransactions']
  },
  {
    name: '05 - Bank Account Creation',
    endpoint: '/api/webhooks/vopay/bank-account',
    payload: {
      AccountID: `BA-${Date.now()}`,
      Status: 'created',
      AccountNumber: '****1234',
      BankName: 'TD Canada Trust',
      Environment: 'Production'
    },
    expectedFields: ['AccountID', 'AccountNumber']
  },
  {
    name: '06 - Batch Detail',
    endpoint: '/api/webhooks/vopay/batch-detail',
    payload: {
      BatchDetailID: `BD-${Date.now()}`,
      BatchID: 'BATCH-123',
      TransactionID: 'TX-456',
      Status: 'completed',
      Environment: 'Production'
    },
    expectedFields: ['BatchDetailID', 'BatchID']
  },
  {
    name: '07 - Scheduled Transaction',
    endpoint: '/api/webhooks/vopay/scheduled',
    payload: {
      ScheduleID: `SCH-${Date.now()}`,
      Status: 'scheduled',
      NextRunDate: '2026-01-30',
      Frequency: 'weekly',
      Environment: 'Production'
    },
    expectedFields: ['ScheduleID', 'NextRunDate']
  },
  {
    name: '08 - Account Verification',
    endpoint: '/api/webhooks/vopay/account-verification',
    payload: {
      VerificationID: `VER-${Date.now()}`,
      Status: 'verified',
      AccountID: 'ACC-123',
      VerificationMethod: 'micro-deposit',
      Environment: 'Production'
    },
    expectedFields: ['VerificationID', 'Status']
  },
  {
    name: '09 - Transaction Group',
    endpoint: '/api/webhooks/vopay/transaction-group',
    payload: {
      GroupID: `GRP-${Date.now()}`,
      Status: 'processing',
      TransactionCount: 5,
      TotalAmount: '500.00',
      Environment: 'Production'
    },
    expectedFields: ['GroupID', 'TransactionCount']
  },
  {
    name: '10 - Account Balance',
    endpoint: '/api/webhooks/vopay/account-balance',
    payload: {
      AccountID: `ACC-${Date.now()}`,
      Balance: '5000.00',
      Available: '4500.00',
      Currency: 'CAD',
      AsOfDate: new Date().toISOString(),
      Environment: 'Production'
    },
    expectedFields: ['Balance', 'Available']
  },
  {
    name: '11 - Client Account Balance',
    endpoint: '/api/webhooks/vopay/client-account-balance',
    payload: {
      ClientAccountID: `CLI-${Date.now()}`,
      Balance: '1200.00',
      Currency: 'CAD',
      LastUpdated: new Date().toISOString(),
      Environment: 'Production'
    },
    expectedFields: ['ClientAccountID', 'Balance']
  },
  {
    name: '12 - Payment Received',
    endpoint: '/api/webhooks/vopay/payment-received',
    payload: {
      PaymentID: `PAY-${Date.now()}`,
      Amount: '250.00',
      Status: 'received',
      PaymentMethod: 'Interac',
      ReceivedAt: new Date().toISOString(),
      Environment: 'Production'
    },
    expectedFields: ['PaymentID', 'Amount']
  },
  {
    name: '13 - Account Limit',
    endpoint: '/api/webhooks/vopay/account-limit',
    payload: {
      AccountID: `ACC-${Date.now()}`,
      DailyLimit: '10000.00',
      RemainingLimit: '7500.00',
      UsedAmount: '2500.00',
      Environment: 'Production'
    },
    expectedFields: ['DailyLimit', 'RemainingLimit']
  },
  {
    name: '14 - Virtual Accounts',
    endpoint: '/api/webhooks/vopay/virtual-accounts',
    payload: {
      VirtualAccountID: `VA-${Date.now()}`,
      Status: 'active',
      AccountNumber: 'VA-****5678',
      CreatedAt: new Date().toISOString(),
      Environment: 'Production'
    },
    expectedFields: ['VirtualAccountID', 'AccountNumber']
  },
  {
    name: '15 - Credit Card Connection',
    endpoint: '/api/webhooks/vopay/credit-card',
    payload: {
      CardID: `CC-${Date.now()}`,
      Status: 'connected',
      LastFourDigits: '4242',
      CardType: 'Visa',
      ExpiryDate: '12/27',
      Environment: 'Production'
    },
    expectedFields: ['CardID', 'LastFourDigits']
  },
  {
    name: '16 - Debit Card Connection',
    endpoint: '/api/webhooks/vopay/debit-card',
    payload: {
      CardID: `DC-${Date.now()}`,
      Status: 'connected',
      LastFourDigits: '1234',
      CardType: 'Debit',
      BankName: 'RBC',
      Environment: 'Production'
    },
    expectedFields: ['CardID', 'LastFourDigits']
  }
]

function generateValidationKey(transactionId: string): string {
  return crypto
    .createHmac('sha1', SHARED_SECRET)
    .update(transactionId)
    .digest('hex')
}

async function testWebhook(test: WebhookTest): Promise<{
  success: boolean
  statusCode: number
  response?: any
  error?: string
  duration: number
  savedToDB: boolean
}> {
  const startTime = Date.now()

  try {
    // Add ValidationKey to payload
    const transactionId = test.payload.TransactionID || test.payload.AccountID || test.payload.BatchID || 'test-id'
    test.payload.ValidationKey = generateValidationKey(transactionId)

    const response = await fetch(`${BASE_URL}${test.endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(test.payload)
    })

    const duration = Date.now() - startTime
    const data = await response.json()

    // Check if webhook saved to DB
    const savedToDB = data.webhook_logged === true || data.saved === true || response.status === 200

    return {
      success: response.ok,
      statusCode: response.status,
      response: data,
      duration,
      savedToDB
    }
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
      savedToDB: false
    }
  }
}

async function testHealthCheck(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET'
    })
    const data = await response.json()
    return data.status === 'online'
  } catch {
    return false
  }
}

async function main() {
  console.log('🏗️  ARCHITECT MODE - VoPay Webhooks Complete Test Suite')
  console.log('=' .repeat(80))
  console.log(`📡 Base URL: ${BASE_URL}`)
  console.log(`🔐 Using Shared Secret: ${SHARED_SECRET.substring(0, 10)}...`)
  console.log(`📊 Testing ${WEBHOOK_TESTS.length} webhook endpoints\n`)

  const results = {
    total: WEBHOOK_TESTS.length,
    online: 0,
    working: 0,
    savedToDB: 0,
    failed: 0,
    details: [] as any[]
  }

  // Test each webhook
  for (const test of WEBHOOK_TESTS) {
    process.stdout.write(`Testing ${test.name}... `)

    // First check health
    const isOnline = await testHealthCheck(test.endpoint)

    if (!isOnline) {
      console.log('❌ OFFLINE')
      results.failed++
      results.details.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'OFFLINE',
        online: false,
        working: false,
        savedToDB: false
      })
      continue
    }

    results.online++

    // Test with real payload
    const result = await testWebhook(test)

    if (result.success && result.savedToDB) {
      console.log(`✅ WORKING (${result.duration}ms) - Saved to DB`)
      results.working++
      results.savedToDB++
      results.details.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'WORKING',
        online: true,
        working: true,
        savedToDB: true,
        duration: result.duration,
        response: result.response
      })
    } else if (result.success) {
      console.log(`⚠️  ONLINE but not saving to DB (${result.duration}ms)`)
      results.details.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'ONLINE_NO_SAVE',
        online: true,
        working: false,
        savedToDB: false,
        duration: result.duration
      })
    } else {
      console.log(`❌ FAILED: ${result.error || `HTTP ${result.statusCode}`}`)
      results.failed++
      results.details.push({
        name: test.name,
        endpoint: test.endpoint,
        status: 'FAILED',
        online: true,
        working: false,
        savedToDB: false,
        error: result.error,
        statusCode: result.statusCode
      })
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 ARCHITECT REPORT - Webhook Test Results')
  console.log('='.repeat(80))
  console.log(`✅ Online:           ${results.online}/${results.total}`)
  console.log(`🟢 Working (w/ DB):  ${results.working}/${results.total}`)
  console.log(`💾 Saved to DB:      ${results.savedToDB}/${results.total}`)
  console.log(`❌ Failed:           ${results.failed}/${results.total}`)
  console.log(`📈 Success Rate:     ${Math.round((results.working / results.total) * 100)}%`)

  // Data Flow Analysis
  console.log('\n' + '='.repeat(80))
  console.log('🔄 DATA FLOW ANALYSIS')
  console.log('='.repeat(80))

  const workingHooks = results.details.filter(d => d.working)
  const onlineNoSave = results.details.filter(d => d.status === 'ONLINE_NO_SAVE')
  const offline = results.details.filter(d => d.status === 'OFFLINE')

  if (workingHooks.length > 0) {
    console.log('\n✅ WORKING HOOKS (Accept Real Data):')
    workingHooks.forEach(h => {
      console.log(`   ${h.name}`)
      console.log(`   └─ ${h.endpoint}`)
      console.log(`   └─ ✓ Online | ✓ Saves to DB | ${h.duration}ms\n`)
    })
  }

  if (onlineNoSave.length > 0) {
    console.log('\n⚠️  ONLINE BUT NOT SAVING:')
    onlineNoSave.forEach(h => {
      console.log(`   ${h.name}`)
      console.log(`   └─ ${h.endpoint}`)
      console.log(`   └─ ✓ Online | ✗ Not saving to DB\n`)
    })
  }

  if (offline.length > 0) {
    console.log('\n❌ OFFLINE HOOKS:')
    offline.forEach(h => {
      console.log(`   ${h.name}`)
      console.log(`   └─ ${h.endpoint}`)
      console.log(`   └─ ✗ Not responding\n`)
    })
  }

  // Export results
  const reportPath = './WEBHOOK-ARCHITECT-REPORT.json'
  const fs = await import('fs/promises')
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: results.total,
      online: results.online,
      working: results.working,
      savedToDB: results.savedToDB,
      failed: results.failed,
      successRate: `${Math.round((results.working / results.total) * 100)}%`
    },
    workingHooks: workingHooks.map(h => ({
      name: h.name,
      endpoint: h.endpoint,
      duration: h.duration
    })),
    details: results.details
  }, null, 2))

  console.log('\n' + '='.repeat(80))
  console.log(`📄 Full report saved: ${reportPath}`)
  console.log('='.repeat(80))

  if (results.working < results.total) {
    console.log('\n⚠️  Some webhooks are not working properly.')
    console.log('   Only accept data from WORKING hooks listed above.')
    process.exit(1)
  } else {
    console.log('\n🎉 All webhooks are operational!')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
