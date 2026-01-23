# 🔄 VoPay Webhook Data Flow - Architect Mode

## Vue d'ensemble

Ce document expose le flux complet des données des webhooks VoPay, de la réception à la visualisation.

## 📊 Architecture Complète

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VOPAY SERVERS                                │
│  (Transactions, Accounts, Payments, Batches, eLinx, Cards, etc.)   │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ POST Webhook
                 │ + HMAC SHA1 Signature
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS (16 total)                          │
│  /api/webhooks/vopay/*                                              │
│  ├─ /vopay                    (Transaction Status)                  │
│  ├─ /vopay/elinx              (Bank Connection)                     │
│  ├─ /vopay/account-status     (Account Updates)                     │
│  ├─ /vopay/batch              (Batch Processing)                    │
│  ├─ /vopay/bank-account       (Bank Account Creation)               │
│  ├─ /vopay/batch-detail       (Batch Details)                       │
│  ├─ /vopay/scheduled          (Scheduled Transactions)              │
│  ├─ /vopay/account-verification (Account Verification)              │
│  ├─ /vopay/transaction-group  (Transaction Groups)                  │
│  ├─ /vopay/account-balance    (Account Balance Updates)             │
│  ├─ /vopay/client-account-balance (Client Balance)                  │
│  ├─ /vopay/payment-received   (Payment Notifications)               │
│  ├─ /vopay/account-limit      (Daily Limits)                        │
│  ├─ /vopay/virtual-accounts   (Virtual Account Events)              │
│  ├─ /vopay/credit-card        (Credit Card Connection)              │
│  └─ /vopay/debit-card         (Debit Card Connection)               │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ 1. Validate Signature
                 │ 2. Check Environment (Production only)
                 │ 3. Parse Payload
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  WEBHOOK PROCESSING LAYER                            │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ Signature       │  │ Environment      │  │ Payload         │   │
│  │ Validation      │→ │ Filter           │→ │ Parsing         │   │
│  │ (HMAC SHA1)     │  │ (Production only)│  │ (JSON)          │   │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘   │
│                                                       │              │
│                                                       ↓              │
│                               ┌───────────────────────────┐         │
│                               │ Business Logic            │         │
│                               │ - Link to clients table   │         │
│                               │ - Update loan status      │         │
│                               │ - Send notifications      │         │
│                               └───────────────────────────┘         │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ Save to Database
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ webhook_logs (Unified Table)                                 │  │
│  │ ├─ id (UUID)                                                 │  │
│  │ ├─ provider ('vopay', 'flinks', 'quickbooks')               │  │
│  │ ├─ event_type (e.g., 'transaction.completed')               │  │
│  │ ├─ status ('received', 'processing', 'completed', 'failed') │  │
│  │ ├─ payload (JSONB) - Full webhook data                      │  │
│  │ ├─ response (JSONB) - Response sent back                    │  │
│  │ ├─ headers (JSONB) - HTTP headers for debugging             │  │
│  │ ├─ error_message (TEXT) - Error details if failed           │  │
│  │ ├─ retry_count (INT) - Number of retry attempts             │  │
│  │ ├─ processing_time_ms (INT) - Performance metric            │  │
│  │ ├─ external_id (TEXT) - Provider's transaction ID           │  │
│  │ ├─ client_id (UUID) - Link to clients table                 │  │
│  │ ├─ loan_id (UUID) - Link to loans table                     │  │
│  │ ├─ signature (TEXT) - Webhook signature                     │  │
│  │ ├─ is_validated (BOOLEAN) - Signature validation result     │  │
│  │ ├─ environment ('production', 'sandbox', 'test')            │  │
│  │ ├─ received_at (TIMESTAMPTZ) - When webhook was received    │  │
│  │ ├─ processed_at (TIMESTAMPTZ) - When processing completed   │  │
│  │ └─ created_at / updated_at (TIMESTAMPTZ)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ vopay_objects (Legacy Support)                               │  │
│  │ - Stores VoPay-specific objects                              │  │
│  │ - Used by /api/admin/vopay endpoint                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ vopay_webhooks_view (Backward Compatibility)                 │  │
│  │ - View for old code using vopay_webhook_logs table           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ Query & Display
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD PAGES                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ /admin/webhooks (Webhook Monitoring)                        │   │
│  │ ├─ Data Flow Visualization                                  │   │
│  │ ├─ Real-time Stats Cards                                    │   │
│  │ │  ├─ Total Webhooks                                        │   │
│  │ │  ├─ Success Rate                                          │   │
│  │ │  ├─ Completed Count                                       │   │
│  │ │  ├─ Failed Count                                          │   │
│  │ │  └─ Avg Processing Time                                   │   │
│  │ ├─ Filters (Provider, Status, Environment, Search)          │   │
│  │ ├─ Webhook List Table                                       │   │
│  │ │  ├─ Provider (VoPay, Flinks, QuickBooks)                 │   │
│  │ │  ├─ Event Type                                            │   │
│  │ │  ├─ External ID                                           │   │
│  │ │  ├─ Status Badge                                          │   │
│  │ │  ├─ Processing Time                                       │   │
│  │ │  ├─ Received Date/Time                                    │   │
│  │ │  └─ Actions (View Details, Retry)                        │   │
│  │ ├─ Payload Modal (View full webhook data)                   │   │
│  │ └─ Export CSV                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ /admin/dashboard?tab=vopay                                  │   │
│  │                                                              │   │
│  │ ┌───────────────────────────────────────────────────────┐   │   │
│  │ │ 📊 Analytics & Metrics Tab                            │   │   │
│  │ │ ├─ Key Metrics Cards                                  │   │   │
│  │ │ │  ├─ Today's Volume (with % change)                  │   │   │
│  │ │ │  ├─ Week Volume                                     │   │   │
│  │ │ │  ├─ Month Volume                                    │   │   │
│  │ │ │  └─ Success Rate (Week/Month)                       │   │   │
│  │ │ ├─ Transaction Volume Chart (7 days)                  │   │   │
│  │ │ ├─ Success vs Failed Pie Chart                        │   │   │
│  │ │ ├─ Transaction Types Breakdown                        │   │   │
│  │ │ ├─ Failed Transactions Alert                          │   │   │
│  │ │ └─ Quick Actions                                      │   │   │
│  │ └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │ ┌───────────────────────────────────────────────────────┐   │   │
│  │ │ 🔧 Architect Mode Tab                                 │   │   │
│  │ │ ├─ Balance Details (9 fields)                         │   │   │
│  │ │ ├─ Non-Functional Endpoints                           │   │   │
│  │ │ ├─ Transaction Fields Documentation (18 fields)       │   │   │
│  │ │ └─ Recent Transactions List (full details)            │   │   │
│  │ └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │ ┌───────────────────────────────────────────────────────┐   │   │
│  │ │ 📄 Bank Statements Tab                                │   │   │
│  │ │ └─ List of uploaded bank statements                   │   │   │
│  │ └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔐 Security Flow

### 1. Signature Validation

```typescript
// Webhook receives request
const validationKey = request.body.ValidationKey
const transactionId = request.body.TransactionID

// Generate expected signature
const expectedSignature = crypto
  .createHmac('sha1', VOPAY_SHARED_SECRET)
  .update(transactionId)
  .digest('hex')

// Timing-safe comparison
if (!crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(validationKey)
)) {
  return NextResponse.json(
    { error: 'Invalid signature' },
    { status: 401 }
  )
}
```

### 2. Environment Filter

```typescript
// Only accept production data
const environment = request.body.Environment || 'unknown'
if (environment.toLowerCase() !== 'production') {
  console.log(`Rejected ${environment} webhook`)
  return NextResponse.json(
    { error: 'Only production webhooks accepted' },
    { status: 403 }
  )
}
```

### 3. Database Write

```typescript
// Log to unified table
await supabase.from('webhook_logs').insert({
  provider: 'vopay',
  event_type: payload.TransactionType,
  status: 'received',
  payload: payload,
  headers: headers,
  external_id: payload.TransactionID,
  signature: validationKey,
  is_validated: true,
  environment: 'production',
  received_at: new Date().toISOString()
})
```

## 📊 Data Processing States

```
┌──────────┐     ┌────────────┐     ┌───────────┐     ┌─────────┐
│ RECEIVED │────→│ PROCESSING │────→│ COMPLETED │────→│ SUCCESS │
└──────────┘     └────────────┘     └───────────┘     └─────────┘
      │                  │
      │                  ↓
      │           ┌──────────┐
      └──────────→│  FAILED  │
                  └──────────┘
                       │
                       ↓
                  ┌──────────┐
                  │ RETRYING │─────┐
                  └──────────┘     │
                       ↑           │
                       └───────────┘
```

## 🎯 Performance Metrics

### Tracked Metrics

1. **processing_time_ms**: Time from webhook receipt to database save
2. **retry_count**: Number of retry attempts for failed webhooks
3. **success_rate**: Percentage of completed vs failed webhooks
4. **volume_metrics**: Daily, weekly, monthly transaction volumes

### Performance Targets

- **Processing Time**: < 500ms
- **Success Rate**: > 97%
- **Failed Webhooks**: < 3% of total
- **Retry Success**: > 80% success on first retry

## 🔄 Retry Logic

```
Failed Webhook
     │
     ↓
Set status = 'retrying'
Increment retry_count
     │
     ↓
Wait exponential backoff
(2^retry_count seconds)
     │
     ↓
Retry webhook processing
     │
     ├─→ Success → status = 'completed'
     │
     └─→ Failed →
         ├─→ retry_count < 3 → Retry again
         └─→ retry_count >= 3 → status = 'failed'
```

## 📡 API Endpoints for Data Access

### Admin API Endpoints

1. **GET /api/admin/webhooks/list**
   - Lists all webhooks with filters
   - Default: Production only
   - Supports pagination (limit, offset)
   - Returns: webhooks[], stats, pagination info

2. **GET /api/admin/webhooks/stats**
   - VoPay-specific statistics
   - Production data only
   - Returns: volume metrics, success rates, daily stats

3. **POST /api/admin/webhooks/retry**
   - Retry a failed webhook
   - Body: { webhookId }
   - Returns: Updated webhook status

4. **GET /api/admin/webhooks/export**
   - Export webhooks as CSV
   - Supports same filters as /list
   - Returns: CSV file download

## 🧪 Testing Flow

### 1. Health Check (GET)
```bash
curl https://api.solutionargentrapide.ca/api/webhooks/vopay
# Returns: { status: 'online', endpoint: '...' }
```

### 2. Send Test Webhook (POST)
```bash
# Generate signature
TRANSACTION_ID="TEST-$(date +%s)"
VALIDATION_KEY=$(echo -n "$TRANSACTION_ID" | openssl dgst -sha1 -hmac "$VOPAY_SHARED_SECRET" | awk '{print $2}')

# Send webhook
curl -X POST https://api.solutionargentrapide.ca/api/webhooks/vopay \
  -H "Content-Type: application/json" \
  -d '{
    "TransactionID": "'$TRANSACTION_ID'",
    "TransactionType": "EFT Out",
    "TransactionAmount": "100.00",
    "TransactionStatus": "completed",
    "ValidationKey": "'$VALIDATION_KEY'",
    "Environment": "Production"
  }'
```

### 3. Verify in Database
```sql
SELECT * FROM webhook_logs
WHERE external_id = 'TEST-...'
ORDER BY received_at DESC
LIMIT 1;
```

### 4. Check in Admin Dashboard
- Visit: https://admin.solutionargentrapide.ca/admin/webhooks
- Filter by provider: VoPay
- Search for test transaction ID

## 📝 Data Retention

- **Production webhooks**: Retained indefinitely
- **Failed webhooks**: Retained for 90 days after final retry
- **Sandbox/Test webhooks**: Not stored (rejected at API level)

## 🚨 Monitoring & Alerts

### Critical Metrics to Monitor

1. **Success Rate < 95%**: Investigate failed webhooks
2. **Processing Time > 2000ms**: Performance issue
3. **Failed Count > 10/day**: System or integration problem
4. **No webhooks received in 24h**: VoPay configuration issue

### Alert Channels

- Admin Dashboard (real-time)
- Email notifications (planned)
- Slack integration (planned)

## 🔍 Debugging

### Common Issues

1. **Signature Validation Failed**
   - Check VOPAY_SHARED_SECRET in .env.local
   - Verify TransactionID matches signature

2. **Webhook Not Saving to Database**
   - Check environment (must be 'Production')
   - Verify Supabase connection
   - Check webhook_logs table permissions

3. **High Failed Rate**
   - Check error_message field in webhook_logs
   - Review business logic in webhook handler
   - Verify external service availability

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=true
npx tsx scripts/test-all-webhooks-architect.ts
```

## 📚 References

- [VoPay Webhooks Documentation](./VOPAY_WEBHOOKS.md)
- [Webhook Monitoring System](./WEBHOOK_MONITORING_SYSTEM.md)
- [Database Schema](../supabase/migrations/20260122000000_unified_webhook_logs.sql)
- [Postman Collection](../postman/collections/VoPay-Webhooks-Complete.postman_collection.json)
- [cURL Tests](./WEBHOOK-CURL-TESTS.sh)
