# CHECKLIST RUNTIME - Client Sessions & Telemetry

## Commandes de Vérification

### 1. Migration Déployée
```sql
-- Vérifier tables créées
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('client_sessions', 'client_telemetry_events', 'security_events', 'client_pattern_hits');
-- Expected: 4 rows

-- Vérifier indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('client_sessions', 'client_telemetry_events', 'security_events', 'client_pattern_hits');
-- Expected: 15+ indexes

-- Vérifier RLS activé
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('client_sessions', 'client_telemetry_events', 'security_events', 'client_pattern_hits');
-- Expected: rowsecurity = true for all
```

### 2. Session Cookie Généré
```bash
# Visit homepage, check cookie set
curl -v http://localhost:3001/ 2>&1 | grep -i "set-cookie.*sar_session_id"
# Expected: Set-Cookie: sar_session_id=<64-char-hex>; HttpOnly; Secure; SameSite=Lax
```

### 3. Session DB Record Créé (Early Capture)
```sql
-- Check session exists with FULL metadata on first event
SELECT
  session_id,
  client_id,
  first_referrer,
  first_utm_source,
  first_utm_medium,
  first_utm_campaign,
  device_type,
  browser,
  os,
  asn,
  country_code,
  ip_prefix,
  created_at
FROM client_sessions
ORDER BY created_at DESC
LIMIT 5;
-- Expected: At least 1 row, client_id = NULL (anonymous)
-- Expected: UTM params populated if present in URL
-- Expected: ASN, country_code, ip_prefix populated
```

### 4. Form Submit Links Session → Client
```bash
# Submit form with session cookie
curl -X POST http://localhost:3001/api/applications/submit \
  -H "Cookie: sar_session_id=<session-id-from-step-2>" \
  -H "Content-Type: application/json" \
  -d '{
    "courriel": "test@example.com",
    "telephone": "5141234567",
    "prenom": "Test",
    "nom": "User",
    "date_naissance": "1990-01-01",
    "montant_demande": 1000
  }'
# Expected: 200 OK
```

```sql
-- Verify session linked to client
SELECT session_id, client_id, linked_via, linked_at
FROM client_sessions
WHERE session_id = '<session-id-from-step-2>';
-- Expected: client_id NOT NULL, linked_via = 'form_submit'
```

### 5. Event Tracking Works
```bash
# Track page view event
curl -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=<session-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "page_view",
    "event_name": "/applications",
    "payload": {"step": 1},
    "duration_ms": 1500,
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "test"
  }'
# Expected: 200 OK
```

```sql
-- Verify event logged
SELECT event_type, event_name, payload, created_at
FROM client_telemetry_events
WHERE session_id = '<session-id>'
ORDER BY created_at DESC
LIMIT 5;
-- Expected: At least 1 row with event_type = 'page_view'
```

### 6. Cleanup Function Works
```sql
-- Create expired session (manual for testing)
INSERT INTO client_sessions (session_id, expires_at, last_activity_at)
VALUES ('test-expired-session-' || gen_random_uuid()::text, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Run cleanup
SELECT * FROM cleanup_client_sessions();
-- Expected: deleted_sessions >= 1

-- Verify expired session deleted
SELECT * FROM client_sessions
WHERE expires_at < NOW() - INTERVAL '1 day';
-- Expected: 0 rows
```

### 7. No PII in Payload
```sql
-- Check all event payloads for leaked PII
SELECT session_id, event_name, payload
FROM client_telemetry_events
WHERE payload::text ~* '(email|courriel|phone|telephone|nom|prenom|password|token)';
-- Expected: 0 rows (sanitization working)
```

### 8. IP/UA Hashes Only (No Raw Values)
```sql
-- Verify no raw IPs stored (only hashes)
SELECT ip_hash FROM client_sessions WHERE ip_hash IS NOT NULL LIMIT 5;
-- Expected: All values are 16-char hex strings (SHA256 truncated)

-- Verify ip_hash is 16 chars
SELECT COUNT(*) FROM client_sessions WHERE ip_hash IS NOT NULL AND LENGTH(ip_hash) != 16;
-- Expected: 0 rows

-- Verify ua_hash is 16 chars
SELECT COUNT(*) FROM client_sessions WHERE ua_hash IS NOT NULL AND LENGTH(ua_hash) != 16;
-- Expected: 0 rows
```

### 9. Early Capture - Attribution on First Event
```sql
-- Verify first event captures UTM + referrer + device + geo
SELECT
  session_id,
  first_referrer,
  first_utm_source,
  first_utm_medium,
  first_utm_campaign,
  device_type,
  browser,
  os,
  asn,
  country_code,
  ip_prefix,
  created_at
FROM client_sessions
WHERE first_utm_source IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
-- Expected: All metadata populated on session creation (not at form submit)
```

### 10. VPN/Proxy Detection
```sql
-- Check security events for VPN detection
SELECT
  event_type,
  session_id,
  asn,
  country_code,
  meta,
  ts
FROM security_events
WHERE event_type IN ('vpn_detected', 'proxy_detected', 'bot_detected')
ORDER BY ts DESC
LIMIT 10;
-- Expected: Events logged when known VPN ASNs detected
```

### 11. Fraud Pattern Matching
```sql
-- Test fraud pattern matching (requires existing client with activity)
SELECT * FROM match_client_patterns('<client-uuid>');
-- Expected: Returns patterns with scores and risk levels
```

### 12. Geolocation Data Captured
```sql
-- Verify geolocation data present
SELECT
  COUNT(*) as total_sessions,
  COUNT(asn) as sessions_with_asn,
  COUNT(country_code) as sessions_with_country,
  COUNT(ip_prefix) as sessions_with_ip_prefix
FROM client_sessions;
-- Expected: Most sessions should have geo data (unless localhost/dev)
```

---

## Tests Automatisés

### Script de Test Complet
```bash
#!/bin/bash
# Run from project root: bash audit_artifacts/telemetry/run-all-tests.sh

echo "🧪 TELEMETRY SYSTEM VERIFICATION"
echo "================================="
echo ""

# Test 1: Track event with UTM params
echo "1️⃣  Testing track-event endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/telemetry/track-event \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sar_session_id=test123456789012345678901234567890123456789012345678901234567890' \
  -d '{
    "event_type": "page_view",
    "event_name": "/test",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "test-campaign"
  }')

echo "Response: $RESPONSE"
echo ""

# Test 2: Check session in database
echo "2️⃣  Checking last session in database..."
node scripts/check-last-session.js
echo ""

echo "✅ Tests complete"
```

---

## Evidence Capture

### Format de Fichier Evidence
```json
{
  "test": "Migration Deployed",
  "timestamp": "2026-01-25T15:30:00.000Z",
  "command": "SELECT table_name FROM information_schema.tables...",
  "result": {
    "rows": [
      {"table_name": "client_sessions"},
      {"table_name": "client_telemetry_events"},
      {"table_name": "security_events"},
      {"table_name": "client_pattern_hits"}
    ],
    "row_count": 4
  },
  "status": "✅ PASS",
  "notes": "All tables created successfully"
}
```

---

## Règles de Vérification

1. **Anonymat par défaut**: Toutes les nouvelles sessions DOIVENT avoir `client_id = NULL`
2. **Linkage volontaire**: `client_id` DOIT être populé SEULEMENT après form submit ou action volontaire
3. **IP hachée**: Aucune raw IP ne DOIT être stockée (seulement hash 16 chars)
4. **Early capture**: First event DOIT capturer referrer + UTM + device + geo
5. **Rétention**: Events > 30j et sessions > 90j DOIVENT être supprimés automatiquement
6. **No PII**: Payload JSONB ne DOIT JAMAIS contenir emails, phones, noms, passwords
7. **VPN detection**: Known VPN ASNs DOIVENT générer security_events
8. **Geolocation**: ASN, country_code, ip_prefix DOIVENT être capturés (sauf localhost)

---

## Status Système

- ✅ Phase 1 deployed (client_sessions, client_telemetry_events)
- ✅ Phase 2 deployed (security_events, client_pattern_hits, geolocation)
- ✅ Early capture implemented (attribution on first event)
- ✅ TelemetryProvider integrated (all pages)
- ✅ VPN/Proxy detection active
- ✅ Fraud pattern matching (7 patterns)
- ✅ Cleanup automation (90d sessions, 30d events, 30d IP hashes)

---

## Prochaines Étapes

1. Deploy to production (Vercel)
2. Monitor first 24h of real traffic
3. Create admin dashboard for viewing sessions/events
4. Tune fraud pattern thresholds based on real data
5. Add more VPN ASNs to detection list
6. Integrate with police reporting workflow
