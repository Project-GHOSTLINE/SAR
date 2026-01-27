# 🔧 Guide de Configuration Google Search Console

**Date**: 2026-01-27
**Status**: ⚠️ En Cours - Activation Complétée, Configuration Requise

---

## ✅ Étapes Complétées

1. ✅ Code GSC implémenté
   - Route GET `/api/seo/gsc` - Données en temps réel
   - Route POST `/api/seo/collect/gsc` - Collection quotidienne
   - Route GET `/api/seo/collect/gsc` - Récupération historique

2. ✅ Base de données configurée
   - Table `seo_gsc_metrics_daily` créée
   - Migration exécutée avec succès
   - RLS policies activées

3. ✅ API Google Search Console activée
   - Activée dans Google Cloud Console
   - Projet: 1059974911454

4. ✅ Code déployé en production
   - Commit: `335f22e` (Google Search Console integration)
   - Déployé sur Vercel: ✅ Ready

---

## ⚠️ Étapes Restantes

### 1. Ajouter le Service Account à Search Console

**Pourquoi**: Le service account a besoin de permission pour lire les données GSC de votre propriété.

**Comment faire**:

1. **Trouver l'email du service account**:
   - Aller sur: https://console.cloud.google.com/iam-admin/serviceaccounts?project=1059974911454
   - Copier l'email (format: `xxxxx@xxxxx.iam.gserviceaccount.com`)

2. **Ajouter à Search Console**:
   - Aller sur: https://search.google.com/search-console
   - Sélectionner la propriété: `sc-domain:solutionargentrapide.ca`
   - Cliquer sur **Settings** (⚙️) dans le menu de gauche
   - Cliquer sur **Users and permissions**
   - Cliquer sur **Add user**
   - Coller l'email du service account
   - Sélectionner permission: **Full** ou **Owner**
   - Cliquer sur **Add**

3. **Attendre la propagation** (~5 minutes)

---

### 2. Tester l'Intégration

Une fois le service account ajouté, tester les endpoints:

#### Test 1: Données en temps réel
```bash
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/gsc?startDate=2026-01-01&endDate=2026-01-27" \
  | jq '.success, .data.overview'
```

**Résultat attendu**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClicks": 123,
      "totalImpressions": 4567,
      "avgCTR": 0.0269,
      "avgPosition": 25.4
    },
    "rows": [ ... ]
  }
}
```

#### Test 2: Collection quotidienne
```bash
curl -X POST \
  -H "x-api-key: $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-23", "force": true}' \
  "https://admin.solutionargentrapide.ca/api/seo/collect/gsc" \
  | jq '.'
```

**Résultat attendu**:
```json
{
  "success": true,
  "message": "Métriques Google Search Console collectées avec succès",
  "date": "2026-01-23",
  "data": {
    "id": "...",
    "domain": "solutionargentrapide.ca",
    "total_clicks": 123,
    "total_impressions": 4567,
    "top_queries": [ ... ],
    "top_pages": [ ... ]
  }
}
```

#### Test 3: Récupération historique
```bash
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/gsc?startDate=2026-01-20&endDate=2026-01-27" \
  | jq '.success, .count'
```

---

## 🔍 Debugging

### Erreur: "Permission denied"
- Le service account n'est pas ajouté à Search Console
- Ou les permissions sont insuffisantes (mettre "Full" ou "Owner")

### Erreur: "Property not found"
- Vérifier que vous avez sélectionné la bonne propriété dans Search Console
- Format correct: `sc-domain:solutionargentrapide.ca`

### Erreur: "No data available"
- GSC a un délai de ~3 jours pour les données
- Utiliser des dates plus anciennes pour tester (ex: 2026-01-20)

---

## 📊 Structure des Données Collectées

### Métriques Globales
- `total_clicks`: Nombre total de clics depuis Google
- `total_impressions`: Nombre total d'impressions dans les résultats
- `avg_ctr`: Taux de clics moyen (CTR)
- `avg_position`: Position moyenne dans les résultats

### Top Queries (Top 20)
```json
{
  "query": "prêt rapide",
  "clicks": 45,
  "impressions": 1200,
  "ctr": 0.0375,
  "position": 8.5
}
```

### Top Pages (Top 20)
```json
{
  "page": "https://solutionargentrapide.ca/pret-rapide",
  "clicks": 67,
  "impressions": 2300,
  "ctr": 0.0291,
  "position": 12.3
}
```

### Device Breakdown
```json
{
  "mobile": {
    "clicks": 80,
    "impressions": 3000,
    "ctr": 0.0267,
    "position": 15.2
  },
  "desktop": {
    "clicks": 40,
    "impressions": 1500,
    "ctr": 0.0267,
    "position": 14.8
  },
  "tablet": {
    "clicks": 3,
    "impressions": 67,
    "ctr": 0.0448,
    "position": 18.9
  }
}
```

### Country Breakdown
```json
{
  "can": {
    "clicks": 120,
    "impressions": 4500,
    "ctr": 0.0267,
    "position": 15.1
  },
  "usa": {
    "clicks": 3,
    "impressions": 67,
    "ctr": 0.0448,
    "position": 28.3
  }
}
```

---

## 🎯 Prochaines Étapes (Après Tests)

### 1. Intégrer au Dashboard SEO

Modifier `/src/app/admin/seo/page.tsx` pour afficher les métriques GSC:

```typescript
// Ajouter fetch GSC
const gscResponse = await fetch('/api/seo/collect/gsc?startDate=...&endDate=...')
const gscData = await gscResponse.json()

// Afficher dans l'UI
<MetricCard
  title="Clics Organiques (GSC)"
  value={gscData.data[0]?.total_clicks}
  icon={MousePointerClick}
  color="blue"
/>
```

### 2. Automatiser les Collections

Créer un cron job Vercel ou utiliser un service externe pour collecter quotidiennement:

```bash
# Tous les jours à 6h AM (après le délai de 3 jours de GSC)
POST /api/seo/collect/gsc
```

### 3. Alertes Automatiques

Configurer des alertes si:
- Baisse > 20% des clics organiques
- Baisse > 30% des impressions
- Augmentation significative de la position moyenne (= baisse de ranking)

---

## 📝 Commandes Utiles

### Forcer une collection manuelle
```bash
curl -X POST \
  -H "x-api-key: $ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-23", "force": true}' \
  https://admin.solutionargentrapide.ca/api/seo/collect/gsc
```

### Voir les dernières collections
```bash
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/gsc?startDate=2026-01-01&endDate=2026-01-27" \
  | jq '.data[] | {date, total_clicks, total_impressions}'
```

### Analyser les top queries
```bash
curl -H "x-api-key: $ADMIN_PASSWORD" \
  "https://admin.solutionargentrapide.ca/api/seo/collect/gsc?startDate=2026-01-23&endDate=2026-01-23" \
  | jq '.data[0].top_queries[] | {query, clicks, position}'
```

---

## ✅ Checklist Finale

- [ ] Service account ajouté à Search Console
- [ ] Permission "Full" ou "Owner" accordée
- [ ] Test 1: Données en temps réel fonctionne
- [ ] Test 2: Collection quotidienne fonctionne
- [ ] Test 3: Récupération historique fonctionne
- [ ] Données visibles dans Supabase (`seo_gsc_metrics_daily`)
- [ ] Intégration au dashboard SEO (optionnel)
- [ ] Automatisation des collections (optionnel)

---

**Dernière mise à jour**: 2026-01-27
**Par**: Claude Sonnet 4.5
**Status**: ⚠️ Configuration en cours - Activation API complétée
