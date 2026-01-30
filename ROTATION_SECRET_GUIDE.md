# 🔒 ROTATION SECRET + CONFIGURATION DRAIN

**Date**: 2026-01-30
**Status**: ✅ SECRET ROTÉ AUTOMATIQUEMENT

---

## ✅ CE QUI A ÉTÉ FAIT AUTOMATIQUEMENT

### 1. Nouveau secret généré
```
aa166c5a6a674cee97b86db7bd7cec85e311491a9edaeefe9bc8d3227af5ffe5
```

### 2. Ancien secret supprimé de Vercel
- ✅ ID: `EgIBBu3BMN23QR9n` (supprimé)

### 3. Nouveau secret ajouté à Vercel
- ✅ ID: `pPeglSOyme71PjO3` (actif)
- ✅ Disponible dans: Production, Preview, Development

### 4. .env.local mis à jour localement
- ✅ `.env.local` contient le nouveau secret
- ✅ `.env.local` est bien dans `.gitignore` (vérifié)

---

## ⚠️ ACTION REQUISE (2 MINUTES)

### Étape 1: Redéployer pour appliquer le nouveau secret

**Option A - Via GitHub** (recommandé):
```bash
git commit --allow-empty -m "chore: trigger redeploy for secret rotation"
git push
```

**Option B - Via Vercel Dashboard**:
1. Aller sur https://vercel.com/team_Rsbwr6LzT93S2w90kI3Cdz07/sar
2. Onglet **Deployments**
3. Cliquer sur le dernier déploiement
4. Bouton **⋯** → **Redeploy**

---

### Étape 2: Configurer le Drain Vercel (NOUVEAU SECRET)

**URL**: https://vercel.com/team_Rsbwr6LzT93S2w90kI3Cdz07/sar/settings/speed-insights

#### Configuration Drain:

| Champ | Valeur |
|-------|--------|
| **Name** | `Speed Insights to Supabase` |
| **Type** | `Speed Insights` |
| **Delivery Format** | `NDJSON` ✅ |
| **Endpoint URL** | `https://solutionargentrapide.ca/api/vercel/drains/speed-insights` |
| **Authorization** | `Bearer aa166c5a6a674cee97b86db7bd7cec85e311491a9edaeefe9bc8d3227af5ffe5` |
| **Environment** | `Production` |

**Cliquer "Create" ou "Save"**

Vercel va tester la connexion → Devrait afficher ✅ Success

---

## 🧪 TESTS IMMÉDIATS

### Test 1: Générer des événements Speed Insights (2 min)

1. **Ouvrir en navigation privée**:
   ```
   https://solutionargentrapide.ca/
   ```

2. **Naviguer un peu**:
   - Attendre 10 secondes (LCP se mesure)
   - Scroller la page
   - Cliquer sur des liens
   - Ouvrir `/admin/seo`

3. **Attendre 60-120 secondes** (Vercel batch les events)

---

### Test 2: Vérifier que les events arrivent en DB

**Dans Supabase SQL Editor**:

```sql
-- Test 1: Count total
SELECT COUNT(*) as total_events
FROM vercel_speed_insights_raw;
```

**Résultat attendu**: `> 0` (au moins quelques events)

---

```sql
-- Test 2: Voir les derniers events
SELECT
  received_at,
  extracted_url,
  extracted_device,
  extracted_lcp,
  extracted_inp,
  extracted_cls,
  extracted_ttfb
FROM vercel_speed_insights_raw
ORDER BY received_at DESC
LIMIT 10;
```

**Résultat attendu**: Liste des events avec métriques réelles

---

### Test 3: Lancer l'agrégation manuellement (pas besoin d'attendre 3h)

**Curl**:
```bash
curl -s https://solutionargentrapide.ca/api/cron/aggregate-speed-insights
```

**Résultat attendu**:
```json
{
  "status": "ok",
  "processed": 42,
  "buckets": 3,
  "upserted": 3,
  "summary": [...]
}
```

---

### Test 4: Vérifier les agrégations daily

**Dans Supabase SQL Editor**:

```sql
-- Count daily aggregations
SELECT COUNT(*) as daily_aggregations
FROM vercel_speed_insights_daily;
```

**Résultat attendu**: `> 0`

---

```sql
-- Voir les agrégations
SELECT
  date,
  path,
  device,
  lcp_p75,
  inp_p75,
  cls_p75,
  ttfb_p75,
  sample_count,
  perf_status
FROM vercel_speed_insights_daily
ORDER BY date DESC, sample_count DESC
LIMIT 20;
```

**Résultat attendu**: Métriques avec p75 calculés + perf_status (GOOD/WARN/CRIT)

---

### Test 5: Vérifier la view unifiée (Speed Insights intégré)

```sql
SELECT
  date,
  ga4_users,
  gsc_clicks,
  semrush_keywords,
  avg_lcp_p75,
  avg_inp_p75,
  speed_samples,
  perf_status
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 15;
```

**Résultat attendu**:
- `avg_lcp_p75` non null
- `speed_samples` > 0
- `perf_status` = GOOD/WARN/CRIT

---

### Test 6: Vérifier le dashboard UI

**URL**: https://solutionargentrapide.ca/admin/seo

**Dans Command Center → Section Speed Insights**:
- ✅ LCP, INP, CLS affichés (au lieu de "En cours de collecte")
- ✅ Status badge: GOOD/WARN/CRIT
- ✅ Samples: nombre > 0

---

## 🔍 TROUBLESHOOTING

### Problème: vercel_speed_insights_raw reste vide après 5 min

**Causes possibles**:
1. Drain pas configuré dans Vercel Dashboard
2. Secret incorrect dans le Drain
3. Redeploy pas encore effectué

**Solutions**:
1. Vérifier Vercel Dashboard → Speed Insights → Drains (doit être "Active")
2. Vérifier que le secret dans le Drain correspond au nouveau
3. Redéployer via GitHub ou Dashboard

---

### Problème: Erreur 401 "Unauthorized" dans les logs Vercel

**Cause**: Secret incorrect ou pas encore déployé

**Solution**:
1. Vérifier que Vercel a le nouveau secret:
   ```bash
   curl -s 'https://api.vercel.com/v9/projects/prj_zrZxYj7W08vVPFyVQMtWG3qed4ri/env' \
     -H 'Authorization: Bearer 5Qjkd1qmU2PIwWopMZkBjvW2' \
     | grep "VERCEL_DRAIN_SECRET"
   ```
2. Redéployer pour appliquer

---

### Problème: Events arrivent mais agrégation échoue

**Cause**: Format payload Vercel différent de l'attendu

**Debug**:
```sql
-- Voir le payload brut
SELECT payload
FROM vercel_speed_insights_raw
ORDER BY received_at DESC
LIMIT 3;
```

**Vérifier les clés**: `route`, `path`, `url`, `device`, `lcp`, `inp`, etc.

Si différent, ajuster l'extraction dans:
- `src/app/api/vercel/drains/speed-insights/route.ts` (extraction)
- `src/app/api/cron/aggregate-speed-insights/route.ts` (parsing)

---

## 📊 QUERIES DE VALIDATION

### Query 1: Vue d'ensemble
```sql
SELECT
  (SELECT COUNT(*) FROM vercel_speed_insights_raw) as raw_events,
  (SELECT COUNT(*) FROM vercel_speed_insights_raw WHERE processed = false) as pending,
  (SELECT COUNT(*) FROM vercel_speed_insights_daily) as daily_agg,
  (SELECT MAX(received_at) FROM vercel_speed_insights_raw) as last_received;
```

**Résultat idéal**:
```
raw_events | pending | daily_agg | last_received
-----------|---------|-----------|-------------------
    250    |    0    |    15     | 2026-01-30 16:45:00
```

---

### Query 2: Performance par page
```sql
SELECT
  path,
  device,
  AVG(lcp_p75) as avg_lcp,
  AVG(inp_p75) as avg_inp,
  SUM(sample_count) as total_samples,
  MODE() WITHIN GROUP (ORDER BY perf_status) as most_common_status
FROM vercel_speed_insights_daily
GROUP BY path, device
ORDER BY total_samples DESC
LIMIT 10;
```

---

### Query 3: Évolution temporelle
```sql
SELECT
  date,
  COUNT(*) as page_combinations,
  SUM(sample_count) as total_samples,
  ROUND(AVG(lcp_p75)::numeric, 0) as avg_lcp,
  ROUND(AVG(inp_p75)::numeric, 0) as avg_inp,
  COUNT(*) FILTER (WHERE perf_status = 'CRIT') as critical_pages
FROM vercel_speed_insights_daily
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

---

## ✅ CHECKLIST FINALE

### Sécurité
- [x] Ancien secret supprimé
- [x] Nouveau secret généré (64 hex)
- [x] Nouveau secret dans Vercel
- [x] .env.local mis à jour
- [x] .env.local dans .gitignore
- [ ] **Redéploiement effectué**
- [ ] **Drain Vercel configuré avec nouveau secret**

### Tests
- [ ] `vercel_speed_insights_raw` contient des events (> 0)
- [ ] `vercel_speed_insights_daily` contient des agrégations (> 0)
- [ ] View `seo_unified_daily_plus` affiche Speed Insights
- [ ] Dashboard `/admin/seo` affiche métriques Speed
- [ ] Aucune erreur 401 dans les logs Vercel

### Performance
- [ ] LCP p75 < 2500ms (GOOD) ou explicable
- [ ] INP p75 < 200ms (GOOD) ou explicable
- [ ] CLS p75 < 0.1 (GOOD) ou explicable
- [ ] Samples > 100 sur 24h (trafic suffisant)

---

## 🎯 RÉSULTAT ATTENDU

Après configuration complète:

**Command Center Speed Insights**:
```
┌─────────────────────────────────────┐
│ Speed Insights           [GOOD] ✅  │
├─────────────────────────────────────┤
│ LCP      1850ms                     │
│ INP       150ms                     │
│ CLS      0.08                       │
│ Samples   245                       │
│                                     │
│ Mobile LCP:  2100ms                 │
│ Desktop LCP: 1400ms                 │
└─────────────────────────────────────┘
```

**View unifiée**:
```sql
date       | ga4_users | avg_lcp_p75 | speed_samples | perf_status
-----------|-----------|-------------|---------------|------------
2026-01-30 |    94     |    1850     |      245      | GOOD
2026-01-29 |    89     |    1920     |      198      | GOOD
```

---

## 📝 POUR TON RETOUR

**Colle-moi ces 3 queries quand tu as tout configuré**:

```sql
-- 1. Counts
SELECT
  (SELECT COUNT(*) FROM vercel_speed_insights_raw) as raw,
  (SELECT COUNT(*) FROM vercel_speed_insights_daily) as daily;

-- 2. Last 5 events
SELECT extracted_url, extracted_device, extracted_lcp, extracted_inp, received_at
FROM vercel_speed_insights_raw
ORDER BY received_at DESC
LIMIT 5;

-- 3. View unifiée
SELECT date, ga4_users, avg_lcp_p75, speed_samples, perf_status
FROM seo_unified_daily_plus
ORDER BY date DESC
LIMIT 3;
```

**Je pourrai alors valider à 100% que tout fonctionne!** 🎯

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30
**Nouveau Secret**: `aa166c5a...` (64 chars)
