# 🌐 REQUEST FLOW - Détails Techniques HTTP

**Scenario:** Suite du fraudeur Marc Dubois qui vole l'identité de Marie Tremblay

---

## 📡 REQUEST #1: Page d'accueil (Premier Contact)

### Client → Server

```http
GET / HTTP/1.1
Host: solutionargentrapide.ca
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0
Accept: text/html,application/xhtml+xml
Accept-Language: fr-CA,fr;q=0.9,en;q=0.8
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

**❌ Pas de cookie encore** (première visite)

---

### Middleware Processing (Edge Runtime)

**Fichier:** `src/middleware.ts`

```typescript
// ÉTAPE 1: Check cookie
let sessionId = request.cookies.get('sar_session_id')?.value
// → undefined (pas de cookie)

// ÉTAPE 2: Generate new session ID
sessionId = crypto.randomBytes(32).toString('hex')
// → "abc123def456789..." (64 caractères)

// ÉTAPE 3: Set cookie dans response
response.cookies.set('sar_session_id', sessionId, {
  httpOnly: true,        // ❌ JavaScript ne peut pas lire (XSS protection)
  secure: true,          // ✅ HTTPS seulement
  sameSite: 'lax',       // 🛡️ CSRF protection
  maxAge: 90 * 24 * 60 * 60  // 90 jours
})

// ÉTAPE 4: Pass to API routes
response.headers.set('x-sar-session-id', sessionId)

// ❌ PAS de DB write ici (Edge = trop lent)
```

---

### Server → Client

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Set-Cookie: sar_session_id=abc123def456789...;
            Path=/;
            Expires=Sat, 25 Apr 2026 14:23:15 GMT;
            Max-Age=7776000;
            HttpOnly;
            Secure;
            SameSite=lax
Content-Length: 45230
Cache-Control: private, no-cache

<!DOCTYPE html>
<html>...</html>
```

**✅ Cookie envoyé au browser**

**📊 Timing:**
- Middleware: ~3ms
- Total: ~50ms (incluant render SSR)

---

## 📡 REQUEST #2: Track Page View

Le browser charge du JavaScript qui track la page:

### Client → Server

```http
POST /api/telemetry/track-event HTTP/1.1
Host: solutionargentrapide.ca
User-Agent: Mozilla/5.0 (Windows NT 10.0...)
Cookie: sar_session_id=abc123def456789...
Content-Type: application/json
Content-Length: 124
X-Forwarded-For: 24.48.123.45
X-Real-IP: 24.48.123.45

{
  "event_type": "page_view",
  "event_name": "/",
  "page_url": "/",
  "referrer_url": "https://google.com/search?q=pret+rapide",
  "duration_ms": 0,
  "payload": {
    "scroll_depth": 0
  }
}
```

**✅ Cookie présent** (envoyé automatiquement par browser)

---

### Server Processing (Node Runtime)

**Fichier:** `src/app/api/telemetry/track-event/route.ts`

```typescript
// ========================================
// ÉTAPE 1: Extract session_id from cookie
// ========================================
const sessionId = request.cookies.get('sar_session_id')?.value
// → "abc123def456789..."

if (!sessionId) {
  return NextResponse.json({ error: 'No session ID' }, { status: 400 })
}

// ========================================
// ÉTAPE 2: Rate Limiting
// ========================================
const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]
// → "24.48.123.45"

const rateLimit = await rateLimitFormSubmission(clientIP)
// → { allowed: true, remaining: 19, resetAt: Date }

if (!rateLimit.allowed) {
  return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
}

// ========================================
// ÉTAPE 3: Session exists in DB?
// ========================================
const { data: existingSession } = await supabase
  .from('client_sessions')
  .select('session_id')
  .eq('session_id', sessionId)
  .maybeSingle()

// → null (première request, pas encore en DB)

if (!existingSession) {
  // ========================================
  // ÉTAPE 3A: Create anonymous session
  // ========================================
  await supabase
    .from('client_sessions')
    .insert({
      session_id: sessionId,
      client_id: null,  // ⚪️ ANONYME
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    })

  // SQL exécuté:
  /*
    INSERT INTO client_sessions
      (session_id, client_id, last_activity_at, expires_at)
    VALUES
      ('abc123def456789...', NULL, NOW(), NOW() + INTERVAL '90 days');
  */
}

// ========================================
// ÉTAPE 4: Parse request body
// ========================================
const body = await request.json()
/*
{
  event_type: "page_view",
  event_name: "/",
  page_url: "/",
  referrer_url: "https://google.com/search?q=pret+rapide",
  duration_ms: 0,
  payload: { scroll_depth: 0 }
}
*/

// ========================================
// ÉTAPE 5: Sanitize payload (strip PII)
// ========================================
const sanitizedPayload = sanitizePayload(body.payload)
// → { scroll_depth: 0 }  ✅ Aucun PII

// If payload contained email:
// { scroll_depth: 0, email: "test@example.com" }
// → { scroll_depth: 0 }  ❌ Email stripped

// ========================================
// ÉTAPE 6: Strip query params from URLs
// ========================================
const cleanReferrerUrl = stripQueryParams(body.referrer_url)
// "https://google.com/search?q=pret+rapide"
// → "https://google.com/search"  ✅ Privacy

// ========================================
// ÉTAPE 7: Insert event
// ========================================
const { data, error } = await supabase
  .from('client_telemetry_events')
  .insert({
    session_id: sessionId,
    trace_id: request.headers.get('x-trace-id'),  // For tracing
    event_type: 'page_view',
    event_name: '/',
    page_url: '/',
    referrer_url: 'https://google.com/search',
    duration_ms: 0,
    payload: { scroll_depth: 0 }
  })
  .select('id')
  .single()

// SQL exécuté:
/*
  INSERT INTO client_telemetry_events
    (session_id, event_type, event_name, page_url, referrer_url, duration_ms, payload)
  VALUES
    ('abc123def456789...', 'page_view', '/', '/', 'https://google.com/search', 0, '{"scroll_depth":0}');

  RETURNING id;
*/

// → { id: "event-uuid-123" }
```

---

### Server → Client

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 67
X-Request-Id: req-xyz789

{
  "success": true,
  "event_id": "event-uuid-123"
}
```

**📊 Timing:**
- Rate limiting check: ~5ms
- Session check/create: ~50ms
- Event insert: ~40ms
- Total: ~100ms

**💾 État DB après cette request:**
```sql
-- client_sessions (1 row)
session_id: 'abc123def456789...'
client_id: NULL  -- ⚪️ Anonyme
created_at: '2026-01-25 14:23:15'

-- client_telemetry_events (1 row)
session_id: 'abc123def456789...'
event_type: 'page_view'
event_name: '/'
created_at: '2026-01-25 14:23:15'
```

---

## 📡 REQUEST #3-6: Navigation (Multiple Events)

Le fraudeur navigue:
- `/demande-de-pret` → track
- Form step 1 → track
- Form step 2 → track
- Form step 3 → track

**Chaque request ressemble à #2** mais avec event_name différent.

**📊 État DB après navigation:**
```sql
-- client_telemetry_events (5 rows)
14:23:15 → page_view: /
14:23:45 → page_view: /demande-de-pret
14:24:10 → form_start: step_1
14:24:58 → form_step: step_2
14:25:30 → form_step: step_3
```

**⚪️ Session toujours ANONYME** (client_id = NULL)

---

## 📡 REQUEST #7: Form Submit (🚨 LA FRAUDE)

### Client → Server

```http
POST /api/applications/submit HTTP/1.1
Host: solutionargentrapide.ca
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
Cookie: sar_session_id=abc123def456789...
Content-Type: application/json
Content-Length: 1543
X-Forwarded-For: 24.48.123.45
X-Real-IP: 24.48.123.45
Referer: https://solutionargentrapide.ca/demande-de-pret-en-ligne-formulaire

{
  "origin": "argentrapide",
  "prenom": "Marie",
  "nom": "Tremblay",
  "courriel": "marie.tremblay@gmail.com",
  "telephone": "514-555-1234",
  "date_naissance": "1985-03-15",
  "adresse_rue": "123 Rue Principale",
  "adresse_ville": "Montréal",
  "adresse_province": "QC",
  "adresse_code_postal": "H1A 1A1",
  "montant_demande": 10000,
  "raison_pret": "consolidation_dettes",
  "duree_pret_mois": 36,
  "statut_emploi": "salarie",
  "employeur": "Acme Corp",
  "poste": "Gestionnaire",
  "revenu_annuel": 65000,
  "institution_financiere": "Desjardins",
  "transit": "81510",
  "numero_compte": "1234567",
  "type_compte": "cheque",
  ...
}
```

**🚨 DONNÉES SENSIBLES** (identité volée)

---

### Server Processing (Node Runtime)

**Fichier:** `src/app/api/applications/submit/route.ts`

```typescript
// ========================================
// ÉTAPE 1: Rate Limiting
// ========================================
const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]
// → "24.48.123.45"

const rateLimit = await rateLimitFormSubmission(clientIP)
// Max: 3 submissions/hour per IP

if (!rateLimit.allowed) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}

// ========================================
// ÉTAPE 2: Validation (38 fields)
// ========================================
const body = await request.json()
const validation = validateLoanApplication(body)

if (!validation.valid) {
  // Log validation errors
  return NextResponse.json({
    success: false,
    errors: validation.errors
  }, { status: 400 })
}

// ========================================
// ÉTAPE 3: Generate reference
// ========================================
const reference = await generateUniqueReference()
// → "SAR-LP-000123"

// ========================================
// ÉTAPE 4: Insert loan application (DRAFT)
// ========================================
const { data: application, error: insertError } = await supabase
  .from('loan_applications')
  .insert({
    reference: 'SAR-LP-000123',
    origin: 'argentrapide',
    status: 'draft',
    prenom: 'Marie',
    nom: 'Tremblay',
    courriel: 'marie.tremblay@gmail.com',
    telephone: '514-555-1234',
    montant_demande: 10000,
    // ... 38 champs
    ip_address: '24.48.123.45',  // Temporaire (30j)
    user_agent: 'Mozilla/5.0...',
    form_completed_at: new Date().toISOString()
  })
  .select()
  .single()

// SQL exécuté:
/*
  INSERT INTO loan_applications
    (reference, origin, status, prenom, nom, courriel, ..., ip_address, user_agent)
  VALUES
    ('SAR-LP-000123', 'argentrapide', 'draft', 'Marie', 'Tremblay', 'marie.tremblay@gmail.com', ..., '24.48.123.45', 'Mozilla/5.0...')
  RETURNING *;
*/

// → application.id = "loan-uuid-456"

// ========================================
// ÉTAPE 5: 🔐 TELEMETRY LINKAGE (CRUCIAL)
// ========================================
const sessionId = request.cookies.get('sar_session_id')?.value
const userAgent = request.headers.get('user-agent')

if (sessionId && body.courriel) {
  // ────────────────────────────────────
  // A. Find or create CLIENT
  // ────────────────────────────────────
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('primary_email', body.courriel)
    .maybeSingle()

  let clientId: string | undefined

  if (existingClient) {
    // Client existe déjà (possiblement vraie victime avait un compte)
    clientId = existingClient.id
  } else {
    // Créer NOUVEAU client (première fraude avec cette identité)
    const { data: newClient } = await supabase
      .from('clients')
      .insert({
        primary_email: body.courriel,
        primary_phone: body.telephone,
        first_name: body.prenom,
        last_name: body.nom,
        dob: body.date_naissance,
        status: 'active'
      })
      .select('id')
      .single()

    clientId = newClient.id

    // SQL exécuté:
    /*
      INSERT INTO clients
        (primary_email, first_name, last_name, ...)
      VALUES
        ('marie.tremblay@gmail.com', 'Marie', 'Tremblay', ...)
      RETURNING id;
    */
  }

  // Validation
  if (!clientId) {
    console.error('[Telemetry] clientId undefined, skipping')
    return  // Safe failure
  }

  // ────────────────────────────────────
  // B. Parse metadata SERVER-SIDE
  // ────────────────────────────────────
  const parsedUA = parseUserAgent(userAgent)
  /*
    Input: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"

    Output: {
      device_type: "Desktop",
      browser: "Chrome",
      os: "Windows 10"
    }
  */

  // ────────────────────────────────────
  // C. Extract referrer & UTM
  // ────────────────────────────────────
  const referrer = stripQueryParams(request.headers.get('referer'))
  // "https://solutionargentrapide.ca/formulaire?utm_source=google"
  // → "https://solutionargentrapide.ca/formulaire"

  const utmSource = request.nextUrl.searchParams.get('utm_source')
  const utmMedium = request.nextUrl.searchParams.get('utm_medium')
  const utmCampaign = request.nextUrl.searchParams.get('utm_campaign')

  // ────────────────────────────────────
  // D. Hash IP/UA (PRIVACY + FRAUD)
  // ────────────────────────────────────
  const salt = process.env.TELEMETRY_HASH_SALT
  // → "95c2bec3908f3fe99257d2d2237e56e0cd144776c2f001e6df359d455a23bff2"

  if (!salt) {
    console.error('[SECURITY] TELEMETRY_HASH_SALT not set')
    return  // Safe failure
  }

  const ipHash = createHash('sha256')
    .update(clientIP + salt)
    .digest('hex')
    .substring(0, 16)
  // "24.48.123.45" + salt
  // → SHA256: "a3f7b2e1c4d8912f..."
  // → First 16 chars: "a3f7b2e1c4d8912f"

  const uaHash = createHash('sha256')
    .update(userAgent + salt)
    .digest('hex')
    .substring(0, 16)
  // "Mozilla/5.0..." + salt
  // → SHA256: "d9e2f1a8b5c3764a..."
  // → First 16 chars: "d9e2f1a8b5c3764a"

  // ────────────────────────────────────
  // E. UPSERT SESSION (🚨 LE LINKAGE!)
  // ────────────────────────────────────
  await supabase
    .from('client_sessions')
    .upsert({
      session_id: sessionId,
      client_id: clientId,             // ✅ PLUS ANONYME!
      linked_via: 'form_submit',       // 🚨 MARQUEUR
      linked_at: new Date().toISOString(),  // ⏰ TIMESTAMP EXACT
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      // EMPREINTE FRAUDEUR:
      ip_hash: ipHash,                 // "a3f7b2e1c4d8912f"
      ua_hash: uaHash,                 // "d9e2f1a8b5c3764a"
      device_type: parsedUA.device_type,  // "Desktop"
      browser: parsedUA.browser,       // "Chrome"
      os: parsedUA.os,                 // "Windows 10"
      first_referrer: referrer,
      first_utm_source: utmSource,
      first_utm_medium: utmMedium,
      first_utm_campaign: utmCampaign
    }, {
      onConflict: 'session_id',
      ignoreDuplicates: false
    })

  // SQL exécuté:
  /*
    INSERT INTO client_sessions
      (session_id, client_id, linked_via, linked_at, ip_hash, ua_hash, device_type, browser, os, ...)
    VALUES
      ('abc123def456789...', 'client-uuid-789', 'form_submit', NOW(), 'a3f7b2e1c4d8912f', 'd9e2f1a8b5c3764a', 'Desktop', 'Chrome', 'Windows 10', ...)
    ON CONFLICT (session_id) DO UPDATE SET
      client_id = EXCLUDED.client_id,
      linked_via = EXCLUDED.linked_via,
      linked_at = EXCLUDED.linked_at,
      ...;
  */
}

// ========================================
// ÉTAPE 6: Submit to Margill
// ========================================
const margillResponse = await margillClient.submitApplication(body)

if (margillResponse.success) {
  await supabase
    .from('loan_applications')
    .update({
      status: 'submitted',
      margill_response: margillResponse,
      submitted_at: new Date().toISOString()
    })
    .eq('id', application.id)
}

// ========================================
// ÉTAPE 7: Return response
// ========================================
return NextResponse.json({
  success: true,
  data: {
    reference: 'SAR-LP-000123',
    status: 'submitted',
    message: 'Votre demande a été soumise avec succès!'
  }
}, { status: 200 })
```

---

### Server → Client

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 145
X-Request-Id: req-abc123

{
  "success": true,
  "data": {
    "reference": "SAR-LP-000123",
    "status": "submitted",
    "message": "Votre demande a été soumise avec succès!"
  }
}
```

**📊 Timing:**
- Validation: ~10ms
- DB inserts (3 tables): ~200ms
- Margill submission: ~800ms
- Total: ~1100ms

**💾 État DB FINAL après cette request:**

```sql
-- clients (1 new row)
id: 'client-uuid-789'
primary_email: 'marie.tremblay@gmail.com'
first_name: 'Marie'
last_name: 'Tremblay'

-- client_sessions (1 row UPDATED)
session_id: 'abc123def456789...'
client_id: 'client-uuid-789'  ✅ LIEN ÉTABLI
linked_via: 'form_submit'
linked_at: '2026-01-25 14:26:05'
ip_hash: 'a3f7b2e1c4d8912f'  🔍 EMPREINTE
ua_hash: 'd9e2f1a8b5c3764a'  🔍 EMPREINTE
device_type: 'Desktop'
browser: 'Chrome'
os: 'Windows 10'

-- client_telemetry_events (5 rows - unchanged)
-- Tous les events toujours liés via session_id

-- loan_applications (1 new row)
reference: 'SAR-LP-000123'
status: 'submitted'
prenom: 'Marie'
courriel: 'marie.tremblay@gmail.com'
montant_demande: 10000
```

---

## 🎯 RÉSUMÉ DU FLOW HTTP

```
Request #1 (GET /)
  → Middleware génère cookie
  → Browser stocke cookie
  → Durée: ~50ms

Request #2-6 (POST /api/telemetry/track-event) x5
  → Session anonyme créée (1ère fois)
  → Events insérés (page_view, form_start, form_step)
  → Session reste anonyme (client_id = NULL)
  → Durée: ~100ms chacun

Request #7 (POST /api/applications/submit) 🚨
  → Validation 38 champs
  → Insert loan_application
  → Find/create client
  → UPDATE session (linkage!)
    • client_id: NULL → uuid-789 ✅
    • ip_hash, ua_hash capturés
    • device/browser/os parsés
  → Submit to Margill
  → Durée: ~1100ms
```

**🔗 LINKAGE ÉTABLI:** Session anonyme → Identité client

**🎯 Pour la police:** On peut maintenant tracer le fraudeur via ip_hash/ua_hash!

---

## 📊 Performance Metrics

| Request | Latency | DB Queries | External Calls |
|---------|---------|------------|----------------|
| GET / | 50ms | 0 | 0 |
| Track event #1 | 100ms | 2 (insert session + event) | 0 |
| Track event #2-5 | 50ms | 2 (update activity + insert event) | 0 |
| Submit form | 1100ms | 4 (insert app, client, update session, update app) | 1 (Margill) |

**Total session:** ~1.5 seconds (overhead télémétrie négligeable)
