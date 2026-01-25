# 🚀 PHASE 2: Early Capture (Referrer + UTM + Device + Geo)

**Date:** 2026-01-25
**Objectif:** Capturer les données d'attribution (referrer, UTM, device, geo) dès le **PREMIER événement** au lieu d'attendre le form submit

---

## 📋 **PROBLÈME RÉSOLU**

### **AVANT (Phase 1):**
```
T0: Cookie généré (middleware)
T0+200ms: Session créée dans DB (SEULEMENT session_id + timestamps)
T0+5min: Form submit → CAPTURE referrer/UTM/device/geo
```

**❌ Problème:** On perd les données si l'utilisateur ne soumet pas le formulaire!

---

### **APRÈS (Phase 2 améliorée):**
```
T0: Cookie généré (middleware)
T0+200ms: PREMIER EVENT → CAPTURE TOUT:
  ✅ Referrer (HTTP header)
  ✅ UTM params (URL query string)
  ✅ Device/Browser/OS (server-parsed UA)
  ✅ ASN/Country/IP prefix (géolocalisation)
  ✅ IP hash / UA hash (SHA256 + salt)
  ✅ VPN/Proxy detection (security events)
```

**✅ Avantage:** On capture TOUS les visiteurs, même ceux qui ne soumettent pas!

---

## 🔧 **MODIFICATIONS APPORTÉES**

### 1. **API `/api/telemetry/track-event` (Serveur)**

**Fichier:** `src/app/api/telemetry/track-event/route.ts`

**Changements:**
- ✅ Accepte `utm_source`, `utm_medium`, `utm_campaign` du client
- ✅ Capture `Referer` header HTTP (serveur)
- ✅ Parse User-Agent (server-side)
- ✅ Lookup géolocalisation (ASN, Country, IP prefix)
- ✅ Hash IP/UA (SHA256 + salt)
- ✅ Détecte VPN/Proxy/Hosting dès la première visite
- ✅ Crée security_events automatiquement si détection

**Nouvelle logique:**
```typescript
if (!existingSession) {
  // FIRST EVENT: Capture EVERYTHING

  // Server-side data
  const userAgent = request.headers.get('user-agent')
  const referrer = request.headers.get('referer')
  const parsedUA = parseUserAgent(userAgent)
  const geoData = await getIPGeoData(clientIP)

  // Create session with FULL metadata
  await supabase.from('client_sessions').insert({
    session_id: sessionId,
    first_referrer: referrer,
    first_utm_source: utm_source,
    first_utm_medium: utm_medium,
    first_utm_campaign: utm_campaign,
    device_type: parsedUA.device_type,
    browser: parsedUA.browser,
    os: parsedUA.os,
    asn: geoData.asn,
    country_code: geoData.country_code,
    ip_prefix: geoData.ip_prefix,
    ip_hash: hashWithSalt(clientIP),
    ua_hash: hashWithSalt(userAgent),
  })

  // Security detection
  if (geoData.is_vpn || geoData.is_proxy) {
    await supabase.from('security_events').insert({
      event_type: 'vpn_detected',
      meta: { detected_at: 'first_visit' }
    })
  }
}
```

---

### 2. **Utilitaire Client-Side**

**Fichier:** `src/lib/utils/telemetry-client.ts`

**Fonctions:**
- `extractUTMParams()` - Extrait UTM de l'URL actuelle
- `getDocumentReferrer()` - Récupère `document.referrer` (filtre same-origin)
- `trackEvent()` - Envoie événement à l'API (auto-inject referrer/UTM)
- `trackPageView()` - Convenience function pour page views
- `trackFormInteraction()` - Convenience function pour forms
- `trackButtonClick()` - Convenience function pour boutons

**Exemple d'usage:**
```typescript
import { trackPageView } from '@/lib/utils/telemetry-client'

// Au chargement de page
useEffect(() => {
  trackPageView('/') // Auto-capture referrer + UTM
}, [])
```

---

### 3. **Composant React Provider**

**Fichier:** `src/components/TelemetryProvider.tsx`

**Usage:**
```tsx
// Dans layout.tsx
import { TelemetryProvider } from '@/components/TelemetryProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TelemetryProvider>
          {children}
        </TelemetryProvider>
      </body>
    </html>
  )
}
```

**Effet:**
- Track automatiquement chaque changement de route
- Capture referrer + UTM sur toutes les pages
- Transparent pour le développeur

---

### 4. **Script de Test HTML**

**Fichier:** `scripts/test-google-referrer.html`

**Usage:**
- Ouvrir dans navigateur
- Cliquer sur boutons pour simuler Google Ads
- Vérifie logs serveur + DB

**Test automatisé:**
```
1. Ouvrir test-google-referrer.html
2. Cliquer "Homepage (avec UTM Google Ads)"
3. Vérifie console serveur:
   [TrackEvent] First event for session: abc123...
   [TrackEvent] Captured data: {
     referrer: 'file:///.../test-google-referrer.html',
     utm_source: 'google',
     utm_medium: 'cpc',
     ...
   }
4. Vérifie DB:
   SELECT * FROM client_sessions ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 **DONNÉES CAPTURÉES (Nouvelle Timeline)**

### **T0: GET / (Première visite)**
```
Request: GET / HTTP/1.1
         Referer: https://www.google.com/
         User-Agent: Mozilla/5.0 ...

Middleware: Generate cookie sar_session_id
Response: Set-Cookie: sar_session_id=abc123...
```

**❌ Aucune DB write encore**

---

### **T0+200ms: POST /api/telemetry/track-event (Premier événement)**

**Request Body:**
```json
{
  "event_type": "page_view",
  "event_name": "/",
  "page_url": "/",
  "referrer_url": "https://www.google.com/",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "pret-rapide-mtl"
}
```

**Serveur détecte:** Session n'existe pas → **PREMIÈRE VISITE**

**Capture immédiate:**
```sql
INSERT INTO client_sessions (
  session_id,

  -- ATTRIBUTION ✅
  first_referrer,          -- "https://www.google.com/"
  first_utm_source,        -- "google"
  first_utm_medium,        -- "cpc"
  first_utm_campaign,      -- "pret-rapide-mtl"

  -- DEVICE (server-parsed) ✅
  device_type,             -- "Desktop"
  browser,                 -- "Chrome"
  os,                      -- "macOS"

  -- SECURITY (hashed) ✅
  ip_hash,                 -- "7f3a2b..." (SHA256)
  ua_hash,                 -- "9e4c1a..." (SHA256)

  -- GEO (Phase 2) ✅
  asn,                     -- 577 (Bell Canada)
  country_code,            -- "CA"
  ip_prefix,               -- "142.167.0.0/16"

  -- TIMING ✅
  created_at,              -- "2026-01-25 14:23:15.200"
  expires_at,              -- "2026-04-25 14:23:15.200"

  -- CLIENT (anonyme) ⚪
  client_id,               -- NULL (pas encore identifié)
  linked_via,              -- NULL
  linked_at                -- NULL
);
```

**Security Events (si VPN détecté):**
```sql
INSERT INTO security_events (
  session_id,
  event_type,              -- "vpn_detected"
  asn,                     -- 209103 (NordVPN)
  country_code,            -- "NL"
  meta                     -- { "detected_at": "first_visit", "is_vpn": true }
);
```

**Console logs serveur:**
```
[TrackEvent] First event for session: abc123...
[TrackEvent] Captured data: {
  referrer: 'https://www.google.com/',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'pret-rapide-mtl',
  device: 'Desktop',
  browser: 'Chrome',
  os: 'macOS',
  asn: 577,
  country: 'CA',
  is_vpn: false
}
POST /api/telemetry/track-event 200 in 150ms
```

---

### **T0+5min: POST /api/applications/submit (Linkage volontaire)**

**Maintenant:** Les données existent DÉJÀ, on fait juste le linkage!

```sql
UPDATE client_sessions
SET
  client_id = 'uuid-client',  -- LINKAGE!
  linked_via = 'form_submit',
  linked_at = now()
WHERE session_id = 'abc123...';
```

**Pas besoin de re-capturer** referrer/UTM/device/geo car déjà présent!

---

## 🎯 **AVANTAGES**

### 1. **Capture TOUS les visiteurs**
- ✅ Même ceux qui ne soumettent pas le formulaire
- ✅ Bounce rate visible (visiteurs qui partent sans soumettre)
- ✅ Analyse de funnel complète

### 2. **Données d'attribution précises**
- ✅ Referrer capturé avant qu'il soit effacé
- ✅ UTM params capturés à l'arrivée
- ✅ Pas de perte de données lors de navigation interne

### 3. **Détection fraude précoce**
- ✅ VPN détecté dès la première visite (pas besoin d'attendre form submit)
- ✅ Bot détecté via ASN (hosting providers)
- ✅ Country tracking dès l'arrivée

### 4. **Rapports marketing améliorés**
- ✅ ROI Google Ads visible même sans conversion
- ✅ Analyse des sources de trafic complètes
- ✅ Taux de conversion par source/medium/campaign

---

## 📊 **NOUVELLES REQUÊTES SQL POSSIBLES**

### **1. Analyse des sources de trafic**
```sql
SELECT
  first_utm_source,
  first_utm_medium,
  first_utm_campaign,
  COUNT(*) as visitors,
  COUNT(DISTINCT CASE WHEN client_id IS NOT NULL THEN client_id END) as conversions,
  ROUND(
    COUNT(DISTINCT CASE WHEN client_id IS NOT NULL THEN client_id END) * 100.0 / COUNT(*),
    2
  ) as conversion_rate
FROM client_sessions
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY first_utm_source, first_utm_medium, first_utm_campaign
ORDER BY visitors DESC;
```

**Résultat:**
```
utm_source | utm_medium | utm_campaign     | visitors | conversions | conversion_rate
-----------+------------+------------------+----------+-------------+----------------
google     | cpc        | pret-rapide-mtl  | 523      | 45          | 8.60%
facebook   | social     | retargeting      | 312      | 12          | 3.85%
(direct)   | (none)     | (none)           | 198      | 8           | 4.04%
```

---

### **2. Visiteurs Google qui n'ont PAS converti**
```sql
SELECT
  session_id,
  first_referrer,
  first_utm_campaign,
  device_type,
  browser,
  country_code,
  created_at,
  last_activity_at,
  EXTRACT(EPOCH FROM (last_activity_at - created_at)) as session_duration_sec
FROM client_sessions
WHERE first_utm_source = 'google'
  AND client_id IS NULL  -- Pas converti
  AND created_at > now() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
```

**Usage:** Analyser pourquoi les visiteurs Google partent sans soumettre.

---

### **3. Détection VPN/Bot dès l'arrivée**
```sql
SELECT
  cs.session_id,
  cs.first_utm_source,
  cs.asn,
  cs.country_code,
  se.event_type,
  se.meta,
  cs.created_at
FROM client_sessions cs
INNER JOIN security_events se ON cs.session_id = se.session_id
WHERE se.event_type IN ('vpn_detected', 'bot_detected')
  AND se.meta->>'detected_at' = 'first_visit'
  AND cs.created_at > now() - INTERVAL '7 days'
ORDER BY cs.created_at DESC;
```

**Usage:** Identifier les fraudeurs dès leur arrivée (avant qu'ils soumettent).

---

## ✅ **TESTS DE VALIDATION**

### **Test 1: Visite depuis Google Ads**
1. Ouvrir `scripts/test-google-referrer.html`
2. Cliquer "Homepage (avec UTM Google Ads)"
3. **Vérifier logs serveur:**
   - `[TrackEvent] First event for session:`
   - `first_referrer: 'file:///.../test-google-referrer.html'`
   - `utm_source: 'google'`
4. **Vérifier DB:**
   ```sql
   SELECT first_utm_source, first_utm_medium FROM client_sessions ORDER BY created_at DESC LIMIT 1;
   ```
   Expected: `google`, `cpc`

---

### **Test 2: Visite organique (sans UTM)**
1. Ouvrir navigateur → `http://localhost:3001/`
2. **Vérifier logs:** `utm_source: null`
3. **Vérifier DB:** `first_utm_source IS NULL`

---

### **Test 3: Navigation interne (pas de referrer externe)**
1. Visiter `http://localhost:3001/`
2. Cliquer lien interne → `/aidesecurite`
3. **Vérifier logs:** `referrer: null` (same-origin filtré)

---

### **Test 4: VPN Detection**
1. Modifier `getMockGeoData()` pour simuler VPN:
   ```typescript
   return { asn: 209103, country_code: 'NL', is_vpn: true }
   ```
2. Visiter site
3. **Vérifier logs:** `[Security] VPN/Proxy detected on first visit`
4. **Vérifier DB:**
   ```sql
   SELECT * FROM security_events WHERE event_type = 'vpn_detected' ORDER BY ts DESC LIMIT 1;
   ```

---

## 🚀 **PROCHAINES ÉTAPES**

1. ✅ **Déployer les modifications** (déjà fait - code modifié)
2. ⚠️ **Tester avec vraie visite** (user doit tester)
3. ⚠️ **Vérifier logs production** (après deploy Vercel)
4. ⚠️ **Analyser 7 jours de données** (après déploiement)

---

## 📝 **NOTES IMPORTANTES**

### **Privacy**
- ✅ Referrer nettoyé (query params stripped)
- ✅ IP hachée (SHA256 + salt, 16 chars)
- ✅ UA hachée (SHA256 + salt, 16 chars)
- ✅ Pas de PII dans payload events

### **Performance**
- ✅ Geolocation API call seulement au PREMIER événement (pas à chaque event)
- ✅ Mock data en dev (pas d'appels externes)
- ✅ Rate limiting (20 events/min par IP)

### **GDPR Compliance**
- ✅ Données anonymes par défaut (client_id = NULL)
- ✅ Linkage volontaire uniquement
- ✅ Consent flags disponibles (consent_analytics, consent_marketing)
- ✅ Cleanup automatique (30d events, 90d sessions, 30d IP hashes)

---

**FIN DU DOCUMENT**
