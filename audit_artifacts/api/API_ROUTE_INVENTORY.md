# API ROUTE INVENTORY - FACTUAL
**Date:** 2026-01-24
**Total Routes:** 135
**Evidence:** audit_artifacts/commands/find_api_routes.txt

---

## SUMMARY BY CATEGORY

| Category | Count | Description |
|----------|-------|-------------|
| misc | 44 | Other endpoints |
| admin | 34 | Administration dashboard endpoints |
| quickbooks | 23 | QuickBooks integration |
| webhook | 17 | Incoming webhook handlers |
| seo | 12 | SEO metrics collection (GA4, GSC, Semrush) |
| vopay | 2 | VoPay payment integration |
| cron | 1 | Scheduled jobs |
| telemetry | 1 | Telemetry and observability |
| worker | 1 | Background workers |

---

## DETAILED INVENTORY

### ADMIN (34 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/admin/analytics` | GET | `src/app/api/admin/analytics/route.ts` |
| `/api/admin/analytics/dashboard` | UNKNOWN | `src/app/api/admin/analytics/dashboard/route.ts` |
| `/api/admin/client-analysis` | GET, POST, PATCH, DELETE, OPTIONS | `src/app/api/admin/client-analysis/route.ts` |
| `/api/admin/clients-sar/autres-contrats` | GET | `src/app/api/admin/clients-sar/autres-contrats/route.ts` |
| `/api/admin/clients-sar/concordances` | GET | `src/app/api/admin/clients-sar/concordances/route.ts` |
| `/api/admin/clients-sar/concordances-stats` | GET | `src/app/api/admin/clients-sar/concordances-stats/route.ts` |
| `/api/admin/clients-sar/search` | GET | `src/app/api/admin/clients-sar/search/route.ts` |
| `/api/admin/clients-sar/stats` | GET | `src/app/api/admin/clients-sar/stats/route.ts` |
| `/api/admin/database/explore` | GET | `src/app/api/admin/database/explore/route.ts` |
| `/api/admin/dataflow-health/alerts` | GET, POST | `src/app/api/admin/dataflow-health/alerts/route.ts` |
| `/api/admin/dataflow-health/kpis` | GET | `src/app/api/admin/dataflow-health/kpis/route.ts` |
| `/api/admin/dataflow-health/traces` | GET | `src/app/api/admin/dataflow-health/traces/route.ts` |
| `/api/admin/downloads/stats` | GET | `src/app/api/admin/downloads/stats/route.ts` |
| `/api/admin/ga4/enriched` | GET | `src/app/api/admin/ga4/enriched/route.ts` |
| `/api/admin/login` | POST | `src/app/api/admin/login/route.ts` |
| `/api/admin/logout` | POST | `src/app/api/admin/logout/route.ts` |
| `/api/admin/messages` | UNKNOWN | `src/app/api/admin/messages/route.ts` |
| `/api/admin/messages/assign` | GET, POST | `src/app/api/admin/messages/assign/route.ts` |
| `/api/admin/metrics/inspect` | GET | `src/app/api/admin/metrics/inspect/route.ts` |
| `/api/admin/send` | POST | `src/app/api/admin/send/route.ts` |
| `/api/admin/support/messages` | POST | `src/app/api/admin/support/messages/route.ts` |
| `/api/admin/support/stats` | GET | `src/app/api/admin/support/stats/route.ts` |
| `/api/admin/support/tickets` | GET, POST | `src/app/api/admin/support/tickets/route.ts` |
| `/api/admin/support/tickets/[id]` | GET, PATCH | `src/app/api/admin/support/tickets/[id]/route.ts` |
| `/api/admin/vopay` | GET | `src/app/api/admin/vopay/route.ts` |
| `/api/admin/vopay-debug` | GET | `src/app/api/admin/vopay-debug/route.ts` |
| `/api/admin/vopay/real-transactions` | GET | `src/app/api/admin/vopay/real-transactions/route.ts` |
| `/api/admin/vopay/transactions` | GET | `src/app/api/admin/vopay/transactions/route.ts` |
| `/api/admin/webhooks/debug` | GET | `src/app/api/admin/webhooks/debug/route.ts` |
| `/api/admin/webhooks/export` | GET | `src/app/api/admin/webhooks/export/route.ts` |
| `/api/admin/webhooks/list` | GET | `src/app/api/admin/webhooks/list/route.ts` |
| `/api/admin/webhooks/retry` | POST | `src/app/api/admin/webhooks/retry/route.ts` |
| `/api/admin/webhooks/send-alert` | POST | `src/app/api/admin/webhooks/send-alert/route.ts` |
| `/api/admin/webhooks/stats` | GET | `src/app/api/admin/webhooks/stats/route.ts` |

### CRON (1 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/cron/seo-collect` | GET | `src/app/api/cron/seo-collect/route.ts` |

### MISC (44 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/activity/log` | POST | `src/app/api/activity/log/route.ts` |
| `/api/activity/recent` | GET | `src/app/api/activity/recent/route.ts` |
| `/api/activity/stats` | GET | `src/app/api/activity/stats/route.ts` |
| `/api/anonymity/check` | GET | `src/app/api/anonymity/check/route.ts` |
| `/api/applications/submit` | POST | `src/app/api/applications/submit/route.ts` |
| `/api/audit/[clientId]` | GET | `src/app/api/audit/[clientId]/route.ts` |
| `/api/audit/stats` | GET | `src/app/api/audit/stats/route.ts` |
| `/api/contact` | POST | `src/app/api/contact/route.ts` |
| `/api/contact-analyse` | POST | `src/app/api/contact-analyse/route.ts` |
| `/api/cortex/sync-miro` | GET, POST | `src/app/api/cortex/sync-miro/route.ts` |
| `/api/device/deep-inspector` | GET | `src/app/api/device/deep-inspector/route.ts` |
| `/api/download/[filename]` | GET | `src/app/api/download/[filename]/route.ts` |
| `/api/download/track` | POST | `src/app/api/download/track/route.ts` |
| `/api/fingerprint/deep-scan` | POST | `src/app/api/fingerprint/deep-scan/route.ts` |
| `/api/memory/context` | GET | `src/app/api/memory/context/route.ts` |
| `/api/memory/doc-read` | GET, POST | `src/app/api/memory/doc-read/route.ts` |
| `/api/memory/recall` | GET | `src/app/api/memory/recall/route.ts` |
| `/api/memory/session` | GET, POST | `src/app/api/memory/session/route.ts` |
| `/api/memory/store` | POST | `src/app/api/memory/store/route.ts` |
| `/api/metrics/all` | GET | `src/app/api/metrics/all/route.ts` |
| `/api/network/active-recon` | POST | `src/app/api/network/active-recon/route.ts` |
| `/api/network/packet-capture` | POST | `src/app/api/network/packet-capture/route.ts` |
| `/api/network/trace` | GET | `src/app/api/network/trace/route.ts` |
| `/api/osint/advanced` | POST | `src/app/api/osint/advanced/route.ts` |
| `/api/osint/bypass-tests` | POST | `src/app/api/osint/bypass-tests/route.ts` |
| `/api/osint/exploit-chains` | POST | `src/app/api/osint/exploit-chains/route.ts` |
| `/api/osint/lab-scan` | GET | `src/app/api/osint/lab-scan/route.ts` |
| `/api/osint/network-scan` | GET | `src/app/api/osint/network-scan/route.ts` |
| `/api/osint/scan` | GET | `src/app/api/osint/scan/route.ts` |
| `/api/osint/vulnerabilities` | POST | `src/app/api/osint/vulnerabilities/route.ts` |
| `/api/performance-diagnostic` | GET | `src/app/api/performance-diagnostic/route.ts` |
| `/api/routes/discover` | GET, POST | `src/app/api/routes/discover/route.ts` |
| `/api/routes/expand` | POST | `src/app/api/routes/expand/route.ts` |
| `/api/sentinel/execute` | POST | `src/app/api/sentinel/execute/route.ts` |
| `/api/sentinel/execute-command` | POST | `src/app/api/sentinel/execute-command/route.ts` |
| `/api/sentinel/fleet` | GET, POST | `src/app/api/sentinel/fleet/route.ts` |
| `/api/sentinel/network-monitor` | POST | `src/app/api/sentinel/network-monitor/route.ts` |
| `/api/sentinel/orchestrator` | POST | `src/app/api/sentinel/orchestrator/route.ts` |
| `/api/sentinel/scan-project` | POST | `src/app/api/sentinel/scan-project/route.ts` |
| `/api/sentinel/scoring` | GET, POST | `src/app/api/sentinel/scoring/route.ts` |
| `/api/test-db` | GET | `src/app/api/test-db/route.ts` |
| `/api/test-insert` | POST | `src/app/api/test-insert/route.ts` |
| `/api/test-tool` | POST | `src/app/api/test-tool/route.ts` |
| `/api/test/demo` | GET, POST | `src/app/api/test/demo/route.ts` |

### QUICKBOOKS (23 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/quickbooks/accounts` | GET | `src/app/api/quickbooks/accounts/route.ts` |
| `/api/quickbooks/auth/callback` | GET | `src/app/api/quickbooks/auth/callback/route.ts` |
| `/api/quickbooks/auth/connect` | GET | `src/app/api/quickbooks/auth/connect/route.ts` |
| `/api/quickbooks/auth/refresh` | GET, POST | `src/app/api/quickbooks/auth/refresh/route.ts` |
| `/api/quickbooks/connection/auto-refresh` | POST | `src/app/api/quickbooks/connection/auto-refresh/route.ts` |
| `/api/quickbooks/connection/disconnect` | POST | `src/app/api/quickbooks/connection/disconnect/route.ts` |
| `/api/quickbooks/connection/force-reconnect` | POST | `src/app/api/quickbooks/connection/force-reconnect/route.ts` |
| `/api/quickbooks/connection/force-status` | GET | `src/app/api/quickbooks/connection/force-status/route.ts` |
| `/api/quickbooks/connection/refresh` | POST | `src/app/api/quickbooks/connection/refresh/route.ts` |
| `/api/quickbooks/connection/status` | GET | `src/app/api/quickbooks/connection/status/route.ts` |
| `/api/quickbooks/connection/test` | GET | `src/app/api/quickbooks/connection/test/route.ts` |
| `/api/quickbooks/reports/aged-receivables` | GET | `src/app/api/quickbooks/reports/aged-receivables/route.ts` |
| `/api/quickbooks/reports/balance-sheet` | GET | `src/app/api/quickbooks/reports/balance-sheet/route.ts` |
| `/api/quickbooks/reports/balance-sheet-detailed` | GET | `src/app/api/quickbooks/reports/balance-sheet-detailed/route.ts` |
| `/api/quickbooks/reports/cash-flow` | GET | `src/app/api/quickbooks/reports/cash-flow/route.ts` |
| `/api/quickbooks/reports/profit-loss` | GET | `src/app/api/quickbooks/reports/profit-loss/route.ts` |
| `/api/quickbooks/status` | GET | `src/app/api/quickbooks/status/route.ts` |
| `/api/quickbooks/sync/accounts` | POST | `src/app/api/quickbooks/sync/accounts/route.ts` |
| `/api/quickbooks/sync/all` | POST | `src/app/api/quickbooks/sync/all/route.ts` |
| `/api/quickbooks/sync/customers` | POST | `src/app/api/quickbooks/sync/customers/route.ts` |
| `/api/quickbooks/sync/invoices` | POST | `src/app/api/quickbooks/sync/invoices/route.ts` |
| `/api/quickbooks/sync/payments` | POST | `src/app/api/quickbooks/sync/payments/route.ts` |
| `/api/quickbooks/sync/vendors` | POST | `src/app/api/quickbooks/sync/vendors/route.ts` |

### SEO (12 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/seo/analytics/detailed` | GET | `src/app/api/seo/analytics/detailed/route.ts` |
| `/api/seo/collect/ga4` | GET, POST | `src/app/api/seo/collect/ga4/route.ts` |
| `/api/seo/collect/gsc` | GET, POST | `src/app/api/seo/collect/gsc/route.ts` |
| `/api/seo/collect/semrush` | GET, POST | `src/app/api/seo/collect/semrush/route.ts` |
| `/api/seo/exploit-secrets` | POST | `src/app/api/seo/exploit-secrets/route.ts` |
| `/api/seo/ga4-status` | GET | `src/app/api/seo/ga4-status/route.ts` |
| `/api/seo/health` | GET | `src/app/api/seo/health/route.ts` |
| `/api/seo/keywords` | GET, POST, PATCH, DELETE | `src/app/api/seo/keywords/route.ts` |
| `/api/seo/metrics` | GET | `src/app/api/seo/metrics/route.ts` |
| `/api/seo/semrush/backlinks` | GET | `src/app/api/seo/semrush/backlinks/route.ts` |
| `/api/seo/semrush/competitors` | GET | `src/app/api/seo/semrush/competitors/route.ts` |
| `/api/seo/semrush/keyword-research` | GET | `src/app/api/seo/semrush/keyword-research/route.ts` |

### TELEMETRY (1 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/telemetry/write` | POST | `src/app/api/telemetry/write/route.ts` |

### VOPAY (2 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/vopay/stats` | GET | `src/app/api/vopay/stats/route.ts` |
| `/api/vopay/stats/[clientId]` | GET | `src/app/api/vopay/stats/[clientId]/route.ts` |

### WEBHOOK (17 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/webhooks/quickbooks` | POST | `src/app/api/webhooks/quickbooks/route.ts` |
| `/api/webhooks/vopay` | GET | `src/app/api/webhooks/vopay/route.ts` |
| `/api/webhooks/vopay/account-balance` | GET | `src/app/api/webhooks/vopay/account-balance/route.ts` |
| `/api/webhooks/vopay/account-limit` | GET | `src/app/api/webhooks/vopay/account-limit/route.ts` |
| `/api/webhooks/vopay/account-status` | GET | `src/app/api/webhooks/vopay/account-status/route.ts` |
| `/api/webhooks/vopay/account-verification` | GET | `src/app/api/webhooks/vopay/account-verification/route.ts` |
| `/api/webhooks/vopay/bank-account` | GET | `src/app/api/webhooks/vopay/bank-account/route.ts` |
| `/api/webhooks/vopay/batch` | GET | `src/app/api/webhooks/vopay/batch/route.ts` |
| `/api/webhooks/vopay/batch-detail` | GET | `src/app/api/webhooks/vopay/batch-detail/route.ts` |
| `/api/webhooks/vopay/client-account-balance` | GET | `src/app/api/webhooks/vopay/client-account-balance/route.ts` |
| `/api/webhooks/vopay/credit-card` | GET | `src/app/api/webhooks/vopay/credit-card/route.ts` |
| `/api/webhooks/vopay/debit-card` | GET | `src/app/api/webhooks/vopay/debit-card/route.ts` |
| `/api/webhooks/vopay/elinx` | GET | `src/app/api/webhooks/vopay/elinx/route.ts` |
| `/api/webhooks/vopay/payment-received` | GET | `src/app/api/webhooks/vopay/payment-received/route.ts` |
| `/api/webhooks/vopay/scheduled` | GET | `src/app/api/webhooks/vopay/scheduled/route.ts` |
| `/api/webhooks/vopay/transaction-group` | GET | `src/app/api/webhooks/vopay/transaction-group/route.ts` |
| `/api/webhooks/vopay/virtual-accounts` | GET | `src/app/api/webhooks/vopay/virtual-accounts/route.ts` |

### WORKER (1 routes)

| Path | Methods | File |
|------|---------|------|
| `/api/worker/process-jobs` | GET, POST | `src/app/api/worker/process-jobs/route.ts` |

---

## EVIDENCE TRAIL

**Command used:**
```bash
find src/app/api -type f \( -name "route.ts" -o -name "route.js" \)
```

**Output saved to:**
- `audit_artifacts/commands/find_api_routes.txt` (raw list)
- `audit_artifacts/api/API_ROUTE_INVENTORY.json` (structured data)

**Analysis method:**
- Regex search for `export function GET/POST/etc` in each file
- Category assignment based on path patterns

**Verification:**
```bash
cat audit_artifacts/commands/find_api_routes.txt | wc -l
# Output: 135
```

---

**Status:** ✅ VERIFIED
**Reproducible:** YES
