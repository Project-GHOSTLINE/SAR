# 🔍 Dashboard de Debug - Guide d'utilisation

## 🌐 Accès au Dashboard

**URL:** https://progression.solutionargentrapide.ca/debug

**Clé API:** `FredRosa%1978`

---

## 📊 Fonctionnalités

### 1. Vue d'ensemble (Overview)

Affiche les statistiques globales:

- **Applications par statut** - Nombre de dossiers à chaque étape
- **Applications par origine** - Répartition Site Web vs Margill vs autres
- **Statistiques en temps réel** - Compteurs actualisés

### 2. Applications

Liste de tous les dossiers créés:

| Colonne | Description |
|---------|-------------|
| ID | Identifiant unique (ex: MARGILL-12345, TEST-2026-001) |
| Client | Nom du client |
| Email | Adresse email |
| Montant | Montant du prêt en $ |
| Statut | Statut actuel (RECEIVED, IBV_COMPLETED, etc.) |
| Origine | Source du dossier (Margill, Site Web, etc.) |
| Créé | Date de création |

### 3. Événements (Webhooks)

Liste de tous les webhooks/événements reçus:

- **Type d'événement** - status_change, margill_status_change, etc.
- **Application ID** - Dossier concerné
- **Payload complet** - Données JSON reçues
- **Date/heure** - Timestamp précis

**Utilité:** Débugger les appels Margill, voir exactement ce qui est reçu

### 4. Magic Links

Liste de tous les liens sécurisés générés:

| Colonne | Description |
|---------|-------------|
| Application | Dossier lié |
| Utilisations | Nombre d'ouvertures (ex: 3/20) |
| Expiration | Date limite d'utilisation |
| Statut | Actif, Expiré, Révoqué, Max atteint |
| Créé | Date de génération |

**Codes couleur:**
- 🟢 **Actif** - Fonctionne normalement
- 🔴 **Expiré** - Plus de 48h
- ⚫ **Révoqué** - Désactivé manuellement
- 🟠 **Max atteint** - 20 utilisations atteintes

### 5. Notes

Messages envoyés aux clients:

- Application concernée
- Contenu du message
- Date d'ajout

---

## 🔄 Rafraîchissement

Cliquer sur le bouton **"Rafraîchir"** en haut à droite pour:
- Recharger toutes les données
- Voir les derniers événements
- Mettre à jour les statistiques

---

## 📈 Cas d'usage

### Debug d'intégration Margill

1. **Vérifier qu'un webhook a été reçu:**
   - Aller dans l'onglet **Événements**
   - Chercher `margill_status_change`
   - Voir le payload exact envoyé par Margill

2. **Vérifier la création d'un dossier:**
   - Onglet **Applications**
   - Chercher l'ID du dossier (ex: MARGILL-12345)
   - Vérifier le statut mappé

3. **Vérifier qu'un magic link a été généré:**
   - Onglet **Magic Links**
   - Chercher par application ID
   - Vérifier qu'il est actif

### Monitoring général

1. **Voir la répartition des dossiers:**
   - Onglet **Vue d'ensemble**
   - Section "Par Statut"
   - Identifier les goulots d'étranglement

2. **Suivre l'activité:**
   - Onglet **Événements**
   - Trier par date (plus récents en premier)
   - Voir le flux d'activité en temps réel

### Dépannage

1. **Magic link ne fonctionne pas:**
   - Onglet **Magic Links**
   - Vérifier le statut (expiré? révoqué?)
   - Vérifier les utilisations (max atteint?)

2. **Statut ne se met pas à jour:**
   - Onglet **Événements**
   - Vérifier si l'événement a bien été reçu
   - Vérifier le payload pour erreurs

3. **Client ne reçoit pas de message:**
   - Onglet **Notes**
   - Vérifier si la note a été créée
   - Vérifier l'application ID

---

## 🧪 Tests avec le Dashboard

### Scénario 1: Tester un webhook Margill

```bash
# 1. Envoyer un webhook de test
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "dossier_id": "DEBUG-001",
    "statut_margill": "nouveau_dossier",
    "nom_client": "Test Debug",
    "email_client": "debug@test.com",
    "telephone_client": "+15140000000",
    "montant": 1000.00
  }'

# 2. Rafraîchir le dashboard
# 3. Vérifier dans "Événements" → doit voir margill_status_change
# 4. Vérifier dans "Applications" → doit voir MARGILL-DEBUG-001
```

### Scénario 2: Tester un magic link

```bash
# 1. Générer un magic link
curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{
    "application_id": "MARGILL-DEBUG-001",
    "phone": "+15140000000"
  }'

# 2. Rafraîchir le dashboard
# 3. Onglet "Magic Links" → doit voir le nouveau lien
# 4. Statut doit être "Actif" (vert)
# 5. Utilisations: 0/20
```

### Scénario 3: Cycle complet

```bash
# 1. Créer un dossier
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{"dossier_id":"CYCLE-001","statut_margill":"nouveau_dossier","nom_client":"Cycle Test","email_client":"cycle@test.com","telephone_client":"+15140001111","montant":5000.00}'

# 2. Mettre à jour le statut
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{"dossier_id":"CYCLE-001","statut_margill":"offre_envoyee"}'

# 3. Ajouter une note
curl -X POST https://progression.solutionargentrapide.ca/api/admin/note \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{"application_id":"MARGILL-CYCLE-001","message":"Votre offre est prête!"}'

# 4. Générer magic link
curl -X POST https://progression.solutionargentrapide.ca/api/admin/magic-link \
  -H "Content-Type: application/json" \
  -H "x-api-key: FredRosa%1978" \
  -d '{"application_id":"MARGILL-CYCLE-001","phone":"+15140001111"}'

# 5. Vérifier dans le dashboard:
# - Applications: MARGILL-CYCLE-001 avec statut OFFER_SENT
# - Événements: 2 événements (création + mise à jour)
# - Notes: 1 note
# - Magic Links: 1 lien actif
```

---

## 📊 Statistiques en temps réel

Le dashboard affiche automatiquement:

### Compteurs globaux (en haut)
- Nombre total d'applications
- Nombre total d'événements reçus
- Magic links actifs / total
- Nombre de notes

### Répartition par statut
- RECEIVED - Demande reçue
- IBV_COMPLETED - IBV reçu
- ANALYSIS_IN_PROGRESS - Analyse en cours
- OFFER_SENT - Offre envoyée
- Etc.

### Répartition par origine
- Margill
- Site Web
- Test
- Autres

---

## 🔒 Sécurité

- ✅ Authentification par clé API requise
- ✅ Même clé que les autres endpoints admin
- ✅ Accès lecture seule (aucune modification possible)
- ✅ Limite à 100 entrées par requête

---

## 💡 Astuces

1. **Garder le dashboard ouvert pendant les tests**
   - Rafraîchir après chaque webhook
   - Vérifier en temps réel

2. **Utiliser l'onglet Événements pour débugger**
   - Payload complet visible
   - Timestamp précis
   - Type d'événement clair

3. **Vérifier les magic links avant d'envoyer aux clients**
   - S'assurer qu'ils sont actifs
   - Vérifier la date d'expiration

4. **Surveiller la répartition par statut**
   - Identifier les blocages
   - Voir où sont les dossiers

---

## 🚀 Prochaines améliorations possibles

- [ ] Graphiques temps réel
- [ ] Filtres et recherche
- [ ] Export CSV
- [ ] Alertes automatiques
- [ ] Logs en streaming

---

**Le dashboard est opérationnel et prêt à l'emploi!** 🎉
