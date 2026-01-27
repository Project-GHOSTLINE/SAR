# Documentation: Linkage Sessions → Clients avec Vérification de Cohérence

**Date**: 2026-01-27
**Feature**: Onglet "Clients Liés" dans Analytics SEO
**Endpoints**: `/api/analytics/linked-sessions`

---

## 🎯 OBJECTIF

Relier les données analytics (IP, localisation, sessions, device, trafic) aux dossiers clients réels et vérifier la cohérence des données pour détecter les anomalies et assurer l'intégrité des informations.

---

## 📊 NOUVEL ONGLET: "Clients Liés"

### Localisation
`/admin/seo/analytics` → Onglet "Clients Liés"

### Fonctionnalités

#### 1. Stats Cards (4 KPIs)
- **Sessions Liées**: Nombre total de sessions liées à des clients + nombre de clients uniques
- **Cohérence Excellente**: Sessions avec score 90-100
- **À Surveiller**: Sessions avec score < 70 (préoccupant + critique)
- **Score Moyen**: Score de cohérence moyen sur toutes les sessions

#### 2. Filtres
- **Recherche**: Par nom client, email ou session ID
- **Statut de cohérence**: All / Excellent / Good / Concerning / Critical
- **Compteur de résultats**: Affichage dynamique

#### 3. Table des Sessions Liées

**Colonnes**:
- **Client**: Nom, email, adresse (ville/province)
- **Session ID**: ID de session tronqué (16 premiers chars)
- **Lié via**: Badge coloré indiquant la méthode de linkage
  - `form_submit` (bleu)
  - `magic_link` (violet)
  - `login` (vert)
  - `contact_form` (gris)
- **Date Lien**: Date et heure de la liaison session → client
- **Device**: Catégorie device + navigateur
- **UTM Source**: Source marketing / medium
- **Cohérence**:
  - Barre de progression avec score (0-100)
  - Flags d'anomalies (max 2 affichés + compteur)
  - Coloration de la ligne selon criticité

**Coloration des lignes**:
- ✅ Normal: Fond blanc
- ⚠️ Préoccupant: Fond orange clair
- 🚨 Critique: Fond rouge clair

---

## 🔍 VÉRIFICATIONS DE COHÉRENCE

### Score de Cohérence (0-100)

Le score démarre à 100 et est diminué selon les incohérences détectées:

| Vérification | Pénalité | Description |
|--------------|----------|-------------|
| **Client manquant** | -50 | Le `client_id` référencé n'existe pas dans la table `clients` |
| **Device incomplet** | -10 | `device_type` est NULL ou 'unknown' |
| **Location mismatch** | -15 | La ville de session ne correspond pas à l'adresse du client |
| **Linkage invalide** | -20 | `linked_via` n'est pas dans la liste des méthodes valides |
| **Incohérence temporelle** | -30 | La date de linkage est AVANT la date de création de session (impossible) |
| **Délai long (30+ jours)** | -5 | Linkage effectué plus de 30 jours après la première visite |
| **Email mismatch** | -25 | Email dans métadonnées session ≠ email du client |
| **IP hash manquant** | -5 | Pas d'IP hash pour la détection de fraude |

### Statuts de Cohérence

| Status | Score | Couleur | Action |
|--------|-------|---------|--------|
| **Excellent** | 90-100 | Vert | Aucune action requise |
| **Good** | 70-89 | Bleu | Surveiller si récurrent |
| **Concerning** | 50-69 | Orange | Vérifier manuellement |
| **Critical** | 0-49 | Rouge | Investigation immédiate requise |

---

## 🔗 API ENDPOINT

### GET `/api/analytics/linked-sessions`

**Description**: Récupère toutes les sessions liées aux clients avec vérification de cohérence automatique.

**Authentification**: Requise (admin session)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "session_id": "64-char-hex",
      "client_id": "uuid",
      "linked_via": "form_submit",
      "linked_at": "2026-01-27T10:30:00Z",
      "created_at": "2026-01-25T14:20:00Z",
      "device_type": "mobile",
      "browser": "Chrome",
      "os": "iOS",
      "first_utm_source": "google",
      "first_utm_medium": "cpc",
      "first_utm_campaign": "promo-2026",
      "client": {
        "id": "uuid",
        "first_name": "Jean",
        "last_name": "Tremblay",
        "primary_email": "jean@example.com",
        "primary_phone": "+15141234567",
        "status": "active",
        "address_city": "Montreal",
        "address_province": "QC"
      },
      "coherence": {
        "score": 95,
        "flags": [],
        "status": "excellent"
      }
    }
  ],
  "stats": {
    "total_linked_sessions": 145,
    "unique_clients": 87,
    "linkage_methods": {
      "form_submit": 120,
      "magic_link": 15,
      "login": 8,
      "contact_form": 2
    },
    "coherence_distribution": {
      "excellent": 130,
      "good": 10,
      "concerning": 3,
      "critical": 2
    },
    "avg_coherence_score": 94.2
  }
}
```

---

## 📋 TABLES IMPLIQUÉES

### `client_sessions`
- **Colonne clé**: `client_id` (UUID, FK vers `clients.id`)
- **Colonnes analysées**:
  - `session_id`, `device_type`, `browser`, `os`
  - `first_utm_source`, `first_utm_medium`, `first_utm_campaign`
  - `linked_via`, `linked_at`, `created_at`
  - `ip_hash`, `meta` (JSONB)

### `clients`
- **Colonnes utilisées**:
  - Identification: `id`, `first_name`, `last_name`
  - Contact: `primary_email`, `primary_phone`
  - Adresse: `address_city`, `address_province`, `address_postal_code`
  - Status: `status`

---

## 🚀 CAS D'USAGE

### 1. Détection de Fraude
**Scénario**: Client avec plusieurs sessions de localisations géographiques très éloignées en peu de temps.

**Flags détectés**:
- 📍 Location mismatch: Session (Vancouver) vs Client (Montreal)
- ⏰ Temporal inconsistency (si les sessions sont à quelques heures d'intervalle)

**Action**: Investigation manuelle, vérifier IP, device fingerprint, demander vérification 2FA.

### 2. Validation de Données Client
**Scénario**: Adresse client incorrecte ou obsolète.

**Flags détectés**:
- 📍 Location mismatch: Session (Toronto) vs Client (Montreal)

**Action**: Contacter le client pour mettre à jour l'adresse.

### 3. Analyse de Parcours Client
**Scénario**: Comprendre comment un client a trouvé le service.

**Données disponibles**:
- UTM Source/Medium/Campaign
- Linked via (form_submit indique conversion directe)
- Device utilisé lors de la conversion

**Action**: Optimiser les campagnes marketing performantes.

### 4. Support Client
**Scénario**: Client rapporte un problème technique.

**Données disponibles**:
- Device type, browser, OS version
- Pages visitées avant le problème
- Timeline complète des sessions

**Action**: Reproduire le bug dans l'environnement identique.

---

## 📈 MÉTRIQUES DE SUCCÈS

### KPIs à Surveiller

1. **Taux de Linkage**
   - Formule: `sessions_linked / total_sessions * 100`
   - Cible: >30% (indique un bon taux de conversion)

2. **Score Moyen de Cohérence**
   - Cible: >90 (excellente qualité de données)
   - Alerte si < 70 (problèmes de qualité)

3. **Distribution des Statuts**
   - Excellent: >80% des sessions
   - Critical: <5% des sessions

4. **Méthodes de Linkage**
   - `form_submit` devrait être majoritaire (conversion directe)
   - `magic_link` indique retour utilisateur existant
   - `login` indique réactivation compte

---

## 🔒 PRIVACY & SÉCURITÉ

### Données Sensibles

- ✅ **IP Hash**: SHA256, non réversible, TTL 30j
- ✅ **Session ID**: Pseudonyme, pas de PII
- ✅ **Client linkage**: Volontaire uniquement (form submit, login, magic link)

### Compliance

- ✅ **GDPR**: Linkage volontaire, pas de tracking sans consentement
- ✅ **Retention**: Sessions 90j, IP hash 30j, client data permanent
- ✅ **Right to be forgotten**: Cascade delete via FK constraints

---

## 🛠️ MAINTENANCE

### Cleanup Automatique

Fonction: `cleanup_client_sessions()`

**Exécution**: Quotidienne via cron job `/api/cron/cleanup-sessions`

**Actions**:
1. Supprime sessions expirées (`expires_at < now()`)
2. Supprime events > 30 jours
3. Efface IP/UA hash après 30 jours (`last_activity_at < now() - 30d`)

### Monitoring

**Alertes à configurer**:
- Score cohérence moyen < 70 pendant 7 jours
- Nombre de sessions "critical" > 10% du total
- Client manquant (FK violation) > 5 cas

---

## 📝 EXEMPLES DE REQUÊTES

### Trouver sessions incohérentes pour un client
```sql
SELECT
  cs.session_id,
  cs.linked_at,
  cs.device_type,
  cs.first_utm_source,
  c.first_name,
  c.primary_email
FROM client_sessions cs
JOIN clients c ON cs.client_id = c.id
WHERE cs.client_id = '<uuid>'
  AND cs.created_at < cs.linked_at - INTERVAL '30 days';
```

### Top 10 clients avec le plus de sessions
```sql
SELECT
  c.first_name,
  c.last_name,
  c.primary_email,
  COUNT(cs.id) as session_count
FROM clients c
JOIN client_sessions cs ON c.id = cs.client_id
GROUP BY c.id, c.first_name, c.last_name, c.primary_email
ORDER BY session_count DESC
LIMIT 10;
```

---

## 🎉 RÉSUMÉ

Cette feature permet de:
- ✅ Relier les analytics anonymes aux dossiers clients réels
- ✅ Détecter les incohérences de données automatiquement
- ✅ Valider l'intégrité des informations client
- ✅ Identifier les tentatives de fraude
- ✅ Optimiser les campagnes marketing
- ✅ Améliorer le support client avec contexte complet

**Status**: ✅ Opérationnel en production

**Prochaines étapes**:
1. ⏳ Ajouter graphiques timeline des sessions par client
2. ⏳ Ajouter export CSV enrichi
3. ⏳ Ajouter alertes automatiques pour scores critiques
4. ⏳ Intégrer au tableau de bord client individuel

---

**Documentation complétée**: 2026-01-27
**Par**: Claude Sonnet 4.5
