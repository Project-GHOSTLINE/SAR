# 🗄️ DATABASE SCHEMA INVENTORY - SAR Project

**Date**: 2026-01-23
**DB**: Supabase PostgreSQL
**Total Tables**: 35
**Materialized Views**: 2
**RPC Functions**: 8+

---

## 🎯 OVERVIEW

Ce document catalogue toutes les tables, colonnes, relations, index, views et fonctions RPC du projet SAR.
Le schéma est organisé autour des **demandes de prêt (loan_applications)** comme entité centrale.

---

## 📊 TABLES PAR DOMAINE

### 1. CORE - Demandes de Prêt & Clients

#### `loan_applications` ⭐ TABLE CENTRALE
**Purpose**: Toutes les demandes de prêt soumises via le formulaire
**Migration**: `20260113000000_titan_init.sql`

**Colonnes principales**:
```sql
id UUID PRIMARY KEY
reference TEXT UNIQUE NOT NULL  -- Format: SAR-LP-XXXXXX
origin TEXT NOT NULL  -- Source (site web, téléphone, etc.)
status TEXT NOT NULL DEFAULT 'draft'  -- draft|submitted|approved|rejected

-- Identité client
prenom TEXT NOT NULL
nom TEXT NOT NULL
courriel TEXT NOT NULL
telephone TEXT NOT NULL
date_naissance DATE

-- Adresse
adresse_rue TEXT
adresse_ville TEXT
adresse_province TEXT
adresse_code_postal TEXT
duree_residence_mois INTEGER
type_logement TEXT

-- Demande
montant_demande INTEGER NOT NULL
raison_pret TEXT
duree_pret_mois INTEGER

-- Emploi & Revenus
statut_emploi TEXT
employeur TEXT
poste TEXT
revenu_annuel INTEGER
anciennete_emploi_mois INTEGER
frequence_paie TEXT
prochaine_paie DATE

-- Compte bancaire
institution_financiere TEXT
transit TEXT
numero_compte TEXT
type_compte TEXT

-- Finances
autres_revenus INTEGER
source_autres_revenus TEXT
paiement_loyer_hypotheque INTEGER
autres_prets INTEGER
cartes_credit INTEGER
autres_dettes INTEGER

-- Co-emprunteur (optionnel)
coemprunteur_prenom TEXT
coemprunteur_nom TEXT
coemprunteur_telephone TEXT
coemprunteur_revenu INTEGER

-- Références
reference_1_nom TEXT
reference_1_telephone TEXT
reference_1_relation TEXT
reference_2_nom TEXT
reference_2_telephone TEXT
reference_2_relation TEXT

-- Scoring & Risk
cortex_score INTEGER DEFAULT 0
cortex_rules_applied JSONB DEFAULT '[]'
risk_level TEXT

-- Margill Integration
margill_response JSONB
margill_submitted_at TIMESTAMPTZ
margill_error TEXT

-- Funnel Metrics
form_started_at TIMESTAMPTZ DEFAULT now()
form_completed_at TIMESTAMPTZ
submitted_at TIMESTAMPTZ
last_step_completed INTEGER DEFAULT 0

-- Marketing Attribution
ab_test_variant TEXT
ip_address INET
user_agent TEXT
utm_source TEXT
utm_medium TEXT
utm_campaign TEXT

-- Metadata
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_loan_applications_status` (status)
- `idx_loan_applications_created_at` (created_at DESC)
- `idx_loan_applications_courriel` (courriel)
- `idx_loan_applications_telephone` (telephone)
- `idx_loan_applications_status_created` (status, created_at DESC)
- `idx_loan_applications_search` (GIN index sur prenom, nom, courriel)

**Triggers**:
- `update_loan_applications_updated_at` - Auto-update updated_at

**Relations sortantes**:
- → `cortex_execution_logs.application_id`
- → `client_analyses` (via matching email/phone/name)
- → `quickbooks_customers` (via client_id)
- → `client_events` (via metadata)

**RLS**: POLICY "Allow all" (à sécuriser en prod!)

**Anti-pattern détecté**: RLS trop permissif, devrait avoir policies par role

---

#### `client_events` 📅 TIMELINE UNIFIÉE
**Purpose**: Événements timeline pour tracking complet du parcours client
**Migration**: `20260117151900_mailops_001_create_client_events.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
client_email TEXT  -- Clé de corrélation principale
client_name TEXT
event_type TEXT NOT NULL  -- Type d'événement (email_received, application_submitted, etc.)
event_source TEXT NOT NULL  -- Source (mailops, webhook, manual, etc.)
event_data JSONB  -- Payload flexible
metadata JSONB  -- Métadonnées additionnelles
created_at TIMESTAMPTZ DEFAULT now()
processed_at TIMESTAMPTZ
is_processed BOOLEAN DEFAULT false
```

**Index**:
- `idx_client_events_email_date` (client_email, created_at DESC)
- `idx_client_events_type` (event_type)
- `idx_client_events_source` (event_source)
- `idx_client_events_created_at` (created_at DESC)

**Types d'événements** (exemples):
- `email_received` - Email reçu
- `email_classified` - Email classifié
- `application_submitted` - Demande soumise
- `application_approved` - Demande approuvée
- `payment_received` - Paiement reçu
- `support_ticket_created` - Ticket support créé
- `document_downloaded` - Document téléchargé
- `webhook_vopay_received` - Webhook VoPay reçu

**Relations sortantes**:
- → `event_actions.event_id` (1:N actions par événement)

**Optimisation recommandée**: Partition par date (monthly) si > 1M rows

---

#### `client_analyses` 🔍 ANALYSES BANCAIRES
**Purpose**: Analyses bancaires Inverite/Flinks (IBV - Instant Bank Verification)
**Migration**: Implicitly created (voir migrations analysis)

**Colonnes**:
```sql
id UUID PRIMARY KEY
client_name TEXT NOT NULL
client_email TEXT
client_address TEXT
inverite_guid TEXT  -- ID Inverite unique
source TEXT  -- 'inverite' ou 'flinks'
raw_data JSONB NOT NULL  -- Données brutes (comptes, transactions)
total_accounts INTEGER
total_balance DECIMAL
total_transactions INTEGER
status TEXT
assigned_to TEXT
assigned_at TIMESTAMPTZ
reviewed_by TEXT
reviewed_at TIMESTAMPTZ
notes TEXT
deleted_at TIMESTAMPTZ  -- Soft delete

-- Inverite Risk Score
inverite_risk_score INTEGER  -- Score 300-850
risk_level TEXT  -- low|medium|high
microloans_data JSONB  -- Prêts rapides détectés

-- Analysis Automation
analyzed_at TIMESTAMPTZ  -- Quand l'analyse auto a été complétée

created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_client_analyses_guid` (inverite_guid)
- `idx_client_analyses_email` (client_email)
- `idx_client_analyses_status_created` (status, created_at DESC)

**Relations sortantes**:
- → `analysis_jobs.analysis_id`
- → `analysis_scores.analysis_id`
- → `analysis_recommendations.analysis_id`

**Workflow**:
1. Extension Chrome envoie données → POST `/api/admin/client-analysis`
2. Insertion dans `client_analyses` + raw_data
3. Création `analysis_jobs` (status='pending')
4. Worker traite → calcul SAR Score + recommandation
5. Insertion `analysis_scores` + `analysis_recommendations`

---

### 2. ANALYSIS AUTOMATION - SAR Score & Recommandations

#### `analysis_jobs` 🔄 QUEUE JOBS
**Purpose**: Queue asynchrone pour traitement analyses
**Migration**: `20260122000001_add_analysis_tables.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE
status TEXT NOT NULL DEFAULT 'pending'  -- pending|processing|completed|failed
priority TEXT NOT NULL DEFAULT 'normal'  -- low|normal|high
error TEXT
created_at TIMESTAMPTZ DEFAULT now()
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

**Index**:
- `idx_analysis_jobs_status` (status)
- `idx_analysis_jobs_analysis_id` (analysis_id)
- `idx_analysis_jobs_created_at` (created_at)
- `idx_analysis_jobs_priority_status` (priority, status)

**Workflow Worker**:
1. Worker poll: `SELECT * FROM analysis_jobs WHERE status='pending' ORDER BY priority DESC, created_at ASC LIMIT 10`
2. UPDATE status='processing'
3. Traitement (calculate SAR score)
4. INSERT results → UPDATE status='completed'

**SLA**: p95 < 10s par job

---

#### `analysis_scores` 📊 SAR SCORES
**Purpose**: Scores et métriques financières calculés
**Migration**: `20260122000001_add_analysis_tables.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE

-- SAR Score (300-850, comme score de crédit)
sar_score INTEGER NOT NULL CHECK (sar_score >= 300 AND sar_score <= 850)
sar_score_normalized INTEGER NOT NULL CHECK (sar_score_normalized >= 0 AND sar_score_normalized <= 1000)

-- Métriques financières
monthly_income DECIMAL(10,2) NOT NULL DEFAULT 0
monthly_expenses DECIMAL(10,2) NOT NULL DEFAULT 0
dti_ratio DECIMAL(5,4) NOT NULL DEFAULT 0  -- Debt-to-Income

-- Red Flags
nsf_count INTEGER NOT NULL DEFAULT 0  -- NSF dans 30 jours
overdraft_count INTEGER NOT NULL DEFAULT 0
bankruptcy_detected BOOLEAN NOT NULL DEFAULT false
microloans_detected BOOLEAN NOT NULL DEFAULT false

-- Health Score
account_health INTEGER NOT NULL CHECK (account_health >= 0 AND account_health <= 1000)
confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1)

created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_analysis_scores_analysis_id` (analysis_id)
- `idx_analysis_scores_sar_score` (sar_score)
- `idx_analysis_scores_created_at` (created_at)

**Calcul SAR Score**:
```
Pondération:
- Inverite base: 40%
- Income factor: 20%
- DTI factor: 15%
- Account health: 15%
- History factor: 10%

Pénalités:
- NSF: -10 points chacun
- Overdraft: -5 points chacun
- Bankruptcy: -150 points
- Microloans: -75 points
```

---

#### `analysis_recommendations` 💡 RECOMMANDATIONS
**Purpose**: Recommandations de prêt générées automatiquement
**Migration**: `20260122000001_add_analysis_tables.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
analysis_id UUID NOT NULL REFERENCES client_analyses(id) ON DELETE CASCADE

recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'decline', 'review'))
max_loan_amount DECIMAL(10,2) NOT NULL DEFAULT 0  -- CAD
reasoning TEXT NOT NULL
confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1)
red_flags JSONB NOT NULL DEFAULT '[]'::jsonb

created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_analysis_recommendations_analysis_id` (analysis_id)
- `idx_analysis_recommendations_recommendation` (recommendation)
- `idx_analysis_recommendations_created_at` (created_at)

**Logique Recommandation**:
```
SAR Score >= 700: APPROVE (max: revenu × 0.5)
SAR Score 550-699: REVIEW (max: revenu × 0.4)
SAR Score < 550: DECLINE (max: 0 ou montant minimal)

Facteurs de réduction:
- NSF récents: -20% max loan
- DTI > 60%: -30% max loan
- Microloans actifs: -40% max loan
```

---

### 3. EMAIL & COMMUNICATIONS

#### `email_accounts` 📧 COMPTES EMAIL
**Purpose**: Comptes email configurés (IMAP/SMTP)
**Migration**: `20260117151901_mailops_002_create_email_accounts.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE NOT NULL
provider TEXT NOT NULL  -- gmail|outlook|custom
connection_settings JSONB  -- IMAP/SMTP config
is_active BOOLEAN DEFAULT true
last_sync_at TIMESTAMPTZ
sync_status TEXT
sync_error TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_email_accounts_email` (email)
- `idx_email_accounts_provider` (provider)
- `idx_email_accounts_active` (is_active)

---

#### `email_messages` 📨 MESSAGES EMAIL
**Purpose**: Emails reçus/envoyés
**Migration**: `20260117151902_mailops_003_create_email_messages.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE
provider_message_id TEXT UNIQUE  -- ID unique du provider
from_email TEXT NOT NULL
to_emails TEXT[]
cc_emails TEXT[]
subject TEXT
body_text TEXT
body_html TEXT
received_at TIMESTAMPTZ NOT NULL
is_processed BOOLEAN DEFAULT false
processed_at TIMESTAMPTZ
attachments JSONB
headers JSONB
metadata JSONB
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_email_messages_account` (account_id, received_at DESC)
- `idx_email_messages_from` (from_email)
- `idx_email_messages_received` (received_at DESC)
- `idx_email_messages_provider_id` (provider_message_id)
- `idx_email_messages_processed` (is_processed) WHERE NOT is_processed

**Relations sortantes**:
- → `email_classifications.email_message_id`
- → `client_events` (via event_data.email_id)

---

#### `email_classifications` 🏷️ CLASSIFICATION EMAILS
**Purpose**: Classification automatique des emails (support, vente, spam, etc.)
**Migration**: `20260117151904_mailops_005_create_email_classifications.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
email_message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE
taxonomy_id UUID REFERENCES classification_taxonomy(id)
category_code TEXT NOT NULL
sub_category_code TEXT
priority INTEGER DEFAULT 5
confidence DECIMAL(3,2)
is_current BOOLEAN DEFAULT true
classified_by TEXT  -- 'auto'|'manual'|user_id
classification_metadata JSONB
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_email_class_message` (email_message_id, is_current)
- `idx_email_class_category` (category_code)
- `idx_email_class_priority` (priority)
- `idx_email_class_current` (is_current) WHERE is_current

---

#### `classification_taxonomy` 📋 TAXONOMIE CLASSIFICATION
**Purpose**: Définition des catégories de classification
**Migration**: `20260117151903_mailops_004_create_classification_taxonomy.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
version TEXT NOT NULL
category_code TEXT NOT NULL
category_name TEXT NOT NULL
sub_category_code TEXT
sub_category_name TEXT
description TEXT
priority_default INTEGER DEFAULT 5
keywords TEXT[]
rules JSONB
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_taxonomy_version` (version, is_active)
- `idx_taxonomy_category` (category_code)

**Catégories typiques**:
- `SUPPORT_TICKET` - Demande support
- `APPLICATION_INQUIRY` - Question sur demande
- `PAYMENT_CONFIRMATION` - Confirmation paiement
- `DOCUMENT_REQUEST` - Demande de document
- `COMPLAINT` - Plainte
- `SPAM` - Spam/marketing

---

#### `event_actions` ⚡ ACTIONS SUR ÉVÉNEMENTS
**Purpose**: Actions déclenchées suite à événements
**Migration**: `20260117151905_mailops_006_create_event_actions.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
event_id UUID REFERENCES client_events(id) ON DELETE CASCADE
action_type TEXT NOT NULL  -- send_email|create_ticket|notify_admin|etc.
action_payload JSONB
action_status TEXT DEFAULT 'pending'  -- pending|processing|completed|failed
action_result JSONB
retry_count INTEGER DEFAULT 0
max_retries INTEGER DEFAULT 3
scheduled_for TIMESTAMPTZ
executed_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_event_actions_event` (event_id)
- `idx_event_actions_type` (action_type)
- `idx_event_actions_status` (action_status) WHERE action_status = 'pending'

---

#### `email_metrics_daily` 📊 MÉTRIQUES EMAIL
**Purpose**: Métriques quotidiennes des emails
**Migration**: `20260117151906_mailops_007_create_email_metrics_daily.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
metric_date DATE NOT NULL
account_id UUID REFERENCES email_accounts(id)
emails_received INTEGER DEFAULT 0
emails_sent INTEGER DEFAULT 0
emails_processed INTEGER DEFAULT 0
emails_pending INTEGER DEFAULT 0
avg_processing_time_ms INTEGER
classifications_by_category JSONB
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_email_metrics_date` (metric_date DESC)

---

### 4. WEBHOOKS & INTEGRATIONS

#### `webhook_logs` 🔔 LOGS WEBHOOKS UNIFIÉS
**Purpose**: Logs de tous les webhooks entrants (VoPay, QuickBooks, etc.)
**Migration**: `20260122000000_unified_webhook_logs.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
provider TEXT NOT NULL  -- 'vopay'|'quickbooks'|'stripe'|etc.
event_type TEXT NOT NULL  -- Type d'événement spécifique au provider
external_id TEXT  -- ID externe (transaction_id VoPay, etc.)
payload JSONB NOT NULL  -- Payload complet du webhook
headers JSONB  -- Headers HTTP reçus
signature TEXT  -- Signature pour validation
signature_verified BOOLEAN
status TEXT NOT NULL DEFAULT 'received'  -- received|processed|failed|retried
processing_attempts INTEGER DEFAULT 0
last_error TEXT
client_id UUID  -- FK vers client (si lié)
application_id UUID  -- FK vers application (si lié)
environment TEXT  -- 'production'|'sandbox'|'test'
received_at TIMESTAMPTZ NOT NULL DEFAULT now()
processed_at TIMESTAMPTZ
metadata JSONB
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_webhook_logs_provider` (provider)
- `idx_webhook_logs_event_type` (event_type)
- `idx_webhook_logs_status` (status)
- `idx_webhook_logs_received_at` (received_at DESC)
- `idx_webhook_logs_external_id` (external_id)
- `idx_webhook_logs_client_id` (client_id) WHERE client_id IS NOT NULL
- `idx_webhook_logs_environment` (environment)
- `idx_webhook_logs_provider_status` (provider, status)
- `idx_webhook_logs_created_at` (created_at DESC)
- `idx_webhook_logs_provider_received` (provider, received_at DESC)

**Triggers**:
- `update_webhook_logs_updated_at` - Auto-update updated_at

**Providers supportés**:
- **VoPay**: `account_balance`, `payment_received`, `batch`, `transaction_group`, etc. (14 types)
- **QuickBooks**: `customer.created`, `invoice.updated`, `payment.created`, etc.

**Workflow Webhook**:
1. Réception POST → Validation signature
2. INSERT `webhook_logs` (status='received')
3. Parsing payload → Extraction `client_id`/`application_id`
4. Traitement métier → INSERT `client_events`
5. UPDATE `webhook_logs` (status='processed')

**Monitoring KPIs**:
- Webhooks lag: `received_at - payload.occurred_at`
- Error rate: `COUNT(*) WHERE status='failed' / COUNT(*)`
- Processing time: `processed_at - received_at`

---

#### `quickbooks_*` 💼 TABLES QUICKBOOKS

##### `quickbooks_tokens`
**Purpose**: Tokens OAuth2 QuickBooks
**Colonnes**: `realm_id`, `access_token`, `refresh_token`, `expires_at`, `scope`
**Index**: `idx_quickbooks_tokens_realm_id`, `idx_quickbooks_tokens_expires_at`

##### `quickbooks_customers`
**Purpose**: Clients QuickBooks synced
**Colonnes**: `qb_id`, `client_id` (FK loan_applications), `display_name`, `email`, `balance`, `synced_at`
**Index**: `idx_quickbooks_customers_qb_id`, `idx_quickbooks_customers_client_id`, `idx_quickbooks_customers_email`

##### `quickbooks_invoices`
**Purpose**: Factures QuickBooks
**Colonnes**: `qb_id`, `customer_qb_id`, `doc_number`, `txn_date`, `total_amt`, `balance`, `status`, `due_date`
**Index**: `idx_quickbooks_invoices_qb_id`, `idx_quickbooks_invoices_customer_qb_id`, `idx_quickbooks_invoices_status`, `idx_quickbooks_invoices_balance` WHERE balance > 0

##### `quickbooks_payments`
**Purpose**: Paiements QuickBooks
**Colonnes**: `qb_id`, `customer_qb_id`, `txn_date`, `total_amt`, `payment_ref_num`
**Index**: `idx_quickbooks_payments_qb_id`, `idx_quickbooks_payments_customer_qb_id`, `idx_quickbooks_payments_txn_date`

##### `quickbooks_accounts`
**Purpose**: Plan comptable QB
**Colonnes**: `qb_id`, `name`, `account_type`, `account_sub_type`, `current_balance`
**Index**: `idx_quickbooks_accounts_qb_id`, `idx_quickbooks_accounts_type`

##### `quickbooks_vendors`
**Purpose**: Fournisseurs QB
**Colonnes**: `qb_id`, `display_name`, `balance`

##### `quickbooks_sync_logs`
**Purpose**: Logs des syncs QB
**Colonnes**: `sync_type`, `entity_type`, `records_synced`, `errors`, `started_at`, `completed_at`

##### `quickbooks_webhooks`
**Purpose**: Webhooks QB reçus
**Colonnes**: `realm_id`, `event_type`, `entity_id`, `payload`

---

### 5. SEO & WEB ANALYTICS

#### `seo_ga4_metrics_daily` 📈 GOOGLE ANALYTICS 4
**Purpose**: Métriques GA4 quotidiennes
**Migration**: `20260121000000_seo_metrics_system.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
date DATE NOT NULL
measurement_id TEXT  -- GA4 Measurement ID
property_id TEXT  -- GA4 Property ID

-- Traffic Metrics
sessions INTEGER DEFAULT 0
users INTEGER DEFAULT 0
new_users INTEGER DEFAULT 0
page_views INTEGER DEFAULT 0
avg_session_duration_seconds DECIMAL(10,2)
bounce_rate DECIMAL(5,4)

-- Engagement
engaged_sessions INTEGER DEFAULT 0
engagement_rate DECIMAL(5,4)
events_count INTEGER DEFAULT 0

-- Conversions
conversions INTEGER DEFAULT 0
conversion_rate DECIMAL(5,4)
goal_completions INTEGER DEFAULT 0

-- Sources
top_sources JSONB  -- [{source, users, sessions}]
top_mediums JSONB
top_campaigns JSONB

-- Pages
top_pages JSONB  -- [{page, views, users}]
top_landing_pages JSONB
top_exit_pages JSONB

-- Devices
device_breakdown JSONB  -- {desktop: X, mobile: Y, tablet: Z}
browser_breakdown JSONB
os_breakdown JSONB

-- Geography
country_breakdown JSONB
city_breakdown JSONB

-- Custom
custom_dimensions JSONB
custom_metrics JSONB

metadata JSONB
collected_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_ga4_date` (date DESC)
- `idx_ga4_date_measurement` (date, measurement_id)

**Collection**: Cron `/api/cron/seo-collect` → `/api/seo/collect/ga4`
**Fréquence**: Daily (2h AM)

---

#### `seo_gsc_metrics_daily` 🔍 GOOGLE SEARCH CONSOLE
**Purpose**: Métriques GSC quotidiennes
**Migration**: `20260121000000_seo_metrics_system.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
date DATE NOT NULL
site_url TEXT NOT NULL

-- Performance Metrics
clicks INTEGER DEFAULT 0
impressions INTEGER DEFAULT 0
ctr DECIMAL(5,4)
position DECIMAL(5,2)

-- Top Queries
top_queries JSONB  -- [{query, clicks, impressions, ctr, position}]
top_pages JSONB

-- Devices
clicks_mobile INTEGER
clicks_desktop INTEGER
clicks_tablet INTEGER

-- Countries
country_breakdown JSONB

metadata JSONB
collected_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_gsc_date` (date DESC)
- `idx_gsc_date_site` (date, site_url)

---

#### `seo_semrush_domain_daily` 🌐 SEMRUSH
**Purpose**: Métriques Semrush quotidiennes
**Migration**: `20260121000000_seo_metrics_system.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
date DATE NOT NULL
domain TEXT NOT NULL

-- Authority Metrics
authority_score INTEGER
organic_traffic INTEGER
organic_keywords INTEGER
organic_traffic_cost DECIMAL(10,2)

-- Backlinks
backlinks_total INTEGER
referring_domains INTEGER
backlinks_new INTEGER
backlinks_lost INTEGER

-- Rankings
top_10_rankings INTEGER
top_100_rankings INTEGER
avg_position DECIMAL(5,2)

-- Competitors
competitors JSONB  -- [{domain, authority_score, common_keywords}]
keyword_gap JSONB

-- Keywords
top_keywords JSONB  -- [{keyword, position, volume, difficulty}]
keyword_positions JSONB

metadata JSONB
collected_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
```

**Index**:
- `idx_semrush_date` (date DESC)
- `idx_semrush_date_domain` (date, domain)

---

#### `seo_keywords_tracking` 🎯 KEYWORDS TRACKING
**Purpose**: Tracking de mots-clés spécifiques
**Colonnes**: `keyword`, `target_url`, `current_position`, `previous_position`, `volume`, `difficulty`, `priority`, `active`
**Index**: `idx_keywords_active`, `idx_keywords_priority`

---

#### `seo_audit_log` 🔍 AUDIT SEO
**Purpose**: Logs d'audit SEO (broken links, errors, warnings)
**Colonnes**: `audit_type`, `url`, `issue_type`, `severity`, `description`, `detected_at`, `resolved_at`
**Index**: `idx_audit_status`, `idx_audit_detected`

---

#### `seo_collection_jobs` 📋 COLLECTION JOBS
**Purpose**: Jobs de collection SEO planifiés
**Colonnes**: `job_type`, `provider`, `status`, `scheduled_for`, `started_at`, `completed_at`, `result`, `error`
**Index**: `idx_jobs_status`, `idx_jobs_scheduled`, `idx_jobs_created`

---

### 6. TELEMETRY & OBSERVABILITY

#### `telemetry_requests` 📊 REQUÊTES HTTP
**Purpose**: Logs de toutes les requêtes HTTP (performance monitoring)
**Migration**: `20260122_telemetry_tables.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
trace_id TEXT  -- Distributed tracing ID
parent_span_id TEXT
request_path TEXT NOT NULL
request_method TEXT NOT NULL
request_headers JSONB
request_body JSONB
response_status INTEGER
response_body JSONB
duration_ms INTEGER
source TEXT  -- 'api'|'webhook'|'cron'|'worker'
environment TEXT  -- 'production'|'development'|'staging'
user_id TEXT
ip_address TEXT
user_agent TEXT
error_message TEXT
error_stack TEXT
metadata JSONB
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Index**:
- `idx_telemetry_requests_trace_id` (trace_id)
- `idx_telemetry_requests_created_at` (created_at DESC)
- `idx_telemetry_requests_path` (request_path)
- `idx_telemetry_requests_status` (response_status)
- `idx_telemetry_requests_source` (source)
- `idx_telemetry_requests_env` (environment)
- `idx_telemetry_requests_duration` (duration_ms DESC)
- `idx_telemetry_requests_error` (error_message) WHERE error_message IS NOT NULL
- `idx_telemetry_requests_env_created_status` (environment, created_at DESC, response_status)

**KPIs**:
- p95 latency: `SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) FROM telemetry_requests WHERE created_at > now() - interval '1 hour'`
- Error rate: `SELECT COUNT(*) FILTER (WHERE response_status >= 500) / COUNT(*)::float FROM telemetry_requests WHERE created_at > now() - interval '1 hour'`

---

#### `telemetry_spans` 🔗 DISTRIBUTED TRACING
**Purpose**: Spans pour distributed tracing (DB queries, API calls, etc.)
**Migration**: `20260122_telemetry_tables.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
trace_id TEXT NOT NULL
parent_span_id TEXT
span_id TEXT NOT NULL
span_type TEXT NOT NULL  -- 'db_query'|'api_call'|'function'|'webhook'
operation_name TEXT NOT NULL
target TEXT  -- Table name, API endpoint, etc.
duration_ms INTEGER NOT NULL
status TEXT  -- 'ok'|'error'|'timeout'
error_message TEXT
metadata JSONB  -- Query params, response size, etc.
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Index**:
- `idx_telemetry_spans_trace_id` (trace_id)
- `idx_telemetry_spans_created_at` (created_at DESC)
- `idx_telemetry_spans_span_type` (span_type)
- `idx_telemetry_spans_target` (target)
- `idx_telemetry_spans_duration` (duration_ms DESC)
- `idx_telemetry_spans_status` (status)
- `idx_telemetry_spans_type_duration` (span_type, duration_ms DESC)

**Usage**: Identifier bottlenecks DB, API calls lentes

---

#### `telemetry_security` 🔒 EVENTS SÉCURITÉ
**Purpose**: Événements de sécurité (tentatives auth, anomalies, etc.)
**Colonnes**: `event_type`, `severity`, `description`, `ip_address`, `user_agent`, `metadata`, `detected_at`
**Index**: `idx_telemetry_security_trace_id`, etc.

---

#### `telemetry_alerts` 🚨 ALERTES
**Purpose**: Alertes système (performance, errors, anomalies)
**Colonnes**: `alert_type`, `severity`, `message`, `metric_value`, `threshold`, `status`, `created_at`, `resolved_at`

---

### 7. DOWNLOAD TRACKING

#### `download_logs` 📥 TRACKING TÉLÉCHARGEMENTS
**Purpose**: Logs des téléchargements de documents/contrats
**Migration**: `20260122000002_add_download_tracking.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
file_name TEXT NOT NULL
file_path TEXT NOT NULL
file_type TEXT  -- 'contract'|'statement'|'report'
file_size_bytes BIGINT
user_email TEXT
user_id TEXT
ip_address TEXT
user_agent TEXT
referer TEXT
download_duration_ms INTEGER
downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
metadata JSONB
```

**Index**:
- `idx_download_logs_file_name` (file_name)
- `idx_download_logs_downloaded_at` (downloaded_at DESC)
- `idx_download_logs_user_email` (user_email)
- `idx_download_logs_file_type` (file_type)

**RPC Function**:
```sql
CREATE OR REPLACE FUNCTION get_download_stats(p_file_name TEXT)
RETURNS TABLE (
  total_downloads BIGINT,
  unique_users BIGINT,
  last_downloaded TIMESTAMPTZ
)
```

---

### 8. SECURITY

#### `security_logs` 🛡️ LOGS SÉCURITÉ
**Purpose**: Logs d'événements de sécurité (auth, accès, etc.)
**Migration**: `20260114_security_logs.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
event_type TEXT NOT NULL  -- 'login'|'login_failed'|'unauthorized_access'|'suspicious_activity'
user_id TEXT
username TEXT
ip_address TEXT
user_agent TEXT
request_path TEXT
request_method TEXT
request_body JSONB
response_status INTEGER
error_message TEXT
severity TEXT  -- 'low'|'medium'|'high'|'critical'
metadata JSONB
timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Index**:
- `idx_security_logs_event_type` (event_type)
- `idx_security_logs_ip` (ip_address)
- `idx_security_logs_user` (user_id) WHERE user_id IS NOT NULL
- `idx_security_logs_timestamp` (timestamp DESC)
- `idx_security_logs_path` (request_path)
- `idx_security_logs_type_time` (event_type, timestamp DESC)

**RPC Function**:
```sql
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
-- Nettoie logs > 90 jours
```

---

### 9. CORTEX - AUTOMATION & SCORING

#### `cortex_rules` 🤖 RÈGLES AUTOMATION
**Purpose**: Règles d'automation/scoring
**Migration**: `20260113000000_titan_init.sql`

**Colonnes**:
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
rule_type TEXT NOT NULL  -- 'scoring'|'automation'|'validation'
condition JSONB NOT NULL  -- JSON Logic condition
action JSONB NOT NULL  -- Action à exécuter
priority INTEGER NOT NULL DEFAULT 100
times_triggered INTEGER DEFAULT 0
last_triggered_at TIMESTAMPTZ
active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

**Triggers**: `update_cortex_rules_updated_at`

**Exemples de règles**:
```json
{
  "name": "High Income Bonus",
  "condition": {">=": [{"var": "revenu_annuel"}, 5000000]},
  "action": {"score": 20}
}
```

---

#### `cortex_execution_logs` 📝 LOGS EXÉCUTION CORTEX
**Purpose**: Logs d'exécution des règles Cortex
**Colonnes**: `application_id`, `rule_id`, `rule_name`, `condition_met`, `action_taken`, `execution_time_ms`, `created_at`
**Relations**: FK vers `loan_applications`, `cortex_rules`

---

### 10. OBJECTIVES

#### `loan_objectives` 🎯 OBJECTIFS MÉTIER
**Purpose**: Objectifs et KPIs métier
**Colonnes**: `name`, `description`, `metric_type`, `target_value`, `current_value`, `period`, `active`, `alert_threshold`
**Exemples**: Conversion Rate, Approval Rate, Average Loan Amount

---

## 🔗 MATERIALIZED VIEWS

### `mv_dashboard_stats`
**Purpose**: Stats dashboard agrégées (performance)
**Migration**: `20260118000002_materialized_views.sql`
**Refresh**: `CALL refresh_dashboard_stats()`
**Contenu**: Applications count, approval rate, avg loan amount, revenue, etc.

### `mv_client_timeline_summary`
**Purpose**: Résumé timeline par client (performance)
**Refresh**: `CALL refresh_client_timeline_summary()`
**Contenu**: Events count par client, dernière activité, status

---

## 🔧 RPC FUNCTIONS (Public)

### `get_messages_with_details()`
**Purpose**: Récupérer messages avec détails de classification
**Input**: Filtres (status, assigned_to, etc.)
**Output**: Messages enrichis

### `process_vopay_webhook()`
**Purpose**: Traiter webhook VoPay
**Input**: `p_payload JSONB`
**Output**: Result

### `get_message_emails_and_notes()`
**Purpose**: Récupérer emails et notes d'un message
**Input**: `p_message_id UUID`
**Output**: Array

### `has_analysis_scores()`
**Purpose**: Vérifier si analyse a des scores
**Input**: `p_analysis_id UUID`
**Output**: BOOLEAN

### `get_latest_job()`
**Purpose**: Récupérer dernier job d'une analyse
**Input**: `p_analysis_id UUID`
**Output**: `analysis_jobs` row

### `get_download_stats()`
**Purpose**: Stats téléchargements pour un fichier
**Input**: `p_file_name TEXT`
**Output**: Table (total_downloads, unique_users, last_downloaded)

### `update_*_updated_at_column()`
**Purpose**: Trigger functions pour auto-update `updated_at`
**Usage**: BEFORE UPDATE triggers

### `cleanup_old_security_logs()`
**Purpose**: Nettoyage automatique security_logs > 90 jours
**Usage**: Cron

---

## 🚨 ANTI-PATTERNS DÉTECTÉS

### 1. RLS Policies trop permissives
**Tables concernées**: `loan_applications`, `cortex_*`, `loan_objectives`
**Policy actuelle**: `POLICY "Allow all" ... USING (true) WITH CHECK (true)`
**Recommandation**: Implémenter policies par role:
```sql
-- Admin only
CREATE POLICY "admin_all" ON loan_applications
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Client read own
CREATE POLICY "client_read_own" ON loan_applications
  FOR SELECT USING (courriel = auth.jwt() ->> 'email');
```

### 2. Index manquants sur colonnes de recherche
**Tables**: `loan_applications`
**Colonnes**: `prenom + nom` (recherche full-text)
**Recommandation**: Ajouter GIN index (déjà fait partiellement)

### 3. Pas de partitioning sur tables volumineuses
**Tables**: `telemetry_requests`, `webhook_logs`, `client_events`
**Recommandation**: Partitionner par mois si > 10M rows
```sql
CREATE TABLE telemetry_requests_2026_01 PARTITION OF telemetry_requests
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 4. Absence de clés de corrélation systématiques
**Problème**: Plusieurs tables sans `application_id` ou `client_id`
**Recommandation**: Ajouter colonnes de corrélation:
- `webhook_logs.application_id` (déjà ajouté)
- `telemetry_requests.application_id`
- `download_logs.application_id`

### 5. Manque de constraints CHECK
**Exemple**: `loan_applications.montant_demande` devrait avoir `CHECK (montant_demande > 0 AND montant_demande <= 10000000)`
**Recommandation**: Ajouter constraints métier

---

## 📊 STATISTIQUES SCHÉMA

- **Total tables**: 35
- **Total index**: ~120
- **Materialized views**: 2
- **RPC functions**: 8+
- **Triggers**: 15+
- **Taille estimée DB**: < 5 GB (actuel), scalable à 100+ GB
- **Tables principales volumineuses**:
  - `telemetry_requests`: ~100K rows/jour
  - `webhook_logs`: ~10K rows/jour
  - `client_events`: ~50K rows/jour
  - `loan_applications`: ~1K rows/mois

---

## ✅ CHECKLIST OPTIMISATION

- [ ] Implémenter RLS policies strictes sur toutes tables sensibles
- [ ] Ajouter partitioning sur `telemetry_*`, `webhook_logs`, `client_events`
- [ ] Créer index composites sur (`client_id`, `created_at`) pour timeline queries
- [ ] Ajouter contraintes CHECK métier sur `loan_applications`
- [ ] Documenter toutes les RPC functions (commentaires SQL)
- [ ] Créer views pour queries complexes récurrentes
- [ ] Implémenter archivage automatique (> 2 ans)
- [ ] Ajouter monitoring index usage (detect unused indexes)

---

## 🔄 MIGRATIONS À VENIR (Recommandées)

1. **client_dossier_unified** - Schéma unifié dossier client
2. **client_identifiers** - Table identifiants multiples (emails, phones, external_ids)
3. **client_relations** - Liens entre clients (famille, co-emprunteurs)
4. **contracts** - Gestion contrats (generated, signed, file_refs)
5. **payments** - Table paiements unifiée (VoPay + QuickBooks + autre)

Voir `CLIENT_DOSSIER_TARGET_SCHEMA.md` pour détails.

---

**Généré le**: 2026-01-23
**Par**: Claude Sonnet 4.5 (Architecture Audit)
**Next**: Voir `METRICS_CATALOG.md` pour catalogue métriques
