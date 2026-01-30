# 🕵️ NSA Dossier v3 - Analyse de Faisabilité

**Date:** 2026-01-30
**Mockup:** HTML fourni par l'utilisateur
**Objectif:** Créer une page "IP Master" style NSA avec Evidence partout

---

## 🎯 VUE D'ENSEMBLE

Le mockup montre un dossier complet pour une IP avec:
- **Evidence** = Preuve de chaque métrique (row_id, timestamp, log line)
- **Heatmap** = Endpoints × Latence (p50/p75/p95/avg + status codes)
- **Relationships Graph** = IP ↔ sessions ↔ client_id ↔ conversions
- **Comparables** = Top 5 IPs similaires par pattern matching

---

## ✅ CE QUI EST DÉJÀ DISPONIBLE (SAR + Views)

### 1. Evidence Table - Métriques de Base

| Métrique | Disponible? | Source | Evidence |
|----------|-------------|--------|----------|
| **IP brute** | ✅ | `telemetry_requests.ip` | row_id + timestamp |
| **first_seen / last_seen** | ✅ | `ip_to_seo_segment.first_seen` | row_id du premier/dernier request |
| **timeline requests** | ✅ | `telemetry_requests` WHERE ip | Tous les rows (path, status, duration) |
| **p50/p95 latence** | ✅ | `ip_to_seo_segment.p50/p95_duration_ms` | Calcul PERCENTILE_CONT |
| **2xx/4xx/5xx distribution** | ✅ | `ip_to_seo_segment.status_2xx/4xx/5xx_count` | COUNT(*) GROUP BY status |
| **Endpoints lents** | ✅ | `telemetry_requests` ORDER BY duration DESC | Top 10 rows |
| **UTM (parfois)** | 🟡 | `telemetry_requests.meta_redacted` | Si capturé dans meta |
| **Device info** | ✅ | `telemetry_requests.meta_redacted` | device, browser, OS |
| **Geo (rough)** | ✅ | `telemetry_requests.region` | Vercel region (iad1, etc.) |

### 2. Evidence Table - Métriques Avancées

| Métrique | Disponible? | Source | Notes |
|----------|-------------|--------|-------|
| **GA4 events/conversions** | 🟡 | `ga4_enriched_sessions` | Pas de join direct IP ↔ GA4 |
| **GSC queries/pages** | ❌ | `gsc_top_queries/pages` | Agrégé par domaine, pas par IP |
| **Speed Insights (par page)** | ✅ | `vercel_speed_insights_daily` | Par (date, path, device), pas par IP |
| **session_id unifié** | ❌ | N/A | Nécessite instrumentation client |
| **referrer fiable** | 🟡 | `telemetry_requests.meta_redacted` | Si capturé |
| **Web Vitals par IP** | ❌ | N/A | Vercel Speed Insights ne donne pas l'IP |

### 3. Heatmap (Endpoints × Latence)

**✅ 100% Réalisable**

Query:
```sql
SELECT
  path,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) as p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY duration_ms) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
  AVG(duration_ms)::int as avg,
  COUNT(*) FILTER (WHERE status BETWEEN 200 AND 299) as status_2xx,
  COUNT(*) FILTER (WHERE status BETWEEN 400 AND 499) as status_4xx,
  COUNT(*) FILTER (WHERE status >= 500) as status_5xx,
  MIN(trace_id) as evidence_row_id -- Premier row_id comme evidence
FROM telemetry_requests
WHERE ip = '192.0.2.44'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY path
ORDER BY COUNT(*) DESC
LIMIT 10;
```

**Evidence**: Chaque ligne a un `evidence_row_id` (trace_id) qui pointe vers le premier request de cet endpoint.

### 4. Evidence Tape (Journal de Logs)

**✅ 100% Réalisable**

Query:
```sql
SELECT
  created_at,
  trace_id,
  ip,
  method,
  path,
  status,
  duration_ms,
  region,
  meta_redacted
FROM telemetry_requests
WHERE ip = '192.0.2.44'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 50;
```

Format:
```
2026-01-08T09:14:12Z  tr_8f2a  192.0.2.44  GET  /faq  200  112ms  region=iad1
```

### 5. Relationships Graph

**🟡 Partiellement Réalisable**

```
IP (192.0.2.44)
  └─> telemetry_requests (✅ Available)
        ├─> session_id (SHA-256 hash) (✅ Available)
        ├─> visit_id (UUID from client) (✅ Available)
        ├─> user_id (if authenticated) (✅ Available)
        └─> client_id (if linked to business) (✅ Available)

session_id ─────> ❌ GA4 session (NO BRIDGE)
                  └─> Need: client-side correlation_id

client_id ─────> ✅ SAR Business Data
                  ├─> client_accounts
                  ├─> client_analyses
                  ├─> client_transactions
                  └─> applications/contracts
```

**Ce qui manque:**
- ❌ Bridge IP → GA4 (GA4 ne donne pas l'IP)
- ❌ session_id unifié (client + server)
- ❌ referrer tracking systématique

### 6. Comparables (Top 5 IPs similaires)

**✅ 80% Réalisable**

Features pour similarity matching:
```sql
SELECT
  ip,
  total_requests,
  unique_pages,
  landing_page,
  most_visited_page,
  p95_duration_ms,
  status_4xx_count,
  status_5xx_count,
  utm_source,
  utm_medium,
  -- Pattern de parcours (besoin d'une colonne path_sequence)
  SIMILARITY(
    (SELECT string_agg(path, ',') FROM telemetry_requests WHERE ip = '192.0.2.44'),
    (SELECT string_agg(path, ',') FROM telemetry_requests WHERE ip = target_ip)
  ) as path_similarity
FROM ip_to_seo_segment
WHERE ip != '192.0.2.44'
ORDER BY path_similarity DESC
LIMIT 5;
```

**Algorithme de similarité:**
1. Cosine similarity sur features numériques (requests, pages, p95)
2. Jaccard similarity sur paths visités
3. Exact match sur utm_source/medium (si présent)
4. Bonus si même landing_page

---

## 📊 TABLEAU DE FAISABILITÉ COMPLÈTE

| Section | Faisabilité | Données Manquantes | Action Requise |
|---------|-------------|-------------------|----------------|
| **Header (Case/Threat/Range/Confidence)** | ✅ 100% | Aucune | Calcul de scores |
| **Sidebar Checklist** | ✅ 100% | Aucune | UI statique |
| **KPIs Summary (4 cards)** | ✅ 95% | Geo ISP précis | Vercel region suffit |
| **Evidence Table** | ✅ 85% | GA4 join, Speed par IP | Acceptable avec notes |
| **Evidence Tape** | ✅ 100% | Aucune | SELECT + formatting |
| **Heatmap** | ✅ 100% | Aucune | Aggregation SQL |
| **Relationships Graph** | 🟡 60% | session_id bridge, GA4 join | Besoin instrumentation |
| **Comparables** | ✅ 80% | path_sequence colonne | Calcul similarity |

**Score Global:** ✅ **85% Réalisable Maintenant**

---

## 🔧 IMPLÉMENTATION RECOMMANDÉE

### Phase 1: MVP (Immediate) - Score 85%

**Ce qu'on peut faire MAINTENANT:**

#### 1. API Route: `/api/seo/ip/[ip]/nsa-dossier`

```typescript
export async function GET(req: NextRequest, { params }: { params: { ip: string } }) {
  const { ip } = params
  const range = req.nextUrl.searchParams.get('range') || '30d'

  // 1. Summary KPIs
  const summary = await supabase
    .from('ip_to_seo_segment')
    .select('*')
    .eq('ip', ip)
    .single()

  // 2. Evidence Table (métriques avec row_id)
  const evidence = {
    first_seen: {
      value: summary.first_seen,
      available: true,
      source: 'SAR',
      evidence: await getFirstRequest(ip) // {row_id, timestamp, log}
    },
    landing_page: {
      value: summary.landing_page,
      available: true,
      source: 'SAR',
      evidence: await getFirstRequest(ip)
    },
    p95_duration: {
      value: summary.p95_duration_ms,
      available: true,
      source: 'SAR',
      evidence: { view: 'ip_to_seo_segment', calc: 'PERCENTILE_CONT(0.95)' }
    },
    // ... etc
  }

  // 3. Evidence Tape (journal)
  const tape = await supabase
    .from('telemetry_requests')
    .select('created_at, trace_id, method, path, status, duration_ms, region')
    .eq('ip', ip)
    .order('created_at', { ascending: false })
    .limit(50)

  // 4. Heatmap
  const heatmap = await supabase.rpc('get_ip_endpoint_heatmap', { p_ip: ip, p_days: 30 })

  // 5. Relationships (partial)
  const relationships = {
    ip: ip,
    sessions: await getSessionsForIP(ip),
    clients: await getClientsForIP(ip), // via user_id or client_id
    ga4: null, // ❌ Not available
    conversions: await getConversionsForClients(clientIds)
  }

  // 6. Comparables
  const comparables = await supabase.rpc('get_similar_ips', { p_ip: ip, p_limit: 5 })

  return NextResponse.json({
    summary,
    evidence,
    tape,
    heatmap,
    relationships,
    comparables,
    meta: { range, timestamp: new Date().toISOString() }
  })
}
```

#### 2. RPC Functions à Créer

**A. get_ip_endpoint_heatmap**
```sql
CREATE OR REPLACE FUNCTION get_ip_endpoint_heatmap(p_ip text, p_days int)
RETURNS TABLE (
  path text,
  p50 int,
  p75 int,
  p95 int,
  avg int,
  status_2xx bigint,
  status_4xx bigint,
  status_5xx bigint,
  evidence_row_id text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.path,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p75,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.duration_ms)::int as p95,
    AVG(tr.duration_ms)::int as avg,
    COUNT(*) FILTER (WHERE tr.status BETWEEN 200 AND 299) as status_2xx,
    COUNT(*) FILTER (WHERE tr.status BETWEEN 400 AND 499) as status_4xx,
    COUNT(*) FILTER (WHERE tr.status >= 500) as status_5xx,
    MIN(tr.trace_id) as evidence_row_id
  FROM telemetry_requests tr
  WHERE tr.ip = p_ip
    AND tr.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY tr.path
  ORDER BY COUNT(*) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

**B. get_similar_ips**
```sql
CREATE OR REPLACE FUNCTION get_similar_ips(p_ip text, p_limit int)
RETURNS TABLE (
  ip text,
  similarity_score numeric,
  signature text,
  quality_score text,
  conversion_signal text,
  top_risk_endpoint text,
  evidence jsonb
) AS $$
BEGIN
  -- Simplified version: compare on total_requests, unique_pages, p95, landing_page
  RETURN QUERY
  WITH target AS (
    SELECT * FROM ip_to_seo_segment WHERE ip = p_ip
  )
  SELECT
    s.ip,
    -- Cosine similarity (simplified)
    (1.0 - (
      ABS(s.total_requests - t.total_requests)::numeric / NULLIF(GREATEST(s.total_requests, t.total_requests), 0) +
      ABS(s.unique_pages - t.unique_pages)::numeric / NULLIF(GREATEST(s.unique_pages, t.unique_pages), 0) +
      ABS(s.p95_duration_ms - t.p95_duration_ms)::numeric / NULLIF(GREATEST(s.p95_duration_ms, t.p95_duration_ms), 0)
    ) / 3.0) as similarity_score,
    CASE
      WHEN s.landing_page = t.landing_page THEN 'Same landing: ' || s.landing_page
      ELSE 'Different pattern'
    END as signature,
    'p95 ' || s.p95_duration_ms || 'ms' as quality_score,
    CASE
      WHEN s.total_requests > 100 THEN 'HIGH'
      WHEN s.total_requests > 20 THEN 'MED'
      ELSE 'LOW'
    END as conversion_signal,
    s.most_visited_page as top_risk_endpoint,
    jsonb_build_object(
      'ipseg_id', s.ip,
      'last_seen', s.last_seen,
      '5xx_count', s.status_5xx_count
    ) as evidence
  FROM ip_to_seo_segment s, target t
  WHERE s.ip != p_ip
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Frontend Component: `<NSADossier />`

Utilise le HTML fourni comme base, mais populate avec vraies données:

```tsx
'use client'

import { useEffect, useState } from 'react'

export default function NSADossier({ ip }: { ip: string }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/seo/ip/${ip}/nsa-dossier?range=30d`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [ip])

  if (loading) return <div>Loading NSA Dossier...</div>

  return (
    <div className="nsa-dossier">
      {/* Header avec métadonnées */}
      <header>
        <div className="chip">Case: NET-OPS-SEO-{data.summary.id}</div>
        <div className="chip">Threat: {calculateThreat(data.summary)}</div>
        <div className="chip">Confidence: {data.summary.confidence_score}</div>
      </header>

      {/* KPIs */}
      <div className="kpiRow">
        <KPI label="Identity" value={ip} sub={`Geo: ${data.summary.region}`} />
        <KPI label="Activity" value={`${data.summary.total_requests} req`} sub={`Active days: ${data.summary.active_days}`} />
        <KPI label="Quality" value={`p95 ${data.summary.p95_duration_ms}ms`} sub={`5xx: ${data.summary.status_5xx_count}`} />
        <KPI label="Conversion" value={data.conversions || 'N/A'} sub="Pattern analysis" />
      </div>

      {/* Evidence Table */}
      <table>
        <thead>
          <tr>
            <th>Métrique</th>
            <th>Valeur</th>
            <th>Disponible?</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.evidence).map(([key, ev]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{ev.value}</td>
              <td><span className={`tag ${ev.available ? 'ok' : 'no'}`}>{ev.source}</span></td>
              <td className="evidence">
                {ev.evidence.row_id && <>row_id: <span className="v">{ev.evidence.row_id}</span></>}
                {ev.evidence.timestamp && <> • ts: <span className="v">{ev.evidence.timestamp}</span></>}
                {ev.evidence.log && <div className="evline"><span className="k">log:</span> {ev.evidence.log}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Evidence Tape */}
      <div className="diagram">
        {data.tape.map(t => (
          `${t.created_at}  ${t.trace_id}  ${ip}  ${t.method}  ${t.path}  ${t.status}  ${t.duration_ms}ms  region=${t.region}\n`
        ))}
      </div>

      {/* Heatmap */}
      <table className="heat">
        {/* ... render heatmap data ... */}
      </table>

      {/* Relationships Graph */}
      <div className="diagram">
        {renderRelationshipsASCII(data.relationships)}
      </div>

      {/* Comparables */}
      <table>
        {/* ... render comparables ... */}
      </table>
    </div>
  )
}
```

---

### Phase 2: Complete (Requires Instrumentation) - Score 100%

**Ce qui nécessite de l'instrumentation:**

#### 1. Session ID Unifié (Client ↔ Server Bridge)

**Client-side (tracking.js):**
```javascript
// Generate correlation_id on client
const correlationId = crypto.randomUUID()
sessionStorage.setItem('sar_correlation_id', correlationId)

// Send with every telemetry event
fetch('/api/telemetry/track-event', {
  body: JSON.stringify({
    correlation_id: correlationId,
    visit_id: visitId,
    session_id: sessionId,
    // ... other fields
  })
})

// Also send to GA4
gtag('config', 'GA4_ID', {
  'user_properties': {
    'correlation_id': correlationId
  }
})
```

**Backend (middleware):**
```typescript
// Store correlation_id in telemetry_requests
await supabase.from('telemetry_requests').insert({
  ip: req.ip,
  correlation_id: headers.get('x-sar-correlation-id'),
  // ... other fields
})
```

**Result:** IP ↔ correlation_id ↔ GA4 session ✅

#### 2. Web Vitals Par IP

Nécessite Vercel Speed Insights API qui expose IP (actuellement pas disponible).

**Alternative:** Track web vitals côté client et envoyer à SAR telemetry:
```javascript
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

onLCP((metric) => {
  fetch('/api/telemetry/track-event', {
    body: JSON.stringify({
      event: 'web_vital',
      metric_name: 'lcp',
      metric_value: metric.value,
      visit_id: visitId,
      // Backend will attach IP
    })
  })
})
```

**Result:** Web Vitals par IP ✅

#### 3. Referrer Tracking Systématique

**Client-side:**
```javascript
fetch('/api/telemetry/track-event', {
  body: JSON.stringify({
    referrer: document.referrer,
    landing_page: window.location.pathname,
    utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    // ...
  })
})
```

**Backend:** Store in `telemetry_events.meta`

---

## 🎨 DESIGN SYSTEM

Le mockup utilise:
- **Colors:** Dark theme avec gradients (bg: #070b14, panel: #0b1326)
- **Fonts:** Monospace pour data, Sans-serif pour labels
- **Badges:** Color-coded (good=green, warn=yellow, crit=red, info=blue)
- **Evidence column:** Monospace avec highlighting (k=key, v=value, fade=log)
- **Heatmap:** Color gradient (hm0=good, hm1=ok, hm2=warn, hm3=crit)
- **ASCII diagrams:** Monospace avec box drawing characters

**Tailwind Config:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        nsa: {
          bg: '#070b14',
          panel: '#0b1326',
          panel2: '#0d1832',
          text: '#dbe7ff',
          muted: '#8ea2d8',
          good: '#2be4a7',
          warn: '#ffcc66',
          crit: '#ff5c7a',
          info: '#72a7ff',
        }
      }
    }
  }
}
```

---

## 📋 PROCHAINES ÉTAPES

### Immédiat (Aujourd'hui)
1. ✅ Créer API route `/api/seo/ip/[ip]/nsa-dossier`
2. ✅ Créer RPC functions (get_ip_endpoint_heatmap, get_similar_ips)
3. ✅ Créer composant `<NSADossier />` avec le CSS du mockup
4. ✅ Tester avec IP réelle (142.127.223.188)

### Court Terme (Cette Semaine)
5. ✅ Ajouter tabs (Evidence / Heatmap / Relationships / Comparables)
6. ✅ Implémenter similarity algorithm pour Comparables
7. ✅ Ajouter filtres par range (7d/30d/90d)
8. ✅ Deploy et test en production

### Moyen Terme (Ce Mois)
9. ⚙️ Instrumenter correlation_id (client + server)
10. ⚙️ Track web vitals côté client
11. ⚙️ Améliorer referrer tracking
12. ⚙️ Bridge SAR ↔ GA4 via correlation_id

---

## 🎉 CONCLUSION

**Le design "NSA Dossier v3" est 85% réalisable MAINTENANT** avec les données SAR existantes.

Les 15% manquants nécessitent de l'instrumentation (correlation_id, web vitals tracking) mais ne bloquent pas le MVP.

**Recommandation:** Commencer par implémenter Phase 1 (MVP) aujourd'hui, ça donnera déjà un dossier IP impressionnant avec Evidence partout!

---

**Prêt à coder?** 🚀
