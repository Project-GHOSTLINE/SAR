# Performance Testing Scripts - PHASE 2

Scripts for testing and analyzing API performance.

## Scripts

### smoke.sh

Smoke test for 5 critical endpoints. Verifies instrumentation is working.

**Usage:**
```bash
./scripts/perf/smoke.sh
./scripts/perf/smoke.sh http://localhost:3001  # Custom base URL
```

**What it tests:**
1. `/api/admin/messages` (GET) - Messages inbox
2. `/api/admin/analytics/dashboard` (GET) - Analytics dashboard
3. `/api/admin/client-analysis` (POST) - Client analysis
4. `/api/applications/submit` (POST) - Application submission
5. `/api/webhooks/vopay` (POST) - VoPay webhook

**Requirements:**
- Dev server running (`npm run dev`)
- `jq` installed (`brew install jq`)

**Output:**
- Console: Test results with timing
- File: `logs/perf.ndjson` with detailed metrics

### analyze.sh

Analyzes performance logs and generates summary report.

**Usage:**
```bash
./scripts/perf/analyze.sh
```

**What it shows:**
- Per-route statistics (p50, p95, p99)
- Average DB calls per route
- Average payload size per route
- Top 10 slowest requests

**Requirements:**
- `jq` installed (`brew install jq`)
- `logs/perf.ndjson` exists

## Workflow

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Run smoke test:**
   ```bash
   ./scripts/perf/smoke.sh
   ```

3. **Analyze results:**
   ```bash
   ./scripts/perf/analyze.sh
   ```

4. **View raw logs:**
   ```bash
   tail -f logs/perf.ndjson | jq '.'
   ```

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| p95 latency | < 200ms | ✅ Pass / ⚠️ Warning / ❌ Fail |
| p99 latency | < 400ms | ✅ Pass / ⚠️ Warning / ❌ Fail |
| Payload size | < 150KB typical | - |
| DB calls | Minimize | - |

## Next Steps (PHASE 3)

After running smoke tests and confirming instrumentation works:

1. Identify slow endpoints (p95 > 200ms)
2. Analyze DB call patterns (N+1, waterfalls)
3. Apply optimizations:
   - Use RPC functions for multi-table queries
   - Add keyset pagination for large datasets
   - Reduce SELECT * overfetch
   - Cache dashboard KPIs

See PERF-BASELINE.md for detailed analysis.
