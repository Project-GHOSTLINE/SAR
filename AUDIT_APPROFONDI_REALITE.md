# 🔍 Claude Code — AUDIT APPROFONDI & EXTENSION DU MODULE SEO (RÉALITÉ TERRAIN)

**Projet**: Solution Argent Rapide (SAR)  
**Module**: SEO / Command Center / Explorer IP  
**Date**: 2026-01-30  
**Rôle attendu**: Senior Full-Stack Architect + Data Engineer + UI Engineer  

---

## 🎯 OBJECTIF DE LA MISSION

Tu dois **AUDITER puis ÉTENDRE** le module SEO **en respectant strictement la réalité du terrain** :

- AUCUNE recréation inutile
- AUCUNE supposition de schéma
- AUCUNE duplication de tables ou routes
- AUCUNE rupture de l’existant

Résultat attendu :
- un **Command Center SEO unifié**
- une **corrélation SEO ↔ performance ↔ télémétrie**
- un **Explorer IP réellement exploitable**
- une **refonte UI claire, progressive, sûre**

---

## 🚨 RÈGLE ABSOLUE (NON NÉGOCIABLE)

👉 **LE SYSTÈME EXISTE DÉJÀ ET TOURNE EN PROD**

Tu es en **mode EXTENSION / REFONTE CONTRÔLÉE**, PAS en création.

---

## ✅ RÉALITÉ DES DONNÉES — À RESPECTER STRICTEMENT

### 📊 TABLES SEO ACTIVES (À UTILISER TELLES QUELLES)

❌ Ne pas recréer  
❌ Ne pas renommer  

- `seo_ga4_metrics_daily`  
  - 31 rows  
  - 34 colonnes  
  - GA4 complet (users, sessions, conversions, engagement, devices, sources, top_pages JSONB)

- `seo_gsc_metrics_daily`  
  - 3 rows  
  - métriques globales GSC + top_queries/top_pages JSONB

- `seo_semrush_domain_daily`  
  - 4 rows  
  - ranking, keywords, traffic, backlinks, authority + raw_data JSONB

---

### 🧠 TÉLÉMÉTRIE — RÉALITÉ CRITIQUE

#### ✅ SYSTÈME VRAIMENT ACTIF
- `telemetry_requests` → **78 000+ rows**
  - IP **hashée**
  - path, duration, status
  - source, env
  - vercel_region
  - meta_redacted JSONB
  - **C’EST LA SOURCE IP / PERF / REQUÊTES**

- `client_sessions` → **985 rows**
  - sessions actives
  - MAIS **tracking incomplet**
  - IP / device / UTM = NULL

#### ⚠️ TABLES EXISTANTES MAIS VIDES
- `telemetry_sessions` (0 rows)
- `telemetry_events` (0 rows)

👉 **Tu ne dois PAS brancher l’Explorer IP sur ces tables vides.**

---

## 🧩 DÉCISION ARCHITECTURALE IMPOSÉE (PHASE 1)

### 🎯 STRATÉGIE TÉLÉMÉTRIE OBLIGATOIRE

👉 **Option B — VIEW d’unification (OBLIGATOIRE)**

- NE PAS migrer les données existantes
- NE PAS casser `client_sessions`
- NE PAS déplacer 78k requêtes

Tu dois :
- utiliser `telemetry_requests` comme **source IP / activité**
- utiliser `client_sessions` comme **source session lifecycle**
- créer des **VIEWS intelligentes** pour :
  - IP → session (heuristique temporelle)
  - session → SEO
  - SEO → performance

---

## ⚡ SPEED INSIGHTS — PAYÉ MAIS NON INTÉGRÉ

### ❌ ÉTAT ACTUEL
- `vercel_speed_insights_raw` → N’EXISTE PAS
- `vercel_speed_insights_daily` → N’EXISTE PAS
- SDK non installé
- Drain non configuré

### ✅ À FAIRE (OBLIGATOIRE)

1. Créer les tables :
   - `vercel_speed_insights_raw`
   - `vercel_speed_insights_daily`
2. Installer `@vercel/speed-insights`
3. Injecter dans `src/app/layout.tsx`
4. Créer endpoint sécurisé :
POST /api/vercel/drains/speed-insights
Authorization: Bearer ${VERCEL_DRAIN_SECRET}

5. Stocker payload brut
6. Créer job :
jobs/aggregate_speed_insights_daily.ts

7. Calculer p75 (priorité Google) :
- LCP
- INP
- CLS
- TTFB
8. Déterminer `perf_status` (GOOD / WARN / CRIT)

⚠️ Ne JAMAIS inventer un champ absent du payload réel Vercel.

---

## 👓 VIEWS À CRÉER (CRITIQUES)

### 1️⃣ `seo_unified_daily`
Unification **GA4 + GSC + Semrush**

- jointure par `date`
- FULL OUTER JOIN autorisé
- AUCUNE perte de données

---

### 2️⃣ `seo_unified_daily_plus`
Ajoute **Speed Insights**

- agrégation quotidienne
- worst-case perf_status
- metrics moyennes globales

---

### 3️⃣ `ip_to_seo_segment`
Vue **INVESTIGATION**

- Source principale : `telemetry_requests`
- IP = `ip_hash`
- landing_page = premier `path`
- device / utm depuis `meta_redacted`
- activité réelle (count, duration)
- **PAS de promesse d’attribution parfaite**

---

## 🌐 ROUTES API — RÉUTILISER AVANT DE CRÉER

### EXISTANTES (À NE PAS DUPLIQUER)
- `/api/seo/metrics`
- `/api/admin/telemetry/command-center`
- `/api/seo/device-intelligence`

### NOUVELLES ROUTES (WRAPPERS SEULEMENT)
- `/api/seo/overview`
- `/api/seo/ip/[ip]`
- `/api/seo/perf`

👉 Ces routes doivent **lire les VIEWS**, pas recalculer la logique.

---

## 🖥 UI — REFACTOR PROGRESSIF

### Page cible
/admin/seo/page.tsx


### Structure UI (OBLIGATOIRE)

#### COL A — Command Center
- KPI GA4 / GSC / Semrush / Speed
- cartes cliquables (drawer)

#### COL B — Attribution & Timeline
- page / requête / perf
- timeline basée sur telemetry_requests

#### COL C — Recommandations
- CRIT / WARN / OK
- basées sur perf + SEO

---

### Onglet **Explorer IP**
- Input IP hash
- IP Intelligence (via telemetry_requests)
- Pages vues
- Performance vécue
- Timeline requests
- Lien session / client si possible

---

## 📁 STRUCTURE DE FICHIERS ATTENDUE

supabase/migrations/20260130_seo_extension.sql

src/app/admin/seo/page.tsx

src/components/seo/
├── SeoTopBar.tsx
├── SeoTabs.tsx
├── KpiGrid.tsx
├── KpiCard.tsx
├── AttributionPanel.tsx
├── TimelinePanel.tsx
├── PerfImpactPanel.tsx
├── RecommendationsPanel.tsx
├── ExplorerIpPanel.tsx
├── DrawerDetails.tsx
└── types.ts


---

## 🛠️ ORDRE D’EXÉCUTION IMPOSÉ

1. AUDIT réel du schéma
2. Création tables Speed Insights
3. Création views unifiées
4. Indexes de performance
5. Intégration Speed Insights (SDK + Drain)
6. APIs wrappers
7. UI refactor
8. Tests réels avec données existantes

⛔ **Interdiction de coder l’UI avant que les views retournent des données réelles**

---

## 🔐 SÉCURITÉ & CONFORMITÉ

- IP = tous les ip peux importe lequel 



---

## ✅ DÉFINITION DU SUCCÈS

Quand un admin entre une IP :

- il voit l’activité réelle (requests)
- il comprend le contexte SEO
- il voit la performance vécue
- il peut corréler avec le business
- sans casser l’existant

---

**Commence par l’AUDIT.  
Explique chaque décision.  
Ne fais aucune hypothèse non vérifiée.**
