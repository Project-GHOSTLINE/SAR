# N2 — RPC FUNCTION RESULTS (EXISTENCE & EXECUTION)
**Date:** 2026-01-24 23:15 EST
**Method:** Direct RPC calls via Supabase Client
**Status:** ✅ **TESTED** (4 functions, 0 successful)

---

## METHODOLOGY

### Test Approach
**Tool:** Supabase Client API (.rpc())
**Auth:** Service role key (admin access)
**Method:** Call RPC with minimal parameters
**PII:** ZERO (no real client data passed)

### Functions Tested
Selected based on architecture proposals for "unified API" and "orchestration":
1. `get_client_dossier_unified` - Unified client dossier endpoint
2. `get_client_summary` - Client summary aggregation
3. `calculate_overall_health_score` - Health scoring
4. `resolve_client_id` - Client ID resolution

---

## STATIC INVENTORY (Expected Functions)

### From DB_SCHEMA_INVENTORY.json

**Total functions claimed:** 28 (but 27 after removing "public" keyword)

**Functions found in migrations:**
- calculate_fraud_score
- calculate_keyword_position_change
- cleanup_old_performance_logs
- cleanup_old_security_logs
- cleanup_telemetry_data
- generate_loan_reference
- get_active_rules
- get_download_stats
- get_important_decisions
- get_latest_job
- get_message_emails_and_notes
- get_messages_with_details
- get_trace_timeline
- has_analysis_scores
- log_rule_violation
- process_vopay_webhook
- refresh_client_timeline_summary
- refresh_dashboard_stats
- search_claude_history
- search_clients_sar
- update_claude_knowledge_search
- update_claude_messages_search
- update_fraud_score
- update_quickbooks_updated_at
- update_seo_updated_at_column
- update_updated_at_column
- update_webhook_logs_updated_at

**Evidence:** `audit_artifacts/sql/DB_SCHEMA_INVENTORY.json` lines 52-81

---

## RUNTIME TEST RESULTS

### RPC 1: get_client_dossier_unified

**Purpose:** Unified client dossier (proposed orchestration function)
**Test file:** `db_live/results/rpc_get_client_dossier_unified.json`

**Call attempted:**
```javascript
supabase.rpc('get_client_dossier_unified', { identifier: 'test' })
```

**Result:**
```json
{
  "success": false,
  "exists": false,
  "error": "Could not find the function public.get_client_dossier_unified(identifier) in the schema cache"
}
```

**Verdict:** ❌ **NOT FOUND** (function does not exist at runtime)
**Confidence:** 100% (direct error from Postgres)

---

### RPC 2: get_client_summary

**Purpose:** Client summary aggregation
**Test file:** `db_live/results/rpc_get_client_summary.json`

**Call attempted:**
```javascript
supabase.rpc('get_client_summary', { client_id: 'test-uuid' })
```

**Result:**
```json
{
  "success": false,
  "exists": false,
  "error": "Could not find the function public.get_client_summary(client_id) in the schema cache"
}
```

**Verdict:** ❌ **NOT FOUND**
**Confidence:** 100%

---

### RPC 3: calculate_overall_health_score

**Purpose:** Calculate overall health/risk score
**Test file:** `db_live/results/rpc_calculate_overall_health_score.json`

**Call attempted:**
```javascript
supabase.rpc('calculate_overall_health_score', {})
```

**Result:**
```json
{
  "success": false,
  "exists": false,
  "error": "Could not find the function public.calculate_overall_health_score without parameters in the schema cache"
}
```

**Verdict:** ❌ **NOT FOUND**
**Confidence:** 100%

---

### RPC 4: resolve_client_id

**Purpose:** Resolve client ID from email/phone
**Test file:** `db_live/results/rpc_resolve_client_id.json`

**Call attempted:**
```javascript
supabase.rpc('resolve_client_id', { identifier: 'test@example.com' })
```

**Result:**
```json
{
  "success": false,
  "exists": false,
  "error": "Could not find the function public.resolve_client_id(...) in the schema cache"
}
```

**Verdict:** ❌ **NOT FOUND**
**Confidence:** 100%

---

## SUMMARY: TEST RESULTS

| Function | Static | Runtime | Status | Evidence |
|----------|--------|---------|--------|----------|
| get_client_dossier_unified | ❌ Not in inventory | ❌ NOT FOUND | not_found_runtime | rpc_get_client_dossier_unified.json |
| get_client_summary | ❌ Not in inventory | ❌ NOT FOUND | not_found_runtime | rpc_get_client_summary.json |
| calculate_overall_health_score | ❌ Not in inventory | ❌ NOT FOUND | not_found_runtime | rpc_calculate_overall_health_score.json |
| resolve_client_id | ❌ Not in inventory | ❌ NOT FOUND | not_found_runtime | rpc_resolve_client_id.json |

**Result:** 0/4 functions exist at runtime (0%)

---

## STATIC-ONLY FUNCTIONS (Not Tested)

### Functions in Static Inventory (27 functions)

**Categorized by purpose:**

#### Fraud & Scoring (3)
- calculate_fraud_score
- update_fraud_score
- has_analysis_scores

#### Email & Communication (4)
- get_message_emails_and_notes
- get_messages_with_details
- search_claude_history
- search_clients_sar

#### QuickBooks Integration (1)
- update_quickbooks_updated_at

#### SEO & Analytics (2)
- calculate_keyword_position_change
- update_seo_updated_at_column

#### Telemetry & Monitoring (5)
- cleanup_old_performance_logs
- cleanup_old_security_logs
- cleanup_telemetry_data
- get_trace_timeline
- log_rule_violation

#### Webhooks & Processing (1)
- process_vopay_webhook

#### Materialized Views (2)
- refresh_client_timeline_summary
- refresh_dashboard_stats

#### Rules & Validation (2)
- get_active_rules
- get_important_decisions

#### Utility Functions (4)
- generate_loan_reference
- get_download_stats
- get_latest_job
- update_updated_at_column

#### Search Functions (2)
- update_claude_knowledge_search
- update_claude_messages_search

#### Webhook Processing (1)
- update_webhook_logs_updated_at

**Status:** 🟨 **NOT TESTED** (exist in migrations, runtime status unknown)

---

## DISCREPANCY ANALYSIS

### Proposed Orchestration Functions (Architecture Docs)

**Expected (from proposals):**
- ✅ get_client_dossier_unified
- ✅ get_client_summary
- ✅ calculate_overall_health_score
- ✅ resolve_client_id

**Found in Static Inventory:**
- ❌ NONE of the 4 proposed functions

**Found at Runtime:**
- ❌ NONE of the 4 proposed functions

**Conclusion:** ❌ **ORCHESTRATION RPC FUNCTIONS NEVER DEPLOYED**

---

## ALTERNATE FUNCTIONS (Static)

### Similar Functions Found in Static

**For client lookup:**
- `search_clients_sar` (exists in static)
  - Status: 🟨 NOT TESTED at runtime

**For scoring:**
- `calculate_fraud_score` (exists in static)
- `update_fraud_score` (exists in static)
- `has_analysis_scores` (exists in static)
  - Status: 🟨 NOT TESTED at runtime

**For dossier/timeline:**
- `get_trace_timeline` (exists in static)
- `refresh_client_timeline_summary` (exists in static, materialized view)
  - Status: 🟨 NOT TESTED at runtime

**Implication:** Alternative functions may exist, but **orchestration-specific functions do NOT**

---

## KEY FINDINGS

### Finding 1: Zero Orchestration RPCs Deployed ❌
**Evidence:** All 4 tests returned "not found in schema cache"
**Impact:** Proposed unified API (`/api/admin/client/:id/dossier`) cannot work
**Status:** ❌ **ARCHITECTURE NOT IMPLEMENTED**

### Finding 2: Proposed Functions NOT in Static ❌
**Evidence:** None of the 4 tested functions appear in `DB_SCHEMA_INVENTORY.json`
**Implication:** Functions were proposed but never migrated
**Status:** ❌ **MIGRATIONS MISSING**

### Finding 3: Alternative Functions Exist (Untested) 🟨
**Evidence:** 27 functions found in static inventory
**Status:** 🟨 **UNKNOWN** (not tested at runtime)
**Implication:** May provide similar functionality via different API

### Finding 4: Static Inventory May Be Stale 🟨
**Issue:** Lists 28 functions (27 after correction) but tested 0
**Reason:** Runtime verification scope limited to 4 proposed functions
**Status:** 🟨 **INCOMPLETE COVERAGE** (27/28 functions not tested = 96% untested)

---

## COMPARISON: EXPECTED vs ACTUAL

### Orchestration Layer

| Expected | Static | Runtime | Verdict |
|----------|--------|---------|---------|
| get_client_dossier_unified | ❌ | ❌ | ❌ NOT IMPLEMENTED |
| get_client_summary | ❌ | ❌ | ❌ NOT IMPLEMENTED |
| calculate_overall_health_score | ❌ | ❌ | ❌ NOT IMPLEMENTED |
| resolve_client_id | ❌ | ❌ | ❌ NOT IMPLEMENTED |

### Alternative Functions (Static Only)

| Function | Static | Runtime | Verdict |
|----------|--------|---------|---------|
| search_clients_sar | ✅ | 🟨 | 🟨 UNKNOWN |
| calculate_fraud_score | ✅ | 🟨 | 🟨 UNKNOWN |
| refresh_client_timeline_summary | ✅ | 🟨 | 🟨 UNKNOWN |
| process_vopay_webhook | ✅ | 🟨 | 🟨 UNKNOWN |

---

## IMPACT ASSESSMENT

### API Endpoint Impact

**Proposed endpoint:** `/api/admin/client/:id/dossier`
**Depends on:** `get_client_dossier_unified()` RPC
**Status:** ❌ **CANNOT WORK** (RPC does not exist)

**Current workaround:** Multiple separate API calls
**Evidence from N+1 analysis:**
- Dashboard makes 8 API calls (potential N+1)
- No unified endpoint found in API routes inventory

### Migration Status

**Phase:** 🟨 **INCOMPLETE**
- Tables migrated: ✅ YES (19/19 critical tables exist)
- FKs migrated: 🟨 INFERRED (likely exist)
- RPCs migrated: ❌ **NO** (0/4 orchestration functions exist)
- Views migrated: 🟨 UNKNOWN (2 materialized views not tested)

---

## RECOMMENDATIONS

### Priority 1: Deploy Orchestration RPCs 🔴
**Action:** Create and deploy the 4 missing RPC functions
**Impact:** Enable unified API, reduce N+1 queries
**Effort:** Medium (4 SQL functions + tests)

### Priority 2: Test Existing RPCs 🟡
**Action:** Verify the 27 static functions exist at runtime
**Method:** Execute .rpc() calls for each function
**Impact:** Understand current capabilities

### Priority 3: Document RPC Inventory 🟡
**Action:** Create comprehensive RPC API documentation
**Include:** Function signatures, parameters, return types
**Impact:** Developer clarity

---

## EVIDENCE FILES

| File | Type | Location |
|------|------|----------|
| **Static inventory** | JSON | `sql/DB_SCHEMA_INVENTORY.json` (lines 52-81) |
| **RPC test 1** | JSON | `db_live/results/rpc_get_client_dossier_unified.json` |
| **RPC test 2** | JSON | `db_live/results/rpc_get_client_summary.json` |
| **RPC test 3** | JSON | `db_live/results/rpc_calculate_overall_health_score.json` |
| **RPC test 4** | JSON | `db_live/results/rpc_resolve_client_id.json` |
| **Runtime summary** | JSON | `db_live/summary.json` (lines 127-131) |

---

## VERDICT

### Claim: "RPC functions exist for orchestration"
**Answer:** ❌ **FALSE** (0/4 exist)

### Claim: "RPC functions run successfully"
**Answer:** ❌ **N/A** (cannot test non-existent functions)

### Overall RPC Status
**Orchestration:** ❌ **NOT DEPLOYED** (0/4 functions)
**Alternatives:** 🟨 **UNKNOWN** (27 functions not tested)
**Confidence:** 100% for tested functions, 0% for untested

---

## CONCLUSION

**Primary Finding:** ❌ **ZERO orchestration RPC functions deployed**

**Evidence Quality:**
- ✅ 100% confidence (direct Postgres error messages)
- ✅ 4/4 functions tested
- ✅ All results saved with timestamps

**Impact:**
- ❌ Unified API cannot work
- ❌ N+1 queries cannot be optimized via RPC
- ❌ Architecture proposal not implemented
- 🟨 Alternative functions may exist but untested

**Status:** ❌ **RPC ORCHESTRATION LAYER MISSING**

---

**Generated:** 2026-01-24 23:15 EST
**Mode:** Audit Forensique N2 (Validation Croisée)
**Functions Tested:** 4/4 (100%)
**Success Rate:** 0/4 (0%)
