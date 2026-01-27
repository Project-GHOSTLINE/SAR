# 📊 ANALYTICS DASHBOARD - GUIDE DÉTAILLÉ

**Date**: 2026-01-27
**Commit**: `32ea4bf` - Dashboard complet déployé

---

## 🎯 NOUVEAUTÉS AJOUTÉES

### 1. **Sources de Trafic** (UTM + Referrer)

**Ce que tu vois**:
- Source (utm_source ou "Direct" si null)
- Medium (utm_medium)
- Nombre de sessions par source
- Nombre de conversions par source
- Taux de conversion par source (%)

**Pourquoi c'est utile**:
- Identifier les canaux d'acquisition les plus performants
- Voir quel UTM source convertit le mieux
- Comparer Direct vs Google vs Facebook vs autres sources
- Optimiser le budget marketing selon les sources qui convertissent

**Exemple de données**:
| Source | Medium | Sessions | Conversions | Taux Conv. |
|--------|--------|----------|-------------|------------|
| google | organic | 150 | 8 | 5.3% |
| facebook | social | 95 | 3 | 3.2% |
| Direct | - | 200 | 15 | 7.5% |

### 2. **Heatmap d'Activité** (7 jours x 24 heures)

**Ce que tu vois**:
- Grille 7 lignes (jours de la semaine) x 24 colonnes (heures)
- Couleur verte plus intense = plus d'événements
- Nombre d'événements affiché dans chaque cellule

**Pourquoi c'est utile**:
- Identifier les heures de pointe (quand lancer des campagnes)
- Voir les jours les plus actifs
- Optimiser les horaires de publication de contenu
- Planifier la maintenance pendant les heures creuses

**Exemple**:
- Lundi 14h = 45 événements (vert foncé) → heure de pointe
- Dimanche 3h = 2 événements (vert pâle) → heure creuse

### 3. **Métriques par Page** (7 derniers jours)

**Ce que tu vois**:
- URL de chaque page
- Nombre total de vues
- Nombre de sessions uniques (visiteurs distincts)
- Durée moyenne passée sur la page (en secondes)
- Ratio vues/session (combien de fois la page est vue par session)

**Pourquoi c'est utile**:
- Identifier les pages les plus populaires
- Voir quelles pages retiennent l'attention (durée élevée)
- Détecter les pages problématiques (durée très courte = bounce)
- Optimiser les pages avec ratio élevé (vues/session > 2 = bon engagement)

**Exemple de données**:
| Page URL | Vues | Sessions Uniques | Durée Moy. | Vues/Session |
|----------|------|------------------|------------|--------------|
| / | 450 | 320 | 45s | 1.4 |
| /formulaire | 280 | 245 | 120s | 1.1 |
| /faq | 150 | 95 | 180s | 1.6 |

### 4. **Sessions Récentes** (Détails par IP)

**Ce que tu vois** (20 sessions les plus récentes):

**Colonnes**:
1. **Session ID** - Identifiant anonymisé (16 chars + "...")
2. **IP Hash** - Hash partiel de l'IP (8 chars + "...")
3. **Statut** - "Lié" (client identifié) ou "Anonyme" (visiteur non-identifié)
4. **Device** - Type + Navigateur (ex: "mobile - Chrome")
5. **Pays** - Code pays (ex: "CA", "US", "FR")
6. **Source** - UTM source, "Referrer", ou "Direct"
7. **Events** - Total événements (page views entre parenthèses)
8. **Durée** - Durée de la session en secondes
9. **Créé** - Date et heure de création

**Pourquoi c'est utile**:
- Voir en temps réel qui visite le site
- Détecter les IPs suspectes (VPN, bots)
- Identifier les pays d'origine du trafic
- Voir le comportement par device (mobile vs desktop)
- Corréler source → device → conversion

**Exemple de ligne**:
```
Session ID: a1b2c3d4e5f6g7h8...
IP Hash: 3f4a9b2c...
Statut: Anonyme
Device: mobile - Safari
Pays: CA
Source: google
Events: 5 (4pg)
Durée: 245s
Créé: jan 27, 15:32
```

**Interprétation**:
- Visiteur canadien sur mobile Safari
- Venu via Google
- 5 événements trackés dont 4 page views
- Session de 4 minutes
- Pas encore identifié (anonyme)

---

## 🔍 DÉTAILS PAR IP - CE QUE TU PEUX ANALYSER

### A. Détecter les Bots/Scrapers

**Red flags**:
- `Statut: Anonyme` + `Events: 50+` en quelques secondes
- `Durée: < 10s` avec `Events: 10+` (impossible humainement)
- `Device: unknown - unknown` (User-Agent suspect)
- Multiple sessions avec même `IP Hash` en rafale

**Action**: Bloquer l'IP via blacklist admin

### B. Identifier les Visiteurs de Qualité

**Green flags**:
- `Durée: > 120s` (2 minutes+)
- `Events: 5+` avec ratio page views élevé
- `Source: google` + `Pays: CA` (trafic local qualifié)
- `Statut: Lié` (client converti)

**Action**: Cibler ce profil dans les campagnes marketing

### C. Analyser les Conversions par Pays

**Requête mentale**:
- Filtre les sessions avec `Statut: Lié`
- Groupe par `Pays`
- Compare le taux de conversion par pays

**Exemple**:
- CA: 15 sessions liées / 200 sessions totales = 7.5%
- US: 5 sessions liées / 50 sessions totales = 10%
- FR: 2 sessions liées / 30 sessions totales = 6.7%

**Insight**: USA convertit mieux → investir plus sur le marché US

### D. Analyser les Conversions par Source

**Requête mentale**:
- Filtre les sessions avec `Statut: Lié`
- Groupe par `Source`
- Compare le taux de conversion par source

**Exemple**:
- Google: 8 conversions / 150 sessions = 5.3%
- Facebook: 3 conversions / 95 sessions = 3.2%
- Direct: 15 conversions / 200 sessions = 7.5%

**Insight**: Trafic direct convertit le mieux → optimiser pour le trafic direct (SEO, brand awareness)

### E. Analyser les Conversions par Device

**Requête mentale**:
- Filtre les sessions avec `Statut: Lié`
- Groupe par `Device.type`
- Compare le taux de conversion par device

**Exemple**:
- Mobile: 10 conversions / 280 sessions = 3.6%
- Desktop: 16 conversions / 165 sessions = 9.7%

**Insight**: Desktop convertit 3x mieux → optimiser l'expérience mobile

---

## 📐 ARCHITECTURE DES DONNÉES

### Flux de Données

```
VISITEUR
   ↓
MIDDLEWARE (génère session_id cookie)
   ↓
/api/telemetry/track-event (capture events)
   ↓
client_sessions (table) + client_telemetry_events (table)
   ↓
VUES SQL (analytics_sessions_enriched, etc.)
   ↓
API ENDPOINTS (/api/analytics/*)
   ↓
DASHBOARD REACT (/admin/analytics)
```

### Tables de Base

1. **client_sessions** - 1 ligne par session
   - session_id (unique)
   - client_id (NULL si anonyme, UUID si lié)
   - device_type, browser, os
   - first_referrer, first_utm_source, first_utm_medium
   - country_code, asn, ip_hash, ua_hash
   - created_at, last_activity_at

2. **client_telemetry_events** - N lignes par session
   - session_id (FK → client_sessions)
   - event_type (page_view, form_start, form_submit, etc.)
   - event_name (URL ou action)
   - page_url, referrer_url
   - duration_ms, payload
   - created_at

### Vues SQL (Pré-agrégées)

1. **visual_conversion_funnel** - Funnel par stage
2. **visual_events_timeline** - Timeline 30 jours
3. **visual_abandon_heatmap** - Points d'abandon
4. **analytics_user_journeys** - Parcours utilisateurs
5. **visual_conversion_by_source** - Conversions par source
6. **visual_activity_heatmap** - Heatmap 7j x 24h

---

## 🚀 PROCHAINES ÉTAPES

### Immédiat (Dans 2 minutes)

1. ✅ Attends que Vercel déploie (commit `32ea4bf`)
2. ✅ Ouvre: https://admin.solutionargentrapide.ca/admin/analytics
3. ✅ Vérifie que les 4 nouvelles sections s'affichent:
   - Sources de Trafic
   - Heatmap d'Activité
   - Métriques par Page
   - Sessions Récentes

### Si Erreurs

1. ✅ Ouvre: https://admin.solutionargentrapide.ca/api/telemetry/test-track
2. ✅ Envoie-moi le JSON de la réponse
3. ✅ Je fixe l'erreur spécifique

### Cette Semaine

1. ⏳ Analyse les sources de trafic (où investir?)
2. ⏳ Identifie les heures de pointe (heatmap)
3. ⏳ Optimise les pages avec durée faible
4. ⏳ Étudie les sessions récentes (profil visiteur)

### Ce Mois

1. ⏳ A/B test sur les pages problématiques
2. ⏳ Campagnes ciblées sur heures de pointe
3. ⏳ Bloquer IPs suspectes (bots)
4. ⏳ Optimiser mobile (si conversion < desktop)

---

## 📊 MÉTRIQUES CLÉS À SURVEILLER

### KPI Hebdomadaires

1. **Taux de Conversion Global**: (Conversions / Sessions) * 100
   - Objectif: > 5%
   - Actuel: Visible dans KPI card en haut

2. **Taux de Conversion par Source**:
   - Google: ?%
   - Facebook: ?%
   - Direct: ?%
   - Objectif: Identifier la meilleure source

3. **Durée Moyenne de Session**:
   - Visible dans "Sessions Récentes"
   - Objectif: > 90 secondes
   - Si < 60s → problème UX

4. **Bounce Rate par Page**:
   - Durée < 30s sur page_url
   - Objectif: < 40%

### Red Flags à Surveiller

1. **Bot Detection**:
   - Sessions avec 20+ events en < 10s
   - IP hash récurrent avec patterns anormaux
   - Device = "unknown"

2. **Conversion Drop**:
   - Taux de conversion en baisse semaine après semaine
   - Source performante qui devient moins performante

3. **Page Problems**:
   - Page avec durée moyenne < 15s
   - Page avec 0 conversions mais trafic élevé

---

## 🔒 PRIVACY & SÉCURITÉ

### Données Anonymisées

1. **Session ID**: 64 chars hex → Affiché partiellement (16 chars + "...")
2. **IP Hash**: SHA256(IP + salt) → Affiché partiellement (8 chars + "...")
3. **Client ID**: UUID → Affiché comme "linked" ou "anonymous" (pas le UUID raw)

### Données Visibles

1. **Country Code**: OK (pas PII)
2. **ASN**: OK (pas PII, juste fournisseur internet)
3. **Device/Browser/OS**: OK (catégories agrégées)
4. **UTM Source/Medium**: OK (marketing data)

### Données JAMAIS Affichées

1. ❌ IP raw (jamais stockée)
2. ❌ User-Agent raw (seulement hash)
3. ❌ Email, nom, téléphone (jamais dans telemetry)
4. ❌ Session ID complet (seulement partiel)

---

## 📖 GLOSSAIRE

- **Session**: Période d'activité d'un visiteur (expire après 90 jours d'inactivité)
- **Event**: Action trackée (page view, clic, form interaction)
- **Conversion**: Session où le visiteur soumet le formulaire (devient "Lié")
- **Anonyme**: Visiteur non-identifié (pas de client_id)
- **Lié**: Visiteur identifié (a soumis formulaire, email connu)
- **IP Hash**: Hash cryptographique de l'IP (non-réversible)
- **ASN**: Autonomous System Number (identifiant du fournisseur internet)
- **UTM**: Paramètres de tracking marketing (utm_source, utm_medium, utm_campaign)

---

**Dashboard déployé! Vérifie dans 2 minutes!** 🚀

**URL**: https://admin.solutionargentrapide.ca/admin/analytics
