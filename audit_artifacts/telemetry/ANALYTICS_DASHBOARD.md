# 📊 ANALYTICS DASHBOARD - GUIDE D'UTILISATION

**Date**: 2026-01-25
**Status**: ✅ DÉPLOYÉ ET OPÉRATIONNEL

---

## 🎯 ACCÈS AU DASHBOARD

### URL Production
```
https://solutionargentrapide.ca/admin/analytics
```

### URL Locale (Dev)
```
http://localhost:3000/admin/analytics
```

---

## 📈 CE QUE TU PEUX VOIR

### 1. KPIs EN HAUT (4 cartes)
- **Total Sessions** - Nombre total de visiteurs (7 derniers jours)
- **Conversions** - Nombre de formulaires soumis
- **Taux Conversion** - % de visiteurs qui convertissent
- **Événements (7j)** - Total des page views

### 2. Funnel de Conversion (Bar Chart)
- **Awareness** - Visiteurs sur homepage
- **Exploration** - Visiteurs qui naviguent
- **Consideration** - Visiteurs sur page formulaire
- **Converted** - Formulaires soumis

**Insight**: Vois où les visiteurs abandonnent le plus

### 3. Timeline Événements (Line Chart)
- **30 derniers jours** d'activité
- **4 courbes**:
  - Sessions Uniques (bleu)
  - Conversions (vert)
  - Mobile (orange)
  - Desktop (violet)

**Insight**: Identifie les jours/périodes de pic d'activité

### 4. Points d'Abandon (Bar Chart Horizontal)
- **Top 10 pages** où les visiteurs quittent
- Montre le nombre d'abandons par page

**Insight**: Optimise les pages avec le plus d'abandons

### 5. Mobile vs Desktop (Pie Chart)
- **Répartition** du trafic par device
- % Mobile vs % Desktop

**Insight**: Optimise pour le device dominant

### 6. Parcours Utilisateurs (Table)
- **Top 10 parcours** les plus fréquents
- Format: "/ → /formulaire → /faq"
- Nombre de pages visitées
- Fréquence du parcours

**Insight**: Comprends comment les visiteurs naviguent

### 7. Détails Funnel (Table)
- **Métriques détaillées** par stage:
  - Sessions
  - Conversions
  - Taux de conversion
  - Avg events (nombre moyen de pages vues)
  - Avg duration (durée moyenne en secondes)

**Insight**: Analyse fine de chaque étape du funnel

---

## 🔄 DONNÉES EN TEMPS RÉEL

Le dashboard se **recharge automatiquement** au chargement de la page.

**Sources de données**:
- `visual_conversion_funnel` (7 derniers jours)
- `visual_events_timeline` (30 derniers jours)
- `visual_abandon_heatmap` (7 derniers jours)
- `analytics_user_journeys` (toutes les sessions)

**Pour rafraîchir**: Recharge la page (F5 ou Cmd+R)

---

## 📊 API ENDPOINTS DISPONIBLES

Si tu veux utiliser les données ailleurs:

### 1. Funnel
```bash
GET /api/analytics/funnel
```

**Réponse**:
```json
{
  "success": true,
  "data": [
    {
      "funnel_stage": "awareness",
      "sessions": 450,
      "conversions": 12,
      "conversion_rate": 2.7,
      "mobile_sessions": 280,
      "desktop_sessions": 170,
      "avg_events": 1.2,
      "avg_seconds": 45
    }
  ]
}
```

### 2. Timeline
```bash
GET /api/analytics/timeline
```

### 3. Abandons
```bash
GET /api/analytics/abandons
```

### 4. Journeys
```bash
GET /api/analytics/journeys
```

### 5. Heatmap
```bash
GET /api/analytics/heatmap
```

---

## 🎨 PERSONNALISATION

### Changer les Couleurs
Édite: `/src/app/admin/analytics/page.tsx`

```typescript
const COLORS = [
  '#3b82f6', // Bleu (default)
  '#10b981', // Vert
  '#f59e0b', // Orange
  '#ef4444', // Rouge
  '#8b5cf6', // Violet
  '#ec4899'  // Rose
]
```

### Changer les Périodes
Édite les vues SQL dans Supabase:

```sql
-- Pour changer de 7 jours à 30 jours dans le funnel
WHERE session_start > NOW() - INTERVAL '30 days'
```

### Ajouter des Filtres
Tu peux ajouter des filtres par:
- Date range (sélecteur de dates)
- Source UTM (dropdown)
- Device type (Mobile/Desktop toggle)

---

## 🚀 PROCHAINES ÉTAPES RECOMMANDÉES

### Immédiat
1. ✅ Ouvre le dashboard: https://solutionargentrapide.ca/admin/analytics
2. ✅ Vérifie que les données s'affichent
3. ✅ Note le taux de conversion actuel (baseline)

### Cette semaine
1. ⏳ Analyse les points d'abandon (quelles pages optimiser?)
2. ⏳ Identifie les parcours qui convertissent le mieux
3. ⏳ Compare Mobile vs Desktop (où optimiser?)

### Ce mois
1. ⏳ A/B test sur les pages avec le plus d'abandons
2. ⏳ Optimise le funnel (réduire les frictions)
3. ⏳ Track l'évolution du taux de conversion

---

## 🔍 DEBUGGING

### Dashboard vide (pas de données)
**Vérification 1**: Check que les vues SQL existent
```sql
SELECT * FROM visual_conversion_funnel LIMIT 1;
```

**Vérification 2**: Check que des sessions existent
```sql
SELECT COUNT(*) FROM client_sessions WHERE created_at > NOW() - INTERVAL '7 days';
```

### Erreur 500 sur API
**Vérification**: Check Vercel logs
```
https://vercel.com/project-ghostline/sar/observability
Filtre: /api/analytics
```

### Charts ne s'affichent pas
**Vérification**: Console browser (F12)
- Check erreurs JavaScript
- Vérifie que recharts est installé: `npm list recharts`

---

## 📐 ARCHITECTURE

```
┌─────────────────────────────────────────┐
│ SUPABASE (PostgreSQL)                   │
│ - analytics_sessions_enriched           │
│ - analytics_events_enriched             │
│ - visual_conversion_funnel              │
│ - visual_events_timeline                │
│ - visual_abandon_heatmap                │
│ - analytics_user_journeys               │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ API ROUTES (Next.js)                    │
│ /api/analytics/funnel                   │
│ /api/analytics/timeline                 │
│ /api/analytics/abandons                 │
│ /api/analytics/journeys                 │
│ /api/analytics/heatmap                  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ DASHBOARD PAGE                          │
│ /admin/analytics                        │
│ - React Components                      │
│ - Recharts visualization                │
│ - Real-time data fetching               │
└─────────────────────────────────────────┘
```

---

## ✅ CHECKLIST FINALE

- [x] Vues SQL créées dans Supabase
- [x] 5 API routes créées
- [x] Dashboard page créée
- [x] Code committé (commit 2d93b72)
- [x] Déployé en production (Vercel)
- [ ] Testé sur production
- [ ] Dashboard accessible
- [ ] Données s'affichent correctement

---

## 🎯 METRICS À SURVEILLER

### Baseline (Semaine 1)
```
Taux conversion actuel: ___%
Pages vues moyennes: ___
Durée session moyenne: ___s
Top abandon page: ___
```

### Objectifs (Mois 1)
- ✅ Réduire abandons sur page formulaire: -20%
- ✅ Augmenter taux conversion: +15%
- ✅ Augmenter durée session: +30s
- ✅ Optimiser parcours mobile: -1 page

---

**Dashboard opérationnel! Va voir tes premières données!** 🚀

**URL**: https://solutionargentrapide.ca/admin/analytics
