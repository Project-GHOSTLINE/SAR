# Documentation: Métriques Unifiées Client avec Vérification de Cohérence Globale

**Date**: 2026-01-27
**Feature**: Merger TOUTES les données clients depuis toutes les sources
**Page**: `/admin/client-coherence`
**Endpoint**: `/api/analytics/client-unified-metrics`

---

## 🎯 OBJECTIF

Créer une **vue unifiée 360°** d'un client en mergeant TOUTES ses données depuis TOUTES les sources de l'application, puis effectuer des **vérifications de cohérence globales** pour détecter les incohérences, fraudes potentielles, et assurer l'intégrité des données.

---

## 📊 SOURCES DE DONNÉES MERGÉES

### 8 Sources Principales

| Source | Table | Données Récupérées |
|--------|-------|-------------------|
| 1. **Profil Client** | `clients` | Info personnelle, adresse, status |
| 2. **Messages Contact** | `contact_messages` | Formulaires de contact reçus |
| 3. **Applications Prêt** | `loan_applications` | Demandes de financement |
| 4. **Transactions VoPay** | `vopay_transactions` | Paiements, virements bancaires |
| 5. **Tickets Support** | `support_tickets` | Demandes d'assistance |
| 6. **Emails** | `email_messages` | Correspondances email |
| 7. **Sessions Analytics** | `client_sessions` | Sessions web, device, UTM tracking |
| 8. **Events Telemetry** | `client_telemetry_events` | Événements comportementaux |

---

## 🔍 VÉRIFICATIONS DE COHÉRENCE (11 CHECKS)

### Score de Cohérence Globale (0-100)

Le système effectue **11 vérifications automatiques** et calcule un score de cohérence:

| # | Vérification | Pénalité | Description |
|---|-------------|----------|-------------|
| 1 | **Email Consistency** | -20 | Détecte si plusieurs emails différents sont utilisés à travers les sources |
| 2 | **Phone Consistency** | -15 | Détecte si plusieurs téléphones différents sont utilisés |
| 3 | **Name Consistency** | -15 | Détecte si plusieurs noms différents sont utilisés |
| 4 | **Location Consistency** | -10 | Compare la ville des sessions analytics vs l'adresse client |
| 5 | **Device Diversity** | -5 | Alerte si > 5 combinaisons device/browser/OS différentes |
| 6 | **Temporal Anomalies** | -25 | Détecte les activités avant la date de création client (impossible) |
| 7 | **Application-Session Link** | -10 | Détecte les applications sans sessions analytics correspondantes |
| 8 | **Message Email Mismatch** | -15 | Détecte les messages avec email différent du client |
| 9 | **VoPay Email Mismatch** | -20 | Détecte les transactions VoPay avec email différent |
| 10 | **IP Diversity** | -5 | Alerte si > 10 IP uniques (potentiel partage de compte) |
| 11 | **UTM Source Tracking** | -0 | Analyse la diversité des sources marketing (informatif) |

### Statuts de Cohérence

| Status | Score | Couleur | Signification | Action |
|--------|-------|---------|---------------|--------|
| **Excellent** | 90-100 | Vert | Données parfaitement cohérentes | Aucune action |
| **Good** | 70-89 | Bleu | Petites incohérences bénignes | Surveiller |
| **Concerning** | 50-69 | Orange | Incohérences significatives | Vérifier manuellement |
| **Critical** | 0-49 | Rouge | Incohérences majeures / Fraude potentielle | Investigation immédiate |

---

## 🚀 PAGE ADMIN: `/admin/client-coherence`

### Interface

#### 1. Barre de Recherche
- Input pour entrer l'ID client (UUID)
- Bouton "Analyser Client" avec loader
- Messages d'erreur si client non trouvé

#### 2. Profil Client (Aperçu)
- Nom complet
- Email + téléphone
- Adresse (ville, province)
- Badge de status (active/inactive)

#### 3. Score de Cohérence (BIG Display)
- **Score géant** (0-100) avec couleur dynamique
- **Statut** (EXCELLENT/GOOD/CONCERNING/CRITICAL)
- **Nombre de checks** effectués (11)
- **Liste des anomalies** détectées (si présentes)
  - Chaque flag affiché dans une box
  - Emoji + description détaillée
- **Check mark** si aucune anomalie

#### 4. Métriques Grid (8 Cards)
- Messages Contact: Nombre total
- Applications: Nombre total
- Transactions VoPay: Nombre total
- Sessions Analytics: Nombre total
- Tickets Support: Nombre total
- Emails: Nombre total
- Events Telemetry: Nombre total
- Score Engagement: 0-100

#### 5. Summary Cards (3 Cards)
- **Total Interactions**: Messages + Sessions + Applications + Tickets
- **Complétude Données**: Pourcentage de champs profile remplis
- **Risque Profil**: HIGH/LOW basé sur cohérence

#### 6. Timeline
- Première interaction (date)
- Dernière activité (date)
- Ligne horizontale entre les deux

#### 7. Sources de Données
- Liste des 8 sources avec nombre d'enregistrements
- Fond bleu clair avec grille 4x2

---

## 🔗 API ENDPOINT

### GET `/api/analytics/client-unified-metrics`

**Paramètres**:
- `client_id` (required): UUID du client

**Response** (200 OK):
```json
{
  "success": true,
  "client_id": "uuid",
  "metrics": {
    "client_name": "Jean Tremblay",
    "client_email": "jean@example.com",
    "client_phone": "+15141234567",
    "client_status": "active",
    "client_address": {
      "line1": "123 Rue Example",
      "city": "Montreal",
      "province": "QC",
      "postal_code": "H1A 1A1"
    },
    "total_contact_messages": 3,
    "total_support_tickets": 1,
    "total_email_messages": 5,
    "total_applications": 2,
    "total_vopay_transactions": 4,
    "total_sessions": 12,
    "total_telemetry_events": 45,
    "first_contact_date": "2026-01-10T10:30:00Z",
    "last_activity_date": "2026-01-27T15:45:00Z",
    "engagement_score": 85
  },
  "coherence": {
    "score": 95,
    "status": "excellent",
    "flags": [],
    "checks_performed": 11
  },
  "summary": {
    "total_interactions": 18,
    "total_transactions": 4,
    "data_completeness": 100,
    "profile_risk": "low"
  },
  "data_sources": {
    "client": { ... },
    "contact_messages": [ ... ],
    "applications": [ ... ],
    "vopay_transactions": [ ... ],
    "support_tickets": [ ... ],
    "email_messages": [ ... ],
    "analytics_sessions": [ ... ],
    "telemetry_events": [ ... ]
  }
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Client not found"
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "client_id parameter required"
}
```

---

## 📈 MÉTRIQUES CALCULÉES

### Engagement Score (0-100)

Formule pondérée:
```typescript
score =
  (messages × 10) +        // 10 points par message
  (applications × 25) +    // 25 points par application
  (sessions × 2) +         // 2 points par session
  (support_tickets × 5)    // 5 points par ticket support

// Cap à 100
return Math.min(100, score)
```

**Interprétation**:
- 0-25: Engagement très faible
- 26-50: Engagement modéré
- 51-75: Engagement élevé
- 76-100: Engagement excellent

### Data Completeness (%)

Champs vérifiés (9 total):
1. `first_name`
2. `last_name`
3. `primary_email`
4. `primary_phone`
5. `dob` (date of birth)
6. `address_line1`
7. `address_city`
8. `address_province`
9. `address_postal_code`

```typescript
completeness = (filled_fields / 9) × 100
```

---

## 🚨 CAS D'USAGE CRITIQUES

### 1. Détection de Fraude Multi-Comptes

**Scénario**: Un fraudeur crée plusieurs comptes avec des variations de nom/email.

**Flags Détectés**:
- 📧 Multiple emails detected
- 👤 Multiple names detected
- 📍 Location mismatch (IPs de plusieurs provinces)
- 🌐 High IP diversity (> 10 IPs)

**Score**: < 50 (CRITICAL)

**Action**: Investigation immédiate, vérification 2FA, possib blocage temporaire.

### 2. Erreur de Saisie Données

**Scénario**: Client a fait une typo dans son nom lors d'une application.

**Flags Détectés**:
- 👤 Multiple names detected: "Jean Tremblay" vs "Jen Tremblay"

**Score**: 85 (GOOD)

**Action**: Contacter client pour corriger, fusion des données.

### 3. Changement d'Adresse Non Mis à Jour

**Scénario**: Client a déménagé mais n'a pas mis à jour son profil.

**Flags Détectés**:
- 📍 Location mismatch: Sessions from Toronto, client in Montreal

**Score**: 90 (EXCELLENT)

**Action**: Suggérer au client de mettre à jour son adresse.

### 4. Compte Partagé (Famille)

**Scénario**: Plusieurs membres d'une famille utilisent le même compte.

**Flags Détectés**:
- 📱 High device diversity (5+ devices)
- 🌐 High IP diversity (10+ IPs)
- 📍 Location mismatch (plusieurs villes)

**Score**: 75 (GOOD)

**Action**: Suggestion de créer des comptes individuels.

### 5. Activité Avant Création Compte (Bug)

**Scénario**: Bug dans le système a créé des timestamps invalides.

**Flags Détectés**:
- ⏰ 3 activities before client creation date

**Score**: 75 (GOOD)

**Action**: Correction des timestamps dans la DB.

---

## 🛠️ MAINTENANCE & MONITORING

### Queries Utiles

#### Trouver tous les clients avec score < 70
```sql
-- Via API call en boucle (pas de table dédiée pour scores)
-- Recommandation: Créer table `client_coherence_scores` avec cron daily
```

#### Analyser un client spécifique
```bash
curl "https://admin.solutionargentrapide.ca/api/analytics/client-unified-metrics?client_id=<uuid>" \
  -H "Cookie: admin-session=xxx" \
  | jq '.coherence'
```

#### Statistiques d'engagement
```sql
-- Calculer manuellement avec RPC ou créer vue matérialisée
CREATE MATERIALIZED VIEW client_engagement_scores AS
SELECT
  c.id,
  c.primary_email,
  (
    (SELECT COUNT(*) FROM contact_messages WHERE client_email = c.primary_email) * 10 +
    (SELECT COUNT(*) FROM loan_applications WHERE client_id = c.id) * 25 +
    (SELECT COUNT(*) FROM client_sessions WHERE client_id = c.id) * 2 +
    (SELECT COUNT(*) FROM support_tickets WHERE client_id = c.id) * 5
  ) AS engagement_score
FROM clients c;
```

### Alertes Recommandées

1. **Alert Critical Coherence**
   - Trigger: Score < 50
   - Notification: Email admin + Slack
   - Fréquence: Temps réel

2. **Alert High Risk Profile**
   - Trigger: `profile_risk = 'high'` + applications actives
   - Notification: Email équipe fraude
   - Fréquence: Daily batch

3. **Alert Data Quality**
   - Trigger: `data_completeness < 70%`
   - Notification: Email client pour compléter profil
   - Fréquence: Weekly

---

## 📊 TABLEAUX DE BORD RECOMMANDÉS

### Dashboard Admin - Vue Globale

**Métriques Agrégées**:
- Nombre total de clients analysés aujourd'hui
- Distribution des scores de cohérence (excellent/good/concerning/critical)
- Top 10 clients avec score le plus faible
- Top 10 clients avec engagement le plus élevé

**Graphiques**:
- Timeline: Évolution moyenne du score de cohérence
- Pie chart: Distribution des statuts
- Bar chart: Top anomalies détectées

---

## 🔒 PRIVACY & SÉCURITÉ

### Données Sensibles Exposées

- ✅ **Emails**: Visibles (nécessaire pour support)
- ✅ **Téléphones**: Visibles (nécessaire pour support)
- ⚠️ **IP hashes**: Agrégées seulement (pas d'IP brutes)
- ✅ **Dates**: Toutes visibles (audit trail)

### Accès Restreint

- **Endpoint**: Requiert authentification admin
- **Page**: Accessible uniquement via `/admin/*`
- **Logs**: Toutes les requêtes sont loguées

### Compliance GDPR

- ✅ **Consent**: Données collectées avec consentement client
- ✅ **Purpose**: Cohérence = sécurité + qualité de service
- ✅ **Right to access**: Client peut demander rapport complet
- ✅ **Right to rectification**: Client peut corriger via profil
- ✅ **Retention**: Respecte les TTL définis (90j sessions, 30j events)

---

## 🎉 RÉSUMÉ

Cette feature permet de:
- ✅ Merger 8 sources de données en une vue unifiée
- ✅ Calculer 11 vérifications de cohérence automatiques
- ✅ Détecter les fraudes multi-comptes
- ✅ Identifier les erreurs de saisie
- ✅ Scorer l'engagement client
- ✅ Évaluer la complétude des données
- ✅ Prioriser les investigations (risk = high)

**Status**: ✅ Opérationnel en production

**Prochaines étapes**:
1. ⏳ Créer table `client_coherence_scores` avec historique
2. ⏳ Cron job quotidien pour calculer scores de tous les clients
3. ⏳ Dashboard agrégé avec KPIs globaux
4. ⏳ Alertes automatiques pour scores critiques
5. ⏳ Export CSV avec tous les clients + scores

---

**Documentation complétée**: 2026-01-27
**Par**: Claude Sonnet 4.5
**Révision**: 1.0
