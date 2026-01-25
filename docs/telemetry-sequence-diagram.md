# 🔄 SEQUENCE DIAGRAM - Interactions Temporelles

**Format:** UML Sequence Diagram (formel, pour documentation technique)

---

## 📐 Scénario Complet: Fraude d'Identité

```
┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────┐
│ Fraudeur │  │ Middleware │  │ Track-Event  │  │  Submit  │  │ Supabase│
│ (Browser)│  │   (Edge)   │  │     API      │  │   API    │  │   DB    │
└────┬─────┘  └─────┬──────┘  └──────┬───────┘  └────┬─────┘  └────┬────┘
     │              │                │               │             │
     │ GET /        │                │               │             │
     │─────────────>│                │               │             │
     │              │                │               │             │
     │              │ Generate       │               │             │
     │              │ session_id     │               │             │
     │              │ (64-char hex)  │               │             │
     │              │                │               │             │
     │ 200 OK       │                │               │             │
     │ Set-Cookie   │                │               │             │
     │<─────────────│                │               │             │
     │              │                │               │             │
     ├─ Cookie stored in browser ───────────────────────────────────┤
     │                               │               │             │
     │ Page loads, JS tracks event   │               │             │
     │                               │               │             │
     │ POST /api/telemetry/track-event               │             │
     │ Cookie: sar_session_id=abc... │               │             │
     │ Body: { event_type: "page_view", ... }        │             │
     │──────────────────────────────>│               │             │
     │                               │               │             │
     │                               │ Extract       │             │
     │                               │ session_id    │             │
     │                               │ from cookie   │             │
     │                               │               │             │
     │                               │ Check session │             │
     │                               │ exists?       │             │
     │                               │──────────────────────────>  │
     │                               │               │             │
     │                               │               │   SELECT    │
     │                               │               │   session   │
     │                               │               │             │
     │                               │ ← NULL        │             │
     │                               │<──────────────────────────  │
     │                               │               │             │
     │                               │ Insert        │             │
     │                               │ anonymous     │             │
     │                               │ session       │             │
     │                               │──────────────────────────>  │
     │                               │               │             │
     │                               │               │   INSERT    │
     │                               │               │   client_   │
     │                               │               │   sessions  │
     │                               │               │   (client_  │
     │                               │               │    id=NULL) │
     │                               │               │             │
     │                               │ ← OK          │             │
     │                               │<──────────────────────────  │
     │                               │               │             │
     │                               │ Sanitize      │             │
     │                               │ payload       │             │
     │                               │               │             │
     │                               │ Insert event  │             │
     │                               │──────────────────────────>  │
     │                               │               │             │
     │                               │               │   INSERT    │
     │                               │               │   client_   │
     │                               │               │   telemetry │
     │                               │               │   _events   │
     │                               │               │             │
     │                               │ ← event_id    │             │
     │                               │<──────────────────────────  │
     │                               │               │             │
     │ 200 OK                        │               │             │
     │ { success: true, event_id }   │               │             │
     │<──────────────────────────────│               │             │
     │                               │               │             │
     ├─ Repeat for each page/action (page_view, form_start, etc) ─┤
     │                               │               │             │
     │ [Time passes: 2min 50s]       │               │             │
     │                               │               │             │
     │ User fills form with stolen identity          │             │
     │                               │               │             │
     │ POST /api/applications/submit │               │             │
     │ Cookie: sar_session_id=abc... │               │             │
     │ Body: { prenom: "Marie", ... }│               │             │
     │────────────────────────────────────────────────>            │
     │                               │               │             │
     │                               │               │ Rate limit  │
     │                               │               │ check       │
     │                               │               │             │
     │                               │               │ Validate    │
     │                               │               │ 38 fields   │
     │                               │               │             │
     │                               │               │ Generate    │
     │                               │               │ reference   │
     │                               │               │ SAR-LP-     │
     │                               │               │ 000123      │
     │                               │               │             │
     │                               │               │ Insert loan │
     │                               │               │ application │
     │                               │               │────────────>│
     │                               │               │             │
     │                               │               │   INSERT    │
     │                               │               │   loan_     │
     │                               │               │   appli     │
     │                               │               │   cations   │
     │                               │               │   (status:  │
     │                               │               │    draft)   │
     │                               │               │             │
     │                               │               │<────────────│
     │                               │               │             │
     │                               │               │ ╔═══════════════════════╗
     │                               │               │ ║ TELEMETRY LINKAGE     ║
     │                               │               │ ║ (CRITICAL SECTION)    ║
     │                               │               │ ╚═══════════════════════╝
     │                               │               │             │
     │                               │               │ Find client │
     │                               │               │ by email    │
     │                               │               │────────────>│
     │                               │               │             │
     │                               │               │   SELECT id │
     │                               │               │   FROM      │
     │                               │               │   clients   │
     │                               │               │   WHERE     │
     │                               │               │   email=... │
     │                               │               │             │
     │                               │               │<────────────│
     │                               │               │ ← NULL      │
     │                               │               │             │
     │                               │               │ Create new  │
     │                               │               │ client      │
     │                               │               │────────────>│
     │                               │               │             │
     │                               │               │   INSERT    │
     │                               │               │   clients   │
     │                               │               │   (email,   │
     │                               │               │    name,    │
     │                               │               │    phone)   │
     │                               │               │             │
     │                               │               │<────────────│
     │                               │               │ ← client_id │
     │                               │               │             │
     │                               │               │ Parse UA    │
     │                               │               │ (server)    │
     │                               │               │ → device,   │
     │                               │               │   browser,  │
     │                               │               │   os        │
     │                               │               │             │
     │                               │               │ Hash IP/UA  │
     │                               │               │ SHA256+salt │
     │                               │               │ → ip_hash   │
     │                               │               │ → ua_hash   │
     │                               │               │             │
     │                               │               │ UPSERT      │
     │                               │               │ session     │
     │                               │               │ (LINKAGE!)  │
     │                               │               │────────────>│
     │                               │               │             │
     │                               │               │   UPDATE    │
     │                               │               │   client_   │
     │                               │               │   sessions  │
     │                               │               │   SET       │
     │                               │               │   client_id │
     │                               │               │   =uuid,    │
     │                               │               │   linked_   │
     │                               │               │   via=      │
     │                               │               │   'form_    │
     │                               │               │   submit',  │
     │                               │               │   ip_hash,  │
     │                               │               │   ua_hash,  │
     │                               │               │   device... │
     │                               │               │   WHERE     │
     │                               │               │   session_  │
     │                               │               │   id=...    │
     │                               │               │             │
     │                               │               │<────────────│
     │                               │               │ ← OK        │
     │                               │               │             │
     │                               │               │ ╔═══════════════════════╗
     │                               │               │ ║ SESSION NOW LINKED!   ║
     │                               │               │ ║ Fraudeur captured     ║
     │                               │               │ ╚═══════════════════════╝
     │                               │               │             │
     │                               │               │ Submit to   │
     │                               │               │ Margill     │
     │                               │               │             │
     │                               │               │ ┌─────────────────┐
     │                               │               │ │ Margill API     │
     │                               │               │ │ (external)      │
     │                               │               │ └────────┬────────┘
     │                               │               │          │
     │                               │               │ POST     │
     │                               │               │─────────>│
     │                               │               │          │
     │                               │               │          │ Process
     │                               │               │          │ loan
     │                               │               │          │
     │                               │               │ ← OK     │
     │                               │               │<─────────│
     │                               │               │          │
     │                               │               │ Update    │
     │                               │               │ loan      │
     │                               │               │ status    │
     │                               │               │────────────>
     │                               │               │             │
     │                               │               │   UPDATE    │
     │                               │               │   loan_     │
     │                               │               │   appli     │
     │                               │               │   cations   │
     │                               │               │   SET       │
     │                               │               │   status=   │
     │                               │               │   'submit   │
     │                               │               │   ted'      │
     │                               │               │             │
     │                               │               │<────────────│
     │                               │               │             │
     │ 200 OK                        │               │             │
     │ { success: true,              │               │             │
     │   reference: "SAR-LP-000123" }│               │             │
     │<────────────────────────────────────────────────            │
     │                               │               │             │
     ├─ Fraudeur croit que tout est OK ─────────────────────────────┤
     │                               │               │             │
     │                               │               │             │
     ╧                               ╧               ╧             ╧
```

---

## ⏱️ TIMING ANNOTATIONS

```
T0     = 14:23:15.000 → GET / (First visit)
T0+50ms              → Cookie set, page rendered

T1     = 14:23:15.200 → POST track-event (page_view /)
T1+100ms             → Session created, event logged

T2     = 14:23:45.100 → POST track-event (page_view /demande-de-pret)
T2+50ms              → Event logged (session exists)

T3     = 14:24:10.300 → POST track-event (form_start)
T3+50ms              → Event logged

T4     = 14:24:58.800 → POST track-event (form_step step_2)
T4+50ms              → Event logged

T5     = 14:25:30.200 → POST track-event (form_step step_3)
T5+50ms              → Event logged

T6     = 14:26:05.000 → POST /api/applications/submit 🚨
T6+10ms              → Rate limit check
T6+20ms              → Validation complete
T6+120ms             → Loan application inserted
T6+150ms             → Client found/created
T6+160ms             → UA parsed, IP/UA hashed
T6+200ms             → Session LINKED ✅
T6+1000ms            → Margill submission complete
T6+1100ms            → Response sent

Total session duration: 2min 50s (170 seconds)
Form fill time: 2min 50s (suspicious if < 60s)
```

---

## 🔍 STATE TRANSITIONS

### Session State Machine

```
┌──────────────────────────────────────────────────┐
│ STATE 1: NO SESSION                              │
│   Browser has no cookie                          │
│   Database: no rows                              │
└───────────┬──────────────────────────────────────┘
            │
            │ Middleware: Generate session_id
            │ Action: Set cookie
            │
            ▼
┌──────────────────────────────────────────────────┐
│ STATE 2: COOKIE ONLY                             │
│   Browser: ✅ has cookie                         │
│   Database: ❌ no session row yet                │
└───────────┬──────────────────────────────────────┘
            │
            │ First event: track-event API
            │ Action: INSERT anonymous session
            │
            ▼
┌──────────────────────────────────────────────────┐
│ STATE 3: ANONYMOUS SESSION                       │
│   Browser: ✅ has cookie                         │
│   Database: ✅ session row                       │
│   client_id: ⚪️ NULL                            │
│   Events: N events tracked                       │
└───────────┬──────────────────────────────────────┘
            │
            │ Form submit: /api/applications/submit
            │ Action: UPDATE session with client_id
            │
            ▼
┌──────────────────────────────────────────────────┐
│ STATE 4: LINKED SESSION 🚨                       │
│   Browser: ✅ has cookie                         │
│   Database: ✅ session row                       │
│   client_id: ✅ UUID (client table)              │
│   linked_via: ✅ 'form_submit'                   │
│   ip_hash: ✅ 16-char hex                        │
│   ua_hash: ✅ 16-char hex                        │
│   device_type: ✅ server-parsed                  │
│   Events: N events (now traceable to identity)   │
│                                                  │
│   🎯 FRAUDEUR CAPTURÉ                            │
└──────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY CHECKPOINTS

### Checkpoint 1: Cookie Generation (Middleware)
- ✅ httpOnly (no JS access)
- ✅ secure (HTTPS only)
- ✅ sameSite=lax (CSRF protection)
- ❌ NO DB write (too slow for Edge)

### Checkpoint 2: Event Tracking (track-event API)
- ✅ Rate limiting (20 events/min per IP)
- ✅ Payload sanitization (PII stripped)
- ✅ URL sanitization (query params stripped)
- ✅ Session auto-created if not exists

### Checkpoint 3: Form Submit (submit API)
- ✅ Rate limiting (3 submissions/hour per IP)
- ✅ Field validation (38 fields)
- ✅ Server-side UA parsing (no trust client)
- ✅ IP/UA hashing (SHA256 + salt)
- ✅ Client ID validation (must exist)

### Checkpoint 4: Database
- ✅ Foreign key constraints (referential integrity)
- ✅ RLS policies (service role only)
- ✅ Indexes (performance)
- ✅ TTL (30d events, 90d sessions, 30d hashes)

---

## 📊 DATA CONSISTENCY GUARANTEES

### ACID Properties

**Atomicity:**
```
Loan submission transaction:
  BEGIN;
    INSERT loan_application (draft)
    FIND/CREATE client
    UPDATE session (linkage)
    UPDATE loan_application (submitted)
  COMMIT;

If ANY step fails → ROLLBACK
```

**Consistency:**
```
Foreign key constraints:
  - client_sessions.client_id → clients.id
  - client_telemetry_events.session_id → client_sessions.session_id
  - loan_applications.client_id → clients.id (future)

NULL client_id is VALID (anonymous state)
```

**Isolation:**
```
Read Committed isolation level (PostgreSQL default)
  - No dirty reads
  - Repeatable reads within transaction
  - Phantom reads possible (acceptable for telemetry)
```

**Durability:**
```
Supabase:
  - Synchronous replication (3 zones)
  - Point-in-time recovery (7 days)
  - Automated backups (daily)
```

---

## 🎯 POUR LA POLICE: Points Clés

1. **Timeline précise** (à la seconde près)
   - Sequence diagram montre QUAND chaque action
   - Timestamps exacts dans DB

2. **État capturé** (avant/après)
   - State machine montre transition anonyme → lié
   - Preuves irréfutables du moment du linkage

3. **Transactions atomiques**
   - Tout ou rien (pas de données partielles)
   - Intégrité garantie

4. **Security checkpoints**
   - Chaque étape validée
   - Pas de bypass possible

5. **Data consistency**
   - Relations FK garanties
   - Pas de données orphelines

**Résultat:** Rapport inattaquable juridiquement!
