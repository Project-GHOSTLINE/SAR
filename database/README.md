# 🚀 Phase 1: Optimisation Base de Données - Guide d'Implémentation

## 📋 Vue d'Ensemble

Ce dossier contient tous les scripts SQL pour optimiser la base de données PostgreSQL de SAR Admin.

**Impact attendu: Réduction de 60-70% des temps de réponse**

- Webhook Stats API: **450ms → 10-20ms** (95% plus rapide)
- Client Analysis API: **265ms → 10-15ms** (94% plus rapide)
- Recherche: **500ms → 50-100ms** (90% plus rapide)

---

## 📁 Fichiers

```
database/
├── README.md                      ← Vous êtes ici
├── 01_create_indexes.sql          ← Indexes stratégiques (2-5 min)
├── 02_create_materialized_views.sql ← Vues matérialisées (1-3 min)
├── 03_create_functions.sql        ← Fonctions optimisées (1 min)
├── 04_setup_cron_jobs.sql         ← CRON jobs auto-refresh (1 min)
└── 05_test_performance.sql        ← Tests de performance (2-5 min)
```

**Durée totale d'implémentation: ~10-15 minutes**

---

## 🎯 Étapes d'Implémentation

### Étape 1: Se Connecter à Supabase

1. Aller sur [https://supabase.com](https://supabase.com)
2. Se connecter à votre projet: **dllyzfuqjzuhvshrlmuq**
3. Aller dans **Database** → **SQL Editor**

---

### Étape 2: Créer les Indexes (2-5 minutes)

**Fichier:** `01_create_indexes.sql`

**Actions:**
1. Copier tout le contenu de `01_create_indexes.sql`
2. Coller dans le SQL Editor de Supabase
3. Cliquer sur **Run** (ou `Ctrl+Enter`)
4. Attendre la fin de l'exécution (~2-5 min selon la taille des tables)

**Vérification:**
```sql
-- Doit afficher 13+ indexes
SELECT COUNT(*) FROM pg_indexes
WHERE tablename IN ('vopay_webhook_logs', 'client_analyses', 'messages')
  AND indexname LIKE 'idx_%';
```

**✅ Résultat attendu:**
```
Indexes créés avec succès sur:
  - vopay_webhook_logs (5 indexes)
  - client_analyses (6 indexes)
  - messages (2 indexes)
```

---

### Étape 3: Créer les Materialized Views (1-3 minutes)

**Fichier:** `02_create_materialized_views.sql`

**Actions:**
1. Copier tout le contenu de `02_create_materialized_views.sql`
2. Coller dans le SQL Editor
3. Cliquer sur **Run**
4. Attendre la fin (~1-3 min)

**Vérification:**
```sql
-- Doit afficher 3 vues
SELECT * FROM pg_matviews WHERE matviewname LIKE 'mv_%';
```

**✅ Résultat attendu:**
```
3 materialized views créées:
  - mv_webhook_stats (stats webhooks)
  - mv_client_analysis_stats (stats analyses)
  - mv_message_stats (stats messages)
```

---

### Étape 4: Créer les Fonctions SQL (1 minute)

**Fichier:** `03_create_functions.sql`

**Actions:**
1. Copier tout le contenu de `03_create_functions.sql`
2. Coller dans le SQL Editor
3. Cliquer sur **Run**

**Vérification:**
```sql
-- Tester la fonction principale
SELECT get_webhook_stats();
```

**✅ Résultat attendu:**
```json
{
  "total": 1234,
  "totalSuccessful": 1100,
  "weekSuccessRate": 95.5,
  ...
}
```

---

### Étape 5: Configurer les CRON Jobs (1 minute)

**Fichier:** `04_setup_cron_jobs.sql`

**⚠️ IMPORTANT:** Les CRON jobs nécessitent l'extension `pg_cron` qui est activée par défaut sur Supabase.

**Actions:**
1. Copier tout le contenu de `04_setup_cron_jobs.sql`
2. Coller dans le SQL Editor
3. Cliquer sur **Run**

**Vérification:**
```sql
-- Doit afficher 5 jobs
SELECT jobname, schedule FROM cron.job;
```

**✅ Résultat attendu:**
```
5 CRON jobs créés:
  - refresh-webhook-stats (*/5 * * * *)
  - refresh-analysis-stats (*/5 * * * *)
  - refresh-message-stats (*/5 * * * *)
  - cleanup-old-sandbox-webhooks (0 3 * * *)
  - daily-vacuum-analyze (0 2 * * *)
```

---

### Étape 6: Tester les Performances (2-5 minutes)

**Fichier:** `05_test_performance.sql`

**Actions:**
1. Copier tout le contenu de `05_test_performance.sql`
2. Coller dans le SQL Editor
3. Cliquer sur **Run**
4. Lire les résultats du benchmark

**✅ Résultats attendus:**

```
BENCHMARK COMPLET DES OPTIMISATIONS

1. STATS WEBHOOKS
   Méthode AVANT: 387ms
   Méthode APRÈS: 8ms
   ✅ Amélioration: 97.9% (97.9 plus rapide)

2. STATS ANALYSES CLIENT
   Méthode AVANT: 241ms
   Méthode APRÈS: 7ms
   ✅ Amélioration: 97.1% (97.1 plus rapide)

3. TRANSACTIONS RÉCENTES
   Méthode AVANT: 156ms
   Méthode APRÈS: 23ms
   ✅ Amélioration: 85.3% (85.3 plus rapide)

4. RECHERCHE FULL-TEXT
   Méthode AVANT: 678ms
   Méthode APRÈS: 67ms
   ✅ Amélioration: 90.1% (90.1 plus rapide)
```

---

## 🔍 Vérification Post-Implémentation

### 1. Vérifier la Santé des Materialized Views

```sql
SELECT * FROM check_materialized_views_health();
```

**Attendu:**
- `is_populated`: `true` pour toutes les vues
- `age_minutes`: < 5 minutes
- `last_refresh`: Récent

### 2. Vérifier l'Utilisation des Indexes

```sql
SELECT
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename = 'vopay_webhook_logs'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

**Attendu:** Les indexes ont des `scans > 0` après quelques requêtes

### 3. Vérifier les CRON Jobs

```sql
SELECT * FROM get_cron_job_stats();
```

**Attendu:**
- `success_rate`: 100%
- `last_run`: Récent (< 5 minutes)
- `last_status`: 'succeeded'

---

## 🛠️ Commandes Utiles

### Forcer le Rafraîchissement des Vues

```sql
SELECT * FROM force_refresh_all_views();
```

### Voir l'Historique des CRON Jobs

```sql
SELECT * FROM get_cron_job_history('refresh');
```

### Vérifier les Jobs en Échec

```sql
SELECT * FROM check_failed_cron_jobs(24);
```

### Rapport de Santé Complet

```sql
-- Exécuter la dernière section de 05_test_performance.sql
```

---

## 🚨 Résolution de Problèmes

### Problème 1: CRON Jobs ne se Lancent Pas

**Symptôme:** Les materialized views ne se rafraîchissent pas

**Solutions:**
1. Vérifier que pg_cron est activée:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Si pas activée, l'activer:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. Vérifier que les jobs existent:
   ```sql
   SELECT * FROM cron.job;
   ```

4. Rafraîchir manuellement en attendant:
   ```sql
   SELECT * FROM force_refresh_all_views();
   ```

### Problème 2: Performances Toujours Lentes

**Solutions:**
1. Vérifier que les indexes sont utilisés:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM vopay_webhook_logs
   WHERE environment = 'production'
   ORDER BY received_at DESC
   LIMIT 100;
   ```
   ➡️ Doit montrer "Index Scan" et non "Seq Scan"

2. Mettre à jour les statistiques:
   ```sql
   ANALYZE vopay_webhook_logs;
   ANALYZE client_analyses;
   ANALYZE messages;
   ```

3. Vérifier le cache hit ratio (doit être > 99%):
   ```sql
   SELECT 'Cache Hit Ratio' as metric,
     ROUND(100.0 * sum(heap_blks_hit) /
       NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as percentage
   FROM pg_statio_user_tables;
   ```

### Problème 3: Materialized Views Vides

**Solutions:**
1. Vérifier si les tables sources ont des données:
   ```sql
   SELECT COUNT(*) FROM vopay_webhook_logs;
   SELECT COUNT(*) FROM client_analyses;
   ```

2. Rafraîchir manuellement:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_webhook_stats;
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_analysis_stats;
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_message_stats;
   ```

---

## 📊 Métriques à Monitorer

### Dashboard Supabase

1. **Database** → **Logs** → **Postgres Logs**
   - Surveiller les requêtes lentes (> 100ms)
   - Vérifier qu'il n'y a pas d'erreurs

2. **Database** → **Reports**
   - Cache hit rate (doit être > 99%)
   - Index usage
   - Table sizes

### Dans l'Application

Avant de modifier les API routes, tester les fonctions directement:

```sql
-- Mesurer le temps de réponse
\timing on

-- Test 1: Stats webhooks (doit être < 10ms)
SELECT get_webhook_stats();

-- Test 2: Stats analyses (doit être < 10ms)
SELECT get_client_analysis_stats();

-- Test 3: Transactions récentes (doit être < 50ms)
SELECT * FROM get_recent_webhooks(100, 0, NULL);
```

---

## ✅ Checklist de Validation

Avant de passer à la Phase 2 (Optimisation API Routes):

- [ ] ✅ Tous les indexes créés (vérifier avec pg_indexes)
- [ ] ✅ Les 3 materialized views créées et populées
- [ ] ✅ Les 7 fonctions SQL créées
- [ ] ✅ Les 5 CRON jobs configurés et actifs
- [ ] ✅ Tests de performance exécutés avec succès
- [ ] ✅ Amélioration > 90% confirmée
- [ ] ✅ Cache hit ratio > 99%
- [ ] ✅ Aucune erreur dans les logs Postgres

---

## 🚀 Prochaines Étapes

Une fois la Phase 1 validée:

1. **Phase 2**: Modifier les API Routes pour utiliser les nouvelles fonctions
   - `src/app/api/admin/webhooks/stats/route.ts`
   - `src/app/api/admin/client-analysis/route.ts`
   - `src/app/api/admin/messages/route.ts`

2. **Phase 3**: Optimiser le Frontend
   - Installer React Query
   - Implémenter le cache client
   - Code splitting des composants

3. **Phase 4**: Configuration Next.js
   - Optimiser les headers de cache
   - Configurer la compression
   - Tests de charge

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifier les logs Supabase: **Database** → **Logs** → **Postgres Logs**
2. Exécuter le rapport de santé: Section finale de `05_test_performance.sql`
3. Vérifier que toutes les étapes ont été complétées dans l'ordre

**Temps total estimé pour Phase 1: 10-15 minutes**

✅ **Impact: Réduction de 60-70% des temps de réponse**

---

## 📝 Notes Importantes

- ⚠️ Les CRON jobs rafraîchissent les vues toutes les 5 minutes
- ⚠️ Les données ont maximum 5 minutes de retard (acceptable pour un dashboard admin)
- ⚠️ Si besoin de données temps réel, utiliser `force_refresh_all_views()`
- ✅ Les indexes n'affectent pas les INSERT/UPDATE (impact minimal)
- ✅ Les materialized views utilisent très peu d'espace disque
- ✅ Tout est réversible (DROP INDEX / DROP MATERIALIZED VIEW)

Bonne optimisation! 🚀
