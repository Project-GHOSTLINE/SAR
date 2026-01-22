# Configuration des Webhooks VoPay

## 🚀 Configuration automatique (Recommandé)

Au lieu de remplir manuellement les 16 webhooks, utilisez le script de configuration automatique:

```bash
# Configurer tous les webhooks VoPay en une seule commande
npm run webhook:configure

# Tester que tous les endpoints sont accessibles
npm run webhook:test
```

Le script va automatiquement:
- ✅ Configurer les 16 webhooks via l'API VoPay
- ✅ Vérifier chaque configuration
- ✅ Afficher un rapport de réussite/échec

## 📝 Configuration manuelle (Alternative)

Si vous préférez configurer manuellement, connectez-vous sur `admin.solutionargentrapide.ca` et allez dans l'onglet VoPay > Manage Webhook.

### Webhooks configurés

| Événement | URL du Webhook | Description |
|-----------|---------------|-------------|
| **Transaction Status** | `https://api.solutionargentrapide.ca/api/webhooks/vopay` | ✅ Statut des transactions (paiements, remboursements) |
| **eLinx Status** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/elinx` | Connexion bancaire via eLinx |
| **Account Status** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/account-status` | Changements de statut de compte |
| **Batch Requests** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/batch` | Traitement de lots de transactions |
| **Bank Account Creation** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/bank-account` | Création de compte bancaire |
| **Batch Detail** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/batch-detail` | Détails d'échec de transactions dans un lot |
| **Scheduled Transaction** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/scheduled` | Transactions planifiées créées |
| **Account Verification** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/account-verification` | Vérification de compte (micro-dépôts, instant) |
| **Transaction Group** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/transaction-group` | Groupes de transactions traités |
| **Account Balance** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/account-balance` | Alerte de solde bas (compte principal) |
| **Client Account Balance** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/client-account-balance` | Alerte de solde bas (compte client) |
| **Payment Received** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/payment-received` | Paiements entrants reçus |
| **Account Limit** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/account-limit` | Dépassement de limites de transaction |
| **Virtual Accounts** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/virtual-accounts` | Transactions de comptes virtuels |
| **Credit Card Connection** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/credit-card` | Connexion de carte de crédit |
| **Debit Card Connection** | `https://api.solutionargentrapide.ca/api/webhooks/vopay/debit-card` | Connexion de carte de débit |

## Vérification des endpoints

Chaque endpoint possède une route GET pour vérifier qu'il est en ligne:

```bash
# Transaction Status
curl https://api.solutionargentrapide.ca/api/webhooks/vopay

# eLinx Status
curl https://api.solutionargentrapide.ca/api/webhooks/vopay/elinx

# Account Status
curl https://api.solutionargentrapide.ca/api/webhooks/vopay/account-status

# etc...
```

Tous devraient retourner un JSON avec `status: "online"`.

## Sécurité

Tous les webhooks VoPay sont sécurisés avec:
- ✅ Validation de signature HMAC SHA1
- ✅ Variable d'environnement `VOPAY_SHARED_SECRET`
- ✅ Logging dans `webhook_logs` table
- ✅ Stockage dans `vopay_objects` table

## Traçabilité

Chaque webhook est automatiquement enregistré dans:

1. **webhook_logs** - Log brut de tous les webhooks reçus
   - `provider`: 'vopay'
   - `event_type`: Type d'événement
   - `payload`: Données brutes
   - `status`: 'received', 'processed', 'error'

2. **vopay_objects** - Objets VoPay structurés
   - `vopay_id`: ID unique de l'objet
   - `object_type`: Type d'objet (transaction, elinx, batch, etc.)
   - `status`: Statut actuel
   - `metadata`: Métadonnées structurées
   - `raw_data`: Données brutes du webhook

## Test des webhooks

VoPay permet de tester les webhooks depuis leur dashboard:
1. Allez dans l'onglet Developer > Webhooks
2. Cliquez sur "Test Webhook"
3. Sélectionnez le type d'événement
4. Vérifiez la réponse 200 OK

## Documentation complète

- [VoPay Events Documentation](https://docs.vopay.com/docs/events)
- [VoPay Webhooks Reference](https://docs.vopay.com/reference/accountwebhooksget)
- [Flinks Documentation](https://docs.flinks.com/api-home)
- [Flinks Webhooks](https://docs.flinks.com/reference/webhooks)

## Notes d'implémentation

### Transaction Status (Principal)
- Gère les paiements réussis/échoués
- Crée automatiquement des `payment_events`
- Met à jour les `payment_installments`
- Supporte les événements NSF

### eLinx Status
- Stocke les tokens de compte bancaire
- Enregistre les informations institutionnelles
- Gère les connexions réussies/échouées

### Batch Processing
- Suivi des lots de transactions
- Gestion des échecs individuels
- Statistiques de traitement

### Scheduled Transactions
- Gestion des paiements récurrents
- Suivi des fréquences de paiement
- Historique des transactions planifiées

### Account Verification
- Vérification instantanée ou par micro-dépôts
- Mise à jour automatique du statut des comptes
- Compteur de tentatives

### Balance Alerts
- Alertes de solde bas
- Notifications admin à implémenter
- Seuils configurables

### Card Connections
- Stockage sécurisé des tokens de carte
- Masquage des numéros de carte
- Support crédit et débit

## TODO

- [ ] Implémenter les notifications admin pour les alertes critiques
- [ ] Ajouter les webhooks Flinks pour la vérification bancaire
- [ ] Créer un dashboard de monitoring des webhooks
- [ ] Implémenter la retry logic pour les webhooks échoués
- [ ] Ajouter des tests automatisés pour chaque endpoint
