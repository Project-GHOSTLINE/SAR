# 📋 API ROUTE INVENTORY - SAR Project

**Date**: 2026-01-23
**Total Routes**: 134
**Architecture**: Next.js App Router + Supabase

---

## 🎯 OVERVIEW

Ce document liste toutes les routes API du projet SAR, organisées par domaine fonctionnel.
Chaque route inclut: méthode HTTP, input/output, tables touchées, latence attendue.

---

## 📊 ROUTES PAR DOMAINE

### 1. ADMIN - Gestion & Dashboard (32 routes)

#### Analytics & Metrics
- **GET `/api/admin/analytics`** - Dashboard analytics principal
  - **Output**: Métriques agrégées (applications, conversions, revenus)
  - **Tables**: `loan_applications`, `seo_ga4_metrics_daily`, `quickbooks_invoices`
  - **Latence**: < 500ms
  - **Optimisation**: Utilise materialized views

- **GET `/api/admin/analytics/dashboard`** - Métriques temps réel
  - **Output**: KPIs dashboard (applications today, approval rate, revenue)
  - **Tables**: `loan_applications`, `quickbooks_payments`
  - **Latence**: < 300ms

- **GET `/api/admin/metrics/inspect`** - Inspection détaillée métriques
  - **Input**: Query params `metric`, `period`, `granularity`
  - **Output**: Time-series data, breakdowns
  - **Tables**: `telemetry_requests`, `seo_*_metrics_daily`
  - **Latence**: < 800ms

#### Client Analysis & Dossiers
- **POST `/api/admin/client-analysis`** - Créer/Mettre à jour analyse client
  - **Input**: `{ client_name, raw_data, inverite_guid, source, risk_score }`
  - **Output**: `{ id, client_name, total_accounts, job_created }`
  - **Tables**: INSERT `client_analyses`, `analysis_jobs`
  - **Workflow**: Déclenche worker automatique (processAnalysisJob)
  - **Latence**: < 1000ms

- **GET `/api/admin/client-analysis?id={id}`** - Récupérer analyse complète
  - **Output**: Analyse + scores + recommandation + job status
  - **Tables**: JOIN `client_analyses`, `analysis_scores`, `analysis_recommendations`, `analysis_jobs`
  - **Latence**: < 400ms
  - **Optimisation**: Index sur `client_analyses.id`

#### Clients SAR - Dossiers Unifiés
- **GET `/api/admin/clients-sar/search`** - Recherche clients multi-critères
  - **Input**: `name`, `email`, `phone`, `status`, `limit`, `offset`
  - **Output**: Liste clients avec métadonnées
  - **Tables**: `loan_applications`, `client_events`
  - **Latence**: < 600ms
  - **Optimisation**: Index trigram sur `nom`, `prenom`, `courriel`

- **GET `/api/admin/clients-sar/concordances`** - Détecter doublons/liens
  - **Input**: Query params `type` (email, phone, address)
  - **Output**: Groupes de clients liés
  - **Tables**: `loan_applications`
  - **Latence**: < 1200ms
  - **Note**: Requête lourde, nécessite optimisation

- **GET `/api/admin/clients-sar/concordances-stats`** - Stats concordances
  - **Output**: Nombre de doublons par type
  - **Tables**: `loan_applications`
  - **Latence**: < 800ms

- **GET `/api/admin/clients-sar/autres-contrats`** - Autres contrats client
  - **Input**: `clientId`
  - **Output**: Liste contrats liés
  - **Tables**: `loan_applications`
  - **Latence**: < 400ms

- **GET `/api/admin/clients-sar/stats`** - Statistiques globales clients
  - **Output**: Total clients, nouveaux ce mois, actifs, etc.
  - **Tables**: `loan_applications`, `client_events`
  - **Latence**: < 500ms

#### Messages & Support
- **GET `/api/admin/messages`** - Liste messages support
  - **Input**: Query params `status`, `assigned_to`, `limit`, `offset`
  - **Output**: Messages paginés
  - **Tables**: `email_messages`, `email_classifications`
  - **Latence**: < 600ms

- **PATCH `/api/admin/messages/assign`** - Assigner message
  - **Input**: `{ messageId, assignedTo }`
  - **Output**: Message updated
  - **Tables**: UPDATE `email_messages`
  - **Latence**: < 200ms

- **GET `/api/admin/support/tickets`** - Liste tickets support
  - **Output**: Tickets ouverts/fermés
  - **Tables**: `client_events` WHERE `type = 'support_ticket'`
  - **Latence**: < 500ms

- **GET `/api/admin/support/tickets/[id]`** - Détails ticket
  - **Output**: Ticket + historique + messages
  - **Tables**: `client_events`, `event_actions`
  - **Latence**: < 400ms

- **GET `/api/admin/support/messages`** - Messages support
  - **Output**: Messages triés par ticket
  - **Tables**: `email_messages`
  - **Latence**: < 600ms

- **GET `/api/admin/support/stats`** - Stats support
  - **Output**: Temps réponse moyen, tickets ouverts, SLA
  - **Tables**: `client_events`, `event_actions`
  - **Latence**: < 700ms

#### VoPay Integration
- **GET `/api/admin/vopay`** - Dashboard VoPay principal
  - **Output**: Transactions récentes, balance, stats
  - **Tables**: `webhook_logs` WHERE `source = 'vopay'`
  - **Latence**: < 800ms

- **GET `/api/admin/vopay/transactions`** - Liste transactions VoPay
  - **Input**: `startDate`, `endDate`, `status`, `limit`, `offset`
  - **Output**: Transactions paginées
  - **Tables**: `webhook_logs`
  - **Latence**: < 1000ms
  - **Note**: Table volumineuse, pagination obligatoire

- **GET `/api/admin/vopay/real-transactions`** - Transactions réelles (vs tests)
  - **Output**: Transactions production uniquement
  - **Tables**: `webhook_logs` WHERE `environment = 'production'`
  - **Latence**: < 900ms

- **GET `/api/admin/vopay-debug`** - Debug VoPay
  - **Output**: Logs, erreurs, webhooks reçus
  - **Tables**: `webhook_logs`, `telemetry_alerts`
  - **Latence**: < 600ms

#### Webhooks Management
- **GET `/api/admin/webhooks/list`** - Liste webhooks
  - **Input**: `source`, `status`, `startDate`, `endDate`
  - **Output**: Webhooks paginés
  - **Tables**: `webhook_logs`
  - **Latence**: < 800ms

- **GET `/api/admin/webhooks/stats`** - Stats webhooks
  - **Output**: Par provider (vopay, quickbooks), succès/échecs
  - **Tables**: `webhook_logs`
  - **Latence**: < 600ms

- **POST `/api/admin/webhooks/retry`** - Retry webhook échoué
  - **Input**: `{ webhookId }`
  - **Output**: Retry result
  - **Tables**: UPDATE `webhook_logs`, INSERT `telemetry_spans`
  - **Latence**: < 2000ms

- **GET `/api/admin/webhooks/export`** - Export webhooks CSV
  - **Input**: Filtres date/source
  - **Output**: CSV file
  - **Tables**: `webhook_logs`
  - **Latence**: < 3000ms

- **POST `/api/admin/webhooks/send-alert`** - Envoyer alerte webhook
  - **Input**: `{ webhookId, message }`
  - **Output**: Alert sent
  - **Tables**: INSERT `telemetry_alerts`
  - **Latence**: < 500ms

- **GET `/api/admin/webhooks/debug`** - Debug webhooks
  - **Output**: Erreurs, stack traces
  - **Tables**: `webhook_logs`, `telemetry_security`
  - **Latence**: < 700ms

#### Downloads & Tracking
- **GET `/api/admin/downloads/stats`** - Stats téléchargements
  - **Output**: Fichiers les plus téléchargés, par client
  - **Tables**: `download_logs`
  - **Latence**: < 500ms

#### Dataflow Health
- **GET `/api/admin/dataflow-health/kpis`** - KPIs santé dataflow
  - **Output**: Webhooks lag, error rate, DB latency
  - **Tables**: `webhook_logs`, `telemetry_requests`, `telemetry_alerts`
  - **Latence**: < 800ms

- **GET `/api/admin/dataflow-health/traces`** - Traces détaillées
  - **Input**: `operation`, `startTime`, `endTime`
  - **Output**: Distributed traces
  - **Tables**: `telemetry_spans`
  - **Latence**: < 1000ms

- **GET `/api/admin/dataflow-health/alerts`** - Alertes actives
  - **Output**: Alertes non résolues
  - **Tables**: `telemetry_alerts`
  - **Latence**: < 400ms

#### Database Explorer
- **GET `/api/admin/database/explore`** - Explorateur DB
  - **Input**: `table`, `filters`, `limit`, `offset`
  - **Output**: Rows + metadata
  - **Tables**: Dynamic (toutes tables)
  - **Latence**: Variable
  - **Sécurité**: RLS check requis

#### GA4 Enrichment
- **GET `/api/admin/ga4/enriched`** - Métriques GA4 enrichies
  - **Output**: Sessions + applications matchées
  - **Tables**: `seo_ga4_metrics_daily`, `loan_applications`
  - **Latence**: < 900ms

#### Auth
- **POST `/api/admin/login`** - Connexion admin
  - **Input**: `{ username, password }`
  - **Output**: `{ token, session }`
  - **Tables**: Supabase Auth (hors projet)
  - **Latence**: < 800ms

- **POST `/api/admin/logout`** - Déconnexion
  - **Output**: Session cleared
  - **Latence**: < 100ms

- **POST `/api/admin/send`** - Envoyer message (generic)
  - **Input**: `{ to, subject, body, type }`
  - **Output**: Message sent
  - **Tables**: INSERT `email_messages`
  - **Latence**: < 1500ms

---

### 2. APPLICATIONS - Demandes de Prêt (1 route)

- **POST `/api/applications/submit`** - Soumettre demande de prêt
  - **Input**: Formulaire complet (prenom, nom, courriel, telephone, montant_demande, etc.)
  - **Output**: `{ id, reference, status }`
  - **Tables**: INSERT `loan_applications`, INSERT `client_events`
  - **Workflow**:
    1. Validation données
    2. Génération reference (SAR-LP-XXXXXX)
    3. Scoring Cortex automatique
    4. Envoi vers Margill (si configured)
    5. Capture métriques (IP, user-agent, UTM)
  - **Latence**: < 2000ms
  - **Optimisation**: Async job pour Margill

---

### 3. WEBHOOKS - Ingestion Externe (16 routes)

#### VoPay Webhooks (14 routes)
- **POST `/api/webhooks/vopay`** - Webhook générique VoPay
- **POST `/api/webhooks/vopay/account-balance`** - Balance update
- **POST `/api/webhooks/vopay/account-limit`** - Limit change
- **POST `/api/webhooks/vopay/account-status`** - Status change
- **POST `/api/webhooks/vopay/account-verification`** - Verification result
- **POST `/api/webhooks/vopay/bank-account`** - Bank account event
- **POST `/api/webhooks/vopay/batch`** - Batch transaction
- **POST `/api/webhooks/vopay/batch-detail`** - Batch detail
- **POST `/api/webhooks/vopay/client-account-balance`** - Client balance
- **POST `/api/webhooks/vopay/credit-card`** - Credit card transaction
- **POST `/api/webhooks/vopay/debit-card`** - Debit card transaction
- **POST `/api/webhooks/vopay/elinx`** - ELinx event
- **POST `/api/webhooks/vopay/payment-received`** - Payment notification
- **POST `/api/webhooks/vopay/scheduled`** - Scheduled payment
- **POST `/api/webhooks/vopay/transaction-group`** - Transaction group
- **POST `/api/webhooks/vopay/virtual-accounts`** - Virtual account event

**Tous les webhooks VoPay**:
- **Input**: VoPay payload (signature vérifiée)
- **Output**: `{ received: true }`
- **Tables**: INSERT `webhook_logs`, INSERT `client_events` (si lié à client)
- **Workflow**:
  1. Validation signature VoPay
  2. Parsing payload
  3. Extraction client_id/application_id (si applicable)
  4. Stockage dans `webhook_logs`
  5. Trigger events si nécessaire
- **Latence**: < 500ms
- **Note**: Idempotent (basé sur VoPay transaction_id)

#### QuickBooks Webhook (1 route)
- **POST `/api/webhooks/quickbooks`** - Webhook QuickBooks
  - **Input**: QB notification payload
  - **Output**: `{ received: true }`
  - **Tables**: INSERT `quickbooks_webhooks`, UPDATE `quickbooks_sync_logs`
  - **Workflow**: Trigger sync selective si entity changed
  - **Latence**: < 600ms

---

### 4. QUICKBOOKS - Intégration Comptabilité (20 routes)

#### Auth & Connection
- **GET `/api/quickbooks/auth/connect`** - Initier connexion QB
- **GET `/api/quickbooks/auth/callback`** - Callback OAuth2
- **POST `/api/quickbooks/auth/refresh`** - Refresh access token
- **GET `/api/quickbooks/connection/status`** - Status connexion
- **POST `/api/quickbooks/connection/test`** - Test connexion
- **POST `/api/quickbooks/connection/refresh`** - Force refresh token
- **POST `/api/quickbooks/connection/auto-refresh`** - Auto-refresh setup
- **POST `/api/quickbooks/connection/disconnect`** - Déconnecter
- **POST `/api/quickbooks/connection/force-reconnect`** - Force reconnexion
- **POST `/api/quickbooks/connection/force-status`** - Force status check

**Tables touchées**: `quickbooks_tokens`, `telemetry_security`

#### Sync Operations
- **POST `/api/quickbooks/sync/all`** - Sync complète
- **POST `/api/quickbooks/sync/customers`** - Sync clients
- **POST `/api/quickbooks/sync/accounts`** - Sync comptes
- **POST `/api/quickbooks/sync/invoices`** - Sync factures
- **POST `/api/quickbooks/sync/payments`** - Sync paiements
- **POST `/api/quickbooks/sync/vendors`** - Sync fournisseurs

**Tables touchées**: `quickbooks_customers`, `quickbooks_accounts`, `quickbooks_invoices`, `quickbooks_payments`, `quickbooks_vendors`, `quickbooks_sync_logs`

**Latence**: 2000-10000ms (dépend volume données)

#### Reports
- **GET `/api/quickbooks/reports/balance-sheet`** - Bilan
- **GET `/api/quickbooks/reports/balance-sheet-detailed`** - Bilan détaillé
- **GET `/api/quickbooks/reports/profit-loss`** - P&L
- **GET `/api/quickbooks/reports/cash-flow`** - Cash flow
- **GET `/api/quickbooks/reports/aged-receivables`** - Créances âgées

**Latence**: 1000-3000ms

#### Status & Accounts
- **GET `/api/quickbooks/status`** - Status global QB
- **GET `/api/quickbooks/accounts`** - Liste comptes QB

---

### 5. SEO & ANALYTICS - Métriques Web (13 routes)

#### Collection (Cron Jobs)
- **GET `/api/cron/seo-collect`** - Cron principal collection SEO
  - **Workflow**: Déclenche GA4, GSC, Semrush collection
  - **Tables**: INSERT `seo_collection_jobs`
  - **Latence**: < 500ms (async)

- **POST `/api/seo/collect/ga4`** - Collecte GA4
  - **Output**: Métriques importées
  - **Tables**: INSERT `seo_ga4_metrics_daily`
  - **Latence**: 2000-5000ms

- **POST `/api/seo/collect/gsc`** - Collecte Google Search Console
  - **Tables**: INSERT `seo_gsc_metrics_daily`
  - **Latence**: 2000-5000ms

- **POST `/api/seo/collect/semrush`** - Collecte Semrush
  - **Tables**: INSERT `seo_semrush_domain_daily`
  - **Latence**: 3000-8000ms

#### Analytics & Metrics
- **GET `/api/seo/analytics/detailed`** - Analytics détaillées
  - **Output**: Sessions, users, conversions par source/medium
  - **Tables**: `seo_ga4_metrics_daily`, `loan_applications`
  - **Latence**: < 800ms

- **GET `/api/seo/metrics`** - Métriques agrégées
  - **Output**: Traffic overview, top pages, top sources
  - **Tables**: `seo_ga4_metrics_daily`, `seo_gsc_metrics_daily`
  - **Latence**: < 700ms

- **GET `/api/seo/keywords/`** - Mots-clés tracking
  - **Output**: Position, volume, CTR par keyword
  - **Tables**: `seo_keywords_tracking`, `seo_gsc_metrics_daily`
  - **Latence**: < 600ms

- **GET `/api/seo/ga4-status`** - Status connexion GA4
  - **Output**: Connected, last sync, errors
  - **Tables**: `seo_collection_jobs`
  - **Latence**: < 200ms

#### Semrush Specific
- **GET `/api/seo/semrush/backlinks`** - Backlinks analysis
- **GET `/api/seo/semrush/competitors`** - Analyse concurrents
- **GET `/api/seo/semrush/keyword-research`** - Recherche mots-clés

**Tables**: `seo_semrush_domain_daily`, `seo_audit_log`

#### Security Testing (Lab)
- **POST `/api/seo/exploit-secrets`** - Test sécurité secrets
  - **Note**: Lab only, ne pas utiliser en prod

---

### 6. WORKER & BACKGROUND JOBS (1 route)

- **GET `/api/worker/process-jobs`** - Traiter jobs d'analyse en attente
  - **Input**: None (ou `jobId` en query)
  - **Output**: `{ processed, succeeded, failed, results[] }`
  - **Tables**:
    - SELECT `analysis_jobs` WHERE `status = 'pending'`
    - UPDATE `analysis_jobs`
    - INSERT `analysis_scores`, `analysis_recommendations`
  - **Workflow**:
    1. Fetch 10 jobs pending (FIFO + priority)
    2. Pour chaque job: calculate SAR score + recommendation
    3. Save results
    4. Mark job completed
  - **Latence**: 5000-15000ms (traitement 10 jobs)
  - **Optimisation**: Peut être appelé par cron Vercel

---

### 7. ACTIVITY & METRICS - Tracking Interne (6 routes)

- **POST `/api/activity/log`** - Logger activité
  - **Input**: `{ userId, action, resource, metadata }`
  - **Output**: `{ logged: true }`
  - **Tables**: INSERT `telemetry_requests`
  - **Latence**: < 200ms

- **GET `/api/activity/stats`** - Stats activité
  - **Output**: Activité par user, par action
  - **Tables**: `telemetry_requests`
  - **Latence**: < 600ms

- **GET `/api/activity/recent`** - Activité récente
  - **Output**: 50 dernières activités
  - **Tables**: `telemetry_requests` ORDER BY created_at DESC LIMIT 50
  - **Latence**: < 300ms

- **GET `/api/metrics/all`** - Toutes métriques
  - **Output**: Métriques systèmes + business
  - **Tables**: Multiple (agrégation)
  - **Latence**: < 1000ms

---

### 8. DOWNLOAD & TRACKING (3 routes)

- **GET `/api/download/[filename]`** - Télécharger fichier
  - **Input**: `filename` param
  - **Output**: File stream
  - **Tables**: SELECT file metadata, INSERT `download_logs`
  - **Latence**: Variable (dépend taille fichier)

- **POST `/api/download/track`** - Tracker téléchargement
  - **Input**: `{ fileId, clientId, ipAddress }`
  - **Output**: `{ tracked: true }`
  - **Tables**: INSERT `download_logs`
  - **Latence**: < 200ms

---

### 9. TELEMETRY - Performance & Observabilité (1 route)

- **POST `/api/telemetry/write`** - Écrire métriques telemetry
  - **Input**: `{ spans[], requests[], alerts[] }`
  - **Output**: `{ written: true }`
  - **Tables**: INSERT `telemetry_spans`, `telemetry_requests`, `telemetry_alerts`
  - **Latence**: < 300ms
  - **Note**: Batch write optimisé

---

### 10. AUDIT (2 routes)

- **GET `/api/audit/[clientId]`** - Audit trail client
  - **Output**: Timeline complète événements
  - **Tables**: `client_events`, `event_actions`, `loan_applications`
  - **Latence**: < 800ms

- **GET `/api/audit/stats`** - Stats audit
  - **Output**: Events par type, par période
  - **Tables**: `client_events`
  - **Latence**: < 500ms

---

### 11. VOPAY STATS (2 routes)

- **GET `/api/vopay/stats`** - Stats VoPay globales
- **GET `/api/vopay/stats/[clientId]`** - Stats VoPay par client

**Tables**: `webhook_logs` WHERE `source = 'vopay'`

---

### 12. MEMORY & CONTEXT (Lab/Expérimental - 5 routes)

- **POST `/api/memory/store`** - Stocker contexte
- **GET `/api/memory/recall`** - Rappeler contexte
- **GET `/api/memory/context`** - Contexte actuel
- **POST `/api/memory/session`** - Gérer session
- **GET `/api/memory/doc-read`** - Lire document en mémoire

**Note**: Système expérimental, ne pas utiliser en prod

---

### 13. NETWORK & SECURITY LAB (3 routes)

- **POST `/api/network/trace`** - Network trace
- **POST `/api/network/active-recon`** - Active reconnaissance
- **POST `/api/network/packet-capture`** - Packet capture

**Note**: Lab only, environnement test uniquement

---

### 14. FINGERPRINT & DEVICE (2 routes)

- **POST `/api/fingerprint/deep-scan`** - Fingerprint device
  - **Input**: Browser/device info
  - **Output**: Device ID, risk score
  - **Tables**: INSERT `telemetry_security`
  - **Latence**: < 500ms

- **POST `/api/device/deep-inspector`** - Inspection device détaillée
  - **Tables**: INSERT `telemetry_security`
  - **Latence**: < 600ms

---

### 15. OSINT & SECURITY (Lab - 7 routes)

Routes expérimentales pour tests sécurité:
- `/api/osint/scan`
- `/api/osint/advanced`
- `/api/osint/network-scan`
- `/api/osint/vulnerabilities`
- `/api/osint/exploit-chains`
- `/api/osint/lab-scan`
- `/api/osint/bypass-tests`

**Note**: Lab uniquement, ne pas exposer en production

---

### 16. SENTINEL (Lab - 6 routes)

Système de monitoring/orchestration expérimental:
- `/api/sentinel/execute`
- `/api/sentinel/execute-command`
- `/api/sentinel/fleet`
- `/api/sentinel/network-monitor`
- `/api/sentinel/orchestrator`
- `/api/sentinel/scan-project`
- `/api/sentinel/scoring`

**Note**: En développement

---

### 17. ROUTES LAB/TEST (5 routes)

- **GET `/api/test/demo`** - Demo route
- **POST `/api/test-tool`** - Test tool
- **GET `/api/test-db`** - Test connexion DB
- **POST `/api/test-insert`** - Test insert DB
- **POST `/api/performance-diagnostic`** - Diagnostic performance

---

### 18. MISC (5 routes)

- **POST `/api/contact`** - Formulaire contact
  - **Input**: `{ name, email, phone, message }`
  - **Output**: `{ sent: true }`
  - **Tables**: INSERT `client_events`
  - **Latence**: < 800ms

- **POST `/api/contact-analyse`** - Analyse contact form submission
  - **Tables**: INSERT `client_events`, `telemetry_security`
  - **Latence**: < 500ms

- **POST `/api/anonymity/check`** - Vérifier anonymat
  - **Output**: Proxy detected, VPN, Tor, etc.
  - **Tables**: INSERT `telemetry_security`
  - **Latence**: < 600ms

- **POST `/api/routes/discover`** - Découvrir routes API
- **POST `/api/routes/expand`** - Expand routes

- **POST `/api/cortex/sync-miro`** - Sync avec Miro (obsolète?)

---

## 🔍 PATTERNS IDENTIFIÉS

### Anti-patterns détectés:
1. **N+1 queries potentiels** dans `/api/admin/clients-sar/concordances`
2. **Pas de pagination obligatoire** sur plusieurs endpoints (ex: `/api/admin/vopay/transactions`)
3. **SELECT *** sur endpoints explorateurs
4. **Manque d'index** sur colonnes de recherche (email, phone, nom)
5. **RLS non vérifié** sur certaines routes admin

### Optimisations recommandées:
1. Créer views matérialisées pour dashboards
2. Implémenter keyset pagination sur timelines
3. Ajouter index composites sur (`client_id`, `created_at`)
4. Cache court (60s) sur endpoints analytics
5. Rate limiting sur endpoints publics

---

## 📊 MÉTRIQUES CLÉS

- **Routes totales**: 134
- **Routes CRUD clients**: 8
- **Routes webhooks**: 16 (VoPay: 14, QuickBooks: 1)
- **Routes admin**: 32
- **Routes analytics/SEO**: 13
- **Routes QuickBooks**: 20
- **Routes Lab/Test**: 23 (à ne pas exposer en prod)

---

## ✅ CHECKLIST VALIDATION

- [ ] Toutes routes documentées
- [ ] Latences mesurées (à benchmarker en prod)
- [ ] Index identifiés (voir DB_VIEWS_AND_FUNCTIONS_PLAN.md)
- [ ] RLS vérifié sur routes sensibles
- [ ] Pagination implémentée sur routes volumineuses
- [ ] Rate limiting sur endpoints publics
- [ ] Monitoring activé (telemetry_requests)

---

**Généré le**: 2026-01-23
**Par**: Claude Sonnet 4.5 (Architecture Audit)
**Next**: Voir `DB_SCHEMA_INVENTORY.md` pour schéma complet
