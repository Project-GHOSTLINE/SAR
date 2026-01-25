# ✅ CHECKLIST PHASE 2 - Fraud Detection System

**Date:** 2026-01-25
**Version:** Phase 2 (ASN + Country + Pattern Matching)

---

## 🎯 PRIORITÉ 1: Migration SQL (Base de données)

### ☐ 1.1 Déployer Migration

```bash
# Dans Supabase Dashboard → SQL Editor
# Copier le contenu de: supabase/migrations/20260125000300_fraud_detection_phase2.sql
# Cliquer "Run"
```

**Vérifications:**

```sql
-- Vérifier tables créées
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('security_events', 'client_pattern_hits');
-- Expected: 2 rows

-- Vérifier colonnes ajoutées à client_sessions
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_sessions'
  AND column_name IN ('asn', 'country_code', 'ip_prefix', 'consent_analytics', 'consent_marketing');
-- Expected: 5 rows

-- Vérifier indexes créés
SELECT indexname FROM pg_indexes
WHERE tablename IN ('security_events', 'client_pattern_hits')
ORDER BY indexname;
-- Expected: 10+ indexes

-- Vérifier RPC existe
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'match_client_patterns';
-- Expected: 1 row

-- Vérifier RLS activé
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('security_events', 'client_pattern_hits');
-- Expected: rowsecurity = true for both
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Capture d'écran des résultats → `EVIDENCE/01_migration_deployed.png`

---

### ☐ 1.2 Tester RPC match_client_patterns()

**Test avec client factice:**

```sql
-- Créer un client test
INSERT INTO clients (id, primary_email, first_name, last_name, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test-fraud@example.com',
  'Test',
  'Fraudeur',
  'active',
  now() - INTERVAL '2 days' -- Nouveau client (< 7j)
)
ON CONFLICT (id) DO NOTHING;

-- Créer une demande de prêt (trigger pattern: nsf_rapid)
INSERT INTO loan_applications (client_id, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  now()
)
ON CONFLICT DO NOTHING;

-- Exécuter RPC
SELECT * FROM match_client_patterns('00000000-0000-0000-0000-000000000001'::uuid);

-- Expected: 1 row avec pattern_key = 'nsf_rapid', score = 75, risk_level = 'HIGH'
```

**Cleanup après test:**

```sql
DELETE FROM loan_applications WHERE client_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM client_pattern_hits WHERE client_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM clients WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Capture d'écran du résultat RPC → `EVIDENCE/02_rpc_pattern_matching.png`

---

## 🎯 PRIORITÉ 2: Modifier APIs (Ingestion des données)

### ☐ 2.1 Vérifier Import Geolocation Utility

```bash
# Vérifier fichier existe
ls -lh src/lib/utils/ip-geolocation.ts
# Expected: fichier existe, ~350 lignes

# Vérifier pas d'erreurs TypeScript
npm run build
# Expected: ✓ Compiled successfully
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

### ☐ 2.2 Tester Geolocation API (Development Mode)

**Créer script test:**

```typescript
// scripts/test-geolocation.ts
import { getIPGeoData, getMockGeoData } from '../src/lib/utils/ip-geolocation'

async function testGeo() {
  // Test 1: Mock data (localhost)
  console.log('Test 1: Mock data')
  const mockData = getMockGeoData('127.0.0.1')
  console.log(mockData)
  // Expected: { asn: 577, country_code: 'CA', ... }

  // Test 2: Real IP (production only - skip if rate limit)
  if (process.env.NODE_ENV === 'production') {
    console.log('Test 2: Real IP')
    const realData = await getIPGeoData('8.8.8.8') // Google DNS
    console.log(realData)
    // Expected: { asn: 15169, country_code: 'US', ... }
  }
}

testGeo()
```

**Run:**

```bash
# Development (mock)
NODE_ENV=development npx tsx scripts/test-geolocation.ts

# Production (real API - careful with rate limits!)
# NODE_ENV=production npx tsx scripts/test-geolocation.ts
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot de la console → `EVIDENCE/03_geolocation_test.png`

---

### ☐ 2.3 Tester Form Submit avec Geolocation

**Étapes:**

1. Ouvrir navigateur → http://localhost:3001/aidesecurite
2. Remplir formulaire test
3. Soumettre
4. Vérifier console serveur (terminal Next.js):

```
[Telemetry] GeoIP data: {
  asn: 577,
  country: 'CA',
  is_vpn: false,
  is_hosting: false,
  is_proxy: false
}
```

5. Vérifier DB:

```sql
-- Vérifier session a ASN/Country
SELECT
  session_id,
  client_id,
  asn,
  country_code,
  ip_prefix,
  linked_via
FROM client_sessions
WHERE client_id IS NOT NULL
ORDER BY linked_at DESC
LIMIT 1;

-- Expected: asn = 577, country_code = 'CA', linked_via = 'form_submit'
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:**
- Screenshot console serveur → `EVIDENCE/04_form_submit_console.png`
- Screenshot query DB → `EVIDENCE/04_form_submit_db.png`

---

### ☐ 2.4 Tester Security Events (VPN Detection)

**Note:** Ce test est SIMULÉ car on ne peut pas forcer un vrai VPN en dev.

**Simulation:**

```sql
-- Insérer manuellement un security_event
INSERT INTO security_events (
  session_id,
  event_type,
  ip_hash,
  asn,
  country_code,
  meta
)
SELECT
  session_id,
  'vpn_detected',
  ip_hash,
  209103, -- NordVPN ASN
  'NL', -- Netherlands
  jsonb_build_object(
    'is_vpn', true,
    'is_proxy', false,
    'is_hosting', false
  )
FROM client_sessions
WHERE client_id IS NOT NULL
ORDER BY linked_at DESC
LIMIT 1;

-- Vérifier insertion
SELECT * FROM security_events
WHERE event_type = 'vpn_detected'
ORDER BY ts DESC
LIMIT 1;

-- Expected: 1 row avec asn = 209103, country_code = 'NL'
```

**Cleanup:**

```sql
DELETE FROM security_events WHERE event_type = 'vpn_detected' AND asn = 209103;
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot query → `EVIDENCE/05_security_event_vpn.png`

---

### ☐ 2.5 Tester Pattern Matching Auto-Trigger

**Workflow:**

1. Soumettre formulaire via /aidesecurite
2. Vérifier console serveur affiche:

```
[Fraud] Running pattern matching for client: <uuid>
[Fraud] PATTERNS DETECTED: [...]
[Fraud] FRAUD SCORE: { total: 75, max: 75, pattern_count: 1, client_id: '...' }
```

3. Vérifier DB:

```sql
-- Vérifier pattern_hits créés
SELECT
  pattern_key,
  score,
  risk_level,
  evidence
FROM client_pattern_hits
WHERE client_id = (
  SELECT id FROM clients WHERE primary_email = 'test@aidesecurite.com' -- Email du test
)
ORDER BY ts DESC;

-- Expected: Au moins 1 row (probablement 'nsf_rapid' si nouveau client)
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot console + DB → `EVIDENCE/06_pattern_matching.png`

---

## 🎯 PRIORITÉ 3: Requêtes SQL Police

### ☐ 3.1 Tester QUERY 1: Rapport Client Complet

**Étapes:**

1. Ouvrir Supabase SQL Editor
2. Copier QUERY 1 depuis `SQL_POLICE_QUERIES.md`
3. Remplacer `'victim@example.com'` par email d'un client test
4. Exécuter
5. Vérifier résultats contiennent:
   - Section CLIENT INFO
   - Section FRAUD SCORE
   - Section SESSIONS
   - Section SESSION METADATA
   - Section TELEMETRY TIMELINE
   - Section SECURITY EVENTS

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Export CSV des résultats → `EVIDENCE/07_police_report_full.csv`

---

### ☐ 3.2 Tester QUERY 2: Fraud Score Only

**Étapes:**

1. Copier QUERY 2
2. Remplacer `'client-uuid-here'` par UUID d'un client test
3. Exécuter
4. Vérifier résultat affiche:
   - `pattern_count`
   - `total_score`
   - `max_score`
   - `patterns` (liste)
   - `overall_risk` (LOW/MEDIUM/HIGH/CRITICAL)

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot → `EVIDENCE/08_fraud_score.png`

---

### ☐ 3.3 Tester QUERY 3: Timeline Complète

**Étapes:**

1. Copier QUERY 3
2. Remplacer UUID client
3. Exécuter
4. Vérifier timeline contient:
   - Événements `telemetry` (page_view, form_step, etc.)
   - Événements `security` (si détection VPN/country change)
   - Événements `session` (session_created)
5. Vérifier ordre chronologique (ASC)

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Export CSV → `EVIDENCE/09_timeline_full.csv`

---

### ☐ 3.4 Tester QUERY 9: Export JSON Police

**Étapes:**

1. Copier QUERY 9
2. Remplacer UUID client
3. Exécuter
4. Copier résultat JSON
5. Sauvegarder dans fichier `.json`
6. Valider JSON (https://jsonlint.com)

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Fichier JSON → `EVIDENCE/10_police_report.json`

---

## 🧪 TESTS D'INTÉGRATION (End-to-End)

### ☐ 4.1 Scénario Fraudeur Complet

**Workflow:**

1. **Visiteur arrive** (anonyme)
   - Cookie généré
   - Session créée (client_id = NULL)

2. **Navigation** (5 pages)
   - Événements télémétrie enregistrés
   - Session reste anonyme

3. **Soumet formulaire** (identifie)
   - Client créé/trouvé
   - Session liée (client_id NOT NULL)
   - Geolocation capturée (ASN, Country)
   - Security events détectés (si VPN/anomaly)
   - Pattern matching exécuté
   - Fraud score calculé

4. **Vérifications DB:**

```sql
-- 1. Session liée existe
SELECT * FROM client_sessions WHERE client_id IS NOT NULL ORDER BY linked_at DESC LIMIT 1;

-- 2. Événements télémétrie existent
SELECT COUNT(*) FROM client_telemetry_events WHERE session_id = '<session-id-from-step-1>';
-- Expected: >= 5 (navigation events)

-- 3. Security events existent (si VPN)
SELECT COUNT(*) FROM security_events WHERE session_id = '<session-id>';
-- Expected: >= 0

-- 4. Pattern hits existent
SELECT COUNT(*) FROM client_pattern_hits WHERE client_id = '<client-id>';
-- Expected: >= 1 (probablement nsf_rapid)

-- 5. Geolocation capturée
SELECT asn, country_code, ip_prefix FROM client_sessions WHERE session_id = '<session-id>';
-- Expected: asn NOT NULL, country_code NOT NULL
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshots de chaque étape → `EVIDENCE/11_e2e_test/`

---

### ☐ 4.2 Test Cleanup Automatique

**Simulation:**

```sql
-- Créer session expirée
INSERT INTO client_sessions (session_id, expires_at, last_activity_at)
VALUES (
  'test-expired-session-12345',
  now() - INTERVAL '1 day', -- Expiré hier
  now() - INTERVAL '1 day'
);

-- Créer événements anciens
INSERT INTO client_telemetry_events (session_id, event_type, event_name, created_at)
VALUES (
  'test-expired-session-12345',
  'page_view',
  '/',
  now() - INTERVAL '35 days' -- > 30 jours
);

INSERT INTO security_events (session_id, event_type, created_at, expires_at)
VALUES (
  'test-expired-session-12345',
  'rate_limit',
  now() - INTERVAL '35 days',
  now() - INTERVAL '5 days' -- Expiré
);

-- Exécuter cleanup
SELECT * FROM cleanup_client_sessions();

-- Expected:
-- deleted_expired_sessions >= 1
-- deleted_old_telemetry_events >= 1
-- deleted_expired_security_events >= 1

-- Vérifier suppression
SELECT COUNT(*) FROM client_sessions WHERE session_id = 'test-expired-session-12345';
-- Expected: 0

SELECT COUNT(*) FROM client_telemetry_events WHERE session_id = 'test-expired-session-12345';
-- Expected: 0

SELECT COUNT(*) FROM security_events WHERE session_id = 'test-expired-session-12345';
-- Expected: 0
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot résultats cleanup → `EVIDENCE/12_cleanup_test.png`

---

## 🔒 TESTS DE SÉCURITÉ

### ☐ 5.1 Vérifier IP Hash Jamais en Clair

```sql
-- Vérifier aucune raw IP stockée
SELECT ip_hash FROM client_sessions WHERE ip_hash LIKE '%:%' OR ip_hash LIKE '%.%.%.%';
-- Expected: 0 rows (format hash = 16 chars hex)

SELECT ip_hash FROM security_events WHERE ip_hash LIKE '%:%' OR ip_hash LIKE '%.%.%.%';
-- Expected: 0 rows
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

### ☐ 5.2 Vérifier UA Hash Jamais en Clair

```sql
-- Vérifier aucune UA string complète
SELECT ua_hash FROM client_sessions WHERE LENGTH(ua_hash) > 16;
-- Expected: 0 rows (hash = exactement 16 chars)

SELECT ua_hash FROM security_events WHERE LENGTH(ua_hash) > 16;
-- Expected: 0 rows
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

### ☐ 5.3 Vérifier RLS Bloque Anonymous

```sql
-- Se connecter en tant qu'anonymous (pas service_role)
-- Dans Supabase Dashboard: Settings → API → anon key

-- Essayer de lire security_events (devrait être bloqué)
SELECT * FROM security_events LIMIT 1;
-- Expected: RLS policy violation error

-- Essayer d'insérer (devrait être bloqué)
INSERT INTO security_events (session_id, event_type) VALUES ('test', 'test');
-- Expected: RLS policy violation error
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Evidence:** Screenshot erreur RLS → `EVIDENCE/13_rls_test.png`

---

## 📊 MÉTRIQUES DE SUCCÈS

### ☐ 6.1 Performance (Latence API)

**Test:**

```bash
# Time form submission
time curl -X POST http://localhost:3001/api/applications/submit \
  -H "Content-Type: application/json" \
  -d '{ ... form data ... }'

# Expected: < 2 secondes (includes geolocation + pattern matching)
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Latence mesurée:** _______ ms

---

### ☐ 6.2 Données Capturées (Coverage)

```sql
-- % de sessions avec geolocation
SELECT
  COUNT(*) FILTER (WHERE asn IS NOT NULL) * 100.0 / COUNT(*) as asn_coverage,
  COUNT(*) FILTER (WHERE country_code IS NOT NULL) * 100.0 / COUNT(*) as country_coverage
FROM client_sessions
WHERE client_id IS NOT NULL;

-- Expected: > 90% (sauf localhost en dev)
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Coverage:** ASN ____% / Country ____%

---

### ☐ 6.3 Pattern Detection Rate

```sql
-- % de clients avec au moins 1 pattern détecté
SELECT
  COUNT(DISTINCT client_id) * 100.0 / (SELECT COUNT(*) FROM clients) as detection_rate
FROM client_pattern_hits;

-- Expected: > 0% (dépend des données réelles)
```

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

**Detection rate:** _____%

---

## ✅ VALIDATION FINALE

### ☐ 7.1 Tous les Tests Passent

- [ ] Migration déployée sans erreurs
- [ ] RPC match_client_patterns() fonctionne
- [ ] Geolocation API retourne données valides
- [ ] Form submit capture ASN/Country
- [ ] Security events créés pour VPN/anomalies
- [ ] Pattern matching auto-trigger fonctionne
- [ ] Requêtes SQL police retournent données complètes
- [ ] Cleanup automatique supprime données expirées
- [ ] RLS bloque accès anonymous
- [ ] Latence API < 2s
- [ ] Coverage geolocation > 90%

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

### ☐ 7.2 Documentation Complète

- [ ] Migration SQL commentée
- [ ] Fichier `SQL_POLICE_QUERIES.md` créé
- [ ] Fichier `CHECKLIST_PHASE2.md` créé (ce fichier)
- [ ] Evidence screenshots dans `EVIDENCE/`
- [ ] README mis à jour (si applicable)

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

### ☐ 7.3 Prêt pour Production

- [ ] Migration testée en staging
- [ ] Backup DB avant déploiement production
- [ ] Variables d'environnement configurées:
  - `TELEMETRY_HASH_SALT` (CRITIQUE - NE PAS PARTAGER)
- [ ] Rate limits configurés (ipapi.co 1000 req/jour)
- [ ] Monitoring activé (logs Vercel)
- [ ] Plan de rollback préparé

**Status:** ☐ TODO / ☐ IN PROGRESS / ☐ DONE

---

## 🚀 DÉPLOIEMENT

### Ordre d'Exécution (Production)

1. ✅ **Backup DB** (Supabase Dashboard → Database → Backups → Create backup)
2. ✅ **Deploy Migration** (SQL Editor → Run `20260125000300_fraud_detection_phase2.sql`)
3. ✅ **Verify Tables** (Checklist 1.1)
4. ✅ **Test RPC** (Checklist 1.2)
5. ✅ **Deploy Code** (Vercel push)
6. ✅ **Test E2E** (Checklist 4.1)
7. ✅ **Monitor Logs** (24h surveillance)

---

**FIN DE LA CHECKLIST**

**Date de complétion:** _______________
**Validé par:** _______________
**Notes:**

_______________________________________________
_______________________________________________
_______________________________________________
