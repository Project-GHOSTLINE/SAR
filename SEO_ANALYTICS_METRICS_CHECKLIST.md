# SEO Analytics - Checklist Complète des Métriques

**Date**: 2026-01-27
**Page**: `/admin/seo/analytics`

---

## ✅ MÉTRIQUES ACTUELLEMENT AFFICHÉES

### Stats Cards (4 total)
- ✅ **Total IP** - Nombre total d'adresses IP uniques
- ✅ **IP Suspectes** - IPs avec anomalyScore >= 30 (non-bot)
- ✅ **Bots détectés** - IPs identifiées comme bots (score >= 50)
- ✅ **Humains** - IPs normales (score < 30)

### Table Principale - Par IP (7 colonnes)
- ✅ **IP / Localisation** - IP hash + ville/pays + icône (Bot/Suspect/Human)
- ✅ **Sessions** - Nombre total de sessions (triable)
- ✅ **Pages vues** - Nombre total de pages vues (triable)
- ✅ **Durée moyenne** - Durée moyenne session en secondes (triable)
- ✅ **Device** - Catégorie device (mobile/desktop/tablet)
- ✅ **Score Anomalie** - Barre de progression 0-100 + flags (triable)
- ✅ **Actions** - Bouton "Détails →"

### Modal Détail IP (5 sections)
- ✅ **Anomalies** - Liste des flags + score/100
- ✅ **Métriques** - 4 cards (Sessions, Pages vues, Durée moy., Taux rebond)
- ✅ **Appareil** - Catégorie, OS, Navigateur
- ✅ **Chronologie** - Première visite, Dernière visite
- ✅ **Recommandation** - Action suggérée (block/monitor/OK)

### Filtres & Contrôles (4 total)
- ✅ **Recherche** - Par IP, ville, pays
- ✅ **Période** - 7d / 30d / 90d
- ✅ **Type** - All / Humans / Suspicious / Bots
- ✅ **Export CSV** - Téléchargement données filtrées

---

## ❌ MÉTRIQUES DISPONIBLES MAIS NON AFFICHÉES

### 📊 GA4 Metrics (10 disponibles, 0 affichées)

**User Metrics:**
- ❌ `activeUsers` - Utilisateurs actifs durant la période
- ❌ `newUsers` - Nouveaux utilisateurs
- ❌ `totalUsers` - Total utilisateurs uniques

**Session Metrics:**
- ❌ `sessionsPerUser` - Sessions par utilisateur (loyauté)
- ❌ `engagementRate` - Taux d'engagement (%)
- ❌ `engagedSessions` - Nombre de sessions engagées

**Business Metrics:**
- ❌ `conversions` - Nombre total de conversions
- ❌ `totalRevenue` - Revenu total ($)

**Event Metrics:**
- ❌ `eventCount` - Nombre total d'événements
- ❌ `userEngagementDuration` - Durée engagement utilisateur (s)

### 📱 GA4 Device Dimensions (7 disponibles, 3 affichées)

**Affichées:**
- ✅ `deviceCategory` - mobile/desktop/tablet
- ✅ `operatingSystem` - iOS, Android, Windows, macOS
- ✅ `browser` - Chrome, Safari, Firefox

**Non affichées:**
- ❌ `osVersion` - Version OS (ex: iOS 17.2, Windows 11)
- ❌ `browserVersion` - Version navigateur (ex: Chrome 120.0)
- ❌ `screenResolution` - Résolution écran (ex: 1920x1080, 390x844)
- ❌ `mobileDeviceBranding` - Marque mobile (Apple, Samsung, Google)
- ❌ `mobileDeviceModel` - Modèle exact (iPhone 14, Galaxy S23)

### 🌍 GA4 Location Dimensions (3 disponibles, 2 affichées)

**Affichées:**
- ✅ `country` - Pays (Canada, USA)
- ✅ `city` - Ville (Montreal, Toronto, Quebec City)

**Non affichée:**
- ❌ `region` - Province/état (Quebec, Ontario, BC)

### 🔗 GA4 Traffic Source Dimensions (3 disponibles, 0 affichées)

- ❌ `sessionSource` - Source trafic (google, facebook, direct)
- ❌ `sessionMedium` - Medium (organic, cpc, referral, none)
- ❌ `sessionCampaignName` - Nom campagne marketing

### 📅 GA4 Temporal Dimension (1 disponible, 0 affichée)

- ❌ `date` - Date exacte événement (YYYYMMDD)

---

### 🔐 Telemetry `client_sessions` (21 colonnes, 7 affichées)

**Affichées:**
- ✅ `ip_hash` (SHA256)
- ✅ `device_type` (mobile/desktop)
- ✅ `browser`
- ✅ `os`
- ✅ `country_code`
- ✅ `city`
- ✅ `created_at` (première visite)

**Non affichées (14):**
- ❌ `session_id` - ID session unique
- ❌ `client_id` - ID client (si lié)
- ❌ `linked_via` - Comment lié (form_submit/magic_link/login)
- ❌ `linked_at` - Timestamp linkage
- ❌ `ua_hash` - User-agent haché
- ❌ `ga4_session_id` - ID session GA4 (correlation)
- ❌ `ga4_client_id` - ID client GA4 (correlation)
- ❌ `first_utm_source` - Source UTM première visite
- ❌ `first_utm_medium` - Medium UTM première visite
- ❌ `first_utm_campaign` - Campagne UTM première visite
- ❌ `first_utm_term` - Terme UTM première visite
- ❌ `first_utm_content` - Contenu UTM première visite
- ❌ `first_referrer` - URL referrer complète
- ❌ `last_activity_at` - Dernière activité
- ❌ `expires_at` - Expiration session
- ❌ `asn` - Numéro AS (provider internet)
- ❌ `asn_organization` - Nom provider (Bell, Videotron, Rogers)
- ❌ `timezone` - Timezone utilisateur
- ❌ `language` - Langue navigateur

### 📊 Telemetry `client_telemetry_events` (9 colonnes, 0 affichées)

- ❌ `id` - ID événement unique
- ❌ `session_id` - Référence session
- ❌ `trace_id` - Correlation serveur
- ❌ `event_type` - Type (page_view, click, form_start, etc.)
- ❌ `event_name` - Nom événement custom
- ❌ `page_url` - URL page (pathname)
- ❌ `referrer_url` - Referrer (redacted)
- ❌ `duration_ms` - Durée événement
- ❌ `payload` - Données JSONB custom
- ❌ `created_at` - Timestamp exact

---

## 🧮 MÉTRIQUES CALCULABLES (Pas encore implémentées)

### Conversion & Revenue
- ❌ **Conversion Rate** - conversions / sessions * 100
- ❌ **Revenue per Session** - totalRevenue / sessions
- ❌ **Revenue per User** - totalRevenue / totalUsers
- ❌ **Average Order Value** - totalRevenue / conversions

### Engagement
- ❌ **Pages per Session** - pageViews / sessions
- ❌ **Engaged Session Rate** - engagedSessions / sessions * 100
- ❌ **Event Rate** - eventCount / sessions
- ❌ **Scroll Depth Average** - (depuis payload events si trackés)

### Traffic Quality
- ❌ **New vs Returning** - newUsers vs (totalUsers - newUsers)
- ❌ **Multi-Session Users** - Utilisateurs avec > 1 session
- ❌ **Session Frequency** - Distribution fréquence visites
- ❌ **Time Between Sessions** - Délai moyen entre sessions

### Funnel Analysis
- ❌ **Entry Pages** - Pages d'entrée les plus fréquentes
- ❌ **Exit Pages** - Pages de sortie les plus fréquentes
- ❌ **Drop-off Points** - Où utilisateurs abandonnent
- ❌ **Conversion Funnel** - % passage entre étapes form

### Temporal Patterns
- ❌ **Peak Hours** - Heures de pointe par jour
- ❌ **Day of Week Distribution** - Volume par jour semaine
- ❌ **Session Duration Distribution** - Buckets durée
- ❌ **Time to Conversion** - Durée moyenne première visite → conversion

### Device & Tech
- ❌ **Device Breakdown** - % mobile vs desktop vs tablet
- ❌ **OS Market Share** - Distribution OS utilisateurs
- ❌ **Browser Market Share** - Distribution navigateurs
- ❌ **Screen Resolution Distribution** - Tailles écran populaires
- ❌ **Mobile Brand Share** - Apple vs Samsung vs autres

### Geographic
- ❌ **Province/Region Distribution** - Volume par province
- ❌ **City Heatmap** - Top 20 villes
- ❌ **ISP Analysis** - Top providers internet (Bell, Videotron, Rogers)
- ❌ **Language Distribution** - Langues navigateur

### Behavior Patterns
- ❌ **Click Heatmap Integration** - Overlay clics sur analytics IP
- ❌ **Rage Clicks** - Détection clics répétés rapides (frustration)
- ❌ **Dead Clicks** - Clics sur éléments non-interactifs
- ❌ **Quick Exits** - Sessions < 5s (probable bot)
- ❌ **Copy-Paste Behavior** - Détection paste dans forms

### UTM Campaign Performance
- ❌ **Campaign ROI** - Par source/medium/campaign
- ❌ **Channel Comparison** - Organic vs Paid vs Direct vs Referral
- ❌ **Campaign Conversion Rate** - Par campagne
- ❌ **Cost per Acquisition** - Si coût ads disponible

### Security & Anti-Fraud
- ❌ **Bot Evolution** - Trend bots dans temps
- ❌ **Anomaly Trend** - Évolution score anomalie
- ❌ **Blocked IPs** - Si firewall intégré
- ❌ **VPN/Proxy Detection** - ASN classification
- ❌ **Honeypot Hits** - Si honeypots implémentés

### Cohort Analysis
- ❌ **Retention by Cohort** - Rétention utilisateurs par cohorte acquisition
- ❌ **LTV by Cohort** - Lifetime value par cohorte
- ❌ **Churn Rate** - Taux abandon par période

---

## 📈 RÉCAPITULATIF

| Catégorie | Disponibles | Affichées | Non Affichées | % Affiché |
|-----------|-------------|-----------|---------------|-----------|
| **Stats Cards** | 8+ possibles | 4 | 4+ | 50% |
| **GA4 Metrics** | 10 | 0 | 10 | 0% |
| **GA4 Device Dims** | 7 | 3 | 4 | 43% |
| **GA4 Location Dims** | 3 | 2 | 1 | 67% |
| **GA4 Traffic Dims** | 3 | 0 | 3 | 0% |
| **GA4 Temporal Dims** | 1 | 0 | 1 | 0% |
| **Telemetry Sessions** | 21 | 7 | 14 | 33% |
| **Telemetry Events** | 9 | 0 | 9 | 0% |
| **Métriques Calculables** | 50+ | 3 | 47+ | 6% |

**TOTAL ESTIMÉ**: ~112 métriques disponibles, ~19 affichées = **17% utilisation**

---

## 🎯 OBJECTIF NOUVELLE VERSION

Créer un dashboard complet qui affiche:
- ✅ Toutes les métriques GA4 (10)
- ✅ Toutes les dimensions GA4 (14)
- ✅ Toutes les colonnes telemetry pertinentes (21 sessions + 9 events)
- ✅ Top 30 métriques calculables les plus utiles
- ✅ Organisation UX avec tabs/sections
- ✅ Graphiques timeline/charts
- ✅ Filtres avancés
- ✅ Export complet

**Target**: Passer de 17% → 85%+ utilisation des données disponibles

---

## 📋 PROCHAINES ÉTAPES

1. ✅ Créer cette checklist
2. ⏳ Refaire layout avec tabs organisation
3. ⏳ Ajouter toutes métriques GA4
4. ⏳ Ajouter toutes dimensions telemetry
5. ⏳ Implémenter métriques calculées prioritaires
6. ⏳ Ajouter graphiques timeline/charts
7. ⏳ Créer documentation avec screenshots avant/après

---

**Conclusion**: Actuellement, la page SEO Analytics utilise seulement **17% des données disponibles**. Une refonte complète permettra d'exploiter 85%+ des métriques pour des insights beaucoup plus profonds.
