# Schéma Supabase - SAR (Solution Argent Rapide)

**Dernière mise à jour**: 2026-01-30
**Version**: Production

---

## 📊 TABLES PRINCIPALES

### 1. **clients**
```sql
id UUID PRIMARY KEY
name TEXT
email TEXT
phone TEXT
status TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 2. **applications**
```sql
id UUID PRIMARY KEY
client_id UUID REFERENCES clients(id)
status TEXT
amount DECIMAL
created_at TIMESTAMPTZ
submitted_at TIMESTAMPTZ
approved_at TIMESTAMPTZ
```

---

## 📈 TÉLÉMÉTRIE & ANALYTICS

### 3. **telemetry_requests**
```sql
id UUID PRIMARY KEY
trace_id UUID
method TEXT
path TEXT
status INTEGER
duration_ms INTEGER
source TEXT (webhook|cron|internal|web)
env TEXT (production|development)
ip TEXT -- Nouveau: IP clair (Phase Identity Graph)
ip_hash TEXT -- SHA256(IP + salt) - 16 chars
ua_hash TEXT -- SHA256(User-Agent + salt) - 16 chars
visit_id UUID -- Nouveau: Cookie client 30 jours
session_id UUID -- Nouveau: Session SAR
user_id UUID -- Nouveau: User authentifié
client_id UUID -- Nouveau: Client lié
ga4_client_id TEXT -- Nouveau: GA4 tracking
ga4_session_id TEXT -- Nouveau: GA4 session
region TEXT
vercel_id TEXT
vercel_region TEXT
meta_redacted JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
```
**Indexes:**
- `(ip, created_at DESC)` - Nouveau
- `(visit_id, created_at DESC)` - Nouveau
- `(session_id, created_at DESC)` - Nouveau
- `(user_id, created_at DESC)` - Nouveau
- `(client_id, created_at DESC)` - Nouveau
- `(ip_hash, created_at DESC)`
- `(env, created_at DESC)`

### 4. **telemetry_events**
```sql
id UUID PRIMARY KEY
visit_id UUID -- Lié au cookie client
session_id UUID
event_name TEXT (page_view|click|form_start|form_submit|etc)
page_path TEXT
referrer TEXT
utm JSONB (source, medium, campaign, term, content)
device JSONB (viewport, screen, devicePixelRatio)
properties JSONB -- Custom event properties
created_at TIMESTAMPTZ DEFAULT NOW()
```
**Indexes:**
- `(visit_id, created_at DESC)`
- `(event_name, created_at DESC)`
- `(page_path, created_at DESC)`

### 5. **telemetry_spans**
```sql
id UUID PRIMARY KEY
trace_id UUID
parent_id UUID
name TEXT
duration_ms INTEGER
status TEXT
tags JSONB
created_at TIMESTAMPTZ
```

### 6. **telemetry_security**
```sql
id UUID PRIMARY KEY
trace_id UUID
event_type TEXT
severity TEXT (low|medium|high|critical)
ip_hash TEXT
details JSONB
created_at TIMESTAMPTZ
```

---

## 🔍 SEO & PERFORMANCE

### 7. **ga4_daily**
```sql
date DATE PRIMARY KEY
users INTEGER
new_users INTEGER
sessions INTEGER
engaged_sessions INTEGER
engagement_rate NUMERIC
bounce_rate NUMERIC
avg_duration NUMERIC
pages_per_session NUMERIC
conversions INTEGER
conversion_rate NUMERIC
organic INTEGER
direct INTEGER
referral INTEGER
social INTEGER
paid INTEGER
mobile INTEGER
desktop INTEGER
tablet INTEGER
top_pages JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 8. **gsc_daily**
```sql
date DATE PRIMARY KEY
clicks INTEGER
impressions INTEGER
ctr NUMERIC
position NUMERIC
top_queries JSONB
top_pages JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 9. **semrush_daily**
```sql
date DATE PRIMARY KEY
keywords INTEGER
traffic INTEGER
traffic_value_cents INTEGER
rank INTEGER
authority NUMERIC
backlinks INTEGER
referring_domains INTEGER
top_keywords JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 10. **vercel_speed_insights_raw**
```sql
id UUID PRIMARY KEY
event_id TEXT
deployment_id TEXT
page_url TEXT
extracted_url TEXT
extracted_device TEXT (mobile|desktop)
extracted_lcp NUMERIC
extracted_inp NUMERIC
extracted_cls NUMERIC
extracted_ttfb NUMERIC
extracted_fcp NUMERIC
raw_payload JSONB
received_at TIMESTAMPTZ DEFAULT NOW()
```
**Indexes:**
- `(extracted_device, received_at DESC)`
- `(extracted_url, received_at DESC)`

### 11. **vercel_speed_insights_daily**
```sql
date DATE
path TEXT
device TEXT (mobile|desktop|all)
lcp_p75 NUMERIC
inp_p75 NUMERIC
cls_p75 NUMERIC
ttfb_p75 NUMERIC
samples INTEGER
perf_status TEXT (GOOD|WARN|CRIT)
created_at TIMESTAMPTZ
PRIMARY KEY (date, path, device)
```

### 12. **seo_collection_jobs**
```sql
id UUID PRIMARY KEY
job_type TEXT (daily_collection|manual_collection)
status TEXT (success|partial_success|failed)
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
records_processed INTEGER
records_created INTEGER
records_failed INTEGER
triggered_by TEXT (cron|manual)
raw_response JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 📧 MAILOPS (Gestion Emails)

### 13. **email_accounts**
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE
provider TEXT (gmail|outlook|etc)
status TEXT (active|inactive)
last_sync_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

### 14. **email_messages**
```sql
id UUID PRIMARY KEY
account_id UUID REFERENCES email_accounts(id)
message_id TEXT UNIQUE
thread_id TEXT
from_email TEXT
to_email TEXT[]
subject TEXT
body_text TEXT
body_html TEXT
received_at TIMESTAMPTZ
labels TEXT[]
is_read BOOLEAN
is_starred BOOLEAN
created_at TIMESTAMPTZ
```

### 15. **email_classifications**
```sql
id UUID PRIMARY KEY
message_id UUID REFERENCES email_messages(id)
category TEXT
subcategory TEXT
confidence NUMERIC
classified_at TIMESTAMPTZ
```

### 16. **client_events**
```sql
id UUID PRIMARY KEY
client_id UUID REFERENCES clients(id)
event_type TEXT
event_data JSONB
source TEXT (email|web|phone)
created_at TIMESTAMPTZ
```

---

## 🔗 VUES (Views)

### 17. **seo_unified_daily_plus** (View)
```sql
-- Combine GA4 + GSC + Semrush + Speed Insights par date
SELECT
  date,
  -- GA4 metrics (94+ columns)
  ga4_users, ga4_sessions, ga4_conversions, ...
  -- GSC metrics
  gsc_clicks, gsc_impressions, gsc_ctr, gsc_position,
  gsc_top_queries, gsc_top_pages,
  -- Semrush metrics
  semrush_keywords, semrush_traffic, semrush_backlinks, ...
  -- Speed Insights (aggregated across all pages)
  avg_lcp_p75, avg_inp_p75, avg_cls_p75, avg_ttfb_p75,
  mobile_lcp_p75, desktop_lcp_p75,
  speed_samples, perf_status
FROM seo_unified_daily sud
FULL OUTER JOIN vercel_speed_insights_daily speed
  ON sud.date = speed.date
ORDER BY date DESC;
```

### 18. **ip_to_seo_segment** (View)
```sql
-- Agrégation par IP pour SEO Command Center
SELECT
  ip_hash as ip,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(*) as total_requests,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
  COUNT(DISTINCT path) as unique_pages,
  (ARRAY_AGG(path ORDER BY created_at ASC))[1] as landing_page,
  MODE() WITHIN GROUP (ORDER BY path) as most_visited_page,
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::int as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  COUNT(*) FILTER (WHERE status >= 200 AND status < 400) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  MODE() WITHIN GROUP (ORDER BY meta_redacted->>'device') as device,
  MODE() WITHIN GROUP (ORDER BY meta_redacted->>'utm_source') as utm_source,
  MODE() WITHIN GROUP (ORDER BY meta_redacted->>'utm_medium') as utm_medium,
  MODE() WITHIN GROUP (ORDER BY meta_redacted->>'utm_campaign') as utm_campaign
FROM telemetry_requests
WHERE env = 'production'
GROUP BY ip_hash;
```

### 19. **visit_dossier** (View) - Nouveau
```sql
-- Agrégation par visit_id (une visite = une session utilisateur)
SELECT
  visit_id,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  MODE() WITHIN GROUP (ORDER BY ip) as ip,
  (ARRAY_AGG(path ORDER BY created_at ASC))[1] as landing_page,
  COUNT(*) as total_requests,
  COUNT(DISTINCT path) as unique_pages,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::int as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  COUNT(*) FILTER (WHERE status >= 200 AND status < 400) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  MODE() WITHIN GROUP (ORDER BY session_id) as session_id,
  MODE() WITHIN GROUP (ORDER BY user_id) as user_id,
  MODE() WITHIN GROUP (ORDER BY client_id) as client_id,
  MODE() WITHIN GROUP (ORDER BY ga4_client_id) as ga4_client_id,
  (ARRAY_AGG(meta_redacted ORDER BY created_at DESC))[1] as meta
FROM telemetry_requests
WHERE visit_id IS NOT NULL AND env = 'production'
GROUP BY visit_id;
```

### 20. **ip_dossier_v2** (View) - Nouveau
```sql
-- Enhanced IP dossier avec insights par visite
SELECT
  ip,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen,
  COUNT(*) as total_requests,
  COUNT(DISTINCT visit_id) as distinct_visits,
  COUNT(DISTINCT session_id) as distinct_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as distinct_users,
  COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) as distinct_clients,
  COUNT(DISTINCT path) as unique_pages,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
  AVG(duration_ms)::int as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::int as p95_duration_ms,
  COUNT(*) FILTER (WHERE status >= 200 AND status < 400) as success_count,
  COUNT(*) FILTER (WHERE status >= 400 AND status < 500) as client_error_count,
  COUNT(*) FILTER (WHERE status >= 500) as server_error_count,
  (
    SELECT jsonb_agg(jsonb_build_object('path', path, 'count', count))
    FROM (
      SELECT path, COUNT(*) as count
      FROM telemetry_requests t2
      WHERE t2.ip = t1.ip AND t2.env = 'production'
      GROUP BY path
      ORDER BY count DESC
      LIMIT 3
    ) top_paths
  ) as top_landing_pages
FROM telemetry_requests t1
WHERE ip IS NOT NULL AND env = 'production'
GROUP BY ip;
```

---

## 🔐 QUICKBOOKS INTEGRATION

### 21. **quickbooks_tokens**
```sql
id UUID PRIMARY KEY
access_token TEXT ENCRYPTED
refresh_token TEXT ENCRYPTED
realm_id TEXT
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 22. **quickbooks_sync_logs**
```sql
id UUID PRIMARY KEY
sync_type TEXT
status TEXT
records_synced INTEGER
errors JSONB
synced_at TIMESTAMPTZ
```

---

## 📝 NOTES IMPORTANTES

### Identity Graph (Nouveau - 2026-01-30)
- **visit_id**: UUID généré côté client, persisté dans cookie 30 jours
- **Permet de lier**: IP → visit → session → user → client
- **Attribution**: UTM/referrer capturés par visite
- **Conversion tracking**: form_start → form_submit par visite

### Anonymisation
- **ip_hash**: SHA256(IP + salt) - 16 chars
- **ua_hash**: SHA256(User-Agent + salt) - 16 chars
- **ip** (clair): Stocké uniquement pour Identity Graph (admin-only access)

### Cron Jobs (Vercel)
```
6h00 UTC: /api/cron/seo-collect (GA4 + GSC + Semrush)
3h00 UTC: /api/cron/aggregate-speed-insights
2h00 UTC: /api/cron/cleanup-sessions
```

### Speed Insights
- **Drain Webhook**: Temps réel → `vercel_speed_insights_raw`
- **Agrégation quotidienne**: 3h UTC → `vercel_speed_insights_daily`
- **p75 par page/device**: Calcul des percentiles

---

## 🔄 CHANGELOG

**2026-01-30**: Identity Graph (Phases 1-6)
- Ajout colonnes: ip, visit_id, session_id, user_id, client_id
- Création views: visit_dossier, ip_dossier_v2
- Table: telemetry_events (tracking client-side)

**2026-01-29**: Email tracking + Composite indexes

**2026-01-27**: Cloudflare Analytics, GSC Metrics, PageSpeed, SSL Monitoring, Uptime Monitoring

**2026-01-22**: Telemetry system, Unified webhook logs

**2026-01-21**: SEO Metrics System (GA4, GSC, Semrush)

**2026-01-20**: QuickBooks Integration

**2026-01-18**: Performance indexes, RPC functions, Materialized views

**2026-01-17**: MailOps (Email management system)

**2026-01-13**: Titan Init (Core tables)
