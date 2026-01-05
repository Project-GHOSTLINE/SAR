# 📧 Page Admin Webhooks VoPay - Guide Complet

## 🎯 Accès à la Page

**URL**: https://admin.solutionargentrapide.ca/webhooks

Ou depuis le dashboard admin, cliquer sur le bouton **"Webhooks"** dans la navigation.

---

## 📊 Fonctionnalités

### 1. Vue d'Ensemble

La page affiche:
- **Total des webhooks** reçus
- **Transactions réussies** (successful)
- **Transactions échouées** (failed)
- **Transactions en attente** (pending + in progress)

### 2. Tableau des Webhooks

Pour chaque webhook, vous voyez:
- **Transaction ID**: Identifiant unique VoPay
- **Type**: Type de transaction (EFT Funding, etc.)
- **Montant**: Montant en CAD
- **Statut**: État actuel avec icône colorée
  - ✅ `successful` (vert)
  - ❌ `failed` (rouge)
  - ⏳ `pending` (jaune)
  - 🔄 `in progress` (bleu)
  - 🚫 `cancelled` (gris)
- **Raison d'échec**: Affichée pour les transactions failed
- **Date**: Date et heure de réception
- **Actions**: Bouton "Envoyer Alerte" pour les failed

### 3. Filtres

Filtrez par statut:
- **Tous**: Affiche tous les webhooks
- **successful**: Seulement les réussies
- **failed**: Seulement les échouées
- **pending**: En attente
- **in progress**: En cours de traitement
- **cancelled**: Annulées

### 4. Bouton "Actualiser"

En haut à droite, cliquez pour recharger les données en temps réel.

---

## 📧 Envoi d'Alertes Email

### Pour les Transactions Échouées

1. Trouvez une transaction avec le statut `failed`
2. Cliquez sur le bouton **"Envoyer Alerte"** à droite
3. Confirmez l'envoi
4. L'email est envoyé automatiquement

### Destinataires

Les emails sont envoyés à:
- ✉️ info@solutionargentrapide.ca
- ✉️ service@solutionargentrapide.ca

### Contenu de l'Email

L'email contient:
- **Alerte visuelle** en rouge
- **Transaction ID**
- **Type de transaction**
- **Montant**
- **Raison de l'échec** (ex: NSF - Insufficient Funds)
- **Environnement** (Production/Sandbox)
- **Date de réception**
- **Actions recommandées**:
  - Vérifier le solde VoPay
  - Contacter le client
  - Vérifier les informations bancaires
  - Planifier une nouvelle tentative
- **Lien direct** vers le dashboard

---

## 🔍 Cas d'Utilisation

### Scénario 1: Transaction Échouée (NSF)

1. Client effectue un paiement
2. VoPay envoie un webhook `failed` avec raison "NSF - Insufficient Funds"
3. Le webhook apparaît dans la page admin
4. Cliquez sur "Envoyer Alerte"
5. L'équipe reçoit un email détaillé
6. Actions:
   - Contacter le client
   - Proposer un nouveau calendrier de paiement
   - Enregistrer dans Margill

### Scénario 2: Vérification des Paiements Réussis

1. Allez dans la page webhooks
2. Cliquez sur le filtre "successful"
3. Voyez tous les paiements réussis
4. Vérifiez que les montants correspondent
5. Comparez avec Margill pour réconciliation

### Scénario 3: Monitoring des Transactions en Cours

1. Cliquez sur le filtre "in progress"
2. Voyez les transactions en cours de traitement
3. Si une transaction reste "in progress" trop longtemps:
   - Attendre 24-48h (délai normal bancaire)
   - Si pas de changement, contacter VoPay support

---

## 🎨 Interface

### Codes Couleurs

| Statut | Couleur | Signification |
|--------|---------|---------------|
| 🟢 Vert | Successful | Tout va bien |
| 🔴 Rouge | Failed | Action requise |
| 🟡 Jaune | Pending | En attente |
| 🔵 Bleu | In Progress | En cours |
| ⚪ Gris | Cancelled | Annulé |

### Icônes

- ✅ **CheckCircle**: Transaction réussie
- ❌ **XCircle**: Transaction échouée ou annulée
- ⏱️ **Clock**: Transaction en attente
- 🔄 **RefreshCw**: Transaction en cours
- 📧 **Mail**: Envoyer email

---

## 🔧 API Endpoints

### GET /api/admin/webhooks/list

Récupère les 100 derniers webhooks.

**Réponse**:
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "uuid",
      "transaction_id": "TEST_123",
      "transaction_type": "EFT Funding",
      "transaction_amount": 250.00,
      "currency": "CAD",
      "status": "failed",
      "failure_reason": "NSF - Insufficient Funds",
      "environment": "Production",
      "is_validated": true,
      "received_at": "2026-01-05T...",
      "updated_at": "2026-01-05T...",
      "raw_payload": {...}
    }
  ]
}
```

### POST /api/admin/webhooks/send-alert

Envoie un email d'alerte pour une transaction failed.

**Requête**:
```json
{
  "webhookId": "uuid-du-webhook"
}
```

**Réponse**:
```json
{
  "success": true,
  "message": "Alert email sent successfully",
  "emailId": "resend-email-id"
}
```

---

## ⚠️ Erreurs Courantes

### "Database unavailable"
- Vérifier la connexion Supabase
- Vérifier les credentials dans Vercel

### "Email service not configured"
- Vérifier que `RESEND_API_KEY` est configuré dans Vercel
- Vérifier que l'API key Resend est valide

### "Failed to send email"
- Vérifier les logs Vercel: `vercel logs`
- Vérifier le quota Resend
- Vérifier que les emails sont validés dans Resend

### Webhook n'apparaît pas
1. Vérifier que "Transaction Status" est activé dans VoPay
2. Vérifier l'URL du webhook: `https://api.solutionargentrapide.ca/api/webhooks/vopay`
3. Tester avec: `./test-webhook.sh`
4. Vérifier les logs: `vercel logs`

---

## 📊 Requêtes SQL Utiles

### Voir les transactions failed des 7 derniers jours
```sql
SELECT
  transaction_id,
  transaction_amount,
  failure_reason,
  received_at
FROM vopay_webhook_logs
WHERE status = 'failed'
  AND received_at >= NOW() - INTERVAL '7 days'
ORDER BY received_at DESC;
```

### Calculer le taux de succès
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM vopay_webhook_logs
WHERE received_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;
```

### Montant total par statut
```sql
SELECT
  status,
  COUNT(*) as transactions,
  SUM(transaction_amount) as total_amount
FROM vopay_webhook_logs
GROUP BY status
ORDER BY total_amount DESC;
```

---

## 🚀 Workflow Recommandé

### Chaque Matin
1. ✅ Ouvrir la page webhooks
2. ✅ Vérifier les transactions de la nuit
3. ✅ Filtrer par "failed"
4. ✅ Envoyer les alertes nécessaires
5. ✅ Noter dans Margill

### En Cas de Transaction Failed
1. 📧 Envoyer l'alerte email via le bouton
2. 📞 Contacter le client sous 24h
3. 💬 Proposer une solution (nouveau calendrier, autre méthode)
4. 📝 Documenter dans Margill
5. 🔄 Planifier une nouvelle tentative si accepté

### Réconciliation Hebdomadaire
1. Comparer webhooks "successful" avec Margill
2. Vérifier que tous les paiements sont enregistrés
3. Investiguer les écarts
4. Mettre à jour les dossiers clients

---

## 📞 Support

### Problème avec la page admin
- Vérifier la connexion Supabase
- Recharger la page (Cmd+R / Ctrl+R)
- Vider le cache du navigateur
- Contacter le développeur

### Problème avec les emails
- Vérifier les logs Vercel
- Vérifier le dashboard Resend: https://resend.com/emails
- Vérifier le quota d'emails

### Problème avec VoPay
- Vérifier le dashboard VoPay: https://app.vopay.com
- Contacter VoPay support: support@vopay.com
- Consulter la doc: https://docs.vopay.com

---

## ✅ Checklist de Test

- [ ] Accéder à la page webhooks
- [ ] Voir les statistiques
- [ ] Tester les filtres (all, successful, failed, etc.)
- [ ] Cliquer sur "Actualiser"
- [ ] Trouver une transaction failed de test
- [ ] Cliquer sur "Envoyer Alerte"
- [ ] Vérifier la réception de l'email
- [ ] Vérifier le contenu de l'email
- [ ] Tester le lien vers le dashboard

---

**Créé le**: 2026-01-05
**Version**: 1.0.0
**Status**: ✅ Production Ready
