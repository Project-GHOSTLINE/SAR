# 08 - Gaps & Fixes

**Projet**: SAR - Solution Argent Rapide
**Date**: 2026-02-03

---

## 🚨 Blockers Critiques (P0)

### 1. ❌ **Pas de Database Staging**
**Impact**: Tests E2E modifient production
**Risque**: Corruption data, faux positifs, instabilité

**Symptômes**:
- Preview deployments utilisent PROD DB
- Tests E2E insèrent data dans PROD
- Impossible de seed data tests

**Fix**:
```bash
# 1. Créer projet Supabase staging
# → supabase.com → New Project → sar-staging

# 2. Récupérer credentials
STAGING_URL=https://[project-id].supabase.co
STAGING_ANON=eyJxxx...
STAGING_SERVICE=eyJxxx...

# 3. Pull schema production
supabase link --project-ref dllyzfuqjzuhvshrlmuq
supabase db pull

# 4. Apply migrations to staging
supabase db push --db-url postgresql://postgres:[PASS]@[staging-id].supabase.co:5432/postgres

# 5. Seed staging data
psql [STAGING_URL] < seed-staging.sql

# 6. Configure Vercel Preview env vars
# → Point to staging DB
```

**Temps estimé**: 1-2h
**Priorité**: 🔴 P0 - BLOQUANT

---

### 2. ❌ **Migrations Non Versionnées**
**Impact**: Impossible recréer DB, drift schema
**Risque**: Staging != Prod, rollback impossible

**Symptômes**:
- Folder `supabase/migrations/` vide
- Changements DB via Supabase UI direct
- Pas de version control

**Fix**:
```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Pull current schema
supabase login
supabase link --project-ref dllyzfuqjzuhvshrlmuq
supabase db pull

# Result: Creates migration file
# supabase/migrations/20260203000000_initial_schema.sql

# 3. Commit to git
git add supabase/migrations/
git commit -m "chore: add initial schema migration"

# 4. Test migration locally
supabase db reset  # Recreate from migrations

# 5. Document workflow
echo "# Migration Workflow
1. Make schema change in Supabase UI
2. Pull: supabase db pull
3. Commit migration file
4. Test: supabase db reset
5. Deploy: Auto-applied via Supabase
" > docs/MIGRATIONS.md
```

**Temps estimé**: 30-60 min
**Priorité**: 🔴 P0 - BLOQUANT

---

### 3. ⚠️ **Service Role Everywhere**
**Impact**: Bypass RLS partout, risque sécurité
**Risque**: Exposition accidentelle, pas de testing RLS

**Symptômes**:
- 80+ routes utilisent `SUPABASE_SERVICE_ROLE_KEY`
- RLS probablement désactivé
- Impossible tester policies

**Fix (partiel - ne casse pas prod)**:
```typescript
// 1. Créer wrapper avec RLS check (optional)
// src/lib/supabase-safe.ts

export function getSupabaseSafe(useServiceRole = false) {
  if (useServiceRole) {
    // Explicite opt-in
    return getSupabaseServer()
  }

  // Par défaut: anon key (RLS enabled)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 2. Migrer progressivement routes publiques
// Exemple: /api/telemetry/track-event
const supabase = getSupabaseSafe(false)  // RLS
```

**Temps estimé**: 2-3h (migration complète = jours)
**Priorité**: 🟡 P1 - Important (pas bloquant CI/CD)

---

### 4. ❌ **Pas de Health Check Endpoint**
**Impact**: Impossible vérifier deployment sanity
**Risque**: Deploy cassé non détecté

**Symptômes**:
- Pas de `/api/health`
- CI ne peut pas valider deployment
- Monitoring externe impossible

**Fix**:
```typescript
// src/app/api/health/route.ts

import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: await checkDatabase(),
      env: checkEnvVars(),
      vercel: 'ok',
    }
  }

  // 503 if any check fails
  const isHealthy = Object.values(checks.checks).every(c => c === 'ok')
  const status = isHealthy ? 200 : 503

  return NextResponse.json(checks, { status })
}

async function checkDatabase() {
  try {
    const supabase = getSupabaseServer()
    const { error } = await supabase
      .from('contact_messages')
      .select('id')
      .limit(1)

    return error ? 'degraded' : 'ok'
  } catch {
    return 'down'
  }
}

function checkEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
  ]

  const missing = required.filter(key => !process.env[key])
  return missing.length === 0 ? 'ok' : `missing: ${missing.join(', ')}`
}
```

**Temps estimé**: 15 min
**Priorité**: 🔴 P0 - BLOQUANT CI/CD

---

## ⚠️ Blockers Élevés (P1)

### 5. ⚠️ **Auth Non Testable E2E**
**Impact**: Setup auth fragile, storage state expire
**Risque**: Tests E2E cassent aléatoirement

**Symptômes**:
- `auth.setup.ts` login avec PROD password
- Storage state expire arbitrairement
- Multi-onglet re-login issue

**Fix**:
```typescript
// 1. Créer user admin staging dédié
// seed-staging.sql
INSERT INTO admin_users (id, email, password_hash) VALUES
  ('test-admin',
   'admin@test.sar',
   '$2b$10$...STAGING_HASH...');  -- Password: TestPassword123!

// 2. Fix auth.setup.ts
// e2e/specs/auth.setup.ts
test('authenticate as admin', async ({ page }) => {
  await page.goto('/admin')
  await page.fill('[data-testid="password-input"]',
                  process.env.STAGING_ADMIN_PASSWORD!)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/admin/dashboard')

  // Save auth state
  await page.context().storageState({
    path: './storage/state.json'
  })
})

// 3. Configure .env.test
STAGING_ADMIN_PASSWORD=TestPassword123!
BASE_URL=http://localhost:4000
```

**Temps estimé**: 30 min
**Priorité**: 🟡 P1 - Important

---

### 6. ⚠️ **Selectors CSS Fragiles**
**Impact**: Tests Playwright cassent à chaque refactor CSS
**Risque**: Faux négatifs, maintenance lourde

**Symptômes**:
- Tests utilisent CSS classes (`await page.click('.bg-blue-500')`)
- Refactor Tailwind = tests cassés
- Pas de `data-testid`

**Fix**:
```typescript
// 1. Ajouter data-testid aux composants critiques
// src/app/admin/page.tsx (Login)
<input
  type="password"
  data-testid="password-input"  // ← ADD THIS
  className="..."
/>
<button
  type="submit"
  data-testid="login-button"    // ← ADD THIS
  className="..."
>
  Login
</button>

// 2. Mettre à jour tests
// e2e/specs/auth.spec.ts (avant)
await page.fill('input[type="password"]', password)

// e2e/specs/auth.spec.ts (après)
await page.fill('[data-testid="password-input"]', password)

// 3. Liste complète dans 06_TEST_PLAN.md
// ~30 data-testid à ajouter
```

**Temps estimé**: 1-2h
**Priorité**: 🟡 P1 - Important

---

### 7. ⚠️ **Endpoints Non Stables (502/503)**
**Impact**: Tests E2E échouent aléatoirement
**Risque**: Faux négatifs, CI instable

**Symptômes**:
- Requêtes Supabase timeout (>1000ms)
- Cold start Next.js lent
- Preview déploiements inconsistants

**Fix**:
```typescript
// 1. Ajouter retry logic dans tests
// e2e/specs/helpers.ts
export async function fetchWithRetry(
  request: APIRequestContext,
  url: string,
  options = {},
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await request.get(url, options)
      if (response.ok()) return response

      // Retry on 5xx
      if (response.status() >= 500) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }

      return response
    } catch (err) {
      if (i === maxRetries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

// 2. Utiliser dans tests
const response = await fetchWithRetry(request, '/api/health')

// 3. Augmenter timeouts Playwright
// playwright.config.ts
export default defineConfig({
  timeout: 60_000,          // 60s per test
  expect: { timeout: 10_000 },  // 10s assertions
  use: {
    actionTimeout: 15_000,      // 15s actions
    navigationTimeout: 30_000,  // 30s navigation
  }
})
```

**Temps estimé**: 1h
**Priorité**: 🟡 P1 - Important

---

## 🟡 Blockers Moyens (P2)

### 8. 🟡 **Seed Data Minimal Manquant**
**Impact**: Tests E2E dépendent data production
**Risque**: Tests cassent si prod vide

**Fix**:
```sql
-- seed-staging.sql

-- Admin user
INSERT INTO admin_users (id, email, password_hash) VALUES
  ('test-admin', 'admin@test.sar', '[HASH]');

-- Messages fixtures (stable IDs)
INSERT INTO contact_messages (id, nom, email, telephone, question, status, created_at) VALUES
  (1001, 'Test Client 1', 'test1@example.com', '555-0001', 'Test question 1', 'nouveau', NOW()),
  (1002, 'Test Client 2', 'test2@example.com', '555-0002', 'Test question 2', 'en_cours', NOW()),
  (1003, 'Test Client 3', 'test3@example.com', '555-0003', 'Test question 3', 'termine', NOW());

-- VoPay transactions fixtures
INSERT INTO vopay_transactions (transaction_id, amount, status, created_at) VALUES
  ('TEST-TX-001', 100.00, 'completed', NOW()),
  ('TEST-TX-002', 200.00, 'pending', NOW()),
  ('TEST-TX-003', 50.00, 'failed', NOW());

-- QuickBooks mock data
INSERT INTO quickbooks_tokens (access_token, refresh_token, expires_at) VALUES
  ('mock-access-token', 'mock-refresh-token', NOW() + INTERVAL '1 hour');
```

**Temps estimé**: 30 min
**Priorité**: 🟢 P2 - Nice to have

---

### 9. 🟡 **Tests Coverage Bas (30%)**
**Impact**: Bugs non détectés, confiance basse
**Risque**: Régression non catchée

**Fix** (progressif):
```typescript
// Phase 1: Unit tests critiques (target: 50%)
// - src/lib/utils (all functions)
// - src/lib/supabase-server.ts
// - Business logic functions

// Phase 2: Integration tests (target: 60%)
// - API routes critiques
// - Auth flow
// - Database interactions

// Phase 3: E2E smoke tests (target: 70%)
// - User journeys complets
// - Happy paths
// - Error handling
```

**Temps estimé**: 3-5h (phase 1)
**Priorité**: 🟢 P2 - Amélioration continue

---

### 10. 🟡 **Multi-Onglet Re-Login**
**Impact**: UX friction, user frustration
**Risque**: Users complain, support tickets

**Hypothèses**:
- JWT expire pendant session active
- Cookie sameSite='lax' + subdomain issue
- Middleware delete cookie prématurément

**Fix (investigation required)**:
```typescript
// 1. Ajouter debug logging
// src/middleware.ts:260
console.log('[Auth Debug]', {
  cookie: request.cookies.get('admin-session'),
  hostname: request.headers.get('host'),
  pathname: request.nextUrl.pathname,
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString(),
})

// 2. Tester fix potentiel: Cookie domain wildcard
response.cookies.set('admin-session', jwt, {
  domain: '.solutionargentrapide.ca',  // ← Wildcard subdomain
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,
  path: '/'
})

// 3. Alternative: Refresh token mechanism
// Générer refresh token long-lived
// Auto-refresh access token court
```

**Temps estimé**: 2-3h investigation
**Priorité**: 🟢 P2 - Post-CI/CD

---

## 🎯 Action Plan Priorisé

### Phase 1: Blockers CI/CD (P0) - 3-4h
1. ✅ **Créer** `/api/health` endpoint (15 min)
2. ✅ **Créer** projet Supabase staging (1h)
3. ✅ **Pull** migrations production (30 min)
4. ✅ **Seed** staging data (30 min)
5. ✅ **Configurer** Vercel Preview env vars (30 min)
6. ✅ **Configurer** GitHub Secrets (15 min)

**Checkpoint**: CI/CD pipeline fonctionnel

---

### Phase 2: Tests E2E (P1) - 3-4h
7. ✅ **Ajouter** data-testid composants (1-2h)
8. ✅ **Créer** 12 tests E2E smoke (2h)
9. ✅ **Fix** auth staging setup (30 min)
10. ✅ **Tester** E2E vs preview (30 min)

**Checkpoint**: Tests E2E passent en CI

---

### Phase 3: Améliorations (P2) - Continu
11. 🔄 **Écrire** unit tests (ongoing)
12. 🔄 **Investiguer** multi-onglet issue (2-3h)
13. 🔄 **Optimiser** slow queries (ongoing)
14. 🔄 **Migrer** vers RLS (long-term)

**Checkpoint**: Coverage 50% → 70%

---

## 📋 Pre-Flight Checklist

### Avant de Lancer CI/CD

#### Infrastructure
- [ ] Projet Supabase staging créé
- [ ] Schema migrations pulled et committés
- [ ] Seed staging data appliqué
- [ ] User admin staging créé
- [ ] JWT secret staging généré

#### Configuration
- [ ] GitHub Secrets configurés (7 vars)
- [ ] Vercel Preview env vars configurés
- [ ] `.env.test` créé avec staging vars
- [ ] Health check endpoint créé

#### Tests
- [ ] 30 data-testid ajoutés
- [ ] 12 E2E smoke tests écrits
- [ ] Auth setup testé localement
- [ ] Tests passent vs localhost

#### CI/CD
- [ ] `.github/workflows/ci.yml` créé
- [ ] Workflow testé sur feature branch
- [ ] Preview deployment fonctionne
- [ ] E2E tests passent en CI

---

## 🚀 Launch Readiness

### Go/No-Go Criteria

**GO** si:
- ✅ Toutes checklist items cochées
- ✅ Tests E2E passent 3 fois consécutives
- ✅ Preview deployment < 5 min
- ✅ Aucune erreur 5xx sur health check

**NO-GO** si:
- ❌ Staging DB non créé
- ❌ Tests E2E échouent >50%
- ❌ Preview deployment timeout
- ❌ Secrets manquants

---

## 📊 Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tests E2E flaky | Medium | High | Retry logic, timeouts élevés |
| Preview deployment lent | Low | Medium | Cache, parallélisation |
| Staging DB out of sync | High | Medium | Weekly reset + seed |
| Health check false negative | Low | High | Monitoring, alerting |
| Multi-onglet issue persist | Medium | Low | Post-launch investigation |

---

## 🎯 Success Metrics

### Court Terme (1 mois)
- ✅ CI/CD pipeline stable (95% success rate)
- ✅ E2E tests run < 5 min
- ✅ Zero production incidents from CI

### Moyen Terme (3 mois)
- ✅ Test coverage 70%
- ✅ Deploy frequency 10+/jour
- ✅ Mean time to deploy < 15 min

### Long Terme (6 mois)
- ✅ Coverage 80%
- ✅ Automated rollback on failure
- ✅ Zero manual QA required

---

**Gaps identifiés: 10**
**Fixes documentés: 10**
**Action plan priorisé: ✅**
**Pre-flight checklist: ✅**
**Ready for CI/CD setup: ✅**
