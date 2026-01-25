# CHECKLIST RUNTIME - Client Sessions & Telemetry

**Date:** 2026-01-25
**Objective:** Verify privacy-by-design session tracking implementation
**Status:** ⚠️ PENDING EXECUTION

---

## ⚙️ PRÉREQUIS

1. Migration déployée sur Supabase (Dashboard → SQL Editor)
2. Dev server running: `npm run dev`
3. Supabase service key configured in `.env.local`

---

## 📋 COMMANDES DE VÉRIFICATION

### 1. Migration Déployée

```sql
-- Vérifier tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('client_sessions', 'client_telemetry_events');
-- Expected: 2 rows
```

```sql
-- Vérifier indexes
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('client_sessions', 'client_telemetry_events')
ORDER BY tablename, indexname;
-- Expected: 9+ indexes
```

```sql
-- Vérifier RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('client_sessions', 'client_telemetry_events');
-- Expected: rowsecurity = true for both
```

**Evidence:** Save output to `EVIDENCE/01_migration_deployed_YYYYMMDD_HHMMSS.json`

---

### 2. Session Cookie Généré

```bash
# Visit homepage, check cookie set
curl -v http://localhost:3001/ 2>&1 | grep -i "set-cookie.*sar_session_id"
# Expected: Set-Cookie: sar_session_id=<64-char-hex>; HttpOnly; ...
```

**Evidence:** Save output to `EVIDENCE/02_session_cookie_YYYYMMDD_HHMMSS.txt`

---

### 3. Session DB Record Créé (Anonymous)

**Action:** Visit homepage, trigger cookie generation, then check DB.

```sql
-- Check anonymous session exists
SELECT
  session_id,
  client_id,
  linked_via,
  ip_hash,
  ua_hash,
  created_at
FROM client_sessions
ORDER BY created_at DESC
LIMIT 5;
-- Expected: At least 1 row, client_id = NULL (anonymous)
```

**Evidence:** Save output to `EVIDENCE/03_session_db_record_YYYYMMDD_HHMMSS.json`

**RÈGLE:** Mask session_id and hashes in evidence (replace with `<REDACTED>`).

---

### 4. Form Submit Links Session → Client

**Action:** Submit loan application form with session cookie.

```bash
# Submit form with session cookie (replace <session-id> with real value)
curl -X POST http://localhost:3001/api/applications/submit \
  -H "Cookie: sar_session_id=<session-id-from-step-2>" \
  -H "Content-Type: application/json" \
  -d '{
    "prenom": "Test",
    "nom": "User",
    "courriel": "test-telemetry@example.com",
    "telephone": "514-555-0123",
    "date_naissance": "1990-01-01",
    "montant_demande": 100000,
    ...
  }'
# Expected: 200 OK
```

```sql
-- Verify session linked to client
SELECT
  cs.session_id,
  cs.client_id,
  cs.linked_via,
  cs.linked_at,
  c.primary_email
FROM client_sessions cs
JOIN clients c ON cs.client_id = c.id
WHERE cs.session_id = '<session-id-from-step-2>';
-- Expected: client_id NOT NULL, linked_via = 'form_submit'
```

**Evidence:** Save output to `EVIDENCE/04_form_submit_link_YYYYMMDD_HHMMSS.json`

**RÈGLE:** Mask email with `test-***@***.com` pattern in evidence.

---

### 5. Event Tracking Works

**Action:** Track page view event via API.

```bash
# Track page view event (replace <session-id> with real value)
curl -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=<session-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "page_view",
    "event_name": "/applications",
    "payload": {"step": 1},
    "duration_ms": 1500
  }'
# Expected: {"success":true,"event_id":"<uuid>"}
```

```sql
-- Verify event logged
SELECT
  event_type,
  event_name,
  payload,
  duration_ms,
  created_at
FROM client_telemetry_events
WHERE session_id = '<session-id>'
ORDER BY created_at DESC
LIMIT 5;
-- Expected: At least 1 row with event_type = 'page_view'
```

**Evidence:** Save output to `EVIDENCE/05_event_tracking_YYYYMMDD_HHMMSS.json`

---

### 6. Cleanup Function Works

```sql
-- Create expired session (manual for testing)
INSERT INTO client_sessions (session_id, expires_at)
VALUES ('test-expired-session-12345678901234567890123456789012', NOW() - INTERVAL '1 day');
```

```sql
-- Run cleanup
SELECT * FROM cleanup_client_sessions();
-- Expected: deleted_expired_sessions >= 1
```

```sql
-- Verify expired session deleted
SELECT * FROM client_sessions
WHERE session_id = 'test-expired-session-12345678901234567890123456789012';
-- Expected: 0 rows
```

**Evidence:** Save output to `EVIDENCE/06_cleanup_function_YYYYMMDD_HHMMSS.json`

---

### 7. No PII in Payload

```sql
-- Check all event payloads for leaked PII
SELECT
  id,
  event_type,
  event_name,
  payload
FROM client_telemetry_events
WHERE payload::text ~* '(email|phone|name|password|token|secret)';
-- Expected: 0 rows (sanitization working)
```

**Evidence:** Save output to `EVIDENCE/07_no_pii_payload_YYYYMMDD_HHMMSS.json`

---

### 8. IP/UA Hashes Only (No Raw Values)

```sql
-- Verify ip_hash format (16 chars hex)
SELECT
  ip_hash,
  ua_hash,
  LENGTH(ip_hash) as ip_hash_length,
  LENGTH(ua_hash) as ua_hash_length
FROM client_sessions
WHERE ip_hash IS NOT NULL
LIMIT 5;
-- Expected: All ip_hash and ua_hash are 16 chars hex
```

```sql
-- Verify no sessions with invalid hash length
SELECT COUNT(*)
FROM client_sessions
WHERE ip_hash IS NOT NULL AND LENGTH(ip_hash) != 16;
-- Expected: 0 rows
```

**Evidence:** Save output to `EVIDENCE/08_hashes_only_YYYYMMDD_HHMMSS.json`

**RÈGLE:** Mask hash values in evidence (replace with `<HASH_REDACTED>`).

---

## ✅ CRITÈRES DE SUCCÈS

| Test | Expected | Status |
|------|----------|--------|
| 1. Migration deployed | 2 tables, 9+ indexes, RLS enabled | ⚠️ Pending |
| 2. Cookie generated | 64-char hex, httpOnly, secure | ⚠️ Pending |
| 3. Anonymous session | client_id = NULL | ⚠️ Pending |
| 4. Session linkage | client_id NOT NULL after form | ⚠️ Pending |
| 5. Event tracking | Events logged with session_id | ⚠️ Pending |
| 6. Cleanup works | Expired sessions deleted | ⚠️ Pending |
| 7. No PII leak | 0 rows with PII in payload | ⚠️ Pending |
| 8. Hashes only | All hashes 16 chars, no raw IP | ⚠️ Pending |

---

## 📦 EVIDENCE FORMAT

All evidence files saved to `EVIDENCE/` directory with format:

```json
{
  "test": "Test Name",
  "timestamp": "2026-01-25T03:15:42.123Z",
  "command": "SQL or bash command executed",
  "result": {
    "rows": [...],
    "row_count": 2
  },
  "status": "✅ PASS" | "❌ FAIL",
  "notes": "Additional observations"
}
```

**Privacy Rules:**
- NO raw emails (mask: `test-***@***.com`)
- NO raw session_ids (mask: `<SESSION_REDACTED>`)
- NO raw IP hashes (mask: `<HASH_REDACTED>`)
- ONLY UUIDs and aggregate counts allowed

---

## 🚀 EXÉCUTION

**To run checklist:**
```bash
# 1. Deploy migration
# (Manual: Supabase Dashboard → SQL Editor → Paste migration → Run)

# 2. Start dev server
npm run dev

# 3. Run all tests above sequentially
# 4. Save evidence files
# 5. Update status column in table above
```

**Final deliverable:** All 8 evidence files + this checklist with ✅ status.

---

**Generated:** 2026-01-25
**Version:** 1.0
**Privacy Level:** Non-PII only
