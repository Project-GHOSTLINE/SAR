# 📋 PHASE 1 - GUIDE D'EXÉCUTION

**Date**: 2026-01-30
**Migration**: `supabase/migrations/20260130_seo_extension.sql`
**Status**: ✅ Migration créée, prête à exécuter

---

## ✅ CE QUI A ÉTÉ CRÉÉ

### Migration SQL Complète (520 lignes)

**1. Tables Speed Insights** (2 tables):
- `vercel_speed_insights_raw` - Stockage brut des payloads Vercel
- `vercel_speed_insights_daily` - Agrégations quotidiennes (p50/p75/p95)

**2. Views Unifiées** (3 views):
- `seo_unified_daily` - GA4 + GSC + Semrush par date
- `seo_unified_daily_plus` - seo_unified_daily + Speed Insights
- `ip_to_seo_segment` - IP → activité/attribution (investigation)

**3. Indexes de Performance** (16 indexes):
- GA4: date, users, conversions
- GSC: date, domain, clicks
- Semrush: date, keywords, traffic
- Speed: date, path, device, status
- Telemetry: ip_hash + created_at (90d window)

**4. Helper Function** (1 fonction):
- `calculate_perf_status(lcp, inp, cls, ttfb)` - Détermine GOOD/WARN/CRIT

---

## 🚀 ÉTAPES D'EXÉCUTION

### Étape 1: Ouvrir Supabase Dashboard

1. Aller sur https://supabase.com
2. Se connecter
3. Sélectionner projet SAR
4. Cliquer sur **SQL Editor** (menu gauche)

---

### Étape 2: Copier/Coller la Migration

1. Créer un **New query**
2. Ouvrir le fichier:
```bash
cat supabase/migrations/20260130_seo_extension.sql
```

3. Copier TOUT le contenu (520 lignes)
4. Coller dans SQL Editor
5. Cliquer **Run** (Cmd+Enter)

---

### Étape 3: Vérifier l'Exécution

Après exécution, vous devriez voir:
```
✅ Tables créées: 2
✅ Views créées: 3
✅ Indexes créés: 16
✅ Functions créées: 1
```

---

## 🧪 TESTS DE VALIDATION

### Test 1: Tables Speed Insights Créées

```sql
-- Test table raw
SELECT COUNT(*) as count FROM vercel_speed_insights_raw;
-- Résultat attendu: 0 rows (table vide mais existe)

-- Test table daily
SELECT COUNT(*) as count FROM vercel_speed_insights_daily;
-- Résultat attendu: 0 rows (table vide mais existe)
```

---

### Test 2: View seo_unified_daily

```sql
SELECT
  date,
  ga4_users,
  ga4_sessions,
  ga4_conversions,
  gsc_clicks,
  gsc_impressions,
  semrush_keywords,
  semrush_traffic
FROM seo_unified_daily
ORDER BY date DESC
LIMIT 7;
```

**Résultat attendu**:
- 7-31 rows (selon données GA4/GSC/Semrush)
- Colonnes GA4: users, sessions, conversions
- Colonnes GSC: clicks, impressions
- Colonnes Semrush: keywords, traffic

---

### Test 3: View seo_unified_daily_plus

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
- Même rows que seo_unified_daily
- Colonnes Speed: NULL (table vide pour l'instant)
- perf_status: NULL (pas encore de données Speed)

---

### Test 4: View ip_to_seo_segment

```sql
SELECT
  ip,
  first_seen,
  last_seen,
  landing_page,
  total_requests,
  active_days,
  unique_pages,
  avg_duration_ms,
  device,
  utm_source
FROM ip_to_seo_segment
ORDER BY last_seen DESC
LIMIT 10;
```

**Résultat attendu**:
- X rows (basé sur telemetry_requests avec ip_hash)
- Colonnes remplies: ip, first_seen, last_seen, landing_page, total_requests
- Colonnes possiblement NULL: device, utm_source (si pas dans meta_redacted)

---

### Test 5: Indexes Créés

```sql
-- Vérifier indexes Speed Insights
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE '%speed%'
ORDER BY tablename, indexname;
```

**Résultat attendu**: 6-8 indexes sur tables speed_insights

---

### Test 6: Helper Function

```sql
-- Test function calculate_perf_status
SELECT
  calculate_perf_status(2000, 150, 0.08, 600) as test_good,
  calculate_perf_status(3000, 300, 0.15, 1000) as test_warn,
  calculate_perf_status(5000, 600, 0.30, 2000) as test_crit;
```

**Résultat attendu**:
```
test_good | test_warn | test_crit
----------+-----------+----------
GOOD      | WARN      | CRIT
```

---

## 📊 EXEMPLES DE DONNÉES ATTENDUES

### Exemple: seo_unified_daily (row type)

```json
{
  "date": "2026-01-29",
  "ga4_users": 94,
  "ga4_sessions": 117,
  "ga4_conversions": 87,
  "ga4_engagement_rate": 0.8,
  "ga4_organic": 78,
  "ga4_direct": 15,
  "gsc_clicks": 0,
  "gsc_impressions": 0,
  "gsc_ctr": 0,
  "gsc_position": 0,
  "semrush_keywords": 346,
  "semrush_traffic": 1046,
  "semrush_rank": 187598,
  "semrush_authority": 0
}
```

---

### Exemple: ip_to_seo_segment (row type)

```json
{
  "ip": "abc123def456",
  "first_seen": "2026-01-25T10:30:00Z",
  "last_seen": "2026-01-29T15:45:00Z",
  "landing_page": "/demande-de-pret",
  "total_requests": 47,
  "active_days": 3,
  "unique_pages": 8,
  "avg_duration_ms": 234,
  "p50_duration_ms": 189,
  "p95_duration_ms": 876,
  "success_count": 45,
  "client_error_count": 2,
  "server_error_count": 0,
  "device": "mobile",
  "utm_source": "google",
  "utm_medium": "organic",
  "vercel_region": "iad1",
  "env": "production"
}
```

---

## ⚠️ TROUBLESHOOTING

### Erreur: "relation already exists"

**Cause**: Table ou view déjà créée

**Solution**: Normal! La migration utilise `IF NOT EXISTS`

---

### Erreur: "column does not exist"

**Cause**: Schéma de table existante différent de l'attendu

**Action**:
1. Vérifier schéma réel avec:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'seo_ga4_metrics_daily';
```

2. Ajuster la view si nécessaire

---

### View ip_to_seo_segment retourne 0 rows

**Causes possibles**:
1. Aucun ip_hash dans telemetry_requests
2. Filter env = 'production' trop restrictif
3. Window 90 jours trop court

**Debug**:
```sql
-- Vérifier ip_hash
SELECT COUNT(*) FILTER (WHERE ip_hash IS NOT NULL) as with_ip
FROM telemetry_requests;

-- Vérifier env
SELECT env, COUNT(*)
FROM telemetry_requests
GROUP BY env;
```

---

### Colonnes device/utm_source NULL dans ip_to_seo_segment

**Cause**: Ces données ne sont pas dans meta_redacted

**Solution**:
1. Vérifier structure de meta_redacted:
```sql
SELECT DISTINCT jsonb_object_keys(meta_redacted) as keys
FROM telemetry_requests
WHERE meta_redacted IS NOT NULL
LIMIT 20;
```

2. Ajuster view si nécessaire

---

## ✅ CHECKLIST POST-MIGRATION

- [ ] Tables créées (vercel_speed_insights_raw, vercel_speed_insights_daily)
- [ ] View seo_unified_daily retourne des données
- [ ] View seo_unified_daily_plus retourne des données
- [ ] View ip_to_seo_segment retourne des données
- [ ] Indexes créés (vérifiés via pg_indexes)
- [ ] Function calculate_perf_status fonctionne
- [ ] Pas d'erreurs dans les logs Supabase

---

## 🎯 PROCHAINES ÉTAPES

Une fois la migration validée:

### Phase 2: Speed Insights Integration
1. Installer `@vercel/speed-insights`
2. Ajouter dans `src/app/layout.tsx`
3. Créer endpoint `/api/vercel/drains/speed-insights`
4. Configurer Vercel Drain
5. Créer job `jobs/aggregate_speed_insights_daily.ts`

### Phase 3: API Routes
1. Créer `/api/seo/overview`
2. Créer `/api/seo/ip/[ip]`
3. Créer `/api/seo/perf`

### Phase 4: UI Refactor
1. Types TypeScript
2. Composants SEO
3. Command Center (3 colonnes)
4. Explorer IP

---

## 📝 NOTES IMPORTANTES

**Performance**:
- Les views ne sont PAS matérialisées (recalculées à chaque query)
- Pour production avec volume élevé, considérer `MATERIALIZED VIEW`
- Les indexes optimisent les queries sur dates récentes

**Maintenance**:
- Tables Speed Insights: croissance ~100KB/jour
- telemetry_requests: déjà 78k rows, considérer archivage > 90 jours
- Views: pas de storage, juste des queries

**Sécurité**:
- Toutes les tables/views sont dans schema `public`
- RLS (Row Level Security) à configurer si nécessaire
- Admin-only access via API routes

---

**Créé par**: Claude Sonnet 4.5
**Pour**: Solution Argent Rapide INC
**Date**: 2026-01-30

**Status**: ✅ **PRÊT À EXÉCUTER**
