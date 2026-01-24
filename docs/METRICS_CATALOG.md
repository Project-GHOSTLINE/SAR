# 📈 METRICS CATALOG - SAR Project

**Date**: 2026-01-23
**Total Metric Types**: 150+
**Sources**: 12 (API routes, Webhooks, Cron jobs, User actions)

---

## 🎯 OVERVIEW

Ce document catalogue toutes les métriques capturées dans le système SAR:
- **Où** elles sont capturées (source)
- **Quand** (fréquence)
- **Comment** elles sont stockées (table de destination)
- **Pourquoi** (usage métier)

---

## 📊 MÉTRIQUES PAR CATÉGORIE

### 1. FUNNEL & CONVERSION METRICS

#### Application Funnel
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `form_started` | `/api/applications/submit` | Per event | `loan_applications.form_started_at` | Début remplissage formulaire |
| `form_completed` | `/api/applications/submit` | Per event | `loan_applications.form_completed_at` | Formulaire complété |
| `application_submitted` | `/api/applications/submit` | Per event | `loan_applications.submitted_at` + `client_events` | Demande soumise |
| `last_step_completed` | Frontend tracking | Per step | `loan_applications.last_step_completed` | Dernière étape vue |
| `ab_test_variant` | Frontend routing | Per session | `loan_applications.ab_test_variant` | Variant A/B test |
| `funnel_drop_rate` | Calculated | Hourly | `mv_dashboard_stats` | Taux abandon par étape |
| `avg_completion_time` | Calculated | Hourly | Analytics | Temps moyen complétion |

**KPIs**:
- Conversion Rate = `submitted / started` (target: > 60%)
- Drop-off Rate = `1 - (completed / started)` (target: < 40%)

#### UTM & Attribution
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `utm_source` | URL params | Per visit | `loan_applications.utm_source` | Source marketing |
| `utm_medium` | URL params | Per visit | `loan_applications.utm_medium` | Média (cpc, social, email) |
| `utm_campaign` | URL params | Per visit | `loan_applications.utm_campaign` | Campagne spécifique |
| `referer` | HTTP headers | Per visit | `telemetry_requests.metadata` | Referer HTTP |
| `landing_page` | URL | Per visit | `seo_ga4_metrics_daily.top_landing_pages` | Page atterrissage |

**Usage**: Attribution marketing, ROI campagnes

---

### 2. CLIENT BEHAVIOR METRICS

#### Session & Engagement
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `sessions` | GA4 collection | Daily | `seo_ga4_metrics_daily.sessions` | Nombre sessions |
| `users` | GA4 collection | Daily | `seo_ga4_metrics_daily.users` | Utilisateurs uniques |
| `new_users` | GA4 collection | Daily | `seo_ga4_metrics_daily.new_users` | Nouveaux utilisateurs |
| `page_views` | GA4 collection | Daily | `seo_ga4_metrics_daily.page_views` | Pages vues |
| `avg_session_duration` | GA4 calculation | Daily | `seo_ga4_metrics_daily.avg_session_duration_seconds` | Durée moyenne session |
| `bounce_rate` | GA4 calculation | Daily | `seo_ga4_metrics_daily.bounce_rate` | Taux rebond |
| `engagement_rate` | GA4 calculation | Daily | `seo_ga4_metrics_daily.engagement_rate` | Taux engagement |

**Collection**: Cron `/api/cron/seo-collect` → `/api/seo/collect/ga4` (2h AM)

#### Device & Browser
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `ip_address` | HTTP headers | Per request | `loan_applications.ip_address`, `telemetry_requests.ip_address` | IP visiteur |
| `user_agent` | HTTP headers | Per request | `loan_applications.user_agent`, `telemetry_requests.user_agent` | Browser/Device |
| `device_type` | Parsed UA | Per request | `seo_ga4_metrics_daily.device_breakdown` | desktop/mobile/tablet |
| `browser` | Parsed UA | Per request | `seo_ga4_metrics_daily.browser_breakdown` | Chrome/Safari/Firefox/etc |
| `os` | Parsed UA | Per request | `seo_ga4_metrics_daily.os_breakdown` | Windows/macOS/iOS/Android |
| `screen_resolution` | Client-side | Per session | `telemetry_security.metadata` | Résolution écran |

#### Fingerprinting
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `device_fingerprint` | `/api/fingerprint/deep-scan` | Per session | `telemetry_security` | Fingerprint unique device |
| `canvas_fingerprint` | Client-side | Per session | `telemetry_security.metadata` | Canvas fingerprint |
| `webgl_fingerprint` | Client-side | Per session | `telemetry_security.metadata` | WebGL fingerprint |
| `font_list` | Client-side | Per session | `telemetry_security.metadata` | Fonts installées |
| `timezone` | Client-side | Per session | `telemetry_security.metadata` | Timezone |
| `language` | HTTP headers | Per request | `telemetry_security.metadata` | Langue navigateur |

**Usage**: Détection fraude, déduplication clients

---

### 3. APPLICATION SCORING METRICS

#### Cortex Scoring
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `cortex_score` | Cortex engine | Per application | `loan_applications.cortex_score` | Score Cortex (0-100) |
| `cortex_rules_applied` | Cortex engine | Per application | `loan_applications.cortex_rules_applied` | Règles appliquées (JSONB) |
| `risk_level` | Cortex calculation | Per application | `loan_applications.risk_level` | low/medium/high |
| `rule_execution_time_ms` | Cortex engine | Per rule | `cortex_execution_logs.execution_time_ms` | Temps exécution règle |

#### SAR Score (Automatic Analysis)
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `sar_score` | Analysis worker | Per analysis | `analysis_scores.sar_score` | Score SAR (300-850) |
| `sar_score_normalized` | Analysis worker | Per analysis | `analysis_scores.sar_score_normalized` | Score normalisé (0-1000) |
| `monthly_income` | Calculated | Per analysis | `analysis_scores.monthly_income` | Revenu mensuel calculé |
| `monthly_expenses` | Calculated | Per analysis | `analysis_scores.monthly_expenses` | Dépenses mensuelles |
| `dti_ratio` | Calculated | Per analysis | `analysis_scores.dti_ratio` | Debt-to-Income ratio |
| `nsf_count` | Detected | Per analysis | `analysis_scores.nsf_count` | Frais NSF (30j) |
| `overdraft_count` | Detected | Per analysis | `analysis_scores.overdraft_count` | Découverts (30j) |
| `bankruptcy_detected` | Detected | Per analysis | `analysis_scores.bankruptcy_detected` | Faillite détectée |
| `microloans_detected` | Detected | Per analysis | `analysis_scores.microloans_detected` | Prêts rapides détectés |
| `account_health` | Calculated | Per analysis | `analysis_scores.account_health` | Santé compte (0-1000) |
| `confidence` | Calculated | Per analysis | `analysis_scores.confidence` | Confiance score (0-1) |

**Workflow**:
1. Extension Chrome → POST `/api/admin/client-analysis`
2. Worker `/api/worker/process-jobs` → Calcul SAR Score
3. Storage dans `analysis_scores` + `analysis_recommendations`

#### Inverite Risk Score
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `inverite_risk_score` | Inverite API | Per IBV | `client_analyses.inverite_risk_score` | Score Inverite (300-850) |
| `inverite_guid` | Inverite API | Per IBV | `client_analyses.inverite_guid` | ID unique Inverite |
| `risk_level` | Inverite API | Per IBV | `client_analyses.risk_level` | low/medium/high |
| `microloans_data` | Inverite API | Per IBV | `client_analyses.microloans_data` | Données prêts rapides |

---

### 4. FINANCIAL METRICS (Margill & QuickBooks)

#### Margill Integration
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `margill_response` | Margill API | Per submission | `loan_applications.margill_response` | Réponse complète Margill |
| `margill_submitted_at` | Margill API | Per submission | `loan_applications.margill_submitted_at` | Timestamp soumission |
| `margill_error` | Margill API | On error | `loan_applications.margill_error` | Erreur si échec |
| `margill_approval_status` | Margill response | Per submission | `margill_response.status` | Approved/Declined |

#### QuickBooks Metrics
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `qb_customer_balance` | QB sync | Daily | `quickbooks_customers.balance` | Balance client QB |
| `qb_invoice_total` | QB sync | Per invoice | `quickbooks_invoices.total_amt` | Montant facture |
| `qb_invoice_balance` | QB sync | Per invoice | `quickbooks_invoices.balance` | Balance due |
| `qb_payment_amount` | QB sync | Per payment | `quickbooks_payments.total_amt` | Montant paiement |
| `qb_aged_receivables` | QB report | Weekly | Analytics | Créances âgées |
| `qb_cash_flow` | QB report | Weekly | Analytics | Cash flow |
| `qb_profit_loss` | QB report | Monthly | Analytics | P&L |

**Collection**: Sync QB via `/api/quickbooks/sync/*` (triggered by webhook ou manuel)

---

### 5. SEO & ORGANIC METRICS

#### Google Search Console
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `gsc_clicks` | GSC API | Daily | `seo_gsc_metrics_daily.clicks` | Clics organiques |
| `gsc_impressions` | GSC API | Daily | `seo_gsc_metrics_daily.impressions` | Impressions SERP |
| `gsc_ctr` | GSC calculation | Daily | `seo_gsc_metrics_daily.ctr` | Click-through rate |
| `gsc_position` | GSC API | Daily | `seo_gsc_metrics_daily.position` | Position moyenne |
| `gsc_top_queries` | GSC API | Daily | `seo_gsc_metrics_daily.top_queries` | Top requêtes |
| `gsc_top_pages` | GSC API | Daily | `seo_gsc_metrics_daily.top_pages` | Top pages |

**Collection**: `/api/seo/collect/gsc` (2h AM)

#### Semrush Metrics
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `semrush_authority_score` | Semrush API | Daily | `seo_semrush_domain_daily.authority_score` | Authority Score |
| `semrush_organic_traffic` | Semrush API | Daily | `seo_semrush_domain_daily.organic_traffic` | Traffic organique |
| `semrush_organic_keywords` | Semrush API | Daily | `seo_semrush_domain_daily.organic_keywords` | Mots-clés rankés |
| `semrush_backlinks_total` | Semrush API | Daily | `seo_semrush_domain_daily.backlinks_total` | Backlinks totaux |
| `semrush_referring_domains` | Semrush API | Daily | `seo_semrush_domain_daily.referring_domains` | Domaines référents |
| `semrush_top_keywords` | Semrush API | Daily | `seo_semrush_domain_daily.top_keywords` | Top keywords |

**Collection**: `/api/seo/collect/semrush` (2h AM)

#### Keyword Tracking
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `keyword_position` | GSC API | Daily | `seo_keywords_tracking.current_position` | Position actuelle |
| `keyword_position_change` | Calculated | Daily | `seo_keywords_tracking.previous_position` | Delta position |
| `keyword_volume` | Semrush API | Monthly | `seo_keywords_tracking.volume` | Volume recherche |
| `keyword_difficulty` | Semrush API | Monthly | `seo_keywords_tracking.difficulty` | Difficulté (0-100) |

---

### 6. WEBHOOK & INTEGRATION METRICS

#### VoPay Webhooks
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `webhook_received` | VoPay webhook | Per event | `webhook_logs` (provider='vopay') | Webhook reçu |
| `webhook_processed` | Worker | Per event | `webhook_logs.processed_at` | Webhook traité |
| `webhook_lag_seconds` | Calculated | Per event | `webhook_logs.received_at - payload.occurred_at` | Lag réception |
| `webhook_processing_time_ms` | Calculated | Per event | `webhook_logs.processed_at - received_at` | Temps traitement |
| `vopay_transaction_amount` | VoPay payload | Per transaction | `webhook_logs.payload.amount` | Montant transaction |
| `vopay_transaction_status` | VoPay payload | Per transaction | `webhook_logs.payload.status` | Status transaction |
| `vopay_account_balance` | VoPay webhook | Per balance update | `webhook_logs.payload.balance` | Balance compte |

**Types d'événements VoPay** (14):
- `account_balance`
- `payment_received`
- `batch`
- `transaction_group`
- `credit_card`
- `debit_card`
- `elinx`
- Etc.

#### QuickBooks Webhooks
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `qb_webhook_received` | QB webhook | Per event | `quickbooks_webhooks` | Webhook QB reçu |
| `qb_entity_changed` | QB webhook | Per event | `quickbooks_webhooks.event_type` | Entity modifiée |

---

### 7. COMMUNICATION METRICS

#### Email Metrics
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `emails_received` | IMAP sync | Continuous | `email_messages` | Emails reçus |
| `emails_sent` | SMTP | Per send | `email_messages` | Emails envoyés |
| `emails_processed` | Classifier | Continuous | `email_messages.is_processed` | Emails classifiés |
| `emails_by_category` | Aggregated | Daily | `email_metrics_daily.classifications_by_category` | Emails par catégorie |
| `avg_processing_time_ms` | Calculated | Daily | `email_metrics_daily.avg_processing_time_ms` | Temps traitement moyen |
| `email_priority` | Classifier | Per email | `email_classifications.priority` | Priorité (1-10) |
| `email_classification_confidence` | Classifier | Per email | `email_classifications.confidence` | Confiance (0-1) |

**Catégories**:
- SUPPORT_TICKET
- APPLICATION_INQUIRY
- PAYMENT_CONFIRMATION
- DOCUMENT_REQUEST
- COMPLAINT
- SPAM

#### SMS Metrics (à venir)
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `sms_sent` | Twilio API | Per send | À définir | SMS envoyés |
| `sms_delivered` | Twilio webhook | Per delivery | À définir | SMS délivrés |
| `sms_failed` | Twilio webhook | Per failure | À définir | SMS échoués |

---

### 8. PERFORMANCE & OBSERVABILITY METRICS

#### API Performance
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `request_duration_ms` | Middleware | Per request | `telemetry_requests.duration_ms` | Durée requête |
| `request_status` | Middleware | Per request | `telemetry_requests.response_status` | Status HTTP |
| `request_path` | Middleware | Per request | `telemetry_requests.request_path` | Endpoint appelé |
| `request_method` | Middleware | Per request | `telemetry_requests.request_method` | GET/POST/etc |
| `error_rate` | Aggregated | Per minute | Calculated | Taux erreur (500+) |
| `p95_latency` | Aggregated | Per hour | Calculated | Latence p95 |
| `p99_latency` | Aggregated | Per hour | Calculated | Latence p99 |
| `requests_per_second` | Aggregated | Per minute | Calculated | RPS |

**KPIs**:
- p95 latency < 500ms (dashboard endpoints)
- p95 latency < 300ms (read endpoints)
- Error rate < 0.1%

#### Database Performance
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `db_query_duration_ms` | Span logging | Per query | `telemetry_spans` (span_type='db_query') | Durée query |
| `db_query_target` | Span logging | Per query | `telemetry_spans.target` | Table ciblée |
| `db_connection_pool_size` | Supabase stats | Per minute | External monitoring | Pool size |
| `db_active_connections` | Supabase stats | Per minute | External monitoring | Connections actives |
| `slow_queries_count` | Aggregated | Per hour | Calculated | Queries > 1s |

#### Worker Performance
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `jobs_processed` | Worker | Per run | `analysis_jobs` | Jobs traités |
| `jobs_succeeded` | Worker | Per run | `analysis_jobs` WHERE status='completed' | Jobs succès |
| `jobs_failed` | Worker | Per run | `analysis_jobs` WHERE status='failed' | Jobs échoués |
| `job_processing_time_ms` | Worker | Per job | Calculated from timestamps | Temps traitement |
| `job_queue_depth` | Aggregated | Per minute | Calculated | Jobs en attente |

---

### 9. SECURITY METRICS

#### Authentication & Authorization
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `login_attempts` | `/api/admin/login` | Per attempt | `security_logs` (event_type='login') | Tentatives login |
| `login_failures` | `/api/admin/login` | Per failure | `security_logs` (event_type='login_failed') | Échecs login |
| `login_success_rate` | Aggregated | Per hour | Calculated | Taux succès login |
| `unauthorized_access_attempts` | Middleware | Per attempt | `security_logs` (event_type='unauthorized_access') | Accès non autorisés |
| `suspicious_activity` | Detector | Per detection | `security_logs` (event_type='suspicious_activity') | Activité suspecte |

#### Fraud Detection
| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `proxy_detected` | `/api/anonymity/check` | Per check | `telemetry_security` | Proxy détecté |
| `vpn_detected` | `/api/anonymity/check` | Per check | `telemetry_security` | VPN détecté |
| `tor_detected` | `/api/anonymity/check` | Per check | `telemetry_security` | Tor détecté |
| `device_fingerprint_match` | Comparison | Per check | `telemetry_security` | Fingerprint match |
| `duplicate_application_detected` | `/api/admin/clients-sar/concordances` | On-demand | Analytics | Doublons détectés |

---

### 10. DOWNLOAD METRICS

| Métrique | Source | Fréquence | Destination | Description |
|----------|--------|-----------|-------------|-------------|
| `file_downloaded` | `/api/download/[filename]` | Per download | `download_logs` | Fichier téléchargé |
| `download_duration_ms` | Measured | Per download | `download_logs.download_duration_ms` | Durée téléchargement |
| `unique_downloaders` | Aggregated | Daily | Calculated | Utilisateurs uniques |
| `top_downloaded_files` | Aggregated | Daily | Calculated | Fichiers populaires |
| `downloads_by_file_type` | Aggregated | Daily | Calculated | Par type (contract/statement/report) |

---

## 🔄 DATAFLOW MÉTRIQUES

### Pipeline Collection

```
1. SOURCE CAPTURE
   ├─ Frontend Events → Telemetry API → telemetry_requests
   ├─ API Requests → Middleware → telemetry_requests + telemetry_spans
   ├─ Webhooks → Webhook handlers → webhook_logs
   ├─ Cron Jobs → Collection APIs → seo_*_metrics_daily
   └─ User Actions → Application APIs → loan_applications + client_events

2. ENRICHMENT
   ├─ IP Geolocation → Add city/country
   ├─ User-Agent Parsing → Add device/browser/os
   ├─ UTM Parsing → Add marketing attribution
   └─ Client Matching → Add client_id/application_id

3. STORAGE
   ├─ Raw Storage → JSONB columns (event_data, payload, metadata)
   ├─ Structured Storage → Typed columns
   └─ Time-series Storage → Partitioned tables (by month)

4. AGGREGATION
   ├─ Materialized Views → mv_dashboard_stats (hourly refresh)
   ├─ Daily Rollups → *_metrics_daily tables (cron 2h AM)
   └─ On-demand Aggregation → RPC functions

5. SERVING
   ├─ Dashboard APIs → Cached views
   ├─ Analytics APIs → Aggregated queries
   └─ Export APIs → CSV/JSON generation
```

### Fréquences de Collection

| Type | Fréquence | Trigger | Latence |
|------|-----------|---------|---------|
| Real-time events | Immédiat | User action, API call | < 100ms |
| Webhooks | Immédiat | External event | < 500ms |
| GA4 metrics | Daily | Cron 2h AM | 24h lag |
| GSC metrics | Daily | Cron 2h AM | 48h lag |
| Semrush metrics | Daily | Cron 2h AM | 24h lag |
| QuickBooks sync | On-demand / Webhook | Manual/Webhook | < 5s |
| Materialized views | Hourly | Cron | 1h lag |

---

## 📊 KPIs MÉTIER (OBJECTIVES)

Définis dans `loan_objectives`:

| KPI | Target | Current | Période | Alerte |
|-----|--------|---------|---------|--------|
| Conversion Rate | 60% | - | Monthly | < 55% |
| Approval Rate | 75% | - | Monthly | < 70% |
| Average Loan Amount | 4,000 CAD | - | Monthly | < 3,500 CAD |
| Funnel Drop-off Rate | < 40% | - | Monthly | > 45% |
| Time to Approval | < 24h | - | Per application | > 48h |
| Customer Satisfaction | > 4.5/5 | - | Monthly | < 4.0/5 |

---

## 🚨 ALERTING MÉTRIQUES

### Alertes automatiques (telemetry_alerts)

| Alerte | Condition | Sévérité | Action |
|--------|-----------|----------|--------|
| High Error Rate | error_rate > 1% | High | Notify admin |
| Slow API | p95_latency > 1000ms | Medium | Investigate |
| Webhook Lag | lag > 300s | High | Check VoPay status |
| Queue Depth | queue_depth > 100 | Medium | Scale worker |
| Disk Usage | disk > 80% | High | Archive old data |
| Failed Logins | failed_logins > 10/hour | High | Check security |

---

## ✅ CHECKLIST OPTIMISATION MÉTRIQUES

- [ ] Implémenter retention policies (archive > 2 ans)
- [ ] Ajouter sampling sur telemetry (1% en prod)
- [ ] Créer indexes sur colonnes de filtrage métriques
- [ ] Implémenter pre-aggregation pour dashboard
- [ ] Ajouter monitoring usage index
- [ ] Créer alertes proactives (anomaly detection)
- [ ] Documenter tous les KPIs métier
- [ ] Créer exports automatisés (weekly reports)

---

## 🔗 CORRÉLATIONS CLÉS

### Client → Métriques
```
client_email (ou phone) permet de lier:
- loan_applications
- client_events
- client_analyses
- email_messages
- webhook_logs (via client_id)
- download_logs (via user_email)
- telemetry_requests (via metadata)
```

### Application → Métriques
```
application_id permet de lier:
- loan_applications (primary)
- cortex_execution_logs
- client_events (via event_data)
- webhook_logs (via application_id)
- quickbooks_invoices (via metadata)
- GA4 events (via custom dimension - à implémenter)
```

---

**Généré le**: 2026-01-23
**Par**: Claude Sonnet 4.5 (Architecture Audit)
**Phase 1**: COMPLÉTÉE ✅
**Next**: Phase 2 - Dataflow Diagrams (Mermaid)
