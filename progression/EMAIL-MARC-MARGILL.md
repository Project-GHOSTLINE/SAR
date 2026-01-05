# Email pour Marc - Margill

---

**Objet:** Configuration webhook - Portail de progression clients Solution Argent Rapide

---

Bonjour Marc,

Nous avons mis en place un nouveau **portail de progression en temps réel** pour nos clients. Ce portail leur permet de suivre l'avancement de leur demande de financement directement via un lien sécurisé envoyé par SMS.

Pour que ce système fonctionne, nous avons besoin que **Margill nous envoie les changements de statuts** des dossiers automatiquement.

Voici toutes les informations techniques nécessaires pour la configuration.

---

## 🔗 Configuration du Webhook

### URL du webhook:
```
https://progression.solutionargentrapide.ca/api/webhook/margill
```

### Méthode:
```
POST
```

### Headers requis:
```
Content-Type: application/json
x-api-key: 44fc1f27922cc5e1e9c544eb8e0bbfeadf0d8c10c64c44fedcf3bd18f51e3202
```

---

## 📝 Format du payload JSON

### Payload complet (création d'un nouveau dossier):
```json
{
  "dossier_id": "12345",
  "statut_margill": "nouveau_dossier",
  "nom_client": "Jean Tremblay",
  "email_client": "jean.tremblay@example.com",
  "telephone_client": "+15141234567",
  "montant": 7500.00,
  "date_premier_paiement": "2026-02-15"
}
```

### Payload minimal (mise à jour de statut uniquement):
```json
{
  "dossier_id": "12345",
  "statut_margill": "offre_envoyee"
}
```

### Description des champs:

| Champ | Type | Requis | Description | Exemple |
|-------|------|--------|-------------|---------|
| `dossier_id` | String | ✅ Oui | Identifiant unique du dossier dans Margill | `"12345"` |
| `statut_margill` | String | ✅ Oui | Statut actuel du dossier (voir tableau ci-dessous) | `"offre_envoyee"` |
| `nom_client` | String | ❌ Non | Nom complet du client | `"Jean Tremblay"` |
| `email_client` | String | ❌ Non | Adresse email | `"jean@example.com"` |
| `telephone_client` | String | ❌ Non | Téléphone au format +1XXXXXXXXXX | `"+15141234567"` |
| `montant` | Number | ❌ Non | Montant du prêt en dollars | `7500.00` |
| `date_premier_paiement` | String | ❌ Non | Date du premier paiement (YYYY-MM-DD) | `"2026-02-15"` |

**Note:** Les champs optionnels sont surtout utiles lors de la **création initiale** d'un dossier. Pour les mises à jour de statut, seuls `dossier_id` et `statut_margill` sont nécessaires.

---

## 🗺️ Mapping des statuts

Voici les statuts que vous pouvez nous envoyer. Si vos statuts ont des noms différents, merci de nous le faire savoir pour qu'on adapte le mapping.

| Statut à envoyer | Affiché au client |
|------------------|-------------------|
| `nouveau_dossier` | ✅ Étape 1: Demande reçue |
| `en_attente_ibv` | ❌ (interne - pas affiché) |
| `ibv_completee` | ✅ Étape 2: IBV reçu |
| `analyse_en_cours` | ✅ Étape 3: Analyse du dossier |
| `offre_en_preparation` | ❌ (interne - pas affiché) |
| `offre_envoyee` | ✅ Étape 4: Offre envoyée |
| `offre_acceptee` | ✅ Étape 5: Offre approuvée |
| `contrat_en_preparation` | ❌ (interne - pas affiché) |
| `contrat_envoye` | ❌ (interne - pas affiché) |
| `en_attente_signature` | ✅ Étape 6: Signature requise |
| `contrat_signe` | ✅ Étape 7: Contrat signé |
| `transfert_de_fonds` | ❌ (interne - pas affiché) |
| `pret_actif` | ✅ Étape 8: Prêt actif |
| `refuse` | ❌ (masqué au client) |
| `sans_reponse` | ❌ (masqué au client) |

**Important:** Si vos statuts dans Margill ont des noms différents (ex: "Nouveau dossier" avec majuscule et espace), merci de nous envoyer la liste exacte pour qu'on ajuste le mapping.

---

## 🧪 Test de connexion

Voici une commande de test que tu peux exécuter pour vérifier que tout fonctionne:

### Test 1: Création d'un dossier test
```bash
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: 44fc1f27922cc5e1e9c544eb8e0bbfeadf0d8c10c64c44fedcf3bd18f51e3202" \
  -d '{
    "dossier_id": "TEST-123",
    "statut_margill": "nouveau_dossier",
    "nom_client": "Test Margill",
    "email_client": "test@margill.com",
    "telephone_client": "+15145551234",
    "montant": 5000.00
  }'
```

**Réponse attendue (succès):**
```json
{
  "success": true,
  "data": {
    "application_id": "MARGILL-TEST-123",
    "margill_status": "nouveau_dossier",
    "mapped_status": "RECEIVED",
    "message": "Dossier synchronisé avec succès"
  }
}
```

### Test 2: Mise à jour de statut
```bash
curl -X POST https://progression.solutionargentrapide.ca/api/webhook/margill \
  -H "Content-Type: application/json" \
  -H "x-api-key: 44fc1f27922cc5e1e9c544eb8e0bbfeadf0d8c10c64c44fedcf3bd18f51e3202" \
  -d '{
    "dossier_id": "TEST-123",
    "statut_margill": "offre_envoyee"
  }'
```

**Réponse attendue (succès):**
```json
{
  "success": true,
  "data": {
    "application_id": "MARGILL-TEST-123",
    "margill_status": "offre_envoyee",
    "mapped_status": "OFFER_SENT",
    "message": "Dossier synchronisé avec succès"
  }
}
```

---

## 🔧 Configuration dans Margill

Si Margill permet de configurer des webhooks automatiques:

1. **Ajoute un nouveau webhook** avec ces paramètres:
   - URL: `https://progression.solutionargentrapide.ca/api/webhook/margill`
   - Méthode: `POST`
   - Headers:
     - `Content-Type: application/json`
     - `x-api-key: 44fc1f27922cc5e1e9c544eb8e0bbfeadf0d8c10c64c44fedcf3bd18f51e3202`

2. **Événements à déclencher:**
   - Création d'un nouveau dossier
   - Changement de statut d'un dossier
   - Tout autre événement pertinent

3. **Format du payload:** Utilise le format JSON décrit ci-dessus

---

## ⚠️ Gestion des erreurs

### Erreur: `{"success": false, "error": "Non autorisé"}`
➡️ Vérifier que le header `x-api-key` est bien présent et correct

### Erreur: `{"success": false, "error": "dossier_id et statut_margill requis"}`
➡️ S'assurer que le payload JSON contient ces deux champs

### Erreur: `{"success": false, "error": "Statut Margill inconnu: ..."}`
➡️ Le statut envoyé n'est pas dans notre mapping. Nous contacter pour l'ajouter.

---

## 📞 Questions ou ajustements nécessaires?

Si tu as besoin d'aide pour:
- Configurer les webhooks dans Margill
- Ajuster le format du payload
- Ajouter d'autres statuts
- Tester l'intégration

N'hésite pas à me contacter.

---

## ✅ Checklist de déploiement

- [ ] Tester la connexion avec les commandes de test ci-dessus
- [ ] Vérifier que les réponses sont bien `"success": true`
- [ ] Configurer les webhooks dans Margill (si disponible)
- [ ] Confirmer la liste des statuts Margill
- [ ] Tester avec 2-3 vrais dossiers
- [ ] Valider que les données apparaissent correctement dans notre système

---

Merci et n'hésite pas si tu as des questions!

Cordialement,
Solution Argent Rapide
