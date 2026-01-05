# ⚠️ Action Requise: Mettre à jour VOPAY_SHARED_SECRET dans Vercel

## Le problème

La valeur de `VOPAY_SHARED_SECRET` dans Vercel est différente de celle en local, c'est pourquoi la validation de signature échoue.

## Solution

### Dashboard Vercel (RECOMMANDÉ)

J'ai ouvert le dashboard Vercel dans votre navigateur.

1. Allez dans l'onglet **Environment Variables**
2. Trouvez `VOPAY_SHARED_SECRET`
3. Cliquez sur les 3 points → **Edit**
4. Copiez cette valeur EXACTEMENT (sans espace, sans newline):
   ```
   ToDqaRRl4nmwnAYVc+==
   ```
5. Sauvegardez
6. Cliquez sur **Redeploy** en haut à droite

### OU via la ligne de commande

```bash
# Dans le projet
source .env.local
vercel env rm VOPAY_SHARED_SECRET production
# Puis ajouter manuellement avec la valeur: ToDqaRRl4nmwnAYVc+==
vercel env add VOPAY_SHARED_SECRET production
```

## Configuration des Webhooks VoPay

Dans votre dashboard VoPay, vous avez plusieurs options de webhooks. Pour commencer:

### Transaction Status (PRIORITAIRE)
- **Event**: Transaction Status
- **URL**: `https://api.solutionargentrapide.ca/api/webhooks/vopay`
- **Enable**: ✅ Activé

### Autres événements (optionnel pour plus tard)
Vous pouvez activer d'autres webhooks selon vos besoins:
- eLinx Status
- Account Status
- Bank Account Creation
- Scheduled Transaction
- Payment Received
- etc.

Pour l'instant, **activez uniquement Transaction Status** avec l'URL ci-dessus.

## Test après mise à jour

Une fois le secret mis à jour et redéployé, testez:

```bash
./test-webhook.sh
```

Vous devriez voir:
```
Status: 200
✅ Webhook traité avec succès!
```
