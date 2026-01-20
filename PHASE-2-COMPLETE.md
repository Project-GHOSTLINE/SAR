# PHASE 2 - INSTRUMENTATION ✅ COMPLETE

**Date:** 2026-01-19
**Status:** PHASE 2 Complete - Instrumentation Ready

---

## What Was Done

### 1. Performance Tracking Infrastructure

**Created `src/lib/perf.ts`** - Core instrumentation module
- `withPerf()` wrapper for API routes
- AsyncLocalStorage-based request context tracking
- Automatic metrics collection:
  - `ms_total` - Total request duration
  - `status` - HTTP status code
  - `bytes_out` - Response payload size
  - `db_calls` - Number of database queries
  - `db_ms_total` - Total database time
  - `request_id` - Unique request identifier
- Logs to `logs/perf.ndjson` (newline-delimited JSON)
- Color-coded console output (dev mode)
- Built-in log analysis function `analyzePerfLogs()`

### 2. Database Call Tracking

**Enhanced `src/lib/supabase-server.ts`**
- Added `trackDbCall()` integration in fetch wrapper
- Singleton pattern already in place (✅ from previous work)
- Automatic slow query logging (> 100ms warning, > 1000ms error)
- Database calls now counted and timed per request

### 3. Logging System

**Created `logs/` directory**
- `.gitignore` - Excludes log files from git
- `README.md` - Log format documentation
- Auto-creates `perf.ndjson` on first request

**Log Format:**
```json
{
  "route": "admin/messages",
  "requestId": "req_1234567890_abc123",
  "msTotal": 150,
  "status": 200,
  "bytesOut": 25600,
  "dbCalls": 3,
  "dbMsTotal": 85,
  "timestamp": "2026-01-19T12:00:00.000Z"
}
```

### 4. Testing Scripts

**Created `scripts/perf/smoke.sh`** ✅
- Tests 5 critical endpoints (HOTPATHS 1-5)
- Measures response time
- Verifies instrumentation works
- Color-coded pass/fail output
- Shows sample log entry

**Created `scripts/perf/analyze.sh`** ✅
- Parses `logs/perf.ndjson`
- Calculates p50, p95, p99 per route
- Shows average DB calls and payload size
- Lists top 10 slowest requests
- Performance status indicators (✅ ⚠️ ❌)

**Created `scripts/perf/README.md`** ✅
- Complete usage documentation
- Workflow instructions
- Performance targets reference

### 5. Example Integration

**Instrumented `/api/admin/messages`** ✅
- Refactored to use `getSupabaseServer()` singleton
- Wrapped GET, POST, PATCH handlers with `withPerf()`
- Now tracking all metrics automatically

**Before:**
```typescript
export async function GET(request: NextRequest) {
  const supabase = getSupabase()  // Creates new client each time
  // ... handler logic
}
```

**After:**
```typescript
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

async function handleGET(request: NextRequest) {
  const supabase = getSupabaseServer()  // Reuses singleton
  // ... handler logic
}

export const GET = withPerf('admin/messages', handleGET)
```

---

## Files Created/Modified

### Created
- ✅ `src/lib/perf.ts` (335 lines)
- ✅ `logs/.gitignore`
- ✅ `logs/README.md`
- ✅ `scripts/perf/smoke.sh` (executable)
- ✅ `scripts/perf/analyze.sh` (executable)
- ✅ `scripts/perf/README.md`
- ✅ `PHASE-2-COMPLETE.md` (this file)

### Modified
- ✅ `src/lib/supabase-server.ts` - Added `trackDbCall()` integration
- ✅ `src/app/api/admin/messages/route.ts` - Added `withPerf()` wrapper

---

## How to Use

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Run Smoke Test
```bash
./scripts/perf/smoke.sh
```

Expected output:
```
========================================
  SAR PERFORMANCE SMOKE TEST - PHASE 2
========================================

[1] Testing: GET /api/admin/messages
✓ PASS - 150ms (status=200)

[2] Testing: GET /api/admin/analytics/dashboard
✓ PASS - 300ms (status=200)

...

✓ Performance logs created: 5 entries in logs/perf.ndjson
```

### 3. Analyze Results
```bash
./scripts/perf/analyze.sh
```

Expected output:
```
========================================
  PERFORMANCE ANALYSIS
========================================

admin/messages (10 requests)
  p50: 120ms | p95: 180ms ✅ | p99: 220ms ⚠️
  DB calls: 2.5 avg | Payload: 45.3KB avg
```

### 4. View Live Logs
```bash
tail -f logs/perf.ndjson | jq '.'
```

---

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| p95 latency | < 200ms | `analyze.sh` shows ✅ green |
| p99 latency | < 400ms | `analyze.sh` shows ✅ green |
| DB calls | Minimize | Check `dbCalls` in logs |
| Payload | < 150KB typical | Check `bytesOut` in logs |

---

## Next Steps - PHASE 3

Now that instrumentation is in place, we can:

1. **Measure Real Performance**
   - Run smoke tests against actual data
   - Identify slow endpoints (p95 > 200ms)
   - Analyze DB call patterns

2. **Apply Optimizations**
   - **HOTPATH 1 - Messages**: Fix N+1 queries, use RPC
   - **HOTPATH 5 - VoPay**: Fix waterfall, use RPC
   - **HOTPATH 2 - Dashboard**: Add KPI caching
   - Apply to other routes as needed

3. **Verify Improvements**
   - Re-run smoke tests
   - Compare before/after metrics
   - Document in SAR-PERF-REPORT.md

---

## Technical Notes

### AsyncLocalStorage Context

The `withPerf()` wrapper uses Node.js AsyncLocalStorage to propagate request context through the entire request lifecycle. This allows `trackDbCall()` in `supabase-server.ts` to automatically associate DB calls with the current request.

**Flow:**
```
Request arrives
  → withPerf() creates context
    → Handler runs within context
      → DB calls tracked via supabase-server.ts
      → trackDbCall() increments context counters
    → Handler returns response
  → withPerf() logs final metrics
```

### Why NDJSON?

Newline-Delimited JSON (NDJSON) format allows:
- Streaming logs without loading entire file
- Easy append-only writes
- Simple parsing with `jq` or line-by-line processing
- No memory issues with large log files

### Integration Pattern

All API routes should follow this pattern:

```typescript
import { getSupabaseServer } from '@/lib/supabase-server'
import { withPerf } from '@/lib/perf'

async function handleGET(request: NextRequest) {
  // Your handler logic
  const supabase = getSupabaseServer()
  // ...
}

export const GET = withPerf('route-name', handleGET)
```

---

**Status:** PHASE 2 ✅ COMPLETE
**Ready for:** PHASE 3 - DB Optimization
**Next:** Measure baseline, then optimize HOTPATHS 1, 2, 5
