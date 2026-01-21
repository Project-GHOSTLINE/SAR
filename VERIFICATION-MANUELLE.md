# ✅ VÉRIFICATION MANUELLE - Interface Web GA4

## 🎯 Objectif
Vérifier visuellement que l'interface web affiche les vraies données GA4.

---

## 📋 CHECKLIST DE VÉRIFICATION

### 1. Ouvrir l'interface admin
```
http://localhost:3002/admin/seo
```

**✅ Vérifications:**
- [ ] La page charge sans erreur
- [ ] Section "Google Analytics 4" visible
- [ ] Table de données présente

---

### 2. Vérifier la table de données

**✅ Vérifications:**
- [ ] Au moins 30 lignes visibles
- [ ] Chaque ligne a une date différente
- [ ] Colonne "Utilisateurs" affiche des nombres > 0
- [ ] Colonne "Sessions" affiche des nombres > 0
- [ ] Les valeurs sont DIFFÉRENTES d'une ligne à l'autre

**❌ Signes de MODE MOCK:**
- Toutes les valeurs identiques
- Valeurs trop rondes (ex: toujours 100, 200, 300)
- Pattern répétitif

**✅ Signes de VRAIES DONNÉES:**
- Valeurs variables (ex: 94, 68, 128, 215...)
- Pas de pattern visible
- Données réalistes

---

### 3. Tester le modal détaillé

**Actions:**
1. Cliquer sur n'importe quelle ligne du tableau
2. Attendre l'ouverture du modal "Métriques Détaillées"

**✅ Vérifications:**
- [ ] Modal s'ouvre correctement
- [ ] Titre affiche "Métriques Détaillées - [Date]"
- [ ] Au moins 8 sections de métriques:
  - [ ] Utilisateurs (15 métriques)
  - [ ] Sessions (10 métriques)
  - [ ] Conversions (8 métriques)
  - [ ] Sources de Trafic (12 métriques)
  - [ ] Répartition par Appareil (9 métriques)
  - [ ] Métriques Pages (5+ métriques)
  - [ ] Événements (5+ métriques)
  - [ ] Scores de Qualité (20+ métriques)

**✅ Vérifications supplémentaires:**
- [ ] Section "Top 10 Pages" visible avec au moins 3 pages
- [ ] Section "Top 10 Événements" visible avec au moins 3 événements
- [ ] Texte "Plus de 100 métriques disponibles" présent
- [ ] Bouton X pour fermer le modal fonctionne

---

### 4. Comparer plusieurs jours

**Actions:**
1. Noter les valeurs de 3 jours différents:

**Jour 1:**
- Date: ___________
- Utilisateurs: ___________
- Sessions: ___________

**Jour 2:**
- Date: ___________
- Utilisateurs: ___________
- Sessions: ___________

**Jour 3:**
- Date: ___________
- Utilisateurs: ___________
- Sessions: ___________

**✅ Vérifications:**
- [ ] Les 3 jours ont des valeurs DIFFÉRENTES
- [ ] Aucun pattern répétitif visible
- [ ] Les valeurs sont réalistes

---

### 5. Vérifier les métriques agrégées

**En haut de la page:**

**✅ Vérifications:**
- [ ] "30 derniers jours" affiche des métriques
- [ ] Total Utilisateurs > 0
- [ ] Total Sessions > 0
- [ ] Taux d'engagement affiché
- [ ] Conversions affichées

---

## 📸 CAPTURES D'ÉCRAN RECOMMANDÉES

Prendre des screenshots de:
1. Vue d'ensemble de la table (30 jours)
2. Modal ouvert avec toutes les sections visibles
3. Section "Top 10 Pages"
4. Section "Top 10 Événements"
5. Comparaison de 2-3 jours différents

---

## ✅ RÉSULTAT FINAL

**Si TOUS les critères ci-dessus sont ✅:**
- **STATUS: SUCCÈS COMPLET**
- Les données sont RÉELLES (pas MOCK)
- L'interface fonctionne à 100%

**Si certains critères sont ❌:**
- Noter lesquels
- Consulter GA4-VALIDATION-REPORT.md
- Relancer la collecte si nécessaire

---

## 🔄 EN CAS DE PROBLÈME

### Problème: Table vide ou pas de données

**Solution:**
```bash
cd /Users/xunit/Desktop/📁 Projets/sar
bash tools/force-collect-30days.sh
```

### Problème: Toutes les valeurs identiques

**Vérification:**
```bash
curl -H "x-api-key: FredRosa%1978" \
  "http://localhost:3002/api/seo/collect/ga4?startDate=2026-01-15&endDate=2026-01-21" | jq
```

Si réponse contient `"mock": true` → Problème de credentials

### Problème: Modal ne s'ouvre pas

**Vérification:**
- Console du navigateur (F12)
- Chercher erreurs JavaScript
- Vérifier que le clic fonctionne

---

## 📊 DONNÉES DE RÉFÉRENCE

**Valeurs attendues (exemple réel):**
```
2026-01-20: 94 users, 112 sessions
2026-01-19: 68 users, 90 sessions
2026-01-18: 128 users, 265 sessions
```

**Top Pages attendues:**
- /
- /demande-de-pret-en-ligne-formulaire/
- /nous-joindre/
- /faq/

**Top Events attendus:**
- page_view
- user_engagement
- session_start
- ads_conversion_PAGE_VIEW_1

---

**Date de création:** 2026-01-21
**Par:** Claude Code (Sonnet 4.5)
