# DATAFLOW HEALTH SIGNALS
**SAR Project - Observability & Monitoring**
**Date:** 2026-01-23

## 🎯 Objectif

Ce document définit les signaux de santé à monitorer pour assurer la fiabilité du pipeline de données SAR. Il couvre les métriques, les seuils d'alerte, les méthodes de mesure et les actions correctives.

---

## 📊 Catégories de Signaux

### 1. WEBHOOK HEALTH 🔔

#### 1.1 Webhook Lag (Latence de réception)

**Description:** Temps entre l'événement externe (VoPay, QuickBooks) et sa réception dans notre système.

**Mesure:**
```sql
-- Webhook lag distribution (last 24h)
SELECT
  source,
  event_type,
  AVG(EXTRACT(EPOCH FROM (received_at - created_at))) as avg_lag_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - created_at))) as p95_lag_seconds,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - created_at))) as p99_lag_seconds,
  COUNT(*) as event_count
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source, event_type
ORDER BY avg_lag_seconds DESC;
```

**Seuils:**
- ✅ **Healthy:** < 5 secondes (p95)
- ⚠️ **Warning:** 5-30 secondes (p95)
- 🚨 **Critical:** > 30 secondes (p95)

**Actions:**
- Warning: Log dans Slack channel #alerts
- Critical: Email à l'équipe technique + SMS admin

#### 1.2 Webhook Failure Rate

**Description:** Taux d'échec de processing des webhooks reçus.

**Mesure:**
```sql
-- Webhook failure rate (last 24h)
SELECT
  source,
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as failure_rate_pct,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE status = 'error') as failed_webhooks
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source;
```

**Seuils:**
- ✅ **Healthy:** < 1% failure rate
- ⚠️ **Warning:** 1-5% failure rate
- 🚨 **Critical:** > 5% failure rate

**Actions:**
- Warning: Investigation manuelle dans les 24h
- Critical: Investigation immédiate + rollback si déploiement récent

#### 1.3 Webhook Delivery Gaps

**Description:** Détection de périodes sans webhooks attendus (possibles problèmes réseau, API down).

**Mesure:**
```sql
-- Detect gaps in webhook delivery
WITH webhook_timeline AS (
  SELECT
    source,
    created_at,
    LEAD(created_at) OVER (PARTITION BY source ORDER BY created_at) - created_at as gap_duration
  FROM webhook_logs
  WHERE source IN ('vopay', 'quickbooks')
    AND created_at > NOW() - INTERVAL '7 days'
)
SELECT
  source,
  MAX(EXTRACT(EPOCH FROM gap_duration) / 3600) as max_gap_hours,
  COUNT(*) FILTER (WHERE gap_duration > INTERVAL '4 hours') as gaps_over_4h
FROM webhook_timeline
GROUP BY source;
```

**Seuils:**
- ✅ **Healthy:** Pas de gap > 4h (sauf week-end)
- ⚠️ **Warning:** 1-2 gaps > 4h
- 🚨 **Critical:** Gap actif > 8h

**Actions:**
- Warning: Vérifier statut API externes
- Critical: Contacter support VoPay/QuickBooks

---

### 2. DATABASE PERFORMANCE 🗄️

#### 2.1 Query Response Time

**Description:** Temps de réponse des requêtes critiques au dashboard admin.

**Mesure:**
```sql
-- Query performance from telemetry_spans
SELECT
  span_name,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration_ms,
  COUNT(*) as query_count
FROM telemetry_spans
WHERE span_name LIKE 'db:%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY span_name
ORDER BY p95_duration_ms DESC
LIMIT 20;
```

**Seuils par type:**

| Type de query | P95 Healthy | P95 Warning | P95 Critical |
|---------------|-------------|-------------|--------------|
| Dashboard summary | < 200ms | 200-500ms | > 500ms |
| Client search | < 100ms | 100-300ms | > 300ms |
| Analysis processing | < 2000ms | 2-5s | > 5s |
| Report export | < 5000ms | 5-10s | > 10s |

**Actions:**
- Warning: Review query plan, add missing indexes
- Critical: Enable statement timeout, optimize immediately

#### 2.2 Database Connections

**Description:** Utilisation du pool de connexions Supabase.

**Mesure:**
```sql
-- Connection pool usage
SELECT
  COUNT(*) as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_queries
FROM pg_stat_activity
WHERE datname = current_database();
```

**Seuils:** (Supabase Free tier = 60 connections)
- ✅ **Healthy:** < 30 connections actives
- ⚠️ **Warning:** 30-50 connections actives
- 🚨 **Critical:** > 50 connections actives

**Actions:**
- Warning: Review connection pooling strategy
- Critical: Scale up Supabase tier ou optimize long-running queries

#### 2.3 Table Bloat & Vacuum

**Description:** Détection de tables nécessitant maintenance (vacuum/reindex).

**Mesure:**
```sql
-- Table bloat estimate
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_pct,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
ORDER BY dead_tuple_pct DESC NULLS LAST
LIMIT 10;
```

**Seuils:**
- ✅ **Healthy:** < 10% dead tuples
- ⚠️ **Warning:** 10-25% dead tuples
- 🚨 **Critical:** > 25% dead tuples

**Actions:**
- Warning: Schedule manual VACUUM
- Critical: Run VACUUM FULL during maintenance window

---

### 3. API LAYER HEALTH ⚡

#### 3.1 API Response Time

**Description:** Latence des endpoints critiques utilisés par le dashboard admin.

**Mesure:**
```sql
-- API endpoint performance (last 1h)
SELECT
  path,
  method,
  COUNT(*) as request_count,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration_ms
FROM telemetry_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND path LIKE '/api/admin/%'
GROUP BY path, method
ORDER BY p95_duration_ms DESC
LIMIT 20;
```

**Seuils:**
- ✅ **Healthy:** < 500ms (p95)
- ⚠️ **Warning:** 500-1500ms (p95)
- 🚨 **Critical:** > 1500ms (p95)

**Actions:**
- Warning: Profile slow endpoints, add caching
- Critical: Enable rate limiting, scale serverless functions

#### 3.2 API Error Rate

**Description:** Taux d'erreur HTTP 5xx (erreurs serveur).

**Mesure:**
```sql
-- API error rate by endpoint (last 1h)
SELECT
  path,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code >= 500) as error_5xx_count,
  COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / COUNT(*) as error_rate_pct
FROM telemetry_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY path
HAVING COUNT(*) FILTER (WHERE status_code >= 500) > 0
ORDER BY error_rate_pct DESC;
```

**Seuils:**
- ✅ **Healthy:** < 0.1% error rate
- ⚠️ **Warning:** 0.1-1% error rate
- 🚨 **Critical:** > 1% error rate

**Actions:**
- Warning: Review error logs, fix common errors
- Critical: Rollback deployment, investigate immediately

#### 3.3 Rate Limiting Triggers

**Description:** Fréquence de déclenchement du rate limiting (potentiel abus/bot).

**Mesure:**
```sql
-- Rate limit triggers (last 24h)
SELECT
  ip_address,
  path,
  COUNT(*) as blocked_requests,
  MIN(created_at) as first_blocked,
  MAX(created_at) as last_blocked
FROM telemetry_requests
WHERE status_code = 429
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, path
ORDER BY blocked_requests DESC
LIMIT 20;
```

**Seuils:**
- ✅ **Healthy:** < 10 IP bloquées/jour
- ⚠️ **Warning:** 10-50 IP bloquées/jour
- 🚨 **Critical:** > 50 IP bloquées/jour (possible DDoS)

**Actions:**
- Warning: Review patterns, adjust rate limits
- Critical: Enable Cloudflare DDoS protection

---

### 4. ANALYSIS WORKER HEALTH 🤖

#### 4.1 Job Processing Lag

**Description:** Temps entre création du job et début du traitement.

**Mesure:**
```sql
-- Analysis job lag (last 24h)
SELECT
  priority,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (started_at - created_at))) as avg_lag_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - created_at))) as p95_lag_seconds
FROM analysis_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status != 'pending'
GROUP BY priority;
```

**Seuils:**
- ✅ **Healthy:** < 30 secondes (p95)
- ⚠️ **Warning:** 30-120 secondes (p95)
- 🚨 **Critical:** > 120 secondes (p95)

**Actions:**
- Warning: Increase worker concurrency
- Critical: Scale worker instances, check DB locks

#### 4.2 Job Failure Rate

**Description:** Taux d'échec du traitement des analyses bancaires.

**Mesure:**
```sql
-- Analysis job failure rate (last 7 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) as failure_rate_pct
FROM analysis_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Seuils:**
- ✅ **Healthy:** < 5% failure rate
- ⚠️ **Warning:** 5-15% failure rate
- 🚨 **Critical:** > 15% failure rate

**Actions:**
- Warning: Review error patterns, improve validation
- Critical: Pause auto-processing, manual review required

#### 4.3 Stuck Jobs Detection

**Description:** Détection de jobs bloqués en statut "processing" trop longtemps.

**Mesure:**
```sql
-- Detect stuck jobs
SELECT
  id,
  analysis_id,
  status,
  priority,
  created_at,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 as minutes_stuck
FROM analysis_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes'
ORDER BY started_at ASC;
```

**Seuils:**
- ✅ **Healthy:** 0 jobs stuck
- ⚠️ **Warning:** 1-3 jobs stuck > 10 min
- 🚨 **Critical:** > 3 jobs stuck OU job stuck > 30 min

**Actions:**
- Warning: Manual retry
- Critical: Kill stuck process, investigate deadlock

---

### 5. DATA QUALITY 🔍

#### 5.1 Missing Required Fields

**Description:** Détection d'enregistrements avec champs critiques manquants.

**Mesure:**
```sql
-- Data quality checks for loan_applications
SELECT
  'Missing Email' as issue,
  COUNT(*) as affected_records
FROM loan_applications
WHERE email IS NULL OR email = ''
  AND created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Missing Phone' as issue,
  COUNT(*) as affected_records
FROM loan_applications
WHERE phone IS NULL OR phone = ''
  AND created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Missing UTM Source' as issue,
  COUNT(*) as affected_records
FROM loan_applications
WHERE utm_source IS NULL
  AND created_at > NOW() - INTERVAL '30 days';
```

**Seuils:**
- ✅ **Healthy:** 0 records avec champs manquants
- ⚠️ **Warning:** 1-10 records par jour
- 🚨 **Critical:** > 10 records par jour

**Actions:**
- Warning: Review form validation logic
- Critical: Fix frontend validation immediately

#### 5.2 Duplicate Detection

**Description:** Détection de doublons potentiels (même email, même téléphone).

**Mesure:**
```sql
-- Detect potential duplicates (last 30 days)
SELECT
  'Duplicate Email' as issue,
  email,
  COUNT(*) as duplicate_count
FROM loan_applications
WHERE created_at > NOW() - INTERVAL '30 days'
  AND email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 3

UNION ALL

SELECT
  'Duplicate Phone' as issue,
  phone,
  COUNT(*) as duplicate_count
FROM loan_applications
WHERE created_at > NOW() - INTERVAL '30 days'
  AND phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 3;
```

**Seuils:**
- ✅ **Healthy:** < 5 doublons détectés/mois
- ⚠️ **Warning:** 5-20 doublons détectés/mois
- 🚨 **Critical:** > 20 doublons détectés/mois (possible bot)

**Actions:**
- Warning: Manual review of duplicates
- Critical: Enable stricter fraud detection

#### 5.3 Orphaned Records

**Description:** Détection d'enregistrements orphelins (références cassées).

**Mesure:**
```sql
-- Detect orphaned client_analyses (no matching application)
SELECT COUNT(*) as orphaned_analyses
FROM client_analyses ca
LEFT JOIN loan_applications la ON ca.client_email = la.email
WHERE la.id IS NULL
  AND ca.created_at > NOW() - INTERVAL '30 days';

-- Detect orphaned analysis_scores (no matching analysis)
SELECT COUNT(*) as orphaned_scores
FROM analysis_scores ascr
LEFT JOIN client_analyses ca ON ascr.analysis_id = ca.id
WHERE ca.id IS NULL;
```

**Seuils:**
- ✅ **Healthy:** 0 orphaned records
- ⚠️ **Warning:** 1-5 orphaned records
- 🚨 **Critical:** > 5 orphaned records

**Actions:**
- Warning: Manual cleanup
- Critical: Fix referential integrity, add foreign keys

---

### 6. EXTERNAL SERVICES HEALTH 🔌

#### 6.1 Third-Party API Availability

**Description:** Monitoring de la disponibilité des services externes critiques.

**Mesure:**
```sql
-- External API success rate (last 24h)
WITH api_calls AS (
  SELECT
    CASE
      WHEN path LIKE '%inverite%' THEN 'Inverite'
      WHEN path LIKE '%vopay%' THEN 'VoPay'
      WHEN path LIKE '%quickbooks%' THEN 'QuickBooks'
      WHEN path LIKE '%analytics.google%' THEN 'GA4'
      WHEN path LIKE '%semrush%' THEN 'Semrush'
    END as external_service,
    status_code,
    duration_ms
  FROM telemetry_requests
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND (path LIKE '%inverite%' OR path LIKE '%vopay%' OR path LIKE '%quickbooks%'
         OR path LIKE '%analytics.google%' OR path LIKE '%semrush%')
)
SELECT
  external_service,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as success_count,
  COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) * 100.0 / COUNT(*) as success_rate_pct,
  AVG(duration_ms) as avg_duration_ms
FROM api_calls
WHERE external_service IS NOT NULL
GROUP BY external_service;
```

**Seuils:**
- ✅ **Healthy:** > 99% success rate
- ⚠️ **Warning:** 95-99% success rate
- 🚨 **Critical:** < 95% success rate

**Actions:**
- Warning: Check API status pages, retry logic
- Critical: Enable circuit breaker, fallback mode

#### 6.2 Webhook Signature Validation Failures

**Description:** Taux d'échec de validation des signatures webhook (security risk).

**Mesure:**
```sql
-- Webhook signature validation failures (last 7 days)
SELECT
  source,
  COUNT(*) FILTER (WHERE status = 'signature_failed') as failed_validations,
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE status = 'signature_failed') * 100.0 / COUNT(*) as failure_rate_pct
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source;
```

**Seuils:**
- ✅ **Healthy:** 0 failures
- ⚠️ **Warning:** 1-5 failures/semaine
- 🚨 **Critical:** > 5 failures/semaine

**Actions:**
- Warning: Review webhook secret rotation
- Critical: Security incident investigation, possible MITM attack

---

### 7. SECURITY SIGNALS 🛡️

#### 7.1 Failed Login Attempts

**Description:** Détection de tentatives de brute-force sur admin login.

**Mesure:**
```sql
-- Failed login attempts by IP (last 24h)
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM security_logs
WHERE event_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;
```

**Seuils:**
- ✅ **Healthy:** < 5 failed attempts par IP/jour
- ⚠️ **Warning:** 5-20 failed attempts par IP/jour
- 🚨 **Critical:** > 20 failed attempts par IP/jour

**Actions:**
- Warning: Enable IP-based rate limiting
- Critical: Block IP, enable CAPTCHA

#### 7.2 Unauthorized Access Attempts

**Description:** Tentatives d'accès aux endpoints admin sans authentification valide.

**Mesure:**
```sql
-- Unauthorized access attempts (last 24h)
SELECT
  ip_address,
  path,
  COUNT(*) as unauthorized_attempts
FROM telemetry_requests
WHERE status_code = 401
  AND path LIKE '/api/admin/%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, path
ORDER BY unauthorized_attempts DESC
LIMIT 20;
```

**Seuils:**
- ✅ **Healthy:** < 10 attempts/jour
- ⚠️ **Warning:** 10-50 attempts/jour
- 🚨 **Critical:** > 50 attempts/jour

**Actions:**
- Warning: Review auth middleware logs
- Critical: Enable IP blocking, investigate breach attempt

#### 7.3 Suspicious Activity Patterns

**Description:** Détection de patterns anormaux (scraping, bot, enumeration).

**Mesure:**
```sql
-- Detect rapid-fire requests from same IP
SELECT
  ip_address,
  COUNT(*) as request_count,
  COUNT(DISTINCT path) as unique_paths,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as timespan_seconds
FROM telemetry_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 100
  AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 300
ORDER BY request_count DESC;
```

**Seuils:**
- ✅ **Healthy:** 0 suspicious patterns
- ⚠️ **Warning:** 1-3 IPs avec behavior suspect
- 🚨 **Critical:** > 3 IPs OU même IP repeated attacks

**Actions:**
- Warning: Add to monitoring list
- Critical: Block IP, enable WAF rules

---

## 📈 Dashboard Health Score

### Calcul du Score Global (0-100)

**Formule:**
```
Health Score = (
  Webhook Health × 20% +
  Database Performance × 25% +
  API Health × 20% +
  Worker Health × 15% +
  Data Quality × 10% +
  External Services × 5% +
  Security × 5%
)
```

### Interprétation:

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | No action needed |
| 70-89 | 🟡 Good | Monitor trends |
| 50-69 | 🟠 Degraded | Investigation required |
| 0-49 | 🔴 Critical | Immediate action |

---

## 🚨 Alert Configuration

### Alert Channels:

1. **Slack #alerts** - Warning + Critical
2. **Email to ops@sar.ca** - Critical only
3. **SMS to admin** - P0 incidents only

### Alert Frequency:

- **Warnings:** Max 1 alert / 15 minutes (throttled)
- **Critical:** Max 1 alert / 5 minutes (throttled)
- **P0 Incidents:** No throttling

### Alert Template:

```
🚨 ALERT: [CRITICAL] High API Error Rate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Signal: API Error Rate
Current Value: 5.2% (Threshold: 1%)
Affected Endpoint: /api/admin/applications
Timeframe: Last 1 hour
Impact: Admin dashboard degraded

Runbook: https://docs.sar.ca/runbooks/high-error-rate
Dashboard: https://admin.sar.ca/dataflow/health
```

---

## 🔧 Implementation Checklist

**Phase 1: Data Collection (Week 1)**
- [ ] Add health check RPC functions to database
- [ ] Create materialized view for health metrics
- [ ] Set up cron job to refresh metrics every 5 min

**Phase 2: Dashboard UI (Week 2)**
- [ ] Create `/admin/dataflow/health` page
- [ ] Add real-time health score card
- [ ] Add historical trend charts
- [ ] Add drill-down panels per category

**Phase 3: Alerting (Week 3)**
- [ ] Integrate Slack webhook for alerts
- [ ] Configure email alerts via SendGrid
- [ ] Set up SMS alerts via Twilio
- [ ] Test alert throttling

**Phase 4: Automation (Week 4)**
- [ ] Auto-retry failed webhook processing
- [ ] Auto-vacuum tables with high bloat
- [ ] Auto-scale worker concurrency
- [ ] Auto-block IPs with suspicious patterns

---

## 📚 Related Documents

- `DATAFLOW_OVERVIEW.mmd` - Complete system architecture
- `DATAFLOW_METRICS_PIPELINE.mmd` - Metrics collection pipeline
- `METRICS_CATALOG.md` - All metrics being tracked
- `DB_SCHEMA_INVENTORY.md` - Database schema details
- `API_ROUTE_INVENTORY.md` - All API endpoints

---

**Status:** ✅ Approved for implementation
**Owner:** Technical Lead
**Next Review:** 2026-02-15
