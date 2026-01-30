# 🔗 Identity Graph SAR - Analysis & Implementation

**Date:** 2026-01-30
**Objectif:** Construire un Identity Graph complet pour lier IP → sessions → users → clients

---

## 🎯 IDENTIFIANTS DISPONIBLES (État Actuel)

### ✅ Niveau 1: Telemetry (Backend)

| Identifiant | Disponible? | Source | Type | Notes |
|-------------|-------------|--------|------|-------|
| **IP** | ✅ **100%** | `telemetry_requests.ip` | TEXT | Clear IP (pas de hash) |
| **trace_id** | ✅ **100%** | `telemetry_requests.trace_id` | TEXT | Unique par request |
| **visit_id** | ✅ **100%** | `telemetry_requests.visit_id` | UUID | Client-side UUID |
| **session_id** | ✅ **100%** | `telemetry_requests.session_id` | TEXT | SHA-256 hash du cookie |
| **user_id** | ✅ **80%** | `telemetry_requests.user_id` | UUID | Si authenticated |
| **client_id** | ✅ **80%** | `telemetry_requests.client_id` | UUID | Si linked to business |
| **region** | ✅ **100%** | `telemetry_requests.region` | TEXT | Vercel edge region |
| **user_agent** | ✅ **100%** | `telemetry_requests.meta_redacted.user_agent` | TEXT | Full UA string |

### 🟡 Niveau 2: Client-Side (Partially Available)

| Identifiant | Disponible? | Source | Type | Notes |
|-------------|-------------|--------|------|-------|
| **device_fingerprint** | 🟡 **Possible** | N/A | TEXT | Nécessite FingerprintJS |
| **cookie_id** | 🟡 **Possible** | `sar_session_id` cookie | TEXT | Already sent as session_id |
| **referrer** | 🟡 **Partial** | `telemetry_events.meta.referrer` | TEXT | Si capturé dans events |
| **utm_source/medium** | 🟡 **Partial** | `telemetry_requests.meta_redacted` | TEXT | Si présent dans URL |
| **correlation_id** | ❌ **Missing** | N/A | UUID | Besoin instrumentation |

### ❌ Niveau 3: External (Not Available)

| Identifiant | Disponible? | Source | Blocker |
|-------------|-------------|--------|---------|
| **GA4 user_id** | ❌ **No Bridge** | GA4 API | GA4 ne donne pas l'IP |
| **GA4 client_id** | ❌ **No Bridge** | GA4 API | Pas de correlation_id |
| **GSC query** | ❌ **Aggregated** | GSC API | Par domaine, pas par IP |

---

## 🏗️ IDENTITY GRAPH ACTUEL (SAR)

### Architecture Existante

```
┌──────────────────────────────────────────────────────────────────┐
│ TELEMETRY_REQUESTS (Source: Middleware)                          │
│                                                                   │
│  ├─ ip (TEXT) ────────────────────────────────────┐              │
│  ├─ trace_id (TEXT)                                │              │
│  ├─ visit_id (UUID) ──────────┐                    │              │
│  ├─ session_id (TEXT/SHA-256) │                    │              │
│  ├─ user_id (UUID) ───────────┼────────────┐       │              │
│  ├─ client_id (UUID) ─────────┼────────┐   │       │              │
│  ├─ region (TEXT)              │        │   │       │              │
│  ├─ user_agent (TEXT)          │        │   │       │              │
│  ├─ meta_redacted (JSONB)      │        │   │       │              │
│  │   ├─ device                 │        │   │       │              │
│  │   ├─ browser                │        │   │       │              │
│  │   ├─ os                     │        │   │       │              │
│  │   └─ utm_source/medium      │        │   │       │              │
│  └─ created_at                 │        │   │       │              │
└────────────────────────────────┼────────┼───┼───────┼──────────────┘
                                 │        │   │       │
                                 ▼        │   │       │
┌────────────────────────────────────┐   │   │       │
│ TELEMETRY_EVENTS                   │   │   │       │
│  ├─ visit_id (UUID) ◄──────────────┘   │   │       │
│  ├─ session_id (TEXT)                  │   │       │
│  ├─ event_name                         │   │       │
│  ├─ meta (JSONB)                       │   │       │
│  │   ├─ referrer                       │   │       │
│  │   ├─ utm_*                          │   │       │
│  │   └─ device_info                    │   │       │
│  └─ created_at                         │   │       │
└────────────────────────────────────────┘   │       │
                                             │       │
                                             ▼       │
┌────────────────────────────────────────────────┐  │
│ USERS (Auth)                                   │  │
│  ├─ id (UUID) ◄────────────────────────────────┘  │
│  ├─ email                                         │
│  ├─ created_at                                    │
│  └─ metadata                                      │
└────────────────────────────────────────────────┘  │
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────┐
│ CLIENT_ACCOUNTS (Business)                          │
│  ├─ id (UUID) ◄─────────────────────────────────────┘
│  ├─ user_id (UUID, nullable)
│  ├─ email
│  ├─ phone
│  └─ created_at
└─────────────────────────────────────────────────────┘
         │
         ├──> CLIENT_ANALYSES
         ├──> CLIENT_TRANSACTIONS
         ├──> APPLICATIONS
         └──> CONTRACTS
```

### Cardinalité

```
1 IP ────────────────> N requests
1 visit_id ──────────> N requests (same page session)
1 session_id ────────> N requests (browser session)
1 user_id ───────────> N requests (authenticated)
1 client_id ─────────> N requests (business account)

1 visit_id ──────────> N events (telemetry_events)
```

---

## 📊 POSSIBILITÉS DE JOINTURE

### ✅ Jointures Actuelles (Fonctionnelles)

#### 1. IP → All Requests
```sql
SELECT * FROM telemetry_requests WHERE ip = '192.0.2.44';
-- Result: Timeline complète de cette IP
```

#### 2. visit_id → Requests + Events
```sql
-- Requests
SELECT * FROM telemetry_requests WHERE visit_id = 'uuid';

-- Events
SELECT * FROM telemetry_events WHERE visit_id = 'uuid';

-- Join
SELECT
  tr.path, tr.status, te.event_name
FROM telemetry_requests tr
LEFT JOIN telemetry_events te ON tr.visit_id = te.visit_id;
```

#### 3. session_id → Multiple Visits
```sql
SELECT * FROM telemetry_requests WHERE session_id = 'sha256_hash';
-- Result: Toutes les visites de cette session browser
```

#### 4. user_id → User Profile + Requests
```sql
-- User profile
SELECT * FROM users WHERE id = 'user_uuid';

-- All requests
SELECT * FROM telemetry_requests WHERE user_id = 'user_uuid';

-- Join
SELECT
  u.email, tr.path, tr.created_at
FROM users u
JOIN telemetry_requests tr ON tr.user_id = u.id;
```

#### 5. client_id → Business Data + Requests
```sql
-- Client profile
SELECT * FROM client_accounts WHERE id = 'client_uuid';

-- All requests
SELECT * FROM telemetry_requests WHERE client_id = 'client_uuid';

-- Full business context
SELECT
  ca.email,
  ca.phone,
  COUNT(DISTINCT tr.ip) as unique_ips,
  COUNT(tr.id) as total_requests,
  MAX(tr.created_at) as last_seen
FROM client_accounts ca
LEFT JOIN telemetry_requests tr ON tr.client_id = ca.id
GROUP BY ca.id;
```

#### 6. IP → client_id (Indirect via user_id)
```sql
-- Find clients by IP
SELECT DISTINCT
  tr.ip,
  ca.id as client_id,
  ca.email,
  COUNT(*) as request_count
FROM telemetry_requests tr
JOIN users u ON tr.user_id = u.id
JOIN client_accounts ca ON ca.user_id = u.id
WHERE tr.ip = '192.0.2.44'
GROUP BY tr.ip, ca.id, ca.email;
```

### 🟡 Jointures Possibles (Avec Instrumentation)

#### 7. correlation_id → GA4 + SAR Bridge
**Nécessite:** Client-side tracking

```javascript
// Client (tracking.js)
const correlationId = crypto.randomUUID()
sessionStorage.setItem('sar_correlation_id', correlationId)

// Send to SAR
fetch('/api/telemetry/track-event', {
  body: JSON.stringify({ correlation_id: correlationId, ... })
})

// Send to GA4
gtag('config', 'GA4_ID', {
  user_properties: { correlation_id: correlationId }
})
```

**Backend:**
```sql
-- New column
ALTER TABLE telemetry_requests ADD COLUMN correlation_id UUID;

-- Export to GA4
-- Then can join GA4 data by correlation_id
```

#### 8. device_fingerprint → Multi-Device Tracking
**Nécessite:** FingerprintJS

```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const fp = await FingerprintJS.load()
const result = await fp.get()
const fingerprint = result.visitorId

fetch('/api/telemetry/track-event', {
  body: JSON.stringify({ device_fingerprint: fingerprint, ... })
})
```

**Result:** Track même user sur multiple devices/browsers

### ❌ Jointures Impossibles (Sans Changement External)

#### 9. IP → GA4 user_id
**Blocker:** GA4 API ne fournit pas l'IP des users

**Alternative:** Use correlation_id (voir #7)

#### 10. IP → GSC query
**Blocker:** GSC API agrégée par domaine

**Alternative:** N/A (limitation Google)

---

## 🚀 IDENTITY GRAPH AMÉLIORÉ (Avec Instrumentation)

### Architecture Cible

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT TRACKING (New Layer)                                          │
│                                                                       │
│  ├─ correlation_id (UUID) ──────────────┐ NEW                        │
│  ├─ device_fingerprint (TEXT) ──────────┼─ NEW                       │
│  ├─ sar_session_id (cookie) ────────────┤                            │
│  ├─ visit_id (UUID)                     │                            │
│  ├─ referrer (TEXT) ────────────────────┼─ ENHANCED                  │
│  └─ utm_* (TEXT) ───────────────────────┘ ENHANCED                   │
└──────────────────────────────────────────┬───────────────────────────┘
                                           │
                                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│ TELEMETRY_REQUESTS (Enhanced)                                         │
│                                                                        │
│  ├─ ip (TEXT)                                                         │
│  ├─ correlation_id (UUID) ◄────────────────────────────┐ NEW          │
│  ├─ device_fingerprint (TEXT) ◄────────────────────────┼─ NEW         │
│  ├─ visit_id (UUID)                                    │              │
│  ├─ session_id (TEXT)                                  │              │
│  ├─ user_id (UUID)                                     │              │
│  ├─ client_id (UUID)                                   │              │
│  └─ ...                                                │              │
└────────────────────────────────────────────────────────┼──────────────┘
                                                         │
                                                         │
┌────────────────────────────────────────────────────────┼──────────────┐
│ GA4 DATA (External via correlation_id bridge)          │              │
│                                                        │              │
│  ├─ correlation_id (user_property) ◄───────────────────┘              │
│  ├─ ga4_user_id                                                       │
│  ├─ ga4_session_id                                                    │
│  ├─ events (page_view, conversions, etc.)                            │
│  └─ metrics (engagement_rate, bounce_rate, etc.)                     │
└───────────────────────────────────────────────────────────────────────┘
```

### Exemple de Pont Complet

```sql
-- View: unified_identity_graph
CREATE OR REPLACE VIEW unified_identity_graph AS
SELECT
  tr.ip,
  tr.correlation_id,
  tr.device_fingerprint,
  tr.visit_id,
  tr.session_id,
  tr.user_id,
  tr.client_id,

  -- User data (if authenticated)
  u.email as user_email,

  -- Client data (if business account)
  ca.email as client_email,
  ca.phone as client_phone,
  ca.id as client_account_id,

  -- GA4 data (via correlation_id)
  ga4.ga4_user_id,
  ga4.ga4_session_id,
  ga4.total_events,
  ga4.conversions,

  -- Aggregated metrics
  COUNT(DISTINCT tr.id) as total_requests,
  COUNT(DISTINCT tr.visit_id) as unique_visits,
  COUNT(DISTINCT DATE(tr.created_at)) as active_days,
  MIN(tr.created_at) as first_seen,
  MAX(tr.created_at) as last_seen

FROM telemetry_requests tr
LEFT JOIN users u ON tr.user_id = u.id
LEFT JOIN client_accounts ca ON tr.client_id = ca.id
LEFT JOIN (
  -- GA4 aggregation by correlation_id
  SELECT
    correlation_id,
    ga4_user_id,
    ga4_session_id,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_name = 'conversion' THEN 1 ELSE 0 END) as conversions
  FROM ga4_enriched_sessions
  WHERE correlation_id IS NOT NULL
  GROUP BY correlation_id, ga4_user_id, ga4_session_id
) ga4 ON tr.correlation_id = ga4.correlation_id

GROUP BY
  tr.ip, tr.correlation_id, tr.device_fingerprint, tr.visit_id,
  tr.session_id, tr.user_id, tr.client_id,
  u.email, ca.email, ca.phone, ca.id,
  ga4.ga4_user_id, ga4.ga4_session_id, ga4.total_events, ga4.conversions;
```

---

## 📋 PLAN D'IMPLÉMENTATION

### Phase 1: Utiliser l'Existant (Immédiat)

**Ce qu'on peut faire MAINTENANT sans rien changer:**

```sql
-- RPC Function: get_identity_graph_for_ip
CREATE OR REPLACE FUNCTION get_identity_graph_for_ip(p_ip TEXT)
RETURNS TABLE (
  -- Identity
  ip TEXT,
  visit_ids UUID[],
  session_ids TEXT[],
  user_ids UUID[],
  client_ids UUID[],

  -- Metrics
  total_requests BIGINT,
  unique_visits BIGINT,
  unique_sessions BIGINT,
  unique_users BIGINT,
  unique_clients BIGINT,
  active_days INT,
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,

  -- Business context
  client_emails TEXT[],
  has_conversion BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_ip::TEXT,
    ARRAY_AGG(DISTINCT tr.visit_id) FILTER (WHERE tr.visit_id IS NOT NULL),
    ARRAY_AGG(DISTINCT tr.session_id) FILTER (WHERE tr.session_id IS NOT NULL),
    ARRAY_AGG(DISTINCT tr.user_id) FILTER (WHERE tr.user_id IS NOT NULL),
    ARRAY_AGG(DISTINCT tr.client_id) FILTER (WHERE tr.client_id IS NOT NULL),

    COUNT(*),
    COUNT(DISTINCT tr.visit_id),
    COUNT(DISTINCT tr.session_id),
    COUNT(DISTINCT tr.user_id),
    COUNT(DISTINCT tr.client_id),
    COUNT(DISTINCT DATE(tr.created_at)),
    MIN(tr.created_at),
    MAX(tr.created_at),

    ARRAY_AGG(DISTINCT ca.email) FILTER (WHERE ca.email IS NOT NULL),
    EXISTS(
      SELECT 1 FROM client_analyses
      WHERE client_id = ANY(ARRAY_AGG(DISTINCT tr.client_id))
    )

  FROM telemetry_requests tr
  LEFT JOIN client_accounts ca ON tr.client_id = ca.id
  WHERE tr.ip = p_ip
  GROUP BY p_ip;
END;
$$ LANGUAGE plpgsql;
```

### Phase 2: Ajouter correlation_id (1 semaine)

**Client-side:**
```typescript
// src/lib/tracking.ts
export function initTracking() {
  // Generate or retrieve correlation_id
  let correlationId = sessionStorage.getItem('sar_correlation_id')
  if (!correlationId) {
    correlationId = crypto.randomUUID()
    sessionStorage.setItem('sar_correlation_id', correlationId)
  }

  // Send with every event
  window.sarTrack = (eventName: string, properties?: any) => {
    fetch('/api/telemetry/track-event', {
      method: 'POST',
      body: JSON.stringify({
        correlation_id: correlationId,
        event_name: eventName,
        ...properties
      })
    })
  }

  // Send to GA4
  gtag('config', 'GA4_MEASUREMENT_ID', {
    user_properties: {
      correlation_id: correlationId
    }
  })
}
```

**Backend:**
```sql
-- Migration: add correlation_id
ALTER TABLE telemetry_requests ADD COLUMN correlation_id UUID;
ALTER TABLE telemetry_events ADD COLUMN correlation_id UUID;

CREATE INDEX idx_telemetry_requests_correlation_id
  ON telemetry_requests(correlation_id);
```

### Phase 3: Ajouter device_fingerprint (1-2 jours)

```bash
npm install @fingerprintjs/fingerprintjs
```

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs'

export async function getDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  return result.visitorId
}
```

---

## 🎯 RÉSULTAT FINAL

Avec l'implémentation complète, on aura:

```
IP (192.0.2.44)
  ├─ 5 visit_ids (5 page sessions)
  ├─ 2 session_ids (2 browser sessions)
  ├─ 1 user_id (authenticated once)
  ├─ 1 client_id (linked to business)
  ├─ 1 correlation_id (bridge to GA4)
  └─ 1 device_fingerprint (cross-browser tracking)
      │
      ├─> GA4: 15 events, 2 conversions
      ├─> Business: 1 application, pending status
      └─> Fraud: Correlation 78%, Classification: HUMAN
```

**Tout est traçable avec Evidence (row_id, timestamp)!** 🎉

---

**Prêt à implémenter?** 🚀
