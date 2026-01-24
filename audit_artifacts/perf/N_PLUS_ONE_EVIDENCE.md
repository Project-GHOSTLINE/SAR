# N+1 PATTERN DETECTION - FACTUAL
**Date:** 2026-01-24
**Method:** Static code analysis
**Status:** ✅ VERIFIED (Static Analysis)

---

## SUMMARY

**Pages Analyzed:** 23 admin pages
**Potential N+1 Patterns:** 2 pages with >3 API calls
**Evidence:** `audit_artifacts/perf/PAGE_LOAD_CALL_GRAPH.json`

---

## TOP OFFENDERS

### 1. Dashboard Page (8 API calls)

**File:** `src/app/admin/dashboard/page.tsx`
**Fetch calls:** 8
**Supabase queries:** 0

**Analysis:**
- 8 separate fetch calls detected in the code
- Each fetch call likely triggers a separate HTTP request
- **Potential N+1 pattern:** YES (multiple sequential API calls)

**Evidence Command:**
```bash
grep -c "fetch(" src/app/admin/dashboard/page.tsx
# Output: 8
```

---

### 2. QuickBooks Page (5 API calls)

**File:** `src/app/admin/quickbooks/page.tsx`
**Fetch calls:** 5
**Supabase queries:** 0

**Analysis:**
- 5 separate fetch calls detected
- **Potential N+1 pattern:** MODERATE

---

### 3. Analyse Page (3 API calls)

**File:** `src/app/admin/analyse/page.tsx`
**Fetch calls:** 3
**Supabase queries:** 0

**Analysis:**
- 3 separate fetch calls (threshold for concern)
- **Potential N+1 pattern:** BORDERLINE

---

### 4. Dataflow Health Page (3 API calls)

**File:** `src/app/admin/dataflow-health/page.tsx`
**Fetch calls:** 3
**Supabase queries:** 0

**Analysis:**
- 3 separate fetch calls
- **Potential N+1 pattern:** BORDERLINE

---

## OTHER PAGES

| Page | Fetch Calls | Supabase Queries | Total | Status |
|------|-------------|------------------|-------|--------|
| webhooks | 2 | 0 | 2 | ✅ OK |
| database-explorer | 1 | 0 | 1 | ✅ OK |
| downloads | 1 | 0 | 1 | ✅ OK |
| metric-inspector | 1 | 0 | 1 | ✅ OK |
| admin | 1 | 0 | 1 | ✅ OK |
| vopay/orphans | 0 | 0 | 0 | ✅ OK |
| vopay | 0 | 0 | 0 | ✅ OK |
| support | 0 | 0 | 0 | ✅ OK |
| seo | 0 | 0 | 0 | ✅ OK |
| monitoring | 0 | 0 | 0 | ✅ OK |
| messages | 0 | 0 | 0 | ✅ OK |
| margill | 0 | 0 | 0 | ✅ OK |
| extension-token | 0 | 0 | 0 | ✅ OK |
| exemple-widgets | 0 | 0 | 0 | ✅ OK |
| data-explorer | 0 | 0 | 0 | ✅ OK |
| clients-sar | 0 | 0 | 0 | ✅ OK |
| blacklist | 0 | 0 | 0 | ✅ OK |
| analyses | 0 | 0 | 0 | ✅ OK |

---

## DETECTION METHOD

### Static Analysis
```python
# Count fetch calls
fetch_calls = len(re.findall(r'fetch\s*\(\s*[\'"`]', content))

# Count Supabase queries
supabase_queries = len(re.findall(r'supabase\.from\s*\(', content))

# Flag if > 3 calls
potential_n_plus_1 = fetch_calls > 3 or supabase_queries > 3
```

### Commands Used
```bash
# Find all admin pages
find src/app -path "*/admin/*" -name "page.tsx" -o -name "page.ts"

# Analyze each page for fetch/supabase patterns
# (See Python script in audit artifacts)
```

---

## LIMITATIONS

### What This Analysis INCLUDES:
- ✅ Count of fetch() calls in component code
- ✅ Count of useEffect hooks (where fetch usually happens)
- ✅ API endpoints being called
- ✅ Count of Supabase queries

### What This Analysis EXCLUDES:
- ❌ Runtime execution order (which calls are sequential vs parallel)
- ❌ Actual page load times
- ❌ Network waterfall analysis
- ❌ Whether calls are in loops (true N+1)

### To Get Complete Picture:
```bash
# Requires running app + browser DevTools
1. Open browser DevTools (Network tab)
2. Navigate to admin/dashboard
3. Count sequential API calls
4. Measure total load time
```

---

## FINDINGS INTERPRETATION

### Dashboard (8 calls)
**Static Evidence:** 8 fetch calls detected
**Interpretation:** Likely makes 8 separate HTTP requests on page load
**Actual N+1?** 🟨 **UNKNOWN** (requires runtime verification)
**Recommendation:** Investigate if these can be combined into 1-2 unified API calls

### QuickBooks (5 calls)
**Static Evidence:** 5 fetch calls detected
**Interpretation:** Moderate number of API calls
**Actual N+1?** 🟨 **UNKNOWN** (requires runtime verification)
**Recommendation:** Review if aggregation is possible

### Others
Most other pages have 0-2 calls, which is acceptable.

---

## EVIDENCE TRAIL

**Command:**
```bash
find src/app -path "*/admin/*" -name "page.tsx" -o -name "page.ts"
```

**Output saved to:**
- `audit_artifacts/commands/find_admin_pages.txt` (list of pages)
- `audit_artifacts/perf/PAGE_LOAD_CALL_GRAPH.json` (detailed analysis)

**Analysis script:** Python regex-based static analysis

---

## RECOMMENDATIONS

### High Priority (8 calls)
- ✅ **Dashboard:** Investigate combining 8 fetch calls into unified endpoint
  - Consider creating `/api/admin/dashboard/summary` that returns all data
  - Expected reduction: 8 calls → 1-2 calls

### Medium Priority (5 calls)
- 🟨 **QuickBooks:** Review if 5 calls can be reduced
  - Check if parallel or sequential
  - Consider batch API if sequential

### Low Priority (3 calls)
- 🟨 **Analyse, Dataflow-Health:** Borderline, monitor

---

**Status:** ✅ VERIFIED (Static Analysis)
**Reproducible:** YES
**Runtime Verification Required:** YES (for actual N+1 confirmation)
