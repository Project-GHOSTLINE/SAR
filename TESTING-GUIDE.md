# 🧪 TESTING GUIDE - Telemetry System

**Date:** 2026-01-22
**Version:** 1.0

---

## 📊 Vue d'Ensemble

Suite de tests complète pour valider le système de télémétrie:

1. **Tests Unitaires** (Jest) - Bibliothèques telemetry
2. **Tests Intégration** - Middleware + API routes
3. **Tests E2E** - Flow complet (browser → server → DB)
4. **Validation Post-Deploy** - Vérification production
5. **Load Testing** - Performance sous charge

---

## 🚀 Installation

```bash
# Dependencies déjà installées
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
```

---

## 1️⃣ Tests Unitaires (Jest)

### Structure

```
src/lib/telemetry/__tests__/
├── index.test.ts          # Core functions (redaction, utils)
├── context.test.ts        # AsyncLocalStorage + TraceContext
├── batcher.test.ts        # Batch writer (TODO)
└── security-checks.test.ts # Security validation (TODO)
```

### Exécution

```bash
# Run tous les tests
npm test

# Run avec coverage
npm test -- --coverage

# Run en watch mode
npm test -- --watch

# Run un fichier spécifique
npm test src/lib/telemetry/__tests__/index.test.ts
```

### Tests Couverts

**index.test.ts:**
- ✅ `redactPII()` - Emails, phones, SSN, credit cards
- ✅ `redactSecrets()` - Passwords, tokens, API keys (nested)
- ✅ `redactErrorMessage()` - Error messages avec PII
- ✅ `createSafeMetadata()` - Metadata redacted
- ✅ `getStatusCategory()` - HTTP status categorization
- ✅ `formatBytes()` - Byte formatting
- ✅ `formatDuration()` - Duration formatting
- ✅ `isRetryableError()` - Error classification
- ✅ `extractProvider()` - Provider from URL
- ✅ `classifySource()` - Source classification
- ✅ `extractRoutePattern()` - Route pattern extraction

**context.test.ts:**
- ✅ `createTraceContext()` - Context creation
- ✅ `runWithTraceContext()` - AsyncLocalStorage propagation
- ✅ `getTraceContext()` - Context retrieval
- ✅ `updateTraceContext()` - Context mutation
- ✅ `incrementDbCall()` - DB counter
- ✅ `incrementSpanCount()` - Span counter
- ✅ `hashWithSalt()` - Privacy hashing
- ✅ `extractRequestMetadata()` - Request metadata extraction
- ✅ `isInTraceContext()` - Context check
- ✅ `getTraceIdSafe()` - Safe trace ID retrieval
- ✅ `getTelemetryPerfContext()` - Compat with perf.ts

### Résultats Attendus

```
PASS  src/lib/telemetry/__tests__/index.test.ts
  ✓ redactPII - email (5ms)
  ✓ redactPII - phone (2ms)
  ✓ redactPII - SSN (1ms)
  ...

PASS  src/lib/telemetry/__tests__/context.test.ts
  ✓ createTraceContext - valid context (3ms)
  ✓ runWithTraceContext - isolation (2ms)
  ...

Test Suites: 2 passed, 2 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        2.5s
```

---

## 2️⃣ Validation Post-Deploy

### Script: `validate-telemetry.js`

Vérifie que le système fonctionne après déploiement.

```bash
# Validate production
node scripts/validate-telemetry.js https://solutionargentrapide.ca

# Validate staging
node scripts/validate-telemetry.js https://staging.solutionargentrapide.ca

# Validate local
node scripts/validate-telemetry.js http://localhost:3000
```

### Tests Effectués

1. **Middleware génère trace_id**
   - Vérifie header `x-trace-id` présent
   - Valide format UUID

2. **Trace IDs uniques**
   - Plusieurs requêtes = différents trace_ids
   - Pas de duplication

3. **API routes avec trace_id**
   - `/api/health`
   - `/api/contact/route`
   - Tous ont `x-trace-id`

4. **Dashboard admin accessible**
   - Route `/admin/dataflow-health` existe
   - Retourne 200/401/403 (normal)

5. **Performance overhead acceptable**
   - Mesure temps de réponse moyen
   - Target: < 2s (avec réseau)

6. **Header telemetry context présent**
   - `x-telemetry-context` décodable
   - Contient traceId, method, path

### Résultats Attendus

```
🔍 VALIDATION TELEMETRY SYSTEM
========================================
Base URL: https://solutionargentrapide.ca
Admin URL: https://admin.solutionargentrapide.ca

✓ Test 1: Middleware génère trace_id
  ✅ trace_id: 123e4567-e89b-12d3-a456-426614174000

✓ Test 2: Trace IDs uniques
  ✅ traceId1: 123e4567-e89b-12d3-a456-426614174000
  ✅ traceId2: 987f6543-e21c-34b5-d678-543210987654

✓ Test 3: API routes avec trace_id
  ✅ /api/health: 234e5678-...
  ✅ /api/contact/route: 345f6789-...

✓ Test 4: Tables database (via API)
  ✅ Route /admin/dataflow-health existe (status: 302)

✓ Test 5: Performance overhead < 5ms
  ℹ️  Temps moyen par requête: 145.32ms (10 requêtes)
  ✅ Performance acceptable (< 2s avec réseau)

✓ Test 6: Header x-telemetry-context
  ✅ Context décodé: traceId=..., method=GET

========================================
📊 RÉSUMÉ
========================================
✅ Tests réussis: 6
❌ Tests échoués: 0
📈 Taux de succès: 100.0%

🎉 TOUS LES TESTS RÉUSSIS!
```

---

## 3️⃣ Load Testing

### Script: `load-test-telemetry.js`

Test de charge pour vérifier performance sous haute concurrence.

```bash
# Load test avec defaults (10 concurrent, 30s)
node scripts/load-test-telemetry.js https://solutionargentrapide.ca

# Custom config
node scripts/load-test-telemetry.js https://solutionargentrapide.ca 25 60

# Local test
node scripts/load-test-telemetry.js http://localhost:3000 5 10
```

### Paramètres

- **URL** - Base URL à tester
- **CONCURRENT** - Nombre d'utilisateurs simultanés (default: 10)
- **DURATION** - Durée en secondes (default: 30)

### Métriques Mesurées

- **Requests/sec** - Débit
- **Success rate** - % requêtes réussies
- **Avg duration** - Latence moyenne
- **P50, P95, P99** - Percentiles
- **Unique trace_ids** - Validation unicité

### Résultats Attendus

```
⚡ LOAD TEST - TELEMETRY SYSTEM
========================================
URL: https://solutionargentrapide.ca
Concurrent users: 10
Duration: 30s

🚀 Starting load test...

  Worker 1: 45 requests
  Worker 2: 44 requests
  Worker 3: 46 requests
  ...

========================================
📊 RÉSULTATS
========================================
Duration: 30.12s
Total requests: 450
Successful: 447 (99.3%)
Failed: 3 (0.7%)

📈 PERFORMANCE
========================================
Requests/sec: 14.95
Avg duration: 152.34ms
Min duration: 89ms
Max duration: 2341ms
P50 (median): 145ms
P95: 287ms
P99: 456ms

🔍 TELEMETRY
========================================
Unique trace_ids: 450
Expected: 450
✅ Tous les trace_ids sont uniques!

🎯 ÉVALUATION
========================================
✅ Success rate > 95%
✅ P95 latency < 500ms
✅ Avg latency < 200ms
✅ All trace_ids unique

🎉 LOAD TEST RÉUSSI!
```

### Seuils de Performance

| Métrique | Target | Critical |
|----------|--------|----------|
| Success rate | >95% | <90% |
| P95 latency | <500ms | >1000ms |
| Avg latency | <200ms | >500ms |
| Trace ID uniqueness | 100% | <99% |

---

## 4️⃣ Tests Manuels

### Dashboard Admin

**URL:** https://admin.solutionargentrapide.ca/dataflow-health

**Checklist:**

- [ ] KPI cards affichent des données
- [ ] Req/min > 0 (après traffic)
- [ ] Error rate % calculé correctement
- [ ] P95 Latency affiché
- [ ] Timeline affiche traces récents
- [ ] Click trace → (TODO: drill-down modal)
- [ ] Filtres fonctionnent (source, time range)
- [ ] Auto-refresh (10s) fonctionne
- [ ] Onglet Alertes affiche alertes actives
- [ ] Actions alertes (acknowledge, close) fonctionnent

### Génération Traffic Test

```bash
# Via curl
for i in {1..20}; do
  curl -s https://solutionargentrapide.ca/ > /dev/null
  curl -s https://solutionargentrapide.ca/api/health > /dev/null
  echo "Batch $i/20"
  sleep 1
done

# Attendre 10 secondes
# Refresh dashboard → traces devraient apparaître
```

### Database Verification

**Via Supabase Dashboard:**

1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
2. Table Editor → `telemetry_requests`
3. Vérifier:
   - [ ] Records présents
   - [ ] `trace_id` uniques
   - [ ] `created_at` récents
   - [ ] `status` corrects (200, 404, etc.)
   - [ ] `duration_ms` raisonnables
   - [ ] `ip_hash` et `ua_hash` présents (16 chars)

4. Table Editor → `telemetry_spans`
   - [ ] Spans présents
   - [ ] Liés aux requests via `trace_id`
   - [ ] `span_type` correct (db, external, etc.)

---

## 5️⃣ CI/CD Integration

### GitHub Actions (TODO)

Créer `.github/workflows/test-telemetry.yml`:

```yaml
name: Telemetry Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  validate-production:
    runs-on: ubuntu-latest
    needs: unit-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: node scripts/validate-telemetry.js https://solutionargentrapide.ca
```

---

## 🐛 Troubleshooting

### Tests échouent localement

**Cause:** Environment variables manquantes

**Solution:**
```bash
# Créer .env.test
cp .env.local .env.test

# Ou set dans jest.setup.js (déjà fait)
```

### Load test timeout

**Cause:** Serveur ne répond pas assez vite

**Solution:**
- Réduire CONCURRENT
- Augmenter timeout dans script (ligne: `req.setTimeout(10000)`)

### Trace IDs dupliqués

**Cause:** Middleware pas déployé correctement

**Solution:**
- Vérifier déploiement Vercel
- Check `src/middleware.ts` est bien dans build
- Vérifier logs Vercel pour erreurs

### Dashboard vide

**Cause:** Aucune donnée en DB

**Solution:**
1. Vérifier migration SQL exécutée
2. Générer traffic de test
3. Wait 10 secondes (batch flush)
4. Refresh dashboard

---

## 📊 Coverage Target

**Target global:** 70% coverage

| Module | Current | Target |
|--------|---------|--------|
| telemetry/index.ts | 85% | 80% |
| telemetry/context.ts | 90% | 80% |
| telemetry/batcher.ts | TBD | 60% |
| telemetry/with-telemetry.ts | TBD | 70% |
| telemetry/fetch-with-telemetry.ts | TBD | 70% |
| telemetry/security-checks.ts | TBD | 75% |

---

## ✅ Checklist Pre-Production

Avant de deployer en production, vérifier:

- [ ] Tests unitaires passent (100%)
- [ ] Migration SQL exécutée
- [ ] Env vars configurées
- [ ] Validation post-deploy OK
- [ ] Load test < 500ms P95
- [ ] Dashboard accessible
- [ ] Traces apparaissent après traffic
- [ ] Aucune erreur 500 dans logs
- [ ] Privacy: PII/secrets redactés
- [ ] Performance: overhead < 5ms

---

**Next:** Phase 2 - Webhook instrumentation + GA4 integration
