# Configuration des Webhooks VoPay

## 📋 Vue d'ensemble

Ce guide explique comment configurer les webhooks VoPay pour recevoir les notifications de statut de transaction en temps réel.

---

## 🗄️ Étape 1: Créer la table Supabase

### 1.1 Ouvrir le SQL Editor

Allez sur: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq/sql/new

### 1.2 Copier et exécuter le SQL

Copiez le contenu complet du fichier `supabase-vopay-webhooks.sql` et exécutez-le dans le SQL Editor.

Le fichier crée:
- ✅ Table `vopay_webhook_logs` avec tous les champs nécessaires
- ✅ Index pour performances optimales
- ✅ Commentaires pour documentation

### 1.3 Vérifier la création

Après l'exécution, vérifiez que la table apparaît dans:
`Table Editor > vopay_webhook_logs`

---

## 🚀 Étape 2: Déployer sur Vercel

### 2.1 Commit et push les changements

```bash
git add .
git commit -m "feat: Add VoPay webhook endpoint"
git push origin main
```

### 2.2 Déployer automatiquement

Vercel détectera le push et déploiera automatiquement.

---

## 🌐 Étape 3: Configurer le sous-domaine

### Option A: Via le Dashboard Vercel

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez le projet "sar"
3. Allez dans **Settings > Domains**
4. Cliquez sur **Add Domain**
5. Entrez: `api.solutionargentrapide.ca`
6. Suivez les instructions pour configurer le DNS

### Option B: Via la CLI Vercel

```bash
vercel domains add api.solutionargentrapide.ca
```

### Configuration DNS requise

Ajoutez un enregistrement CNAME dans votre DNS:

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 3600
```

**Important**: Attendez la propagation DNS (peut prendre jusqu'à 48h, généralement 1-2h)

---

## 🔗 Étape 4: Configurer le webhook dans VoPay

### 4.1 Endpoint webhook

URL à configurer: `https://api.solutionargentrapide.ca/api/webhooks/vopay`

### 4.2 Configuration via l'API VoPay

```bash
curl -X POST https://earthnode.vopay.com/api/v2/account/webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "AccountID": "solutionargentrapideinc",
    "Key": "bUXExKVc0sLyNS9zjfGq6AJukdDB1pvCR5ihHF78",
    "Signature": "<CALCULER_SIGNATURE>",
    "WebhookURL": "https://api.solutionargentrapide.ca/api/webhooks/vopay"
  }'
```

**Note**: La signature doit être calculée avec: `SHA1(APIKey + SharedSecret + Date(YYYY-MM-DD))`

### 4.3 Alternative: Via le dashboard VoPay

1. Connectez-vous à https://app.vopay.com
2. Allez dans **Settings > Webhooks**
3. Entrez l'URL: `https://api.solutionargentrapide.ca/api/webhooks/vopay`
4. Sauvegardez

---

## 🧪 Étape 5: Tester le webhook

### 5.1 Test de connectivité

```bash
curl https://api.solutionargentrapide.ca/api/webhooks/vopay
```

Réponse attendue:
```json
{
  "status": "online",
  "endpoint": "VoPay Webhook Receiver",
  "methods": ["POST"],
  "timestamp": "2025-01-05T..."
}
```

### 5.2 Test avec payload simulé

```bash
curl -X POST https://api.solutionargentrapide.ca/api/webhooks/vopay \
  -H "Content-Type: application/json" \
  -d '{
    "Success": true,
    "TransactionType": "EFT Funding",
    "TransactionID": "TEST123456",
    "TransactionAmount": "100.00",
    "Status": "successful",
    "UpdatedAt": "2025-01-05T12:00:00Z",
    "ValidationKey": "<CALCULER_HMAC>",
    "Environment": "Production"
  }'
```

### 5.3 Vérifier dans Supabase

Allez dans Table Editor > vopay_webhook_logs pour voir les webhooks reçus.

---

## 📊 Format des webhooks VoPay

### Payload type

```typescript
{
  Success: boolean
  TransactionType: string          // "EFT Funding", "Interac Request Money", etc.
  TransactionID: string            // Identifiant unique
  TransactionAmount: string        // "123.45"
  Status: string                   // "pending" | "in progress" | "failed" | "cancelled" | "successful"
  UpdatedAt: string                // ISO 8601 timestamp
  ValidationKey: string            // HMAC SHA1 pour validation
  FailureReason?: string           // Présent si Status === "failed"
  Environment: string              // "Production" | "Sandbox"
}
```

### Statuts de transaction

- **pending**: Transaction créée, en attente de traitement
- **in progress**: Envoyée à la banque, en cours de traitement
- **successful**: ✅ Transaction complétée avec succès
- **failed**: ❌ Transaction échouée (voir FailureReason)
- **cancelled**: 🚫 Transaction annulée

---

## 🔐 Validation de signature

Le webhook valide automatiquement la signature avec:

```typescript
ValidationKey === HMAC_SHA1(SharedSecret + TransactionID)
```

Si la validation échoue, le webhook retourne une erreur 401.

---

## 📈 Monitoring

### Logs en temps réel

```bash
vercel logs --follow
```

### Dashboard Supabase

Consultez les webhooks dans: Table Editor > vopay_webhook_logs

### Filtrer par statut

```sql
-- Transactions réussies aujourd'hui
SELECT * FROM vopay_webhook_logs
WHERE status = 'successful'
AND received_at >= CURRENT_DATE
ORDER BY received_at DESC;

-- Transactions échouées
SELECT * FROM vopay_webhook_logs
WHERE status = 'failed'
ORDER BY received_at DESC;
```

---

## 🚨 Troubleshooting

### Le webhook ne reçoit rien

1. ✅ Vérifier que le sous-domaine est bien configuré
2. ✅ Vérifier la propagation DNS: `nslookup api.solutionargentrapide.ca`
3. ✅ Vérifier que l'URL est configurée dans VoPay
4. ✅ Vérifier les logs Vercel: `vercel logs`

### Erreur 401 (Invalid signature)

1. ✅ Vérifier que `VOPAY_SHARED_SECRET` est correct dans Vercel
2. ✅ Vérifier le format du TransactionID (pas d'espaces)
3. ✅ Vérifier que le SharedSecret est le même que celui fourni par VoPay

### Erreur 500 (Database unavailable)

1. ✅ Vérifier que la table `vopay_webhook_logs` existe dans Supabase
2. ✅ Vérifier les credentials Supabase dans Vercel Environment Variables
3. ✅ Vérifier les logs Supabase

---

## 🎯 Prochaines étapes

Une fois les webhooks configurés:

1. **Synchronisation avec les prêts**
   - Mettre à jour le statut dans la table `loans` ou `repayments`
   - Déclencher des notifications clients

2. **Notifications automatiques**
   - Email au client si transaction échouée
   - SMS/Email de confirmation si transaction réussie
   - Alerte admin pour transactions échouées

3. **Dashboard de monitoring**
   - Graphiques temps réel des transactions
   - Taux de succès/échec
   - Alertes pour patterns anormaux

---

## 📚 Ressources

- **VoPay API Docs**: https://docs.vopay.com/
- **Webhook Docs**: https://docs.vopay.com/docs/webhooks
- **Supabase Dashboard**: https://supabase.com/dashboard/project/dllyzfuqjzuhvshrlmuq
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## ✅ Checklist finale

- [ ] Table `vopay_webhook_logs` créée dans Supabase
- [ ] Code déployé sur Vercel
- [ ] Sous-domaine `api.solutionargentrapide.ca` configuré
- [ ] DNS propagé (test avec nslookup)
- [ ] Webhook URL configurée dans VoPay
- [ ] Test de connectivité réussi (GET)
- [ ] Test avec payload simulé réussi (POST)
- [ ] Premier webhook reçu et enregistré en BD

---

**Dernière mise à jour**: 2025-01-05
**Version**: 1.0.0
**Status**: Prêt pour production 🚀
