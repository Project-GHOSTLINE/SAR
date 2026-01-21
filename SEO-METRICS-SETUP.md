# 📊 SEO Metrics System - Guide de Configuration

**Projet**: Solution Argent Rapide (SAR)
**Date**: 2026-01-21
**Objectif**: Enregistrer et analyser toutes les métriques SEO dans Supabase

---

## ✅ Ce qui a été créé

### 1. Migration SQL (`supabase/migrations/20260121000000_seo_metrics_system.sql`)

**6 Tables créées**:
- `seo_ga4_metrics_daily` - Métriques Google Analytics 4 (quotidiennes)
- `seo_gsc_metrics_daily` - Métriques Google Search Console (quotidiennes)
- `seo_semrush_domain_daily` - Métriques Semrush (quotidiennes)
- `seo_keywords_tracking` - Suivi des mots-clés stratégiques
- `seo_audit_log` - Journal des audits et problèmes SEO
- `seo_collection_jobs` - Historique des jobs de collecte

**3 Vues créées**:
- `seo_summary_30d` - Résumé des 30 derniers jours
- `seo_top_keywords` - Top keywords performance
- `seo_pending_issues` - Issues à résoudre

**Fonctionnalités**:
- ✅ Triggers automatiques pour `updated_at`
- ✅ Calcul automatique des changements de position
- ✅ RLS (Row Level Security) activé
- ✅ Indexes pour performances
- ✅ 8 keywords stratégiques pré-configurés

### 2. API Endpoints

#### Collecte des données
- **POST** `/api/seo/collect/ga4` - Collecter métriques GA4
- **POST** `/api/seo/collect/gsc` - Collecter métriques Google Search Console
- **POST** `/api/seo/collect/semrush` - Collecter métriques Semrush

#### Récupération des données
- **GET** `/api/seo/collect/ga4?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Historique GA4
- **GET** `/api/seo/collect/gsc?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Historique GSC
- **GET** `/api/seo/collect/semrush?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Historique Semrush
- **GET** `/api/seo/metrics?period=30d&source=all` - Résumé complet

#### Gestion des keywords
- **GET** `/api/seo/keywords` - Liste des keywords
- **POST** `/api/seo/keywords` - Ajouter un keyword
- **PATCH** `/api/seo/keywords` - Mettre à jour un keyword
- **DELETE** `/api/seo/keywords` - Désactiver un keyword

#### Cron job automatique
- **GET** `/api/cron/seo-collect` - Collecte automatique quotidienne

---

## 🚀 Étapes d'Installation

### Étape 1: Appliquer la Migration SQL

**Option A: Via Supabase Dashboard (RECOMMANDÉ)**

1. Ouvrir: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/editor
2. Cliquer sur **"SQL Editor"** dans la sidebar
3. Cliquer sur **"New Query"**
4. Copier-coller le contenu de: `supabase/migrations/20260121000000_seo_metrics_system.sql`
5. Cliquer sur **"Run"** (ou Ctrl+Enter)
6. Vérifier le message: `✅ SEO Metrics System: Toutes les tables créées avec succès (6/6)`

**Option B: Via Script**

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar
./scripts/apply-seo-migration.sh
```

### Étape 2: Vérifier les Tables

Dans Supabase Dashboard → Table Editor, vous devriez voir:

- ✅ `seo_ga4_metrics_daily` (0 rows)
- ✅ `seo_gsc_metrics_daily` (0 rows)
- ✅ `seo_semrush_domain_daily` (0 rows)
- ✅ `seo_keywords_tracking` (8 rows - keywords pré-configurés)
- ✅ `seo_audit_log` (0 rows)
- ✅ `seo_collection_jobs` (0 rows)

### Étape 3: Configurer les Credentials

Ajouter dans `.env.local`:

```env
# Google Analytics 4 (DÉJÀ CONFIGURÉ ✅)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-F130RBTZDC
GA_PROPERTY_ID=340237010

# Google Search Console (À CONFIGURER)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=votre-project-id
GSC_SITE_URL=https://solutionargentrapide.ca

# Semrush API (À CONFIGURER)
SEMRUSH_API_KEY=votre-semrush-api-key
SEMRUSH_API_URL=https://api.semrush.com/

# Cron Secret
CRON_SECRET=cron-secret-sar-2026
```

### Étape 4: Configurer le Cron Job dans Vercel

1. Ouvrir: https://vercel.com/project-ghostline/sar/settings/cron-jobs
2. Cliquer sur **"Add Cron Job"**
3. Configurer:
   - **Name**: SEO Daily Collection
   - **Path**: `/api/cron/seo-collect`
   - **Schedule**: `0 6 * * *` (tous les jours à 6h UTC = 2h EST)
   - **HTTP Method**: GET
   - **Headers**:
     - `authorization: Bearer cron-secret-sar-2026`
4. Sauvegarder

### Étape 5: Tester la Collecte

**Test manuel GA4**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/ga4 \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Test manuel GSC**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/gsc \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Test manuel Semrush**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/semrush \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json"
```

**Récupérer les métriques**:
```bash
curl "https://admin.solutionargentrapide.ca/api/seo/metrics?period=30d" \
  -H "x-api-key: FredRosa%1978"
```

**Tester le cron job**:
```bash
curl "https://admin.solutionargentrapide.ca/api/cron/seo-collect" \
  -H "authorization: Bearer cron-secret-sar-2026"
```

---

## 📊 Utilisation

### Collecter les Métriques Manuellement

```bash
# Collecter pour une date spécifique
curl -X POST https://admin.solutionargentrapide.ca/api/seo/collect/ga4 \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-20", "force": true}'
```

### Récupérer un Résumé Complet

```bash
# Résumé 30 derniers jours
curl "https://admin.solutionargentrapide.ca/api/seo/metrics?period=30d&source=all" \
  -H "x-api-key: FredRosa%1978"
```

### Gérer les Keywords

**Ajouter un keyword**:
```bash
curl -X POST https://admin.solutionargentrapide.ca/api/seo/keywords \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "prêt urgent",
    "category": "prêt",
    "priority": "high",
    "search_volume": 590,
    "target_url": "https://solutionargentrapide.ca"
  }'
```

**Lister les keywords**:
```bash
curl "https://admin.solutionargentrapide.ca/api/seo/keywords" \
  -H "x-api-key: FredRosa%1978"
```

**Mettre à jour un keyword**:
```bash
curl -X PATCH https://admin.solutionargentrapide.ca/api/seo/keywords \
  -H "x-api-key: FredRosa%1978" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "uuid-du-keyword",
    "current_position": 8,
    "previous_position": 12
  }'
```

---

## 📈 Données Collectées

### Google Analytics 4
- Utilisateurs (total, nouveaux, actifs)
- Sessions (total, engagées, durée moyenne)
- Taux d'engagement / bounce rate
- Conversions
- Traffic sources (organic, direct, referral, social, paid, email)
- Device breakdown (desktop, mobile, tablet)
- Top pages
- Top events

### Google Search Console
- Clics et impressions
- CTR (Click-through rate)
- Position moyenne
- Top queries (avec métriques détaillées)
- Top pages performantes
- Breakdown par device
- Données d'indexation

### Semrush
- Ranking du domaine
- Keywords organiques (nombre et positions)
- Traffic organique estimé
- Backlinks (total, referring domains)
- Authority score
- Top keywords avec positions
- Concurrents principaux

### Keywords Tracking
- Position actuelle vs précédente
- Changement de position
- Search volume
- Difficulté
- Historique des positions
- Traffic estimé

---

## 🔄 Collecte Automatique

Le cron job `/api/cron/seo-collect` s'exécute **tous les jours à 6h UTC (2h EST)** et collecte:

1. ✅ Google Analytics 4 (données de la veille)
2. ✅ Google Search Console (données d'il y a 3 jours - délai GSC)
3. ✅ Semrush (données de la veille)

Les résultats sont enregistrés dans `seo_collection_jobs` pour audit.

---

## 🎯 Prochaines Étapes

### Court terme (1-2 jours)
1. ✅ Appliquer la migration SQL
2. ⏳ Configurer le cron job Vercel
3. ⏳ Tester la collecte manuelle
4. ⏳ Vérifier la collecte automatique (attendre 24h)

### Moyen terme (1 semaine)
1. Configurer Google Search Console API (service account)
2. Configurer Semrush API (si budget disponible)
3. Créer un dashboard admin pour visualiser les métriques
4. Ajouter plus de keywords à suivre

### Long terme (1 mois)
1. Implémenter les audits SEO automatiques
2. Créer des alertes pour changements importants
3. Générer des rapports SEO hebdomadaires
4. Intégrer avec n8n pour automatisations avancées

---

## 🆘 Troubleshooting

### La migration échoue
- Vérifier que vous utilisez le bon projet Supabase (dllyzfuqjzuhvshrlmuq)
- Vérifier que vous avez les permissions admin
- Essayer via le Dashboard plutôt que CLI

### La collecte GA4 échoue
- Vérifier `GA_PROPERTY_ID=340237010` dans .env.local
- Pour l'instant, le système utilise des données mock si credentials manquants
- Configurer `GA_SERVICE_ACCOUNT_JSON` pour vraies données

### Le cron job ne s'exécute pas
- Vérifier la configuration dans Vercel
- Vérifier que `CRON_SECRET` est défini dans Vercel env vars
- Vérifier les logs Vercel pour erreurs

### Pas de données dans les tables
- Normal au début! Le cron job collectera automatiquement
- Tester manuellement avec les endpoints `/api/seo/collect/*`
- Attendre 24h pour la première collecte automatique

---

## 📞 Support

- **Documentation Supabase**: https://supabase.com/docs
- **Documentation Vercel Cron**: https://vercel.com/docs/cron-jobs
- **Logs Vercel**: https://vercel.com/project-ghostline/sar/logs

---

**✅ Système SEO Metrics prêt à être déployé!**

*Dernière mise à jour: 2026-01-21*
