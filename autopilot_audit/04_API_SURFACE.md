# 04 - API Surface

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 📊 Vue d'Ensemble

**Total API Routes**: ~120 endpoints
**Catégories**:
- Admin APIs (40+)
- Telemetry APIs (10+)
- Webhooks (5+)
- QuickBooks (20+)
- SEO (10+)
- Cron Jobs (5+)
- Public APIs (10+)
- Utilities (20+)

---

## 🔐 Endpoints Critiques

### Authentication
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/admin/login` | None | Login admin (password → JWT) |
| POST | `/api/admin/logout` | Cookie | Logout admin (delete cookie) |

### Messages (Admin)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/messages` | JWT | List contact messages |
| POST | `/api/admin/messages` | Public | Create contact message |
| PATCH | `/api/admin/messages` | JWT | Update message status |
| DELETE | `/api/admin/messages` | JWT | Delete message (soft) |

### Telemetry
| Method | Endpoint | Auth | Purpose | DB Access |
|--------|----------|------|---------|-----------|
| POST | `/api/telemetry/track-event` | None | Track user events | service_role |
| POST | `/api/telemetry/write` | X-Telemetry-Key | Write telemetry data | service_role |

### VoPay (Payments)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/vopay` | JWT | List transactions |
| GET | `/api/admin/vopay/stats` | JWT | Get stats |
| POST | `/api/webhooks/vopay` | Webhook signature | VoPay webhook handler |

### QuickBooks
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/quickbooks/status` | JWT | Get connection status |
| GET | `/api/quickbooks/auth/connect` | JWT | Start OAuth flow |
| GET | `/api/quickbooks/auth/callback` | OAuth | Handle OAuth callback |
| POST | `/api/quickbooks/sync/customers` | JWT | Sync customers |
| POST | `/api/quickbooks/sync/invoices` | JWT | Sync invoices |
| GET | `/api/quickbooks/reports/profit-loss` | JWT | Get P&L report |

---

## 🗺️ API Surface Map

### `/api/admin/*` (Admin APIs)

#### Messages & Support
```
GET    /api/admin/messages              # List messages (filter by status)
POST   /api/admin/messages              # Create message (public)
PATCH  /api/admin/messages              # Update message
DELETE /api/admin/messages              # Delete message

GET    /api/admin/messages/assign       # Assign message to user
POST   /api/admin/messages/resend       # Resend email

GET    /api/admin/support/tickets       # List support tickets
GET    /api/admin/support/tickets/[id]  # Get ticket details
POST   /api/admin/support/tickets       # Create ticket
PATCH  /api/admin/support/tickets/[id]  # Update ticket

GET    /api/admin/support/messages      # List support messages
GET    /api/admin/support/stats         # Support stats
```

#### VoPay & Payments
```
GET    /api/admin/vopay                 # List VoPay transactions
GET    /api/admin/vopay/transactions    # Get transactions (detailed)
GET    /api/admin/vopay/real-transactions # Real-time transactions
GET    /api/admin/vopay-debug           # Debug VoPay connection
```

#### Webhooks & Monitoring
```
GET    /api/admin/webhooks/stats        # Webhook stats
POST   /api/admin/webhooks/send-alert   # Send webhook alert
GET    /api/admin/webhooks/debug        # Debug webhooks
```

#### Analytics & Metrics
```
GET    /api/admin/metrics/inspect       # Inspect metrics
GET    /api/admin/database/explore      # Explore database
GET    /api/admin/downloads/stats       # Download stats
GET    /api/admin/clients-sar/stats     # Client stats
```

### `/api/telemetry/*` (Analytics)

```
POST   /api/telemetry/track-event       # Track user event
POST   /api/telemetry/write             # Write telemetry data (internal)
```

**Auth**:
- `track-event`: Public (CORS enabled)
- `write`: X-Telemetry-Key header

**DB Access**: Service role (bypass RLS)

### `/api/webhooks/*` (Webhooks)

```
POST   /api/webhooks/vopay              # VoPay webhook handler
POST   /api/webhooks/quickbooks         # QuickBooks webhook handler
```

**Auth**: Signature verification (VoPay shared secret)

**⚠️ Security**: Validate signature avant processing

### `/api/cron/*` (Cron Jobs)

```
GET    /api/cron/seo-collect            # Collect SEO data (daily)
POST   /api/cron/cleanup                # Cleanup old data (weekly)
```

**Auth**: Vercel Cron Secret (header verification)

**Trigger**: Automated via Vercel cron config

### `/api/quickbooks/*` (QuickBooks Integration)

#### Connection
```
GET    /api/quickbooks/auth/connect     # Start OAuth
GET    /api/quickbooks/auth/callback    # OAuth callback
POST   /api/quickbooks/auth/refresh     # Refresh token

GET    /api/quickbooks/connection/status         # Status
POST   /api/quickbooks/connection/refresh        # Manual refresh
POST   /api/quickbooks/connection/auto-refresh   # Auto refresh
GET    /api/quickbooks/connection/test           # Test connection
POST   /api/quickbooks/connection/disconnect     # Disconnect
```

#### Sync
```
POST   /api/quickbooks/sync/customers   # Sync customers
POST   /api/quickbooks/sync/invoices    # Sync invoices
POST   /api/quickbooks/sync/payments    # Sync payments
POST   /api/quickbooks/sync/accounts    # Sync accounts
POST   /api/quickbooks/sync/vendors     # Sync vendors
POST   /api/quickbooks/sync/all         # Sync everything
```

#### Reports
```
GET    /api/quickbooks/reports/profit-loss       # P&L report
GET    /api/quickbooks/reports/balance-sheet     # Balance sheet
GET    /api/quickbooks/reports/cash-flow         # Cash flow
GET    /api/quickbooks/reports/aged-receivables  # Aged receivables
```

#### Data Access
```
GET    /api/quickbooks/accounts         # List accounts
GET    /api/quickbooks/status           # Overall status
```

### `/api/seo/*` (SEO Tools)

```
POST   /api/seo/collect/ga4             # Collect GA4 data
GET    /api/seo/keywords                # Get keywords
```

### `/api/download/*` (File Downloads)

```
GET    /api/download/[filename]         # Download file
POST   /api/download/track              # Track download
```

### Public APIs

```
POST   /api/activity/log                # Log activity
GET    /api/activity/recent             # Get recent activity
GET    /api/activity/stats              # Activity stats
```

---

## ⚠️ API Health Check

### Recommandation: `/api/health`

**Actuellement**: ❌ Pas de health check endpoint

**À créer**:
```typescript
// src/app/api/health/route.ts

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: await checkDatabase(),
      vercel: 'ok',
      env: checkEnvVars(),
    }
  }

  const status = checks.checks.database === 'ok' ? 200 : 503

  return NextResponse.json(checks, { status })
}

async function checkDatabase() {
  try {
    const supabase = getSupabaseServer()
    const { error } = await supabase.from('contact_messages').select('id').limit(1)
    return error ? 'degraded' : 'ok'
  } catch {
    return 'down'
  }
}
```

**Usage**:
- CI/CD: Vérifier deployment sanity
- Monitoring: Uptime checks (Vercel, external)
- Debugging: Quick status check

---

## 🔐 Auth Requirements Matrix

| Endpoint Pattern | Auth Type | Verification | Notes |
|-----------------|-----------|--------------|-------|
| `/api/admin/login` | None | N/A | Public login |
| `/api/admin/*` (autres) | JWT Cookie | Manual (verifyAuth) | Protected |
| `/api/telemetry/track-event` | None | N/A | Public tracking |
| `/api/telemetry/write` | X-Telemetry-Key | Header check | Internal |
| `/api/webhooks/*` | Signature | Shared secret | VoPay/QB |
| `/api/cron/*` | Vercel Cron Secret | Header check | Automated |
| `/api/quickbooks/*` | JWT Cookie | Manual | Admin only |
| `/api/seo/*` | JWT Cookie | Manual | Admin only |
| `/api/download/*` | None | N/A | Public (tracked) |
| `/api/activity/*` | None | N/A | Public logging |

---

## 🧪 Testing Strategy

### E2E Tests (Playwright)

**Critical Paths**:
```typescript
// Test 1: Admin API Auth
test('admin API requires auth', async ({ request }) => {
  const response = await request.get('/api/admin/messages')
  expect(response.status()).toBe(401)
})

// Test 2: Telemetry Public
test('telemetry accepts public events', async ({ request }) => {
  const response = await request.post('/api/telemetry/track-event', {
    headers: {
      'x-sar-visit-id': 'test-visit-id',
    },
    data: {
      event_name: 'page_view',
      page_path: '/test',
    }
  })
  expect(response.status()).toBe(200)
})

// Test 3: Health Check
test('health check returns 200', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('healthy')
})
```

### API Smoke Tests (Newman)

**Actuellement**: Tests Postman configurés
**Script**: `npm run api:test`

**Collections**:
- `postman/collections/SAR-API-Tests.postman_collection.json`
- Environments: dev, staging, prod

**À ajouter**:
```json
// Test health check in all envs
{
  "name": "Health Check",
  "request": {
    "method": "GET",
    "url": "{{baseUrl}}/api/health"
  },
  "event": [{
    "listen": "test",
    "script": {
      "exec": [
        "pm.test('Status is 200', () => {",
        "  pm.response.to.have.status(200);",
        "});",
        "pm.test('Database is healthy', () => {",
        "  const body = pm.response.json();",
        "  pm.expect(body.checks.database).to.eql('ok');",
        "});"
      ]
    }
  }]
}
```

---

## 📊 API Dependencies

### Supabase (Database)
**Endpoints utilisant service_role**:
- `/api/admin/messages/*` (toutes méthodes)
- `/api/admin/vopay/*`
- `/api/admin/support/*`
- `/api/telemetry/*`
- `/api/quickbooks/sync/*`
- ~80 autres

**⚠️ Impact**: Si Supabase down → 80% APIs down

### External Services

| Service | Endpoints | Impact si down |
|---------|-----------|----------------|
| VoPay | `/api/webhooks/vopay`, `/api/admin/vopay/*` | Paiements offline |
| QuickBooks | `/api/quickbooks/*` | Comptabilité offline |
| Google Analytics | `/api/seo/collect/ga4` | SEO data stale |
| Resend | Email sending (internal calls) | Emails non envoyés |

---

## 🎯 Recommandations

### Immédiat (avant CI/CD)
1. ✅ **Créer** `/api/health` endpoint
2. ✅ **Tester** health check sur preview
3. ✅ **Documenter** API auth requirements
4. ⚠️ **Auditer** endpoints utilisant service_role

### Court Terme (avec CI/CD)
5. 🧪 **Ajouter** health check dans CI pipeline
6. 📊 **Monitorer** API response times
7. 🔐 **Ajouter** rate limiting sur public endpoints
8. 📝 **Générer** OpenAPI spec (Swagger)

### Moyen Terme (amélioration)
9. 🔄 **Migrer** vers RLS où possible (reduce service_role usage)
10. 📈 **Implémenter** API versioning (`/api/v1/`, `/api/v2/`)
11. 🎯 **Optimiser** slow endpoints (>500ms)
12. 🔒 **Renforcer** webhook signature validation

---

**API Surface documentée** ✅
**120+ endpoints inventoriés** ✅
**Health check recommandé** ✅
