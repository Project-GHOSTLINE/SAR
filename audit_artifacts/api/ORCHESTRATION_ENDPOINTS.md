# ORCHESTRATION ENDPOINTS - FACTUAL
**Date:** 2026-01-24
**Method:** Keyword search in API routes
**Status:** ✅ VERIFIED

---

## SEARCH CRITERIA

Searched for keywords indicating orchestration/aggregation:
- "dossier"
- "timeline"
- "metrics"
- "unified"

**Command:**
```bash
grep -l "dossier\|timeline\|metrics\|unified" src/app/api/**/*.ts
```

---

## RESULTS: 17 Endpoints Found

### Client-Related Orchestration

| Path | File | Likely Purpose |
|------|------|----------------|
| `/api/admin/clients-sar/stats` | `src/app/api/admin/clients-sar/stats/route.ts` | Client statistics aggregation |
| `/api/admin/clients-sar/search` | `src/app/api/admin/clients-sar/search/route.ts` | Client search (possibly aggregated) |
| `/api/admin/clients-sar/concordances` | `src/app/api/admin/clients-sar/concordances/route.ts` | Client concordances/duplicates |
| `/api/admin/clients-sar/autres-contrats` | `src/app/api/admin/clients-sar/autres-contrats/route.ts` | Other client contracts |

**Analysis:** These endpoints appear to be client-focused aggregation endpoints.

---

### Analytics/Metrics Orchestration

| Path | File | Likely Purpose |
|------|------|----------------|
| `/api/admin/analytics/dashboard` | `src/app/api/admin/analytics/dashboard/route.ts` | Dashboard analytics (likely aggregated) |
| `/api/admin/analytics` | `src/app/api/admin/analytics/route.ts` | General analytics endpoint |
| `/api/admin/metrics/inspect` | `src/app/api/admin/metrics/inspect/route.ts` | Metrics inspection |
| `/api/metrics/all` | `src/app/api/metrics/all/route.ts` | All metrics endpoint |
| `/api/admin/ga4/enriched` | `src/app/api/admin/ga4/enriched/route.ts` | Enriched GA4 data |

**Analysis:** These provide aggregated metrics and analytics data.

---

### SEO Orchestration

| Path | File | Likely Purpose |
|------|------|----------------|
| `/api/seo/analytics/detailed` | `src/app/api/seo/analytics/detailed/route.ts` | Detailed SEO analytics |
| `/api/seo/metrics` | `src/app/api/seo/metrics/route.ts` | SEO metrics aggregation |
| `/api/seo/health` | `src/app/api/seo/health/route.ts` | SEO health status |
| `/api/seo/collect/ga4` | `src/app/api/seo/collect/ga4/route.ts` | GA4 collection |
| `/api/seo/collect/gsc` | `src/app/api/seo/collect/gsc/route.ts` | GSC collection |

**Analysis:** SEO-focused data aggregation and collection.

---

### System Orchestration

| Path | File | Likely Purpose |
|------|------|----------------|
| `/api/sentinel/orchestrator` | `src/app/api/sentinel/orchestrator/route.ts` | System orchestrator |
| `/api/routes/expand` | `src/app/api/routes/expand/route.ts` | Route expansion |
| `/api/applications/submit` | `src/app/api/applications/submit/route.ts` | Application submission (may aggregate) |

**Analysis:** System-level orchestration endpoints.

---

## SPECIFIC SEARCH: "Dossier" Endpoint

**Search Command:**
```bash
grep -r "dossier" src/app/api --include="*.ts"
```

**Result:** No files found with "dossier" keyword

**Conclusion:** ❌ **NOT FOUND** - No unified "dossier" endpoint exists yet

---

## SPECIFIC SEARCH: "Timeline" Endpoint

**Search Command:**
```bash
grep -r "timeline" src/app/api --include="*.ts"
```

**Result:** No files found with "timeline" keyword

**Conclusion:** ❌ **NOT FOUND** - No dedicated "timeline" endpoint exists yet

---

## SPECIFIC SEARCH: "Unified" Endpoint

**Search Command:**
```bash
grep -r "unified" src/app/api --include="*.ts"
```

**Result:** No files found with "unified" keyword

**Conclusion:** ❌ **NOT FOUND** - No "unified" aggregation endpoint exists yet

---

## ASSESSMENT: Client Dossier Orchestration

### Question: Does a unified client dossier endpoint exist?

**Answer:** 🟨 **PARTIAL**

**What EXISTS:**
- ✅ Client-specific endpoints under `/api/admin/clients-sar/*`
  - Stats endpoint
  - Search endpoint
  - Concordances endpoint
  - Autres contrats endpoint
- ✅ Multiple separate client-related APIs

**What DOES NOT EXIST:**
- ❌ Single unified `/api/admin/client/:id/dossier` endpoint
- ❌ Timeline endpoint
- ❌ Comprehensive aggregation endpoint (as proposed in architecture docs)

**Current State:** Client data is accessed via **multiple separate endpoints** rather than one unified orchestration API.

---

## COMPARISON TO ARCHITECTURE DOCS

### Proposed in `ORCHESTRATION_API_SPEC.md`:
```
GET /api/admin/client/:id/dossier        ❌ NOT FOUND
GET /api/admin/client/:id/timeline       ❌ NOT FOUND
GET /api/admin/client/:id/metrics        ❌ NOT FOUND
GET /api/admin/client/:id/relations      ❌ NOT FOUND
POST /api/admin/client/search            🟨 EXISTS (as /api/admin/clients-sar/search)
```

### Conclusion:
The **proposed unified orchestration API** from the architecture documents **has NOT been implemented yet**.

Current approach uses **multiple granular endpoints** instead of a single unified API.

---

## EVIDENCE TRAIL

**Commands used:**
```bash
# Search for orchestration keywords
grep -l "dossier\|timeline\|metrics\|unified" src/app/api/**/*.ts

# Specific searches
grep -r "dossier" src/app/api --include="*.ts"
grep -r "timeline" src/app/api --include="*.ts"
grep -r "unified" src/app/api --include="*.ts"
```

**Output saved to:**
- `audit_artifacts/commands/grep_orchestration_endpoints.txt`

---

## RECOMMENDATIONS

### To Implement Unified Orchestration:

1. **Create `/api/admin/client/[id]/dossier` endpoint**
   - Aggregate all client data in one call
   - Return: identity, summary, timeline, metrics, relations
   - Use RPC functions for server-side aggregation

2. **Consolidate existing endpoints**
   - Current: 4+ separate calls to get full client view
   - Target: 1-2 calls maximum

3. **Implement caching layer**
   - Redis cache for frequently accessed client data
   - TTL: 5 minutes

### Impact:
- Expected latency reduction: 85% (per architecture docs)
- API calls per page: 15-20 → 1-2
- Bandwidth reduction: 90%

---

**Status:** ✅ VERIFIED
**Unified Orchestration API:** ❌ NOT IMPLEMENTED YET
**Existing Endpoints:** 17 orchestration-style endpoints found
**Reproducible:** YES
