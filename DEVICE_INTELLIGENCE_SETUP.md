# Device Intelligence - Guide de Configuration

**Date**: 2026-01-27
**Status**: ✅ API Opérationnelle, PageSpeed à configurer

---

## 🎯 Vue d'Ensemble

Le **Device Intelligence Dashboard** calcule 10+ métriques croisées entre Mobile/Desktop/Tablet en combinant:
- **Google Search Console** (positions, clics, CTR)
- **Google Analytics 4** (sessions, users)
- **PageSpeed Insights** (performance mobile/desktop)

---

## ✅ Ce qui Fonctionne

### API Endpoint
`GET /api/seo/device-intelligence?days=30`

**Métriques calculées**:
- Mobile-First Index Score (0-100)
- Positions moyennes par device
- Répartition du trafic (% clics)
- CTR moyen par device
- SEO Conversion (GSC → GA4)
- Clics à risque (basé sur performance)

### Données Actuelles (Test du 2026-01-27)
```
✅ GSC: 2 entrées (32 clics, 621 impressions)
✅ GA4: 30 entrées (94 users)
❌ PageSpeed: 0 entrées → Score à 0
```

**Résultats avec données partielles**:
- Mobile-First Score: **60/100** (MOYEN)
- Position mobile: **#12.9** vs #23.5 desktop (+10.6 ✅)
- Traffic mobile: **75%** (24 clics)
- CTR mobile: **5.90%** vs 2.45% desktop (241% meilleur ✅)

---

## 🔧 Configuration PageSpeed

Pour obtenir le score complet (90-100), il faut collecter les données PageSpeed.

### 1. Créer un script de collecte

Créer `scripts/collect-pagespeed.mjs`:

```javascript
#!/usr/bin/env node
import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY
const SITE_URL = 'https://solutionargentrapide.ca'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function collectPageSpeed(device = 'mobile') {
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(SITE_URL)}&strategy=${device}&key=${PAGESPEED_API_KEY}`

  const response = await fetch(url)
  const data = await response.json()

  const performance = data.lighthouseResult?.categories?.performance?.score || 0

  await supabase.from('seo_pagespeed_metrics_daily').insert({
    url: SITE_URL,
    device_type: device,
    performance_score: Math.round(performance * 100),
    date: new Date().toISOString().split('T')[0],
    raw_data: data
  })

  console.log(`✅ ${device}: ${Math.round(performance * 100)}/100`)
}

async function run() {
  console.log('🚀 Collecte PageSpeed...')
  await collectPageSpeed('mobile')
  await collectPageSpeed('desktop')
  console.log('✅ Terminé!')
}

run()
```

### 2. Ajouter la clé API PageSpeed

Dans `.env.local`:
```bash
PAGESPEED_API_KEY=your-api-key-here
```

**Obtenir une clé**: https://developers.google.com/speed/docs/insights/v5/get-started

### 3. Exécuter la collecte

```bash
node scripts/collect-pagespeed.mjs
```

### 4. Automatiser (Cron)

Ajouter à votre cron ou GitHub Actions:
```bash
# Tous les jours à 6h AM
0 6 * * * cd /path/to/sar && node scripts/collect-pagespeed.mjs
```

---

## 📊 Interprétation des Scores

### Mobile-First Index Score

| Score | Statut | Action |
|-------|--------|--------|
| 90-100 | ✅ EXCELLENT | Maintenir |
| 75-89 | ✔️ BON | Optimisations mineures |
| 60-74 | ⚠️ MOYEN | Priorité moyenne |
| < 60 | ❌ CRITIQUE | Action urgente |

**Composantes du score**:
- 40% - Performance mobile PageSpeed
- 30% - Position mobile vs desktop
- 30% - CTR mobile

### Recommandations Types

**Alert (Impact Élevé)**:
- Performance mobile < 75
- Position mobile pire que desktop de 3+
- Beaucoup de clics à risque

**Success**:
- Position mobile meilleure que desktop
- Mobile-First Score > 90

**Opportunity**:
- Gros trafic mobile mais perf moyenne
- CTR à améliorer

---

## 🔍 Debugging

### Vérifier les tables

```bash
node check-seo-tables.mjs
```

### Inspecter le format des données

```bash
node inspect-device-data.mjs
```

### Tester l'API

```bash
node test-device-intelligence.mjs
```

---

## 📈 Roadmap

### Phase 1 (✅ Terminé)
- [x] API Device Intelligence
- [x] Dashboard UI complet
- [x] Recommandations automatiques
- [x] Intégration GSC + GA4

### Phase 2 (En cours)
- [ ] Collecte PageSpeed automatique
- [ ] Alertes email si score < 70
- [ ] Export CSV des métriques

### Phase 3 (Futur)
- [ ] Analyse tendances (30j/90j)
- [ ] Prédictions basées sur ML
- [ ] Comparaison concurrents

---

## 🚀 Déploiement

Le dashboard est déjà déployé sur Vercel:

**URL**: https://admin.solutionargentrapide.ca/admin/seo

Pour redéployer après modifications:
```bash
npm run build
git add -A
git commit -m "feat: update device intelligence"
git push
```

Vercel déploie automatiquement.

---

## 📞 Support

**Logs API**: `/api/seo/device-intelligence` renvoie `rawData` en mode dev

**Erreurs communes**:
- `device_breakdown.forEach is not a function` → Fixed (objet au lieu d'array)
- `performance_score` null → Collecter données PageSpeed
- Score à 0 → Pas de données dans les tables

---

**Dernière mise à jour**: 2026-01-27
**Maintenu par**: Claude pour SAR
