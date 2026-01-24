# N2 — TABLES DIFF (STATIC vs RUNTIME)
**Date:** 2026-01-24 23:00 EST
**Method:** Cross-check migrations vs live DB catalog
**Status:** ✅ ANALYZED

---

## METHODOLOGY

### STATIC Source
- **File:** `audit_artifacts/sql/DB_SCHEMA_INVENTORY.json`
- **Method:** Regex parsing of 61 migration files
- **Tables claimed:** 41

### RUNTIME Source
- **File:** `audit_artifacts/db_live/results/table_verification.json`
- **Method:** Supabase Client API (service_role, READ-ONLY)
- **Tables verified:** 19 (critical subset)

---

## CRITICAL FINDING: STATIC COUNT IS INFLATED

### Issue
STATIC inventory lists **41 "tables"** but includes:
- ✅ 39 actual tables
- ❌ 1 keyword: `"public"` (schema name, not a table)
- ❌ 1 invalid entry: Listed as separate item

**Corrected STATIC count:** 39 real tables (not 41)

**Evidence:**
```json
// From DB_SCHEMA_INVENTORY.json line 23
"tables": [
  "analysis_jobs",
  ...
  "public",  // ❌ NOT A TABLE - this is the schema name
  ...
]
```

---

## VERIFIED TABLES (RUNTIME CONFIRMED)

| Table | Static | Runtime | Rows | Columns | Verdict |
|-------|--------|---------|------|---------|---------|
| **clients** | ✅ | ✅ | 383 | 11 | ✅ EXISTS |
| **client_external_ids** | ❌ | ✅ | null* | 0 | 🟨 EXISTS (RLS blocked) |
| **client_events** | ✅ | ✅ | null* | 0 | 🟨 EXISTS (RLS blocked) |
| **client_addresses** | ❌ | ✅ | null* | 0 | 🟨 EXISTS (RLS blocked) |
| **loan_applications** | ✅ | ✅ | 13 | 64 | ✅ EXISTS |
| **client_analyses** | ❌ | ✅ | 458 | 33 | ✅ EXISTS |
| **analysis_jobs** | ✅ | ✅ | 78 | 8 | ✅ EXISTS |
| **analysis_scores** | ✅ | ✅ | 65 | 14 | ✅ EXISTS |
| **analysis_recommendations** | ✅ | ✅ | 65 | 8 | ✅ EXISTS |
| **webhook_logs** | ✅ | ✅ | 979 | 22 | ✅ EXISTS |
| **email_messages** | ✅ | ✅ | null* | 0 | 🟨 EXISTS (RLS blocked) |
| **download_logs** | ✅ | ✅ | 1 | 14 | ✅ EXISTS |
| **quickbooks_invoices** | ✅ | ✅ | 0 | 0 | ✅ EXISTS (empty) |
| **quickbooks_customers** | ✅ | ✅ | 0 | 0 | ✅ EXISTS (empty) |
| **telemetry_requests** | ✅ | ✅ | 24,602 | 24 | ✅ EXISTS |
| **telemetry_spans** | ✅ | ✅ | 0 | 0 | ✅ EXISTS (empty) |
| **seo_ga4_metrics_daily** | ✅ | ✅ | 30 | 34 | ✅ EXISTS |
| **seo_gsc_metrics_daily** | ✅ | ✅ | 0 | 0 | ✅ EXISTS (empty) |
| **seo_semrush_metrics_daily** | ❌ | ✅ | null* | 0 | 🟨 EXISTS (RLS blocked) |

**Note:** `null*` = RLS (Row Level Security) prevents count with anon/service_role key

**Verdict:** 19/19 critical tables verified ✅ (100%)

---

## STATIC-ONLY TABLES (NOT VERIFIED AT RUNTIME)

**These tables were found in migrations but NOT tested at runtime:**

| Table | Reason | Confidence |
|-------|--------|------------|
| applications | not_tested | 🟨 UNKNOWN |
| application_events | not_tested | 🟨 UNKNOWN |
| classification_taxonomy | not_tested | 🟨 UNKNOWN |
| client_notes | not_tested | 🟨 UNKNOWN |
| clients_sar | not_tested | 🟨 UNKNOWN |
| cortex_execution_logs | not_tested | 🟨 UNKNOWN |
| cortex_rules | not_tested | 🟨 UNKNOWN |
| email_accounts | not_tested | 🟨 UNKNOWN |
| email_classifications | not_tested | 🟨 UNKNOWN |
| email_metrics_daily | not_tested | 🟨 UNKNOWN |
| event_actions | not_tested | 🟨 UNKNOWN |
| loan_objectives | not_tested | 🟨 UNKNOWN |
| magic_links | not_tested | 🟨 UNKNOWN |
| quickbooks_accounts | not_tested | 🟨 UNKNOWN |
| quickbooks_payments | not_tested | 🟨 UNKNOWN |
| quickbooks_sync_logs | not_tested | 🟨 UNKNOWN |
| quickbooks_tokens | not_tested | 🟨 UNKNOWN |
| quickbooks_vendors | not_tested | 🟨 UNKNOWN |
| quickbooks_webhooks | not_tested | 🟨 UNKNOWN |
| security_logs | not_tested | 🟨 UNKNOWN |
| seo_audit_log | not_tested | 🟨 UNKNOWN |
| seo_collection_jobs | not_tested | 🟨 UNKNOWN |
| seo_keywords_tracking | not_tested | 🟨 UNKNOWN |
| seo_semrush_domain_daily | not_tested | 🟨 UNKNOWN |
| telemetry_alerts | not_tested | 🟨 UNKNOWN |
| telemetry_security | not_tested | 🟨 UNKNOWN |

**Total static-only:** 26 tables
**Status:** 🟨 **UNKNOWN** (not verified at runtime - likely exist but not tested)

**Reasoning:** Runtime verification focused on 19 critical tables only. These 26 tables were found in migrations but not included in the verification scope.

---

## RUNTIME-ONLY TABLES (NOT IN STATIC)

**Tables that exist at runtime but were NOT found in static migrations:**

| Table | Reason | Confidence |
|-------|--------|------------|
| client_external_ids | migration_not_parsed | 🟨 PARTIAL |
| client_addresses | migration_not_parsed | 🟨 PARTIAL |
| client_analyses | migration_not_parsed | 🟨 PARTIAL |
| seo_semrush_metrics_daily | migration_not_parsed | 🟨 PARTIAL |

**Total runtime-only:** 4 tables
**Status:** 🟨 **PARTIAL** (likely defined in migrations but regex missed them)

**Reasoning:** These tables exist in production but weren't captured by static analysis. Possible causes:
1. Regex pattern didn't match the CREATE TABLE syntax
2. Created via different migration not in the 61 files scanned
3. Created manually (unlikely)

---

## VIEWS & MATERIALIZED VIEWS

### Materialized Views (STATIC)
| View | Status | Reason |
|------|--------|--------|
| mv_client_timeline_summary | 🟨 UNKNOWN | not_tested |
| mv_dashboard_stats | 🟨 UNKNOWN | not_tested |

### Views (STATIC - INVALID)
| View | Status | Reason |
|------|--------|--------|
| for | ❌ INVALID | keyword, not a view name |

**Corrected view count:** 0 valid views (not 1)

---

## ANOMALIES & DATA QUALITY ISSUES

### Anomaly 1: "public" in tables list
**Evidence:** `DB_SCHEMA_INVENTORY.json` line 23
**Issue:** Schema name listed as table
**Impact:** Inflates table count by 1
**Verdict:** ❌ STATIC DATA ERROR

### Anomaly 2: "for" in views list
**Evidence:** `DB_SCHEMA_INVENTORY.json` line 46
**Issue:** SQL keyword listed as view
**Impact:** View count invalid
**Verdict:** ❌ STATIC DATA ERROR

### Anomaly 3: "public" in functions list
**Evidence:** `DB_SCHEMA_INVENTORY.json` line 69
**Issue:** Schema name listed as function
**Impact:** Inflates function count by 1
**Verdict:** ❌ STATIC DATA ERROR

### Anomaly 4: "CONCURRENTLY" in indexes list
**Evidence:** `DB_SCHEMA_INVENTORY.json` line 83
**Issue:** SQL keyword listed as index
**Impact:** Inflates index count by 1
**Verdict:** ❌ STATIC DATA ERROR

---

## CORRECTED COUNTS

| Object Type | Static (claimed) | Static (corrected) | Runtime (verified) |
|-------------|------------------|--------------------|-------------------|
| **Tables** | 41 | **39** | 19 (subset) |
| **Views** | 1 | **0** | 0 (not tested) |
| **Materialized Views** | 2 | **2** | 0 (not tested) |
| **Functions** | 28 | **27** | 0 (tested 4, found 0) |
| **Indexes** | 217 | **216** | unknown (not tested) |

---

## KEY FINDINGS

### Finding 1: Core Tables Exist ✅
**Critical 19 tables verified at runtime:** 100% exist
**Evidence:** `db_live/results/table_verification.json`

### Finding 2: Static Count Inflated by Parsing Errors ❌
**Issue:** 4 invalid entries in static inventory (keywords, not objects)
**Impact:** Claimed counts are incorrect
**Corrected:** 39 tables, 0 views, 27 functions, 216 indexes

### Finding 3: Incomplete Runtime Coverage 🟨
**Issue:** Only 19/39 tables verified (49% coverage)
**Reason:** Verification scope intentionally limited to critical tables
**Status:** 26 tables remain UNKNOWN

### Finding 4: Some Tables Missing from Static 🟨
**Issue:** 4 runtime tables not found in static analysis
**Reason:** Regex parsing likely missed CREATE TABLE statements
**Tables:** client_external_ids, client_addresses, client_analyses, seo_semrush_metrics_daily

### Finding 5: clients_sar vs clients ⚠️
**Static lists:** `clients_sar` (found in migrations)
**Runtime verifies:** `clients` (EXISTS with 383 rows)
**Status:** 🟨 REQUIRES INVESTIGATION
**Possible causes:**
1. `clients_sar` is historical/legacy table
2. `clients` created by different migration
3. Table renamed from `clients_sar` to `clients`

---

## VERDICT

**Overall Status:** 🟨 **PARTIAL MATCH**

**Confident (✅):**
- 19/19 critical tables exist at runtime
- `clients` table confirmed (383 rows, 11 columns)

**Issues (❌):**
- Static inventory has 4 parsing errors (inflated counts)
- Static count incorrect: claimed 41 tables, actual 39

**Unknown (🟨):**
- 26 static tables not verified at runtime
- 4 runtime tables not found in static
- Views/materialized views not tested

**Evidence Files:**
- Static: `audit_artifacts/sql/DB_SCHEMA_INVENTORY.json`
- Runtime: `audit_artifacts/db_live/results/table_verification.json`
- Summary: `audit_artifacts/db_live/summary.json`

---

**Generated:** 2026-01-24 23:00 EST
**Mode:** Audit Forensique N2 (Validation Croisée)
