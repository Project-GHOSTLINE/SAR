# Tables Supabase - LISTE VÉRIFIÉE

**⚠️ TOUJOURS CONSULTER CE FICHIER AVANT D'ÉCRIRE DU SQL**

**Dernière vérification**: 2026-01-30 14:30 EST
**Source**: `information_schema.tables` (Supabase Production)

---

## 📊 VUES (40 VIEWS)

### Analytics & Visualisations
- `analytics_events_enriched`
- `analytics_sessions_enriched`
- `analytics_user_journeys`
- `visual_abandon_heatmap`
- `visual_activity_heatmap`
- `visual_conversion_by_source`
- `visual_conversion_funnel`
- `visual_events_timeline`
- `visual_page_flow`

### SEO
- `ip_dossier_v2`
- `ip_to_seo_segment`
- `seo_pending_issues`
- `seo_top_keywords`
- `seo_unified_daily`
- `seo_unified_daily_plus`
- `visit_dossier`

### Clients & Analyses
- `v_high_risk_clients`
- `v_pending_analyses`
- `vw_active_clients`
- `vw_client_summary`
- `vw_client_timeline`
- `vw_client_timeline_by_type`

### Claude AI
- `claude_project_summary`
- `claude_recent_activity`

### Signatures & Downloads
- `download_stats`
- `recent_downloads`
- `signature_recent_documents`
- `signature_stats`

### Télémétrie & Performance
- `vw_cache_hit_ratio`
- `vw_phase_performance`
- `vw_route_performance`
- `vw_slow_routes`
- `vw_table_sizes`
- `vw_telemetry_active_alerts`
- `vw_telemetry_request_rate`
- `vw_telemetry_security_failures`
- `vw_telemetry_slow_operations`

### VoPay
- `vopay_webhooks_view`
- `vw_vopay_by_client`
- `vw_vopay_orphans`

---

## 📋 TABLES (128 BASE TABLES)

### Clients & Applications
- `applications`
- `application_events`
- `clients`
- `clients_sar`
- `client_accounts`
- `client_analyses`
- `client_analysis_notes`
- `client_analysis_status_history`
- `client_analysis_tags`
- `client_external_ids`
- `client_identity_aliases`
- `client_notes`
- `client_pattern_hits`
- `client_phones`
- `client_sessions`
- `client_telemetry_events`
- `client_transactions`

### Loans & Payments
- `loans`
- `loan_applications`
- `loan_objectives`
- `payment_events`
- `payment_installments`
- `payment_schedule_versions`

### SEO & Analytics (✅ NOMS CORRECTS)
- `seo_audit_log`
- `seo_cloudflare_analytics_daily`
- `seo_collection_jobs`
- `seo_ga4_metrics_daily` ← GA4 (pas "ga4_daily")
- `seo_gsc_metrics_daily` ← GSC (pas "gsc_daily")
- `seo_keywords_tracking`
- `seo_pagespeed_metrics_daily`
- `seo_semrush_domain_daily` ← Semrush (pas "semrush_daily")
- `seo_ssl_checks`
- `seo_uptime_checks`
- `vercel_speed_insights_daily`
- `vercel_speed_insights_raw`

### Télémétrie
- `telemetry_requests` ← Principal (ip, visit_id, session_id, user_id, client_id)
- `telemetry_alerts`
- `telemetry_security`
- `telemetry_spans`

### Claude AI & Automation
- `claude_actions`
- `claude_code_insights`
- `claude_conversation_log`
- `claude_decisions`
- `claude_docs_read`
- `claude_file_changes`
- `claude_files_touched`
- `claude_knowledge`
- `claude_memory`
- `claude_messages`
- `claude_projects`
- `claude_questions`
- `claude_rule_violations`
- `claude_rules`
- `claude_sessions`

### Communications
- `communications`
- `communication_attachments`
- `contact_messages`
- `emails_envoyes`
- `notification_logs`
- `notification_templates`

### Support
- `support_messages`
- `support_tickets`

### Signatures & Documents
- `signature_audit_logs`
- `signature_documents`
- `signature_templates`

### QuickBooks
- `quickbooks_accounts`
- `quickbooks_customers`
- `quickbooks_invoices`
- `quickbooks_payments`
- `quickbooks_sync_logs`
- `quickbooks_tokens`
- `quickbooks_vendors`
- `quickbooks_webhooks`

### VoPay
- `vopay_objects`
- `vopay_webhook_logs`

### Security & Audit
- `audit_log`
- `audit_logs`
- `security_events`
- `fraud_cases`
- `webauthn_challenges`
- `webauthn_credentials`

### Admin & API
- `admin_sections`
- `api_keys`
- `api_performance_logs`
- `profiles`
- `team_members`

### Analytics & Testing
- `ab_test_assignments`
- `ab_tests`
- `analysis_jobs`
- `analysis_recommendations`
- `analysis_scores`

### ML & Predictions
- `ml_models`
- `ml_predictions`

### Training & Modules
- `training_modules`
- `module_sections`
- `exercises`
- `weekly_missions`
- `user_exercise_progress`
- `user_mission_progress`
- `user_module_progress`

### Workflows & Automation
- `workflows`
- `workflow_executions`
- `cortex_execution_logs`
- `cortex_rules`

### Metrics & Monitoring
- `metric_registry`
- `metric_values`
- `metrics_log`

### Divers
- `download_logs`
- `inverite_links`
- `magic_links`
- `notes`
- `notes_internes`
- `webhook_logs`

---

## 🎯 REQUÊTES FRÉQUENTES (AVEC VRAIS NOMS)

### Vérifier doublons SEO
```sql
-- GA4
SELECT date, COUNT(*) FROM seo_ga4_metrics_daily GROUP BY date HAVING COUNT(*) > 1;

-- GSC
SELECT date, COUNT(*) FROM seo_gsc_metrics_daily GROUP BY date HAVING COUNT(*) > 1;

-- Semrush
SELECT date, COUNT(*) FROM seo_semrush_domain_daily GROUP BY date HAVING COUNT(*) > 1;
```

### Dernières données SEO
```sql
SELECT date, ga4_users, ga4_sessions, gsc_clicks, semrush_keywords
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 10;
```

### Vérifier jobs de collecte
```sql
SELECT job_type, status, started_at, records_created, records_failed
FROM seo_collection_jobs
ORDER BY started_at DESC
LIMIT 10;
```

### Télémétrie avec Identity Graph
```sql
SELECT ip, visit_id, session_id, user_id, client_id, path, created_at
FROM telemetry_requests
WHERE visit_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

---

## ⚠️ RÈGLES D'UTILISATION

1. **TOUJOURS** consulter ce fichier avant d'écrire du SQL
2. **JAMAIS** deviner ou improviser un nom de table
3. **TOUJOURS** utiliser les noms exacts de ce fichier
4. Si une table n'est pas dans cette liste → elle n'existe pas
5. Mettre à jour ce fichier après chaque migration

---

## 📝 NOTES

- Les tables SEO ont le préfixe `seo_` (ex: `seo_ga4_metrics_daily`)
- Les vues ont souvent le préfixe `vw_` ou `v_`
- Les tables de télémétrie ont le préfixe `telemetry_`
- Les tables Claude AI ont le préfixe `claude_`
- PRIMARY KEY pour les tables daily: `date` (sauf speed insights: `date, path, device`)
