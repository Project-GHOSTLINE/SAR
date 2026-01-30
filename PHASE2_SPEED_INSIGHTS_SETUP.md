# ✅ PHASE 2 - SPEED INSIGHTS SETUP COMPLET

**Date**: 2026-01-30
**Status**: ✅ **CODE CRÉÉ - CONFIGURATION VERCEL REQUISE**

---

## 📦 CE QUI A ÉTÉ CRÉÉ

### 1️⃣ Fichiers créés (2)

✅ **Endpoint Drain**:
```
src/app/api/vercel/drains/speed-insights/route.ts
```
- Reçoit les events Speed Insights via webhook
- Vérifie `VERCEL_DRAIN_SECRET`
- Supporte JSON et NDJSON
- Stocke dans `vercel_speed_insights_raw`

✅ **Job d'agrégation quotidien**:
```
src/app/api/cron/aggregate-speed-insights/route.ts
```
- Lit `vercel_speed_insights_raw` (processed = false)
- Calcule p50/p75/p95 pour LCP/INP/CLS/TTFB/FCP
- Détermine `perf_status` (GOOD/WARN/CRIT)
- Upsert dans `vercel_speed_insights_daily`
- Marque raw comme processed

### 2️⃣ Configuration ajoutée

✅ **Secret généré**:
```bash
VERCEL_DRAIN_SECRET=9e955526dfdad4f0fad07834d64174ce71326220e6a69697de6655c15b30bf58
```
- ✅ Ajouté dans `.env.local`
- ✅ Ajouté dans `.env.example`

✅ **Cron configuré** (vercel.json):
```json
{
  "path": "/api/cron/aggregate-speed-insights",
  "schedule": "0 3 * * *"  // Tous les jours à 3h
}
```

---

## 🚀 ÉTAPES DE CONFIGURATION VERCEL

### Étape 1: Déployer le code

```bash
git add .
git commit -m "feat(seo): add Speed Insights Drain + aggregation job"
git push origin main
```

Attendre que Vercel déploie (1-2 minutes).

---

### Étape 2: Ajouter le secret dans Vercel Dashboard

1. Aller sur https://vercel.com/[team]/[project]/settings/environment-variables
2. Ajouter une nouvelle variable:
   - **Key**: `VERCEL_DRAIN_SECRET`
   - **Value**: `9e955526dfdad4f0fad07834d64174ce71326220e6a69697de6655c15b30bf58`
   - **Environment**: Production, Preview, Development
3. Cliquer **Save**
4. **Redéployer** pour appliquer (Deployments → Latest → Redeploy)

---

### Étape 3: Configurer le Drain dans Vercel

1. Aller sur https://vercel.com/[team]/[project]/settings/speed-insights
2. Scroll jusqu'à **Data Destinations** ou **Drains**
3. Cliquer **Add Drain**
4. Configurer:
   - **Name**: Speed Insights to Supabase
   - **Delivery Format**: NDJSON (recommandé)
   - **Endpoint URL**: `https://solutionargentrapide.ca/api/vercel/drains/speed-insights`
   - **Secret**: `9e955526dfdad4f0fad07834d64174ce71326220e6a69697de6655c15b30bf58`
   - **Environment**: Production
5. Cliquer **Create Drain**
6. Vercel teste la connexion → devrait afficher ✅ Success

---

## 🧪 TESTS DE VALIDATION

### Test 1: Vérifier que le Drain reçoit des données (10 min après config)

**Requête SQL** (Supabase SQL Editor):
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = false) as pending,
  COUNT(*) FILTER (WHERE processed = true) as processed,
  MAX(received_at) as last_received
FROM vercel_speed_insights_raw;
```

**Résultat attendu**:
```
total | pending | processed | last_received
------|---------|-----------|-------------------
  X   |   X     |    0      | 2026-01-30 ...
```

Si `total > 0` → ✅ Drain fonctionne!

---

### Test 2: Tester le job d'agrégation manuellement

**Appel direct** (en local ou via Vercel):
```bash
curl https://solutionargentrapide.ca/api/cron/aggregate-speed-insights
```

**Résultat attendu**:
```json
{
  "status": "ok",
  "processed": 42,
  "buckets": 3,
  "upserted": 3,
  "summary": [
    {
      "date": "2026-01-30",
      "path": "/",
      "device": "mobile",
      "samples": 15,
      "lcp_p75": 1850,
      "status": "GOOD"
    },
    ...
  ]
}
```

---

### Test 3: Vérifier les données agrégées

**Requête SQL**:
```sql
SELECT
  date,
  path,
  device,
  sample_count,
  lcp_p75,
  inp_p75,
  cls_p75,
  perf_status
FROM vercel_speed_insights_daily
ORDER BY date DESC, sample_count DESC
LIMIT 10;
```

**Résultat attendu**:
```
date       | path | device  | samples | lcp_p75 | perf_status
-----------|------|---------|---------|---------|------------
2026-01-30 | /    | mobile  | 15      | 1850    | GOOD
2026-01-30 | /    | desktop | 8       | 1200    | GOOD
...
```

---

### Test 4: Vérifier la view unifiée

**Requête SQL**:
```sql
SELECT
  date,
  ga4_users,
  gsc_clicks,
  semrush_keywords,
  avg_lcp_p75,
  avg_inp_p75,
  perf_status,
  speed_samples
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 7;
```

**Résultat attendu**:
- ✅ Colonnes GA4/GSC/Semrush remplies (depuis Phase 1)
- ✅ Colonnes Speed (`avg_lcp_p75`, `perf_status`) remplies (après agrégation)

---

## 🐛 TROUBLESHOOTING

### Erreur: "Unauthorized" dans les logs Vercel

**Cause**: Secret incorrect ou manquant

**Solution**:
1. Vérifier `.env.local` contient `VERCEL_DRAIN_SECRET`
2. Vérifier Vercel Dashboard → Environment Variables
3. Redéployer après ajout de la variable

---

### Erreur: "Empty body" ou "Invalid JSON"

**Cause**: Format du payload Vercel incorrect

**Solution**:
1. Vérifier Drain configuré en **NDJSON** (pas JSON)
2. Regarder les logs Vercel pour voir le payload envoyé
3. Ajuster le parsing dans `route.ts` si nécessaire

---

### Table `vercel_speed_insights_raw` reste vide

**Causes possibles**:
1. Drain pas configuré dans Vercel Dashboard
2. Secret incorrect
3. Pas assez de trafic réel (attendre 10-30 min)

**Debug**:
1. Vercel Dashboard → Speed Insights → vérifier que des données sont collectées
2. Vercel Dashboard → Drains → vérifier status "Active"
3. Vercel Dashboard → Logs → chercher erreurs 401/500

---

### Job d'agrégation ne s'exécute pas

**Causes possibles**:
1. Cron pas configuré dans `vercel.json`
2. Cron pas activé dans Vercel Dashboard

**Solution**:
1. Vérifier `vercel.json` contient le cron
2. Vercel Dashboard → Cron Jobs → vérifier liste
3. Exécuter manuellement pour tester

---

## 📊 MÉTRIQUES SPEED INSIGHTS

### Core Web Vitals collectés

| Métrique | Description | Seuil GOOD | Seuil WARN | Seuil CRIT |
|----------|-------------|------------|------------|------------|
| **LCP** | Largest Contentful Paint | < 2500ms | < 4000ms | ≥ 4000ms |
| **INP** | Interaction to Next Paint | < 200ms | < 500ms | ≥ 500ms |
| **CLS** | Cumulative Layout Shift | < 0.1 | < 0.25 | ≥ 0.25 |
| **TTFB** | Time to First Byte | < 800ms | < 1800ms | ≥ 1800ms |
| **FCP** | First Contentful Paint | - | - | - |

### Percentiles calculés

- **p50** (médiane) - Performance typique
- **p75** (recommandé Google) - 75% des utilisateurs
- **p95** - Pire cas (5% des utilisateurs)

---

## ✅ CHECKLIST COMPLÈTE

### Configuration
- [x] Code créé (Drain + Job)
- [x] Secret généré
- [x] Secret ajouté dans .env.local
- [x] Secret ajouté dans .env.example
- [x] Cron configuré dans vercel.json
- [ ] Code déployé sur Vercel
- [ ] Secret ajouté dans Vercel Dashboard
- [ ] Drain configuré dans Vercel Dashboard

### Tests
- [ ] `vercel_speed_insights_raw` reçoit des données
- [ ] Job d'agrégation fonctionne
- [ ] `vercel_speed_insights_daily` contient des données
- [ ] View `seo_unified_daily_plus` affiche Speed Insights
- [ ] `perf_status` calculé correctement (GOOD/WARN/CRIT)

### Validation
- [ ] Drain actif pendant 24h
- [ ] Cron s'exécute automatiquement
- [ ] Métriques cohérentes avec Vercel Dashboard
- [ ] Pas d'erreurs dans les logs

---

## 🔜 PROCHAINE ÉTAPE (PHASE 3)

Une fois les données Speed Insights collectées pendant 1 journée:

**Phase 3 - API Routes Unifiées** (1h30):
1. `GET /api/seo/overview` - KPIs GA4 + GSC + Semrush + Speed
2. `GET /api/seo/ip/[ip]` - IP Intelligence + Timeline
3. `GET /api/seo/perf` - Speed Insights détaillé par page/device

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30

**Status**: ✅ **CODE PRÊT - CONFIGURATION VERCEL REQUISE**
