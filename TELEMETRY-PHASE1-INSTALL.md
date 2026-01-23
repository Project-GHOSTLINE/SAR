# 🚀 TELEMETRY PHASE 1 - GUIDE D'INSTALLATION

**Date:** 2026-01-22
**Phase:** 1 - Instrumentation Fondation
**Status:** ✅ IMPLÉMENTÉ

---

## 📊 Ce qui a été implémenté

### 1. Infrastructure Database

**Fichier:** `supabase/migrations/20260122_telemetry_tables.sql`

**Tables créées:**
- `telemetry_requests` - Toutes les requêtes HTTP
- `telemetry_spans` - Opérations sub-request (DB, external APIs)
- `telemetry_security` - Security checks (webhooks, rate limiting)
- `telemetry_alerts` - Alertes agrégées

**Vues SQL:**
- `vw_telemetry_request_rate` - Taux de requêtes temps réel
- `vw_telemetry_slow_operations` - Top opérations lentes
- `vw_telemetry_security_failures` - Échecs sécurité
- `vw_telemetry_active_alerts` - Alertes actives

**Fonctions:**
- `cleanup_telemetry_data()` - Nettoyage automatique (retention 30j)
- `get_trace_timeline()` - Timeline complète d'un trace

### 2. Bibliothèques Telemetry

**Fichiers:**
```
src/lib/telemetry/
├── context.ts              # AsyncLocalStorage + TraceContext
├── batcher.ts              # Batch writes (optimisé)
├── index.ts                # Utilitaires + redaction PII
├── with-telemetry.ts       # Wrapper API routes
├── fetch-with-telemetry.ts # Wrapper external APIs + retry
├── security-checks.ts      # Webhook validation + security
└── extract-context.ts      # Extract context from middleware
```

**Fonctionnalités:**
- ✅ Génération trace_id (UUID v4)
- ✅ AsyncLocalStorage propagation
- ✅ Redaction automatique PII/secrets
- ✅ Batch writes (auto-flush 5s ou 100 records)
- ✅ Retry logic pour APIs externes
- ✅ Security checks (signature, replay, rate limit)

### 3. Middleware Global

**Fichier:** `src/middleware.ts`

**Modifications:**
- ✅ Génération trace_id pour chaque requête
- ✅ Extraction metadata (IP, UA, Vercel region)
- ✅ Hash IP/UA pour privacy (SHA256 + salt)
- ✅ Extraction rôle JWT (admin/user/anonymous)
- ✅ Propagation via headers (`x-trace-id`, `x-telemetry-context`)

### 4. Admin UI Dashboard

**Page:** `/admin/dataflow-health`

**Composants:**
- ✅ 6 KPI cards real-time
- ✅ Timeline traces (filtrable)
- ✅ Dashboard alertes
- ✅ Tabs: Traces, Alertes, Sécurité, Analytics
- ✅ Auto-refresh 10s

**APIs:**
- `GET /api/admin/dataflow-health/kpis`
- `GET /api/admin/dataflow-health/traces`
- `GET /api/admin/dataflow-health/alerts`
- `POST /api/admin/dataflow-health/alerts` (acknowledge/close)

### 5. Packages NPM

**Ajoutés:**
- `@vercel/analytics` - Vercel Analytics
- `@vercel/speed-insights` - Speed Insights

---

## 🔧 Installation et Déploiement

### Étape 1: Migration Database

```bash
# Via Supabase Dashboard
1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
2. SQL Editor → New Query
3. Copier contenu de: supabase/migrations/20260122_telemetry_tables.sql
4. Exécuter (takes ~30 seconds)

# Vérifier installation
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'telemetry_%';
-- Devrait retourner: 4 tables
```

### Étape 2: Variables d'Environnement

Ajouter dans Vercel (ou `.env.local`):

```bash
# Telemetry configuration
TELEMETRY_ENABLED=true
TELEMETRY_HASH_SALT=sar-telemetry-2026  # Change this!

# Existing (already set)
SUPABASE_URL=https://dllyzfuqjzuhvshrlmuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=sar-admin-secret-key-2024
```

### Étape 3: Deploy to Vercel

```bash
# Commit already done (2 commits):
# - 3c2779d: feat(telemetry): Add observability instrumentation libraries
# - 10feb17: feat(telemetry): Add middleware trace_id + admin UI dashboard

# Push to GitHub
git push origin main

# Vercel will auto-deploy (via GitHub integration)
# Wait 2-3 minutes for deployment
```

### Étape 4: Vérification Post-Deploy

```bash
# 1. Check middleware propagation
curl -I https://solutionargentrapide.ca/api/health
# Devrait retourner header: x-trace-id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 2. Check admin UI
# Ouvrir: https://admin.solutionargentrapide.ca/dataflow-health
# Login avec credentials admin
# Devrait afficher dashboard avec KPIs

# 3. Check database tables
# Via Supabase Dashboard: Table Editor
# Vérifier tables: telemetry_requests, telemetry_spans, telemetry_security, telemetry_alerts

# 4. Generate test traffic
curl https://solutionargentrapide.ca/api/contact/route
curl https://solutionargentrapide.ca/api/loan-application/route
# Attendre 10 secondes
# Refresh /admin/dataflow-health
# Devrait voir apparaître traces
```

---

## 📊 Utilisation

### Dashboard Admin

**URL:** https://admin.solutionargentrapide.ca/dataflow-health

**Fonctionnalités:**

1. **KPI Cards (Real-time)**
   - Req/min - Taux de requêtes par minute
   - Error Rate - Pourcentage d'erreurs (4xx + 5xx)
   - P95 Latency - Latence 95e percentile
   - Webhooks - Taux de succès webhooks
   - DB P95 - Latence DB 95e percentile
   - APIs Externes - Taux d'erreur providers

2. **Timeline Traces**
   - Filtres: source (web/webhook/cron), time range (5m to 7d)
   - Click trace → voir détail (TODO: Phase 2)
   - Couleur: vert (success), jaune (4xx), rouge (5xx/error)

3. **Alertes**
   - Alertes actives avec sévérité (low/medium/high/critical)
   - Actions: Acquitter, Fermer
   - Historique occurrences

### Dans le Code

**Wrapper API Route:**
```typescript
import { withTelemetry } from '@/lib/telemetry/with-telemetry'

export const GET = withTelemetry(async (req: NextRequest) => {
  // Your handler code
  return NextResponse.json({ success: true })
})
```

**Track DB Operation:**
```typescript
import { trackDbOperation } from '@/lib/telemetry/with-telemetry'

const users = await trackDbOperation('SELECT', 'users', async () => {
  return await supabase.from('users').select('*')
})
```

**External API Call:**
```typescript
import { fetchWithTelemetry } from '@/lib/telemetry/fetch-with-telemetry'

const response = await fetchWithTelemetry('https://api.vopay.com/balance', {
  provider: 'vopay',
  method: 'GET',
  retry: { maxAttempts: 3 },
  timeoutMs: 10000
})
```

**Security Check (Webhook):**
```typescript
import { validateWebhook } from '@/lib/telemetry/security-checks'

const validation = await validateWebhook({
  provider: 'vopay',
  signature: {
    type: 'sha1',
    transactionId: req.body.TransactionID,
    validationKey: req.body.ValidationKey,
    receivedSignature: req.headers['x-signature']
  },
  timestamp: req.body.TransactionDateTime,
  payloadSize: Buffer.byteLength(JSON.stringify(req.body)),
  ipHash: hashWithSalt(req.ip)
})

if (!validation.valid) {
  return NextResponse.json({ error: 'Invalid webhook' }, { status: 403 })
}
```

---

## 🔒 Privacy & Security

### Redaction Automatique

**PII détectée et masquée:**
- Emails → `[EMAIL]`
- Téléphones → `[PHONE]`
- SSN → `[SSN]`
- Cartes de crédit → `[CARD]`
- Codes postaux → `[POSTAL]`
- IP addresses → `[IP]`

**Secrets masqués:**
Tout key contenant: `password`, `secret`, `token`, `key`, `apiKey`, `jwt`, `session*`, etc.

### Anonymisation

**IP et User-Agent:**
Hashés avec SHA256 + salt (configurable)
```
IP: 192.168.1.1 → ipHash: a1b2c3d4e5f6g7h8
```

**Payload requests/responses:**
Non sauvegardés par défaut (privacy-first)

---

## 📈 Performance

### Overhead

**Target:** <5ms par requête

**Mesures:**
- Middleware: ~1-2ms (trace_id + hash)
- Batch writer: async (non-blocking)
- DB writes: batched (5s ou 100 records)

### Retention

**Par défaut:**
- `telemetry_requests`: 30 jours
- `telemetry_spans`: 30 jours
- `telemetry_security`: 90 jours
- `telemetry_alerts`: 90 jours (fermées)

**Cleanup automatique:**
```sql
-- Via Supabase scheduled function (TODO: setup cron)
SELECT * FROM cleanup_telemetry_data(30);
```

---

## 🚨 Alerting (Phase 1 - Manuel)

### Seuils par Défaut

| Alerte | Seuil | Fenêtre |
|--------|-------|---------|
| High error rate | >10 errors | 5 min |
| Webhook failures | >3 failures | 15 min |
| Slow DB queries | >5 queries >1s | 10 min |
| Provider timeouts | >5 timeouts | 5 min |

### Création Alertes

**Manuel (Phase 1):**
```sql
INSERT INTO telemetry_alerts (
  alert_key,
  severity,
  state,
  first_seen_at,
  last_seen_at,
  summary,
  occurrence_count
) VALUES (
  'high_error_rate_api',
  'high',
  'open',
  NOW(),
  NOW(),
  'High error rate on API routes: 15 errors in 5min',
  15
);
```

**Automatique (Phase 3 - TODO):**
Background job qui check les seuils et crée alertes automatiquement.

---

## ✅ Checklist Post-Installation

- [ ] Migration SQL exécutée (4 tables créées)
- [ ] Env vars configurées dans Vercel
- [ ] Deploy successful sur Vercel
- [ ] Header `x-trace-id` présent dans responses
- [ ] Dashboard `/admin/dataflow-health` accessible
- [ ] KPIs affichent des données (après traffic)
- [ ] Traces apparaissent dans timeline
- [ ] Filtres fonctionnent (source, time range)
- [ ] Batch writer fonctionne (check Supabase table editor)
- [ ] Aucune erreur 500 dans logs Vercel

---

## 🐛 Troubleshooting

### Dashboard vide (pas de données)

**Cause:** Aucun traffic instrumenté

**Solution:**
1. Vérifier que middleware génère trace_id:
   ```bash
   curl -I https://solutionargentrapide.ca/
   # Chercher: x-trace-id
   ```
2. Générer traffic de test
3. Vérifier tables Supabase (Table Editor)

### Erreur "Table does not exist"

**Cause:** Migration SQL pas exécutée

**Solution:**
1. Vérifier tables créées:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename LIKE 'telemetry_%';
   ```
2. Exécuter migration manuellement via SQL Editor

### Erreur "Service role access denied"

**Cause:** RLS activée mais policy manquante

**Solution:**
Migration SQL inclut les policies. Vérifier dans Supabase Dashboard → Authentication → Policies.

### Batch writer ne flush pas

**Cause:** Process exit avant flush

**Solution:**
- Batch auto-flush toutes les 5s
- Ou call `flushTelemetry()` manuellement avant exit
- Graceful shutdown hook inclus (SIGTERM, SIGINT)

---

## 🚀 Prochaines Étapes (Phase 2)

**Phase 2 - Enrichissement:**
- [ ] Instrumenter webhooks VoPay/QuickBooks
- [ ] Wrapper VoPay/QuickBooks clients
- [ ] Détail trace (timeline drill-down UI)
- [ ] Security dashboard (failed checks)
- [ ] Intégration GA4 + Vercel Analytics cross-ref

**Phase 3 - Alerting:**
- [ ] Background job alert checking
- [ ] Auto-création alertes sur seuils
- [ ] Email/Slack notifications
- [ ] Alert management (snooze, escalate)

---

**Documentation Complète:** `DATAFLOW-HEALTH-ARCHITECTURE.md`
**Migration SQL:** `supabase/migrations/20260122_telemetry_tables.sql`
**Status:** ✅ PHASE 1 COMPLETE
