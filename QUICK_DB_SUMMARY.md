# 🗄️ RÉSUMÉ TABLES BD PAR API - SAR

## 📊 STATS GLOBALES

- **Total routes**: 188
- **Tables uniques**: 93
- **Services externes**: 7
- **Groupes API**: 35

---

## 🏆 TOP 10 TABLES

| # | Table | Routes | Usage |
|---|-------|--------|-------|
| 1 | `webhook_logs` | 19 | Logging webhooks (VoPay, etc.) |
| 2 | `vopay_objects` | 18 | Transactions VoPay |
| 3 | `quickbooks_tokens` | 16 | Intégration QuickBooks |
| 4 | `telemetry_requests` | 13 | Observabilité (APM) |
| 5 | `contact_messages` | 8 | Formulaires contact |
| 6 | `loan_applications` | 8 | Demandes de prêts |
| 7 | `client_sessions` | 7 | Sessions analytics |
| 8 | `support_tickets` | 6 | Tickets support |
| 9 | `claude_actions` | 5 | Actions Claude AI |
| 10 | `clients_sar` | 5 | Clients SAR (legacy) |

---

## 🔴 APIS "HEAVY" (5+ tables)

### 1. `/api/admin` - **28 tables** (45 routes)
**Le Hub Central** - Admin dashboard avec accès à presque tout

**Tables principales**:
- `telemetry_requests` (5 routes)
- `clients_sar` (5 routes)
- `contact_messages` (5 routes)
- `support_tickets` (5 routes)
- `webhook_logs` (4 routes)
- `telemetry_spans` (4 routes)
- `vopay_webhook_logs` (4 routes)
- `emails_envoyes` (3 routes)
- ... +20 autres

**Services externes**: inverite.com, api.resend.com, quickbooks.intuit.com

**Routes clés**:
- Analytics dashboard
- API Explorer
- Client analysis
- Messages & support
- Webhooks debug
- Telemetry command center

---

### 2. `/api/metrics` - **16 tables** (1 route)
**Dashboard Métriques Global** - Une route qui lit 16 vues matérialisées

**Tables (vues)**:
- `vw_client_timeline`
- `vw_vopay_summary`
- `vw_audit_recent`
- `vw_performance_*` (4 vues)
- `vopay_objects`
- `communications`
- `loans`
- ... +8 autres

**Usage**: `/api/metrics/all` - Snapshot complet du système

---

### 3. `/api/analytics` - **15 tables** (14 routes)
**Analytics Utilisateurs** - Tracking, heatmaps, funnels

**Tables principales**:
- `client_telemetry_events` (5 routes)
- `client_sessions` (5 routes)
- `visual_*` (7 vues: heatmap, funnel, flow, etc.)

**Routes**:
- Heatmaps (click, activity, abandon)
- Funnels de conversion
- Page flow & journeys
- Sessions & referrers

---

### 4. `/api/seo` - **15 tables** (27 routes)
**SEO & Performance Metrics** - GA4, GSC, PageSpeed, SEMRush

**Tables principales**:
- `telemetry_requests` (7 routes)
- `seo_ga4_metrics_daily` (3 routes)
- `seo_unified_daily_plus` (3 routes)
- `loan_applications` (4 routes)
- `seo_gsc_metrics_daily` (2 routes)
- ... +10 autres

**Services externes**: api.cloudflare.com, api.uptimerobot.com

**Routes**:
- Collectors (GA4, GSC, PageSpeed, SEMRush, SSL, Uptime)
- Dashboards (overview, performance, realtime)
- IP intelligence & visitor tracking

---

### 5. `/api/webhooks` - **12 tables** (17 routes)
**Webhooks QuickBooks & VoPay** - Intégration comptable

**Tables principales**:
- `quickbooks_*` (7 tables)
- `webhook_logs` (9 routes)
- `vopay_webhook_logs` (5 routes)
- `payment_schedule_versions`
- `payment_installments`

**Routes**:
- QuickBooks sync (customers, invoices, payments, accounts)
- VoPay webhooks
- Webhook logs & replay

---

### 6. `/api/quickbooks` - **11 tables** (14 routes)
**Intégration QuickBooks** - OAuth, sync, customers, invoices

**Tables**: Toutes les tables `quickbooks_*`

**Routes**:
- OAuth callback & refresh
- Customers CRUD
- Invoices & payments
- Vendors & accounts
- Sync status

---

## 🟡 APIS "MEDIUM" (2-4 tables)

| API | Tables | Routes | Description |
|-----|--------|--------|-------------|
| `/api/applications` | 4 | 1 | Demandes de prêts |
| `/api/fraud` | 4 | 2 | Détection fraude |
| `/api/cron` | 3 | 3 | Jobs planifiés |
| `/api/memory` | 3 | 5 | Mémoire Claude |
| `/api/sentinel` | 3 | 7 | Security & fraud |
| `/api/activity` | 1 | 3 | Actions Claude |
| `/api/telemetry` | 1 | 6 | Events tracking |

---

## 🟢 APIS "LIGHT" (0-1 table)

**7 groupes avec 1 table**:
- `/api/activity`, `/api/anonymity`, `/api/audit`, etc.

**11 groupes SANS base de données**:
- `/api/test`, `/api/contact`, `/api/sign`, etc.

---

## 🌐 SERVICES EXTERNES (7)

| Service | Routes | Usage |
|---------|--------|-------|
| `quickbooks.intuit.com` | 25 | Comptabilité |
| `api.resend.com` | 4 | Emails transactionnels |
| `localhost` | 4 | Tests locaux |
| `inverite.com` | 1 | IBV backup |
| `api.cloudflare.com` | 1 | Analytics CDN |
| `api.uptimerobot.com` | 1 | Monitoring uptime |
| `attacker.com` | 1 | Tests sécurité |

---

## 💡 INSIGHTS CLÉS

### 🎯 **Tables Critiques** (utilisées partout):
1. **`webhook_logs`** (19 routes) - Logging critique de tous les webhooks
2. **`vopay_objects`** (18 routes) - Toutes les transactions paiement
3. **`quickbooks_tokens`** (16 routes) - Auth QuickBooks
4. **`telemetry_requests`** (13 routes) - APM/Observabilité

### ⚡ **APIs les Plus Connectées**:
- **`/api/admin`** - Point central, touche 28 tables
- **`/api/metrics`** - Vue unifiée, 16 vues matérialisées
- **`/api/seo`** - Monitoring complet, 15 tables

### 🔒 **Isolation**:
- 11 APIs sans DB (tests, diagnostics, utils)
- Séparation claire: admin vs public vs cron

### 📊 **Patterns d'Architecture**:
- **Vues matérialisées** pour analytics (`vw_*`, `visual_*`)
- **Logs centralisés** (`webhook_logs`, `telemetry_*`)
- **Intégrations isolées** (QuickBooks, VoPay dans leurs propres tables)

---

## 🚀 COMMANDES

```bash
# Voir le rapport complet
cat /Users/xunit/Desktop/📁\ Projets/sar/API_DB_ANALYSIS.txt | less

# Ouvrir page HTML interactive
open /Users/xunit/Desktop/📁\ Projets/sar/public/api-db-analysis.html

# Régénérer
cd /Users/xunit/Desktop/📁\ Projets/sar
node scripts/analyze-api-db-usage.js > API_DB_ANALYSIS.txt
node scripts/generate-db-analysis-html.js
```

---

**Date**: 2026-01-30
**Projet**: Solution Argent Rapide (SAR)
**Source**: Scan automatique de 188 routes API
