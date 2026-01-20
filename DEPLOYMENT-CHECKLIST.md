# SAR Performance Optimization - Deployment Checklist

**Date:** 2026-01-19
**Version:** 1.0 - Post PHASE 3 Optimizations

---

## Pre-Deployment Verification

### ✅ Local Testing

- [ ] Run `npm install` to ensure dependencies are installed
- [ ] Run `npm run dev` and verify app starts without errors
- [ ] Execute `./scripts/perf/smoke.sh` - all tests pass
- [ ] Check `logs/perf.ndjson` contains performance logs
- [ ] Run `./scripts/perf/analyze.sh` - verify p95 < 200ms on optimized routes

### ✅ Code Review

- [ ] Review changes in `src/lib/perf.ts` (instrumentation)
- [ ] Review changes in `src/lib/cache.ts` (caching)
- [ ] Review changes in `src/lib/supabase-server.ts` (singleton + tracking)
- [ ] Review changes in `src/app/api/admin/messages/route.ts` (RPC)
- [ ] Review changes in `src/app/api/webhooks/vopay/route.ts` (RPC)
- [ ] Review changes in `src/app/api/admin/analytics/dashboard/route.ts` (cache)

### ✅ Migration Files Ready

- [ ] `supabase/migrations/20260118000000_performance_indexes.sql` exists
- [ ] `supabase/migrations/20260118000001_rpc_functions.sql` exists
- [ ] `supabase/migrations/20260118000002_materialized_views.sql` exists

---

## Database Deployment

### Step 1: Backup Database (CRITICAL)

```bash
# Supabase CLI backup
supabase db dump -f backup_pre_perf_opt_$(date +%Y%m%d_%H%M%S).sql

# Or via Supabase Dashboard:
# Settings → Database → Backups → Create Backup
```

- [ ] Database backup created and verified
- [ ] Backup file size is reasonable (non-empty)
- [ ] Backup stored in safe location

### Step 2: Apply Migrations (Production)

**Option A: Supabase CLI (Recommended)**

```bash
# Connect to production project
supabase link --project-ref YOUR_PROJECT_REF

# Check migration status
supabase migration list

# Apply pending migrations
supabase db push
```

**Option B: Supabase Dashboard**

1. Go to SQL Editor
2. Open `20260118000000_performance_indexes.sql`
3. Execute (takes 1-5 minutes with CONCURRENTLY)
4. Verify: `SELECT '✅ Performance indexes created successfully' as status`
5. Repeat for `20260118000001_rpc_functions.sql`
6. Repeat for `20260118000002_materialized_views.sql`

- [ ] Migration 1 (indexes) applied successfully
- [ ] Migration 2 (RPC functions) applied successfully
- [ ] Migration 3 (materialized views) applied successfully

### Step 3: Verify Migrations

```sql
-- Verify indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- Expected: 20+ indexes

-- Verify RPC functions exist
SELECT proname
FROM pg_proc
WHERE proname IN (
  'get_messages_with_details',
  'get_message_emails_and_notes',
  'process_vopay_webhook'
);

-- Expected: 3 rows

-- Verify materialized views exist
SELECT matviewname FROM pg_matviews;

-- Expected: 1+ rows (dashboard_kpis, etc.)
```

- [ ] All indexes created (20+ indexes)
- [ ] All RPC functions exist (3 functions)
- [ ] Materialized views created (if applicable)

---

## Application Deployment

### Step 4: Deploy Code (Vercel/Production)

**Via Git Push (if Vercel connected to GitHub):**

```bash
git add .
git commit -m "perf: Phase 3 optimizations (RPC, cache, instrumentation)"
git push origin main
```

**Via Vercel CLI:**

```bash
vercel --prod
```

- [ ] Code deployed to production
- [ ] Deployment successful (no build errors)
- [ ] Deployment URL accessible

### Step 5: Environment Variables

Verify these environment variables are set in production:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret!)
- [ ] `JWT_SECRET` - Admin session JWT secret
- [ ] `VOPAY_SHARED_SECRET` - VoPay webhook signature validation

**Vercel Dashboard:**
1. Project Settings → Environment Variables
2. Verify all variables are set
3. Redeploy if any variables were added

---

## Post-Deployment Verification

### Step 6: Smoke Test Production

**Test Critical Endpoints:**

```bash
# Set base URL
export BASE_URL="https://api.solutionargentrapide.ca"
export ADMIN_TOKEN="your-admin-session-token"

# Test 1: Messages endpoint
curl "$BASE_URL/api/admin/messages" \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\nTime: %{time_total}s\n"

# Expected: < 0.2s, 200 OK

# Test 2: Dashboard
curl "$BASE_URL/api/admin/analytics/dashboard?period=7d" \
  -H "Cookie: admin-session=$ADMIN_TOKEN" \
  -w "\nTime: %{time_total}s\n"

# Expected: < 0.5s first call, < 0.1s second call (cached)

# Test 3: VoPay webhook health
curl "$BASE_URL/api/webhooks/vopay"

# Expected: { "status": "online", ... }
```

- [ ] Messages endpoint responds < 200ms
- [ ] Dashboard endpoint responds (cache works)
- [ ] VoPay webhook is accessible

### Step 7: Monitor Performance

**Check Production Logs:**

```bash
# Vercel logs
vercel logs --follow

# Look for:
# [PERF] admin/messages | 150ms | 1 DB calls ...
# [CACHE] HIT: dashboard:7d ...
```

- [ ] Performance logs appear in production
- [ ] Latencies meet targets (p95 < 200ms)
- [ ] Cache hits logged for dashboard
- [ ] No critical errors

### Step 8: Verify Database Performance

```sql
-- Check RPC function execution times
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%get_messages_with_details%'
   OR query LIKE '%process_vopay_webhook%'
ORDER BY mean_exec_time DESC;

-- Expected: mean_exec_time < 100ms
```

- [ ] RPC functions execute in < 100ms
- [ ] No slow queries logged (> 1000ms)
- [ ] Database CPU/memory within normal range

---

## Monitoring & Alerts

### Step 9: Set Up Alerts

**Supabase Dashboard:**
- [ ] Enable slow query logging (Settings → Database → Logs)
- [ ] Set alert for CPU > 80%
- [ ] Set alert for connection pool > 90%

**Vercel:**
- [ ] Enable Edge Caching (if applicable)
- [ ] Monitor function execution time
- [ ] Set alert for error rate > 1%

**Custom Monitoring:**
- [ ] Create dashboard for `logs/perf.ndjson` analysis
- [ ] Set up alert for p95 > 200ms
- [ ] Monitor cache hit rate (target > 80%)

---

## Rollback Plan (If Issues Arise)

### Emergency Rollback

**Option 1: Revert Code Deploy**

```bash
# Vercel: Rollback to previous deployment
vercel rollback
```

**Option 2: Revert Database Migrations**

```sql
-- Drop indexes (safe - doesn't affect data)
DROP INDEX CONCURRENTLY IF EXISTS idx_contact_messages_created_at;
-- ... (repeat for all indexes)

-- Drop RPC functions
DROP FUNCTION IF EXISTS get_messages_with_details;
DROP FUNCTION IF EXISTS get_message_emails_and_notes;
DROP FUNCTION IF EXISTS process_vopay_webhook;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS dashboard_kpis;
```

**Option 3: Restore Database Backup**

```bash
# Via Supabase Dashboard:
# Settings → Database → Backups → Restore
```

- [ ] Rollback tested in staging (if applicable)
- [ ] Rollback plan documented and accessible
- [ ] Team aware of rollback procedure

---

## Success Criteria

### Performance Targets Met

- [ ] Messages endpoint: p95 < 200ms, p99 < 400ms
- [ ] VoPay webhook: p95 < 100ms, p99 < 200ms
- [ ] Dashboard: p95 < 200ms (initial), < 50ms (cached)
- [ ] Overall API: 95% of requests < 200ms

### Business Metrics

- [ ] No increase in error rates
- [ ] Admin inbox loads faster (user feedback)
- [ ] Webhook processing reliable (no timeouts)
- [ ] Dashboard KPIs load instantly on subsequent requests

### Technical Metrics

- [ ] Database queries reduced by 70-90%
- [ ] External API calls (GA) reduced by 95%
- [ ] Cache hit rate > 80% for dashboard
- [ ] No N+1 queries on critical endpoints

---

## Post-Deployment Tasks

### Week 1: Monitor Closely

- [ ] Daily review of performance logs
- [ ] Track cache hit rates
- [ ] Monitor for any regressions
- [ ] Gather user feedback on performance

### Week 2-4: Optimize Further

- [ ] Identify remaining slow endpoints
- [ ] Apply RPC/cache patterns to other routes
- [ ] Consider Redis for distributed caching (if needed)
- [ ] Implement keyset pagination on large tables

### Documentation

- [ ] Update team wiki with new architecture
- [ ] Document RPC function usage patterns
- [ ] Share cache invalidation procedures
- [ ] Create runbook for performance issues

---

## Contact & Support

**Questions:**
- Review `PHASE-2-COMPLETE.md` for instrumentation details
- Review `PHASE-3-COMPLETE.md` for optimization details
- Check `scripts/perf/README.md` for testing procedures

**Critical Issues:**
- Revert deployment immediately
- Check `logs/perf.ndjson` for error patterns
- Review Supabase logs for database errors
- Contact DevOps/Database admin if needed

---

## Checklist Summary

**Pre-Deploy:** 15 items
**Database:** 7 items
**Application:** 5 items
**Verification:** 8 items
**Monitoring:** 3 items

**Total:** 38 checklist items

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Verified By:** _____________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
