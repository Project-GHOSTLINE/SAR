# SECURITY PASS - BEFORE/AFTER Summary

**Date:** 2026-01-25
**Objective:** Harden telemetry system against client-side tampering and enforce privacy controls
**Status:** ✅ COMPLETE

---

## 🔐 SECURITY FIXES IMPLEMENTED

### 1. TELEMETRY_HASH_SALT Mandatory (NO Fallback)

**BEFORE (INSECURE):**
```typescript
function hashWithSalt(value: string): string {
  const salt = process.env.TELEMETRY_HASH_SALT || 'sar-telemetry-2026'  // ❌ INSECURE
  return createHash('sha256').update(value + salt).digest('hex').substring(0, 16)
}
```

**AFTER (SECURE):**
```typescript
function hashWithSalt(value: string): string | null {
  const salt = process.env.TELEMETRY_HASH_SALT

  if (!salt) {
    console.error('[SECURITY] TELEMETRY_HASH_SALT not set - skipping hash')
    return null  // ✅ No fallback, fail safe
  }

  return createHash('sha256').update(value + salt).digest('hex').substring(0, 16)
}
```

**Impact:**
- ❌ BEFORE: Hardcoded fallback salt = predictable hashes = security theater
- ✅ AFTER: Missing salt = telemetry skipped = safe failure, forces proper config

**File:** `src/app/api/applications/submit/route.ts:47-59`

---

### 2. Server-Side UA Parsing (Don't Trust Client Body)

**BEFORE (VULNERABLE):**
```typescript
// Client can send fake device data
device_type: body.client_device,    // ❌ Falsifiable
browser: body.client_browser,       // ❌ Falsifiable
os: body.client_os,                 // ❌ Falsifiable
```

**AFTER (HARDENED):**
```typescript
// Server parses User-Agent header (unfalsifiable by client JS)
const parsedUA = parseUserAgent(request.headers.get('user-agent'))  // ✅ Server-side

device_type: parsedUA.device_type,  // ✅ Trusted source
browser: parsedUA.browser,          // ✅ Trusted source
os: parsedUA.os,                    // ✅ Trusted source
```

**Impact:**
- ❌ BEFORE: Client JS can spoof device type (analytics poisoning)
- ✅ AFTER: UA parsed from HTTP headers (tamper-proof at JS level)

**Files:**
- `src/lib/utils/ua-parser.ts:18-72` (NEW - server-side parser)
- `src/app/api/applications/submit/route.ts:270-271`

---

### 3. Referrer from HTTP Header (Not Body)

**BEFORE (VULNERABLE):**
```typescript
first_referrer: body.referrer,  // ❌ Falsifiable
```

**AFTER (HARDENED):**
```typescript
const referrer = stripQueryParams(request.headers.get('referer'))  // ✅ HTTP header

first_referrer: referrer,  // ✅ Trusted source
```

**Impact:**
- ❌ BEFORE: Client can claim fake referrer (attribution fraud)
- ✅ AFTER: Referrer from HTTP header (set by browser, not JS)

**Files:**
- `src/lib/utils/ua-parser.ts:77-87` (stripQueryParams helper)
- `src/app/api/applications/submit/route.ts:272`

---

### 4. UTM from Query Params (Not Body)

**BEFORE (VULNERABLE):**
```typescript
first_utm_source: body.utm_source,      // ❌ Falsifiable
first_utm_medium: body.utm_medium,      // ❌ Falsifiable
first_utm_campaign: body.utm_campaign,  // ❌ Falsifiable
```

**AFTER (HARDENED):**
```typescript
const utmSource = request.nextUrl.searchParams.get('utm_source')      // ✅ URL params
const utmMedium = request.nextUrl.searchParams.get('utm_medium')      // ✅ URL params
const utmCampaign = request.nextUrl.searchParams.get('utm_campaign')  // ✅ URL params

first_utm_source: utmSource,    // ✅ Trusted source
first_utm_medium: utmMedium,    // ✅ Trusted source
first_utm_campaign: utmCampaign,// ✅ Trusted source
```

**Impact:**
- ❌ BEFORE: Client can claim fake campaign source (marketing fraud)
- ✅ AFTER: UTM extracted from URL query params (visible in browser, auditable)

**File:** `src/app/api/applications/submit/route.ts:273-275`

---

### 5. clientId Validation Before Upsert

**BEFORE (UNSAFE):**
```typescript
let clientId: string  // ❌ Can be undefined if client creation fails

// ... client creation logic ...

if (clientId) {  // ❌ TypeScript allows undefined here
  await supabase.from('client_sessions').upsert({ client_id: clientId, ... })
}
```

**AFTER (SAFE):**
```typescript
let clientId: string | undefined  // ✅ Explicit undefined type

// ... client creation logic ...

// SECURITY: Only proceed if clientId is defined
if (!clientId) {
  console.error('[Telemetry] clientId undefined, skipping session linkage')
  return  // ✅ Early exit, no upsert attempt
}

await supabase.from('client_sessions').upsert({ client_id: clientId, ... })
```

**Impact:**
- ❌ BEFORE: Undefined clientId could cause FK constraint violation
- ✅ AFTER: Explicit validation prevents database errors, safe failure

**File:** `src/app/api/applications/submit/route.ts:236, 264-268`

---

### 6. Rate Limiting on Track-Event Endpoint

**BEFORE (VULNERABLE):**
```typescript
// No rate limiting, open to abuse
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('sar_session_id')?.value
  // ... process event
}
```

**AFTER (HARDENED):**
```typescript
export async function POST(request: NextRequest) {
  // 0. RATE LIMITING: Prevent abuse (20 events per minute per IP)
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  const rateLimit = await rateLimitFormSubmission(clientIP)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.', resetAt: rateLimit.resetAt },
      { status: 429 }
    )
  }

  // ... process event
}
```

**Impact:**
- ❌ BEFORE: Attacker can spam telemetry events (DB bloat, cost)
- ✅ AFTER: 20 events/minute limit per IP (prevents abuse)

**File:** `src/app/api/telemetry/track-event/route.ts:20-36`

---

### 7. Hash Validation Before Upsert

**BEFORE (UNSAFE):**
```typescript
// Hash might be null if salt missing, but still used
ip_hash: hashWithSalt(clientIP),  // ❌ Could be null
ua_hash: hashWithSalt(userAgent), // ❌ Could be null
```

**AFTER (SAFE):**
```typescript
// Compute hashes
const ipHash = clientIP !== 'unknown' ? hashWithSalt(clientIP) : null
const uaHash = userAgent !== 'unknown' ? hashWithSalt(userAgent) : null

// SECURITY: Skip telemetry if salt is missing
if ((clientIP !== 'unknown' && !ipHash) || (userAgent !== 'unknown' && !uaHash)) {
  console.error('[Telemetry] TELEMETRY_HASH_SALT not set, skipping session linkage')
  return  // ✅ Safe exit, no partial data
}

// Use validated hashes
ip_hash: ipHash,  // ✅ Guaranteed not null if we reach here
ua_hash: uaHash,  // ✅ Guaranteed not null if we reach here
```

**Impact:**
- ❌ BEFORE: Null hashes stored if salt missing (incomplete data)
- ✅ AFTER: Telemetry completely skipped if salt missing (all-or-nothing)

**File:** `src/app/api/applications/submit/route.ts:277-285`

---

## 📋 VERIFICATION CHECKLIST

Run the verification script to test all fixes:

```bash
chmod +x audit_artifacts/telemetry/SECURITY_PASS_VERIFICATION.sh
./audit_artifacts/telemetry/SECURITY_PASS_VERIFICATION.sh
```

### Manual Tests

#### Test 1: Salt Mandatory
```bash
# 1. Remove TELEMETRY_HASH_SALT from .env.local
# 2. Submit loan application form
# 3. Check console logs:
# EXPECTED: "[SECURITY] TELEMETRY_HASH_SALT not set - skipping hash"
# EXPECTED: "[Telemetry] TELEMETRY_HASH_SALT not set, skipping session linkage"

# 4. Verify in Supabase:
SELECT client_id FROM client_sessions WHERE session_id = '<your-session-id>';
-- EXPECTED: 0 rows (session linkage skipped)
```

#### Test 2: Server-Side UA Parsing
```bash
# 1. Submit form with Chrome browser
# 2. Intercept request, change body.client_device to "FakeDevice"
# 3. Check DB:

SELECT device_type, browser, os FROM client_sessions
ORDER BY created_at DESC LIMIT 1;

-- EXPECTED: device_type = 'Desktop' (from real UA header)
-- EXPECTED: browser = 'Chrome' (from real UA header)
-- NOT: device_type = 'FakeDevice' (body value ignored)
```

#### Test 3: Referrer from Header
```bash
# 1. Visit form from Google search (referrer = https://google.com)
# 2. Intercept request, change body.referrer to "https://fake.com"
# 3. Check DB:

SELECT first_referrer FROM client_sessions
ORDER BY created_at DESC LIMIT 1;

-- EXPECTED: first_referrer = 'https://google.com' (from HTTP header)
-- NOT: first_referrer = 'https://fake.com' (body value ignored)
```

#### Test 4: UTM from URL
```bash
# 1. Visit form via URL: http://localhost:3001/applications?utm_source=google&utm_campaign=test
# 2. Submit form
# 3. Check DB:

SELECT first_utm_source, first_utm_campaign FROM client_sessions
ORDER BY created_at DESC LIMIT 1;

-- EXPECTED: first_utm_source = 'google' (from URL)
-- EXPECTED: first_utm_campaign = 'test' (from URL)
```

#### Test 5: Rate Limiting
```bash
# Send 25 rapid requests to track-event endpoint
for i in {1..25}; do
  curl -X POST http://localhost:3001/api/telemetry/track-event \
    -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
    -H "Content-Type: application/json" \
    -d '{"event_type":"page_view","event_name":"/test","payload":{"step":1}}'
done

# EXPECTED: First 20 requests → 200 OK
# EXPECTED: Requests 21-25 → 429 Rate Limit Exceeded
```

#### Test 6: PII Sanitization
```bash
curl -X POST http://localhost:3001/api/telemetry/track-event \
  -H "Cookie: sar_session_id=$(openssl rand -hex 32)" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "form_interaction",
    "event_name": "/test",
    "payload": {
      "step": 1,
      "email": "test@example.com",
      "phone": "514-555-1234",
      "secret": "abc123"
    }
  }'

# Check DB:
SELECT payload FROM client_telemetry_events ORDER BY created_at DESC LIMIT 1;
-- EXPECTED: {"step": 1}
-- NOT: email, phone, secret (stripped by sanitizer)
```

#### Test 7: clientId Validation
```bash
# 1. Temporarily break clients table (e.g., add duplicate email constraint)
# 2. Submit form with email that causes constraint violation
# 3. Check console logs:
# EXPECTED: "[Telemetry] Failed to create client: <error>"
# EXPECTED: "[Telemetry] clientId undefined, skipping session linkage"

# 4. Verify no session upsert attempted (no FK violation error)
```

---

## 🎯 SECURITY GUARANTEES

After this security pass:

1. ✅ **No Hardcoded Secrets**: Salt is mandatory env var, no fallback
2. ✅ **Tamper-Proof Metadata**: Device/browser/OS from server-parsed UA headers
3. ✅ **Audit Trail Integrity**: Referrer/UTM from HTTP/URL, not client body
4. ✅ **Safe Failures**: Missing clientId/salt = skip telemetry, don't crash
5. ✅ **Rate Limiting**: 20 events/min per IP prevents abuse
6. ✅ **PII Protection**: Sanitizer strips email/phone/secrets from payloads
7. ✅ **Type Safety**: Explicit `undefined` handling prevents DB constraint violations

---

## 📁 FILES MODIFIED

| File | Lines Changed | Type |
|------|---------------|------|
| `src/app/api/applications/submit/route.ts` | 47-59, 236, 264-310 | MODIFIED |
| `src/app/api/telemetry/track-event/route.ts` | 3, 20-36 | MODIFIED |
| `src/lib/utils/ua-parser.ts` | 1-88 | NEW |
| `audit_artifacts/telemetry/SECURITY_PASS_VERIFICATION.sh` | 1-150 | NEW |
| `audit_artifacts/telemetry/SECURITY_PASS_SUMMARY.md` | THIS FILE | NEW |

---

## ⚠️ BREAKING CHANGES

**None** - All changes are backward compatible:
- Old sessions without device_type still valid
- Missing salt = skip telemetry (graceful degradation)
- Body fields (`body.client_device`, etc.) ignored but not rejected

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Set `TELEMETRY_HASH_SALT` in Vercel environment variables (32+ char random string)
- [ ] Run verification script on staging environment
- [ ] Verify rate limiting works (attempt 25 rapid requests)
- [ ] Monitor console logs for security warnings
- [ ] Confirm no PII in `client_telemetry_events.payload` (SQL query)

---

**Generated:** 2026-01-25
**Version:** 1.0
**Privacy Level:** Enhanced (server-side trust, client-side verification)
