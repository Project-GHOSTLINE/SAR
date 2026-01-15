# ⚡ SAR Performance Monitoring System - Guide Complet

**Date:** 2026-01-15
**Système:** Monitoring de performance avec millisecondes + Stress tests automatiques

---

## 🎯 Vue d'Ensemble

Un système complet pour:
1. ✅ **Logger automatiquement** le temps de réponse de TOUTES les routes API (millisecondes)
2. ✅ **Stress test animé** avec visualisations "wow" en temps réel
3. ✅ **Dashboard HTML live** avec auto-refresh
4. ✅ **Synchronisation Miro** automatique après chaque test
5. ✅ **Tracking par phase** de restructuration DB

---

## 🚀 Quick Start

### 1. Installer la Table de Performance

```bash
cd /Users/xunit/Desktop/📁\ Projets/sar

# Via Supabase SQL Editor
cat database/migrations/restructure/create_performance_logs.sql
# Copier/coller dans Supabase SQL Editor et exécuter
```

**Ce que ça crée:**
- Table `api_performance_logs` (temps de réponse de chaque route)
- View `vw_route_performance` (performance moyenne 24h)
- View `vw_phase_performance` (performance par phase)
- View `vw_slow_routes` (top 10 routes lentes)
- Cleanup automatique (7 jours rétention)

### 2. Lancer un Stress Test

```bash
# Test général
node scripts/stress-test-animated.mjs

# Test avec phase spécifique
node scripts/stress-test-animated.mjs P4
```

**Durée:** ~30-45 secondes
- 5 vagues de 10 requêtes parallèles
- Total: 50 requêtes
- Résultats stockés dans Supabase
- Board Miro créé automatiquement

### 3. Voir le Dashboard Live

```bash
# Ouvrir dans le navigateur
open http://localhost:3000/stress-test-dashboard.html
```

**Ou déployer:**
Le fichier est déjà dans `/public/`, accessible via:
```
https://admin.solutionargentrapide.ca/stress-test-dashboard.html
```

---

## 📊 Utilisation du Middleware (Pour Développeurs)

### Option A: Wrapper Automatique (Recommandé)

Créer `/src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { measureRoutePerformance } from './middleware/performance-logger'

export async function middleware(request: NextRequest) {
  return measureRoutePerformance(request, async () => {
    return NextResponse.next()
  })
}

export const config = {
  matcher: '/api/:path*'  // Toutes les routes API
}
```

### Option B: Wrapper Manuel par Route

Dans chaque fichier `/src/app/api/*/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withPerformanceLogging } from '@/middleware/performance-logger'

export async function GET(request: NextRequest) {
  return withPerformanceLogging(request, async () => {
    // Votre logique ici
    const data = await fetchData()
    return NextResponse.json({ data })
  })
}
```

**Avantages:**
- ✅ Automatique: pas besoin de modifier le code
- ✅ Headers: ajoute `X-Response-Time: XXms`
- ✅ Console: log coloré dans le terminal
- ✅ Supabase: stockage automatique pour analyse

---

## 🎨 Visualisations

### Terminal (Stress Test)

```
╔════════════════════════════════════════════════════════════════╗
║     🚀 SAR PERFORMANCE STRESS TEST - AQUEDUC VELOCITY 🚀     ║
╚════════════════════════════════════════════════════════════════╝

🌊 VAGUE 1/5
──────────────────────────────────────────────────────────────────
⚠️ 🟢 Messages        23ms (200)
   🟢 Support         45ms (200)
   🟡 VoPay           89ms (200)
   🟠 Analytics       156ms (200)

📊 RÉSULTATS FINAUX
──────────────────────────────────────────────────────────────────
Total requêtes:       50
✅ Succès:            48
❌ Échecs:            2
📈 Taux de succès:    96%
⚡ Temps moyen:       67ms
```

### Dashboard HTML (Live)

**URL:** `/stress-test-dashboard.html`

**Features:**
- 🎨 Design glassmorphism moderne
- 📊 Stats globales: requêtes, succès, temps moyen, grade
- 🚀 Performance par route avec barres colorées
- 🔴 Live indicator (auto-refresh 5s)
- ✨ Animations fluides sur hover

**Codes Couleur:**
- 🟢 Vert: <50ms (Excellent)
- 🟡 Jaune: 50-150ms (Bon)
- 🟠 Orange: 150-300ms (Lent)
- 🔴 Rouge: >300ms (Critique)

### Miro (Après Stress Test)

Chaque stress test crée un board Miro avec:
- Routes triées par performance (pire en haut)
- Heatmap colorée selon vitesse
- Stats: min/max/avg/requêtes par route
- Alertes si erreurs détectées

**Exemple:** `https://miro.com/app/board/uXjVGPxxxxxx=`

---

## 🔄 Workflow: Test Après Chaque Phase

### Automatique (Recommandé)

Créer `/scripts/post-phase-test.sh`:

```bash
#!/bin/bash
# Test automatique après migration d'une phase

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: ./post-phase-test.sh P4"
  exit 1
fi

echo "🚀 Lancement stress test pour phase $PHASE..."

# Lancer stress test
node scripts/stress-test-animated.mjs "$PHASE"

# Ouvrir dashboard
open http://localhost:3000/stress-test-dashboard.html

# Resync progression Miro
node scripts/sync-journal-to-miro.mjs

echo "✅ Tests terminés pour phase $PHASE"
```

```bash
chmod +x scripts/post-phase-test.sh
```

### Manuel

Après chaque phase de restructuration:

```bash
# Exemple: Phase 4 terminée
./scripts/post-phase-test.sh P4

# Ou manuellement:
node scripts/stress-test-animated.mjs P4
```

**Résultats:**
1. Console: résultats animés
2. Supabase: données stockées avec tag `phase='P4'`
3. Miro: board créé
4. Dashboard: données visibles instantanément

---

## 📈 Analyse des Résultats

### Via Supabase SQL

```sql
-- Performance moyenne par phase
SELECT * FROM vw_phase_performance
ORDER BY phase;

-- Routes les plus lentes (24h)
SELECT * FROM vw_route_performance
WHERE avg_ms > 100
ORDER BY avg_ms DESC;

-- Évolution dans le temps (Phase 1 vs Phase 4)
SELECT
  phase,
  route,
  AVG(duration_ms)::integer as avg_ms
FROM api_performance_logs
WHERE phase IN ('P1', 'P4')
GROUP BY phase, route
ORDER BY route, phase;

-- Taux d'erreur par route
SELECT
  route,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status >= 400) as errors,
  ROUND(COUNT(*) FILTER (WHERE status >= 400) * 100.0 / COUNT(*), 2) as error_rate_percent
FROM api_performance_logs
WHERE timestamp > now() - interval '1 day'
GROUP BY route
HAVING COUNT(*) FILTER (WHERE status >= 400) > 0
ORDER BY error_rate_percent DESC;
```

### Via Dashboard

1. Ouvrir `/stress-test-dashboard.html`
2. Auto-refresh toutes les 5 secondes
3. Voir stats globales + détail par route
4. Performance grade: A+, A, B, C, D

### Via Miro

1. Ouvrir le board créé par le stress test
2. Voir heatmap visuelle (vert → rouge)
3. Comparer plusieurs boards (historique)

---

## 🎯 Objectifs de Performance

### Cibles par Type de Route

| Route Type | Target | Good | Acceptable | Critical |
|------------|--------|------|------------|----------|
| **Critiques** (Messages, Support, Clients) | <50ms | <100ms | <200ms | >200ms |
| **Standards** (Loans, VoPay) | <100ms | <150ms | <300ms | >300ms |
| **Analytics** | <200ms | <300ms | <500ms | >500ms |

### Cibles Globales

- **Taux de succès:** >99%
- **Temps moyen:** <100ms
- **P95:** <200ms
- **P99:** <500ms
- **Erreurs:** <1%

---

## 🔧 Configuration Avancée

### Modifier Config Stress Test

Éditer `/scripts/stress-test-animated.mjs`:

```javascript
const CONFIG = {
  concurrent: 20,      // Requêtes parallèles (défaut: 10)
  iterations: 10,      // Vagues (défaut: 5)
  delayBetweenWaves: 500  // ms (défaut: 1000)
}
```

**Impact:**
- `concurrent: 20` → Plus de charge simultanée
- `iterations: 10` → Plus de données collectées
- `delay: 500` → Test plus rapide

### Ajouter une Route au Test

```javascript
const ROUTES = [
  // ... routes existantes
  { path: '/api/admin/nouvelle-route', name: 'NouvellRoute', critical: true }
]
```

### Personnaliser Dashboard

Éditer `/public/stress-test-dashboard.html`:

```javascript
// Modifier refresh rate (ligne ~450)
setInterval(refresh, 3000)  // 3 secondes au lieu de 5

// Modifier emojis
const ROUTE_EMOJIS = {
  'Messages': '💬',
  'NouvellRoute': '🎯'  // Ajouter emoji
}
```

---

## 🐛 Troubleshooting

### "Table api_performance_logs does not exist"

**Solution:**
```bash
# Exécuter migration SQL
cat database/migrations/restructure/create_performance_logs.sql
# Copier dans Supabase SQL Editor
```

### Stress Test: "Failed to fetch"

**Cause:** Serveur Next.js non démarré ou mauvaise URL

**Solution:**
```bash
# Vérifier serveur
npm run dev

# Ou changer BASE_URL dans script
const BASE_URL = 'https://admin.solutionargentrapide.ca'
```

### Dashboard: "Aucune donnée disponible"

**Cause:** Pas encore de stress test lancé

**Solution:**
```bash
# Lancer au moins un stress test
node scripts/stress-test-animated.mjs
```

### Miro: "401 Unauthorized"

**Cause:** Token expiré

**Solution:**
```bash
# Regénérer token Miro
# 1. https://miro.com/app/settings/user-profile/apps
# 2. Generate new token
# 3. Copier dans script (ligne 8)
```

### Performances Dégradées

**Investigation:**
```sql
-- Identifier routes lentes
SELECT * FROM vw_slow_routes;

-- Voir évolution
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  route,
  AVG(duration_ms)::integer as avg_ms
FROM api_performance_logs
WHERE timestamp > now() - interval '24 hours'
GROUP BY hour, route
ORDER BY hour DESC, avg_ms DESC;
```

**Actions:**
1. Vérifier logs console (`X-Response-Time` header)
2. Profiler route spécifique
3. Optimiser queries/indexes
4. Relancer stress test après fix

---

## 📊 Métriques Clés

### Console Logs

Chaque requête API log:
```
✅ 🟢 GET /api/admin/messages - 23ms - 200
✅ 🟡 GET /api/admin/vopay/transactions - 89ms - 200
❌ 🔴 GET /api/admin/analytics - 456ms - 500
```

### Headers HTTP

```
X-Response-Time: 23ms
```

### Supabase Columns

```sql
{
  route: "/api/admin/messages",
  method: "GET",
  status: 200,
  duration_ms: 23,
  phase: "P4",  -- optionnel
  timestamp: "2026-01-15T12:34:56Z",
  user_agent: "SAR-StressTest/1.0",
  ip_address: "192.168.1.1"
}
```

---

## 🎨 Exemples Visuels

### Terminal Animé

Le stress test affiche:
- Barre de progression: `[████████████░░░░░░░] 60%`
- Spinner: `⠋ Initialisation...`
- Couleurs: Vert (success), Rouge (error), Jaune (warning)
- Emojis: 🌊 (vagues), 🟢🟡🟠🔴 (vitesse)

### Dashboard Glassmorphism

- Fond: Gradient violet dégradé
- Cards: Verre translucide avec blur
- Hover: Lift effect (-5px translateY)
- Animations: Fade in, slide in, pulse
- Live dot: Clignotant rouge

### Miro Heatmap

- Vert clair (#d1fae5): <50ms
- Jaune clair (#fef3c7): 50-150ms
- Orange clair (#fed7aa): 150-300ms
- Rouge clair (#fee2e2): >300ms
- Bordures épaisses (4px) selon couleur

---

## ✅ Checklist Post-Phase

Après chaque phase de restructuration:

- [ ] Lancer stress test avec phase: `node scripts/stress-test-animated.mjs PX`
- [ ] Vérifier console logs (toutes routes <200ms?)
- [ ] Consulter dashboard HTML (grade A+ ou A?)
- [ ] Voir board Miro (pas de rouge?)
- [ ] Comparer avec phase précédente (dégradation?)
- [ ] Documenter dans JOURNAL si problèmes
- [ ] Si routes lentes: optimiser avant phase suivante
- [ ] Resync progression: `node scripts/sync-journal-to-miro.mjs`

---

## 🚀 Roadmap

### Phase Actuelle (Implémenté)
- [x] Middleware performance logging
- [x] Table Supabase + views
- [x] Stress test animé terminal
- [x] Dashboard HTML live
- [x] Sync Miro automatique
- [x] Tracking par phase

### Prochaines Améliorations
- [ ] Alertes Slack/Email si dégradation
- [ ] Graphiques historiques (Chart.js)
- [ ] Comparaison avant/après phase
- [ ] Export PDF rapport performance
- [ ] Benchmarks concurrence (autres systèmes)
- [ ] Load test avec Artillery/K6
- [ ] Monitoring production (Datadog/Sentry)

---

## 📞 Support

### Fichiers du Système

- **Middleware:** `src/middleware/performance-logger.ts`
- **Stress test:** `scripts/stress-test-animated.mjs`
- **Dashboard:** `public/stress-test-dashboard.html`
- **Migration SQL:** `database/migrations/restructure/create_performance_logs.sql`
- **Post-phase:** `scripts/post-phase-test.sh`

### Commandes Utiles

```bash
# Test rapide
node scripts/stress-test-animated.mjs

# Test avec phase
node scripts/stress-test-animated.mjs P4

# Dashboard
open http://localhost:3000/stress-test-dashboard.html

# Voir logs Supabase
# Dashboard → Table Editor → api_performance_logs

# Cleanup vieux logs (>7 jours)
# SELECT cleanup_old_performance_logs();
```

---

**Dernière mise à jour:** 2026-01-15
**Version:** 1.0
**Status:** ✅ Opérationnel - Système complet déployé
