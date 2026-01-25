# 📊 GUIDE D'UTILISATION - DASHBOARDS VERCEL

**Statut**: ✅ Tous les add-ons activés

---

## 🔍 DASHBOARD 1: OBSERVABILITY

**URL**: https://vercel.com/project-ghostline/sar/observability

### Ce que tu vas voir:

#### A. Runtime Logs (en temps réel)
```
Filtre par endpoint:
  → /api/telemetry/track-event
  → /api/telemetry/write
  → /api/applications/submit

Filtre par niveau:
  → Error (erreurs critiques)
  → Warn (warnings, VPN détectés)
  → Info (events normaux)
```

**Exemple de logs à chercher**:
```json
{
  "type": "metric",
  "name": "telemetry.sessions_created",
  "value": 1,
  "tags": {
    "device_type": "Mobile",
    "has_utm": "true",
    "country": "CA"
  }
}
```

#### B. Traces (Performance)
```
Endpoint: /api/telemetry/track-event
Métriques:
  → P50 (médiane): ~150ms
  → P95: ~300ms
  → P99: ~500ms

Filtre par durée:
  → > 500ms (appels lents)
```

#### C. Metrics (Custom)
Nos métriques custom apparaîtront ici:

```
telemetry.api.duration_ms
  └─ Tags: endpoint, status
  └─ Aggregation: P50, P95, P99

telemetry.sessions_created
  └─ Tags: device_type, has_utm, country
  └─ Aggregation: Count, Rate

telemetry.security_events
  └─ Tags: event_type, asn
  └─ Aggregation: Count
```

---

## 📈 DASHBOARD 2: WEB ANALYTICS

**URL**: https://vercel.com/project-ghostline/sar/analytics

### Ce que tu vas voir:

#### A. Visitors (Visiteurs)
```
📊 Métriques:
  → Visiteurs uniques (jour/semaine/mois)
  → Sessions totales
  → Taux de rebond
  → Durée moyenne session

📅 Périodes:
  → Dernières 24h
  → 7 derniers jours
  → 30 derniers jours
  → Custom range
```

#### B. Pages
```
Pages les plus visitées:
  1. /
  2. /demande-de-pret-en-ligne-formulaire
  3. /nous-joindre
  4. /faq

Par page:
  → Vues uniques
  → Temps moyen sur page
  → Taux de sortie
```

#### C. Referrers (Sources de trafic)
```
Top sources:
  1. Direct (pas de referrer)
  2. google.com/search
  3. facebook.com
  4. google.ca/ads

UTM Campaigns (si capturés):
  → utm_source: google, facebook, email
  → utm_medium: cpc, organic, social
  → utm_campaign: winter-2026, promo-janvier
```

#### D. Locations (Géolocalisation)
```
Par pays:
  🇨🇦 Canada: 85%
  🇺🇸 USA: 10%
  🇫🇷 France: 3%
  
Par ville (top 5):
  1. Montréal
  2. Québec
  3. Laval
  4. Longueuil
  5. Gatineau
```

#### E. Devices
```
Types:
  💻 Desktop: 60%
  📱 Mobile: 35%
  📱 Tablet: 5%

Browsers:
  Chrome: 55%
  Safari: 25%
  Firefox: 10%
  Edge: 8%
  Other: 2%

Operating Systems:
  Windows: 40%
  iOS: 25%
  macOS: 20%
  Android: 12%
  Other: 3%
```

---

## ⚡ DASHBOARD 3: SPEED INSIGHTS

**URL**: https://vercel.com/project-ghostline/sar/speed-insights

### Ce que tu vas voir:

#### Core Web Vitals
```
LCP (Largest Contentful Paint)
  ✅ Good: < 2.5s
  ⚠️  Needs Improvement: 2.5s - 4.0s
  ❌ Poor: > 4.0s

FID (First Input Delay)
  ✅ Good: < 100ms
  ⚠️  Needs Improvement: 100ms - 300ms
  ❌ Poor: > 300ms

CLS (Cumulative Layout Shift)
  ✅ Good: < 0.1
  ⚠️  Needs Improvement: 0.1 - 0.25
  ❌ Poor: > 0.25
```

#### Score par page
```
Page                           Score    LCP    FID    CLS
/                              95       1.8s   45ms   0.05
/demande-de-pret...            88       2.1s   78ms   0.08
/nous-joindre                  92       1.9s   52ms   0.06
```

#### Device breakdown
```
Desktop Performance: 95
Mobile Performance: 88
Tablet Performance: 91
```

---

## 🔔 ALERTES À CONFIGURER

### Dans Observability → Alerts

#### Alerte 1: API Errors
```
Name: Telemetry API High Error Rate
Condition: Error rate > 5%
Window: 5 minutes
Filter: path starts with /api/telemetry
Notification: Email solutionargentrapide@gmail.com
```

#### Alerte 2: Slow API
```
Name: Telemetry API Slow Response
Condition: P95 latency > 500ms
Window: 5 minutes
Filter: /api/telemetry/track-event
Notification: Email solutionargentrapide@gmail.com
```

#### Alerte 3: High Volume (quota ipapi.co)
```
Name: High Session Creation Rate
Condition: Count > 800 in 1 hour
Metric: telemetry.sessions_created
Notification: Email + Slack (quota warning)
```

---

## 📊 QUERIES UTILES

### Observability Logs
```
Filter Examples:
1. Voir toutes les erreurs:
   level:error

2. Voir détection VPN:
   "VPN/Proxy detected"

3. Voir sessions créées:
   "First event for session"

4. Voir events spécifiques:
   path:/api/telemetry/track-event AND level:info
```

### Metrics
```
Query Examples:
1. Performance API (P95):
   telemetry.api.duration_ms
   → Aggregation: P95
   → Group by: endpoint, status

2. Sessions par device:
   telemetry.sessions_created
   → Aggregation: Count
   → Group by: device_type

3. Taux de VPN:
   telemetry.security_events
   → Aggregation: Count
   → Group by: event_type
```

---

## 🎯 WORKFLOWS RECOMMANDÉS

### Workflow 1: Monitoring quotidien (5 min/jour)
```
1. Web Analytics → Check visiteurs uniques
2. Speed Insights → Check Core Web Vitals
3. Observability Logs → Filter level:error (check aucune erreur)
4. Metrics → telemetry.sessions_created (vérifier trafic normal)
```

### Workflow 2: Analyse hebdomadaire (30 min/semaine)
```
1. Web Analytics:
   → Top pages visitées
   → Sources de trafic (Google Ads performance)
   → Geolocation (nouveaux pays?)
   
2. Speed Insights:
   → Trends (performance améliore ou dégrade?)
   → Pages lentes (> 3s LCP)
   
3. Observability:
   → Taux d'erreur API
   → P95 latency trends
   → Security events (VPN/Proxy rate)
```

### Workflow 3: Debugging issue
```
1. Observability Logs:
   → Filter par timestamp
   → Search error message
   → View trace ID
   
2. Traces:
   → Find trace by ID
   → See full request flow
   → Identify slow component
   
3. Metrics:
   → Check if spike in errors
   → Correlate with deployment time
```

---

## 💡 TIPS & TRICKS

### Tip 1: Corrélation Events
```
Dans Supabase:
SELECT 
  cs.session_id,
  cs.first_utm_source,
  cs.device_type,
  COUNT(cte.id) as events
FROM client_sessions cs
LEFT JOIN client_telemetry_events cte ON cs.session_id = cte.session_id
GROUP BY cs.session_id, cs.first_utm_source, cs.device_type
ORDER BY events DESC
LIMIT 10;

Dans Web Analytics:
→ Compare avec visiteurs uniques
→ Valide que notre tracking = Vercel tracking
```

### Tip 2: ROI Google Ads
```
Dans Supabase:
SELECT 
  first_utm_campaign,
  COUNT(*) as sessions,
  COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) as conversions,
  ROUND(
    COUNT(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL) * 100.0 / COUNT(*), 
    2
  ) as conversion_rate
FROM client_sessions
WHERE first_utm_source = 'google'
  AND first_utm_medium = 'cpc'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY first_utm_campaign
ORDER BY conversions DESC;
```

### Tip 3: Performance Baseline
```
Capture baseline après déploiement:
→ P50 track-event: ~150ms
→ P95 track-event: ~300ms
→ P99 track-event: ~500ms

Si P95 > 500ms:
→ Check ipapi.co response time
→ Check Supabase query time
→ Check if quota exceeded
```

---

## 🚨 ALERTES À SURVEILLER

### Critique (action immédiate)
```
❌ Error rate > 10% (API cassée)
❌ P95 latency > 1000ms (performance dégradée)
❌ 0 sessions created en 1h (tracking cassé)
```

### Warning (vérifier dans 24h)
```
⚠️  Error rate 5-10% (problème intermittent)
⚠️  P95 latency 500-1000ms (performance dégradée)
⚠️  > 800 sessions en 1h (quota ipapi.co proche)
```

### Info (monitoring seulement)
```
ℹ️  VPN detected (normal, ~5-10% du trafic)
ℹ️  Bot detected (normal, ~2-5% du trafic)
ℹ️  New country (expansion géographique?)
```

---

## 📈 KPIs À TRACKER

### Semaine 1 (baseline)
```
Sessions/jour: ___
Conversion rate: ___%
P95 API latency: ___ms
Error rate: ___%
VPN rate: ___%
Top UTM source: ___
```

### Objectifs mois 1
```
✅ Sessions/jour: +20%
✅ P95 latency: < 300ms
✅ Error rate: < 1%
✅ Conversion rate: +5%
```

---

**FIN DU GUIDE**
