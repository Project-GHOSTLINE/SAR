# 🔧 ACTIVATION VERCEL OBSERVABILITY & ANALYTICS

**Tu as acheté**: Observability Plus ($10/mois) + Web Analytics Plus ($10/mois)

Le **code est déjà déployé** ✅, mais il faut **activer dans le dashboard Vercel**.

---

## ✅ ÉTAPE 1: Activer Observability Plus

1. Va sur: **https://vercel.com/project-ghostline/sar/settings/observability**

2. Clique sur **"Enable Observability Plus"**

3. Confirme l'activation

4. **IMPORTANT**: Sélectionne les sources de données:
   - ✅ **Runtime Logs** (errors, warnings, info)
   - ✅ **Traces** (API performance)  
   - ✅ **Metrics** (custom metrics)

---

## ✅ ÉTAPE 2: Activer Web Analytics Plus

1. Va sur: **https://vercel.com/project-ghostline/sar/settings/analytics**

2. Clique sur **"Enable Web Analytics Plus"**

3. Confirme l'activation

**Fonctionnalités automatiques**:
- Visiteurs uniques par jour/semaine/mois
- Pages les plus visitées
- Sources de trafic (referrers)
- Géolocalisation des visiteurs
- Devices (Desktop/Mobile/Tablet)

---

## ✅ ÉTAPE 3: Activer Speed Insights (optionnel, déjà inclus)

1. Va sur: **https://vercel.com/project-ghostline/sar/settings/speed-insights**

2. Devrait déjà être activé automatiquement

**Métriques capturées**:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- FCP (First Contentful Paint)

---

## 📊 ÉTAPE 4: Configurer les alertes Observability

Une fois Observability activé:

1. Va dans **Observability** → **Alerts**

2. Crée 3 alertes:

### A. Alerte "Telemetry API Errors"
```
Nom: Telemetry API Errors
Condition: Error rate > 5%
Période: 5 minutes
Endpoints: /api/telemetry/*
Action: Email à solutionargentrapide@gmail.com
```

### B. Alerte "Slow Telemetry API"
```
Nom: Slow Telemetry API
Condition: P95 latency > 500ms
Période: 5 minutes
Endpoints: /api/telemetry/track-event
Action: Email à solutionargentrapide@gmail.com
```

### C. Alerte "High Event Volume" (quota ipapi.co)
```
Nom: High Event Volume
Condition: > 800 events en 1 heure
Métrique: telemetry.sessions_created
Action: Email (warning: approche limite 1000/day ipapi.co)
```

---

## 📈 ÉTAPE 5: Vérifier que ça marche

### Observability
1. Va sur: **https://vercel.com/project-ghostline/sar/observability**
2. Tu devrais voir:
   - 📊 **Logs** en temps réel
   - 📈 **Metrics** custom (telemetry.api.duration_ms, telemetry.sessions_created)
   - 🔍 **Traces** des API calls

### Web Analytics
1. Va sur: **https://vercel.com/project-ghostline/sar/analytics**
2. Tu devrais voir:
   - 👥 **Visitors** (unique visitors)
   - 📄 **Pages** (most visited pages)
   - 🌍 **Locations** (countries, cities)
   - 📱 **Devices** (Desktop vs Mobile)

### Speed Insights
1. Va sur: **https://vercel.com/project-ghostline/sar/speed-insights**
2. Tu devrais voir:
   - ⚡ **Real User Metrics** (LCP, FID, CLS)
   - 📊 **Score** par page
   - 📈 **Trends** over time

---

## 🎯 MÉTRIQUES CUSTOM DISPONIBLES

Nos métriques custom (via Observability Plus):

```javascript
// Performance API
telemetry.api.duration_ms
  - Tag: endpoint (/api/telemetry/track-event)
  - Tag: status (success | error)

telemetry.api.errors
  - Tag: endpoint

// Sessions
telemetry.sessions_created
  - Tag: device_type (Desktop | Mobile | Tablet)
  - Tag: has_utm (true | false)
  - Tag: country (CA, US, FR, etc.)

// Security
telemetry.security_events
  - Tag: event_type (vpn_detected | bot_detected | proxy_detected)
  - Tag: asn (ASN number)

// Quota monitoring
telemetry.ipapi_quota_remaining
  - Tag: service (ipapi.co)
```

---

## 🔍 QUERIES UTILES

### Dans Observability → Logs:
```
Filter: /api/telemetry/track-event
Level: error
```

### Dans Observability → Metrics:
```
Metric: telemetry.api.duration_ms
Aggregation: P95
Group by: endpoint, status
```

### Dans Observability → Traces:
```
Endpoint: /api/telemetry/track-event
Duration: > 300ms
```

---

## ✅ CHECKLIST ACTIVATION

- [ ] Observability Plus activé
- [ ] Runtime Logs activés
- [ ] Traces activés
- [ ] Metrics activés
- [ ] 3 alertes configurées
- [ ] Web Analytics Plus activé
- [ ] Speed Insights activé (auto)
- [ ] Tester en visitant le site
- [ ] Vérifier métriques apparaissent dans dashboard

---

## 💰 COÛTS

**Inclus dans ton abonnement**:
- Observability Plus: $10/mois + ~$1.20/1M events
- Web Analytics Plus: $10/mois
- Speed Insights: Inclus (pas de coût additionnel)

**Total**: ~$20/mois + usage based events

**Quota à surveiller**:
- ipapi.co: 1000 req/day (gratuit)
  - Si dépassé: Upgrade à $10/mois pour 30k req/day
  - Ou: Utiliser mock data en dev pour réduire calls

---

**FIN DU GUIDE**
